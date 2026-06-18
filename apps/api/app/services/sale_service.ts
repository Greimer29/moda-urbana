import CustomerNoEncontradoException from '#exceptions/cliente_no_encontrado_exception'
import LineaVentaInvalidaException from '#exceptions/linea_venta_invalida_exception'
import MaterialNoEncontradoException from '#exceptions/material_no_encontrado_exception'
import ProductoCatalogoNoEncontradoException from '#exceptions/producto_catalogo_no_encontrado_exception'
import StockInsuficienteException from '#exceptions/stock_insuficiente_exception'
import VentaNoEncontradaException from '#exceptions/venta_no_encontrada_exception'
import CatalogProduct from '#models/catalog_product'
import Customer from '#models/customer'
import InventoryMovement from '#models/inventory_movement'
import Material from '#models/material'
import Sale from '#models/sale'
import SaleLine from '#models/sale_line'
import CatalogProductStockService from '#services/catalog_product_stock_service'
import MaterialService from '#services/material_service'
import ProductInventoryService from '#services/product_inventory_service'
import SaleCodigoService from '#services/sale_code_service'
import { formatCantidadMovimiento } from '#services/order_stock'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import type { ModelPaginatorContract } from '@adonisjs/lucid/types/model'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

export type SaleLineInput = {
  catalog_product_id?: number
  material_id?: number
  quantity: number
  unit_price_usd: number
}

export type CreateSaleInput = {
  customer_id?: number | null
  guest_name?: string | null
  payment_method: Sale['paymentMethod']
  usd_rate?: number | null
  lines: SaleLineInput[]
}

export type ListSalesFilters = {
  page?: number
  perPage?: number
  customer_id?: number
  date_from?: string
  date_to?: string
}

export default class SaleService {
  private codeService = new SaleCodigoService()
  private materialService = new MaterialService()
  private productInventoryService = new ProductInventoryService()
  private catalogProductStockService = new CatalogProductStockService()

  async listar(filters: ListSalesFilters = {}): Promise<ModelPaginatorContract<Sale>> {
    const page = filters.page ?? 1
    const perPage = filters.perPage ?? 20

    const query = Sale.query()
      .preload('customer')
      .orderBy('soldAt', 'desc')
      .orderBy('id', 'desc')

    if (filters.customer_id) {
      query.where('customerId', filters.customer_id)
    }

    if (filters.date_from) {
      query.where('soldAt', '>=', filters.date_from)
    }

    if (filters.date_to) {
      query.where('soldAt', '<=', `${filters.date_to} 23:59:59`)
    }

    return query.paginate(page, perPage)
  }

  async obtenerDetalle(id: number): Promise<Sale> {
    const sale = await Sale.query()
      .where('id', id)
      .preload('customer')
      .preload('saleLines', (q) => {
        q.preload('catalogProduct').preload('material').orderBy('id', 'asc')
      })
      .first()

    if (!sale) {
      throw new VentaNoEncontradaException()
    }

    return sale
  }

