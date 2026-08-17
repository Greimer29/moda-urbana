import ProductoCatalogoNoEncontradoException from '#exceptions/producto_catalogo_no_encontrado_exception'
import CatalogProduct from '#models/catalog_product'
import ProductInventoryMovement, {
  type ProductMovementType,
} from '#models/product_inventory_movement'
import CatalogProductStockService from '#services/catalog_product_stock_service'
import { formatCatalogProductCode } from '#utils/catalog_product_code'
import { DateTime } from 'luxon'

export type InventoryReportFilters = {
  search?: string
  category?: string
  active?: boolean
  low_stock?: boolean
  hide_zero?: boolean
  movement_from?: string
  movement_to?: string
  movement_month?: string
  sort_by?: 'id' | 'name' | 'sale_price' | 'quantity'
  sort_dir?: 'asc' | 'desc'
  page?: number
  per_page?: number
  export?: boolean
}

export type InventoryReportRow = {
  product_id: number
  code: string
  image_path: string | null
  description: string
  size: string | null
  quantity: string
  sale_price_usd: string
  cost_usd: string | null
  sale_unit: string
  category: string
  stock_source: 'manual' | 'formula'
  low_stock: boolean
}

export type InventoryMovementsFilters = {
  from?: string
  to?: string
  month?: string
  types?: ProductMovementType[]
  page?: number
  per_page?: number
  export?: boolean
}

export type InventoryMovementRow = {
  id: number
  type: ProductMovementType
  quantity: string
  note: string | null
  created_at: string
  order_id: number | null
  order_code: string | null
  sale_id: number | null
  purchase_id: number | null
}

export type InventoryProductSummary = {
  product_id: number
  code: string
  description: string
  image_path: string | null
  stock_quantity: string
  sale_price_usd: string
  cost_usd: string | null
  sale_unit: string
  stock_source: 'manual' | 'formula'
  movements_unavailable: boolean
}

export default class InventoryReportService {
  private stockService = new CatalogProductStockService()

  async listarSnapshot(filters: InventoryReportFilters = {}) {
    const products = await this.fetchProducts(filters)
    const stockMap = await this.stockService.calcularStockForProducts(products)

    let rows: InventoryReportRow[] = []

    for (const product of products) {
      const productId = Number(product.id)
      const stock = stockMap.get(productId) ?? {
        quantity: Number(product.stockQuantity),
        source: product.formulaId ? ('formula' as const) : ('manual' as const),
      }
      const minimumStock = Number(product.minimumStock ?? 0)
      const productLowStock = stock.quantity < minimumStock
      const sizes = Array.isArray(product.sizes) ? product.sizes : []

      if (sizes.length > 0) {
        for (const sizeRow of sizes) {
          const qty = Number(sizeRow.stockQuantity)
          rows.push(this.buildRow(product, stock.source, productLowStock, {
            size: sizeRow.size,
            quantity: qty,
          }))
        }
      } else {
        rows.push(
          this.buildRow(product, stock.source, productLowStock, {
            size: null,
            quantity: stock.quantity,
          })
        )
      }
    }

    if (filters.hide_zero) {
      rows = rows.filter((row) => Number(row.quantity) > 0)
    }

    if (filters.low_stock) {
      rows = rows.filter((row) => row.low_stock)
    }

    rows = this.sortRows(rows, filters.sort_by ?? 'id', filters.sort_dir ?? 'asc')

    const page = filters.page ?? 1
    const perPage = filters.export ? rows.length || 1 : Math.min(filters.per_page ?? 30, 200)
    const total = rows.length
    const lastPage = Math.max(1, Math.ceil(total / perPage))
    const currentPage = filters.export ? 1 : Math.min(page, lastPage)
    const offset = (currentPage - 1) * perPage
    const data = filters.export ? rows : rows.slice(offset, offset + perPage)

    return {
      rows: data,
      meta: {
        total,
        per_page: perPage,
        current_page: currentPage,
        last_page: lastPage,
      },
    }
  }

  async listarMovimientos(catalogProductId: number, filters: InventoryMovementsFilters = {}) {
    const product = await CatalogProduct.query()
      .where('id', catalogProductId)
      .preload('sizes')
      .first()

    if (!product) {
      throw new ProductoCatalogoNoEncontradoException()
    }

    const stock = await this.stockService.calcularStockDisponible(product)
    const movementsUnavailable = stock.source === 'formula'

    const summary: InventoryProductSummary = {
      product_id: Number(product.id),
      code: formatCatalogProductCode(Number(product.id)),
      description: product.name,
      image_path: product.imagePath,
      stock_quantity: stock.quantity.toFixed(3),
      sale_price_usd: product.salePriceUsd,
      cost_usd: product.costUsd,
      sale_unit: product.saleUnit,
      stock_source: stock.source,
      movements_unavailable: movementsUnavailable,
    }

    if (movementsUnavailable) {
      return {
        product: summary,
        movements: [] as InventoryMovementRow[],
        meta: {
          total: 0,
          per_page: filters.per_page ?? 30,
          current_page: 1,
          last_page: 1,
        },
      }
    }

    const period = this.resolvePeriod(filters)
    const page = filters.page ?? 1
    const perPage = filters.export ? 10_000 : Math.min(filters.per_page ?? 30, 200)

    const query = ProductInventoryMovement.query()
      .where('catalogProductId', catalogProductId)
      .preload('order')
      .preload('purchaseItem', (purchaseItemQuery) => purchaseItemQuery.preload('purchase'))
      .orderBy('createdAt', 'desc')
      .orderBy('id', 'desc')

    if (period.from) {
      query.where('createdAt', '>=', DateTime.fromISO(period.from).startOf('day').toSQL()!)
    }

    if (period.to) {
      query.where('createdAt', '<=', DateTime.fromISO(period.to).endOf('day').toSQL()!)
    }

    if (filters.types?.length) {
      query.whereIn('type', filters.types)
    }

    const paginator = await query.paginate(page, perPage)

    const movements: InventoryMovementRow[] = paginator.all().map((mov) => ({
      id: Number(mov.id),
      type: mov.type,
      quantity: mov.quantity,
      note: mov.note,
      created_at: mov.createdAt.toISO()!,
      order_id: mov.orderId ? Number(mov.orderId) : null,
      order_code: mov.order?.code ?? null,
      sale_id: mov.saleId ? Number(mov.saleId) : null,
      purchase_id: mov.purchaseItem?.purchaseId ? Number(mov.purchaseItem.purchaseId) : null,
    }))

    return {
      product: summary,
      movements,
      meta: {
        total: paginator.total,
        per_page: paginator.perPage,
        current_page: paginator.currentPage,
        last_page: paginator.lastPage,
      },
      period,
    }
  }

  private async fetchProducts(filters: InventoryReportFilters): Promise<CatalogProduct[]> {
    const query = CatalogProduct.query().preload('sizes', (sizesQuery) =>
      sizesQuery.orderBy('size', 'asc')
    )

    if (filters.active === true) {
      query.where('active', true)
    }

    if (filters.category?.trim()) {
      query.where('category', filters.category.trim())
    }

    if (filters.search?.trim()) {
      const term = `%${filters.search.trim()}%`
      query.where((builder) => {
        builder
          .whereILike('name', term)
          .orWhereILike('brand', term)
          .orWhereILike('reference', term)
          .orWhereILike('productModel', term)

        const numericId = Number(filters.search!.trim())
        if (Number.isInteger(numericId) && numericId > 0) {
          builder.orWhere('id', numericId)
        }
      })
    }

    const movementPeriod = this.resolveMovementPeriod(filters)
    if (movementPeriod) {
      query.whereExists((subquery) => {
        subquery
          .from('product_inventory_movements as pim')
          .whereRaw('pim.catalog_product_id = catalog_products.id')

        if (movementPeriod.from) {
          subquery.where(
            'pim.created_at',
            '>=',
            DateTime.fromISO(movementPeriod.from).startOf('day').toSQL()!
          )
        }

        if (movementPeriod.to) {
          subquery.where(
            'pim.created_at',
            '<=',
            DateTime.fromISO(movementPeriod.to).endOf('day').toSQL()!
          )
        }
      })
    }

    return query.orderBy('id', 'asc')
  }

  private buildRow(
    product: CatalogProduct,
    stockSource: 'manual' | 'formula',
    productLowStock: boolean,
    row: { size: string | null; quantity: number }
  ): InventoryReportRow {
    return {
      product_id: Number(product.id),
      code: formatCatalogProductCode(Number(product.id)),
      image_path: product.imagePath,
      description: product.name,
      size: row.size,
      quantity: row.quantity.toFixed(3),
      sale_price_usd: product.salePriceUsd,
      cost_usd: product.costUsd,
      sale_unit: product.saleUnit,
      category: product.category,
      stock_source: stockSource,
      low_stock: productLowStock,
    }
  }

  private sortRows(
    rows: InventoryReportRow[],
    sortBy: InventoryReportFilters['sort_by'],
    sortDir: InventoryReportFilters['sort_dir']
  ) {
    const dir = sortDir === 'desc' ? -1 : 1

    return [...rows].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.description.localeCompare(b.description, 'es') * dir
        case 'sale_price':
          return (Number(a.sale_price_usd) - Number(b.sale_price_usd)) * dir
        case 'quantity':
          return (Number(a.quantity) - Number(b.quantity)) * dir
        case 'id':
        default:
          if (a.product_id !== b.product_id) {
            return (a.product_id - b.product_id) * dir
          }
          return (a.size ?? '').localeCompare(b.size ?? '', 'es') * dir
      }
    })
  }

  private resolveMovementPeriod(filters: InventoryReportFilters) {
    if (!filters.movement_from && !filters.movement_to && !filters.movement_month) {
      return null
    }

    return this.resolvePeriod({
      from: filters.movement_from,
      to: filters.movement_to,
      month: filters.movement_month,
    })
  }

  private resolvePeriod(filters: {
    from?: string
    to?: string
    month?: string
  }) {
    if (filters.month) {
      const start = DateTime.fromISO(`${filters.month}-01`)
      return {
        from: start.startOf('month').toISODate()!,
        to: start.endOf('month').toISODate()!,
      }
    }

    const now = DateTime.now()

    return {
      from: filters.from ?? now.startOf('month').toISODate()!,
      to: filters.to ?? now.endOf('month').toISODate()!,
    }
  }
}