  async crear(input: CreateSaleInput): Promise<Sale> {
    if (input.lines.length === 0) {
      throw new LineaVentaInvalidaException('Debe incluir al menos una línea de venta')
    }

    if (input.customer_id) {
      const customer = await Customer.find(input.customer_id)
      if (!customer) {
        throw new CustomerNoEncontradoException()
      }
    }

    return db.transaction(async (trx) => {
      const soldAt = DateTime.now()
      const code = await this.codeService.generar(soldAt, trx)

      let totalUsd = 0
      const resolvedLines: {
        catalogProductId: number | null
        materialId: number | null
        description: string
        quantity: string
        unitPriceUsd: string
        subtotalUsd: string
      }[] = []

      for (const line of input.lines) {
        const hasCatalog = line.catalog_product_id !== undefined && line.catalog_product_id !== null
        const hasMaterial = line.material_id !== undefined && line.material_id !== null

        if (hasCatalog === hasMaterial) {
          throw new LineaVentaInvalidaException()
        }

        const quantity = line.quantity
        const unitPrice = line.unit_price_usd
        const subtotal = quantity * unitPrice
        totalUsd += subtotal

        if (hasCatalog) {
          const product = await CatalogProduct.query({ client: trx })
            .where('id', line.catalog_product_id!)
            .preload('formula', (f) =>
              f.preload('materials', (fm) => fm.preload('material'))
            )
            .forUpdate()
            .first()

          if (!product) {
            throw new ProductoCatalogoNoEncontradoException()
          }

          resolvedLines.push({
            catalogProductId: line.catalog_product_id!,
            materialId: null,
            description: product.name,
            quantity: quantity.toFixed(3),
            unitPriceUsd: unitPrice.toFixed(4),
            subtotalUsd: subtotal.toFixed(4),
          })
        } else {
          const material = await Material.find(line.material_id!)
          if (!material) {
            throw new MaterialNoEncontradoException()
          }

          resolvedLines.push({
            catalogProductId: null,
            materialId: line.material_id!,
            description: material.name,
            quantity: quantity.toFixed(3),
            unitPriceUsd: unitPrice.toFixed(4),
            subtotalUsd: subtotal.toFixed(4),
          })
        }
      }

      const totalBs =
        input.usd_rate && input.usd_rate > 0
          ? (totalUsd * input.usd_rate).toFixed(2)
          : null

      const sale = await Sale.create(
        {
          code,
          customerId: input.customer_id ?? null,
          guestName: input.guest_name?.trim() || null,
          paymentMethod: input.payment_method,
          totalUsd: totalUsd.toFixed(4),
          totalBs,
          usdRate: input.usd_rate ? input.usd_rate.toFixed(4) : null,
          status: 'COMPLETED',
          soldAt,
        },
        { client: trx }
      )

      for (const line of resolvedLines) {
        await SaleLine.create(
          {
            saleId: Number(sale.id),
            catalogProductId: line.catalogProductId,
            materialId: line.materialId,
            description: line.description,
            quantity: line.quantity,
            unitPriceUsd: line.unitPriceUsd,
            subtotalUsd: line.subtotalUsd,
          },
          { client: trx }
        )
      }

      await this.descontarStock(Number(sale.id), input.lines, trx)

      await sale.load('customer')
      await sale.load('saleLines', (q) => {
        q.preload('catalogProduct').preload('material').orderBy('id', 'asc')
      })

      return sale
    })
  }

  private async descontarStock(
    saleId: number,
    lines: SaleLineInput[],
    trx: TransactionClientContract
  ) {
    for (const line of lines) {
      if (line.catalog_product_id) {
        const product = await CatalogProduct.query({ client: trx })
          .where('id', line.catalog_product_id)
          .preload('formula', (f) =>
            f.preload('materials', (fm) => fm.preload('material'))
          )
          .forUpdate()
          .first()

        if (!product) {
          throw new ProductoCatalogoNoEncontradoException()
        }

        const { quantity: disponible } = await this.catalogProductStockService.calcularStockDisponible(
          product,
          { trx }
        )

        if (line.quantity > disponible) {
          throw new StockInsuficienteException([
            {
              material_id: Number(product.id),
              name: product.name,
              stock_actual: disponible,
              consumo_proyectado: line.quantity,
              faltante: line.quantity - disponible,
            },
          ])
        }

        if (product.formulaId) {
          const formulaMaterials = product.formula?.materials ?? []
          for (const formulaItem of formulaMaterials) {
            const materialId = Number(formulaItem.materialId)
            const consumo = line.quantity * Number(formulaItem.quantity)
            if (consumo <= 0) {
              continue
            }

            const stockActual = await this.materialService.calcularStock(materialId)
            if (stockActual < consumo) {
              const material = formulaItem.material ?? (await Material.findOrFail(materialId))
              throw new StockInsuficienteException([
                {
                  material_id: materialId,
                  name: material.name,
                  stock_actual: stockActual,
                  consumo_proyectado: consumo,
                  faltante: consumo - stockActual,
                },
              ])
            }

            await InventoryMovement.create(
              {
                materialId,
                type: 'SALE_OUT',
                quantity: formatCantidadMovimiento(consumo),
                note: `Venta #${saleId}`,
              },
              { client: trx }
            )
          }
          continue
        }

        await this.productInventoryService.registrarMovimiento(
          {
            catalogProductId: line.catalog_product_id,
            type: 'SALE_OUT',
            quantity: -line.quantity,
            saleId,
            note: `Venta #${saleId}`,
          },
          trx
        )
      }

      if (line.material_id) {
        const stockActual = await this.materialService.calcularStock(line.material_id)
        if (stockActual < line.quantity) {
          const material = await Material.findOrFail(line.material_id)
          throw new StockInsuficienteException([
            {
              material_id: line.material_id,
              name: material.name,
              stock_actual: stockActual,
              consumo_proyectado: line.quantity,
              faltante: line.quantity - stockActual,
            },
          ])
        }

        await InventoryMovement.create(
          {
            materialId: line.material_id,
            type: 'SALE_OUT',
            quantity: formatCantidadMovimiento(line.quantity),
            note: `Venta #${saleId}`,
          },
          { client: trx }
        )
      }
    }
  }
}
