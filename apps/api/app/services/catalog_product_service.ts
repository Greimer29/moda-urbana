import FormulaNoEncontradaException from '#exceptions/formula_no_encontrada_exception'
import ProductoCatalogoEnPedidosActivosException from '#exceptions/producto_catalogo_en_pedidos_activos_exception'
import ProductoCatalogoNoEncontradoException from '#exceptions/producto_catalogo_no_encontrado_exception'
import ProductoCatalogoStockFormulaException from '#exceptions/producto_catalogo_stock_formula_exception'
import ProductoTallaDuplicadaException from '#exceptions/producto_talla_duplicada_exception'
import ArchivoImagenNoDisponibleException from '#exceptions/archivo_imagen_no_disponible_exception'
import CatalogProduct from '#models/catalog_product'
import CatalogProductSize from '#models/catalog_product_size'
import Formula from '#models/formula'
import Order from '#models/order'
import OrderLine from '#models/order_line'
import CategoryService from '#services/category_service'
import FormulaService from '#services/formula_service'
import ProductCodeService from '#services/product_code_service'
import type { InventoryUnit } from '#constants/inventory_units'
import type { CostWarning } from '#types/cost_warning'
import drive from '@adonisjs/drive/services/main'
import type { MultipartFile } from '@adonisjs/core/bodyparser'
import db from '@adonisjs/lucid/services/db'
import { randomUUID } from 'node:crypto'
import type { ModelPaginatorContract } from '@adonisjs/lucid/types/model'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

export type CatalogProductSizeInput = {
  size: string
  stock_quantity: number
}

export type CatalogProductInput = {
  name: string
  brand?: string | null
  product_model?: string | null
  reference?: string | null
  description?: string | null
  category: string
  sale_unit?: InventoryUnit
  sale_price_usd: number
  cost_usd?: number
  formula_id?: number | null
  stock_quantity?: number
  minimum_stock?: number
  active?: boolean
  sizes?: CatalogProductSizeInput[]
}

export type CatalogProductUpdateInput = Partial<CatalogProductInput>

export type ListCatalogProductsFilters = {
  page?: number
  perPage?: number
  search?: string
  brand?: string
  productModel?: string
  reference?: string
  size?: string
  category?: string
  active?: boolean
  sortBy?: 'name' | 'most_sold' | 'id' | 'sale_price'
  sortDir?: 'asc' | 'desc'
}

export type CatalogProductImageDownload = {
  bytes: Uint8Array
  contentType: string
  filename: string
}

export type ApplyProfitMarginInput = {
  catalog_product_ids: number[]
  profit_margin_percent: number
}

export type ApplyProfitMarginSkipped = {
  id: number
  name: string
  reason: 'NO_COST_PRICE' | 'NOT_FOUND'
}

export type ApplyProfitMarginResult = {
  updatedCount: number
  skipped: ApplyProfitMarginSkipped[]
}

export type CatalogProductUpdateResult = {
  product: CatalogProduct
  costWarnings: CostWarning[]
}

const IMAGE_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

const MOST_SOLD_SQL = `COALESCE((
  SELECT SUM(sl.quantity)
  FROM sale_lines sl
  WHERE sl.catalog_product_id = catalog_products.id
), 0) + COALESCE((
  SELECT SUM(ol.quantity)
  FROM order_lines ol
  INNER JOIN orders o ON o.id = ol.order_id
  WHERE ol.catalog_product_id = catalog_products.id
    AND o.status NOT IN ('CANCELLED', 'DRAFT')
), 0)`

export default class CatalogProductService {
  private formulaService = new FormulaService()
  private categoryService = new CategoryService()
  private productCodeService = new ProductCodeService()

  async listar(
    filters: ListCatalogProductsFilters = {}
  ): Promise<ModelPaginatorContract<CatalogProduct>> {
    const page = filters.page ?? 1
    const perPage = filters.perPage ?? 30
    const sortBy = filters.sortBy ?? 'name'
    const sortDir = filters.sortDir ?? 'asc'

    const query = CatalogProduct.query().preload('sizes', (sizesQuery) =>
      sizesQuery.orderBy('size', 'asc')
    )

    if (filters.search) {
      const term = `%${filters.search.trim()}%`
      query.where((builder) => {
        builder
          .whereILike('name', term)
          .orWhereILike('description', term)
          .orWhereILike('brand', term)
          .orWhereILike('product_model', term)
          .orWhereILike('reference', term)
      })
    }

    if (filters.brand) {
      query.whereILike('brand', `%${filters.brand.trim()}%`)
    }

    if (filters.productModel) {
      query.whereILike('product_model', `%${filters.productModel.trim()}%`)
    }

    if (filters.reference) {
      query.whereILike('reference', `%${filters.reference.trim()}%`)
    }

    if (filters.size) {
      const sizeTerm = filters.size.trim()
      query.whereHas('sizes', (sizesQuery) => {
        sizesQuery.whereILike('size', sizeTerm).where('stock_quantity', '>', 0)
      })
    }

    if (filters.category) {
      query.where('category', filters.category)
    }

    if (filters.active !== undefined) {
      query.where('active', filters.active)
    }

    if (sortBy === 'most_sold') {
      query.orderByRaw(`${MOST_SOLD_SQL} ${sortDir === 'desc' ? 'DESC' : 'ASC'}`)
      query.orderBy('id', 'desc')
    } else if (sortBy === 'id') {
      query.orderBy('id', sortDir)
    } else if (sortBy === 'sale_price') {
      query.orderBy('sale_price_usd', sortDir)
      query.orderBy('id', 'desc')
    } else {
      query.orderBy('name', sortDir)
      query.orderBy('id', 'desc')
    }

    return query.paginate(page, perPage)
  }

  async obtener(id: number): Promise<CatalogProduct> {
    const product = await CatalogProduct.find(id)
    if (!product) {
      throw new ProductoCatalogoNoEncontradoException()
    }
    return product
  }

  async obtenerDetalle(id: number): Promise<CatalogProduct> {
    const product = await CatalogProduct.query()
      .where('id', id)
      .preload('formula', (q) =>
        q.preload('materials', (mq) => mq.preload('material').orderBy('id', 'asc'))
      )
      .preload('sizes', (q) => q.orderBy('size', 'asc'))
      .first()

    if (!product) {
      throw new ProductoCatalogoNoEncontradoException()
    }

    return product
  }

  async crear(input: CatalogProductInput): Promise<CatalogProduct> {
    let costUsd = input.cost_usd ?? 0

    if (input.formula_id) {
      await this.assertFormulaExiste(input.formula_id)
      if (input.cost_usd === undefined) {
        costUsd = await this.formulaService.calcularCosto(input.formula_id)
      }
    }

    await this.categoryService.assertCategoriaActiva(input.category)

    const normalizedSizes = input.sizes ? this.normalizeSizesInput(input.sizes) : null
    const hasSizes = Boolean(normalizedSizes && normalizedSizes.length > 0)
    const stockFromSizes = hasSizes
      ? normalizedSizes!.reduce((sum, item) => sum + item.stock_quantity, 0)
      : null

    return db.transaction(async (trx) => {
      const product = await CatalogProduct.create(
        {
          name: input.name.trim(),
          brand: this.normalizeOptionalText(input.brand),
          productModel: this.normalizeOptionalText(input.product_model),
          reference: this.normalizeOptionalText(input.reference),
          description: input.description?.trim() || null,
          category: input.category.trim(),
          saleUnit: input.sale_unit ?? 'UND',
          formulaId: input.formula_id ?? null,
          salePriceUsd: input.sale_price_usd.toFixed(4),
          previousSalePriceUsd: null,
          costUsd: costUsd.toFixed(4),
          stockQuantity: (
            input.formula_id ? 0 : (stockFromSizes ?? input.stock_quantity ?? 0)
          ).toFixed(3),
          minimumStock: (input.minimum_stock ?? 0).toFixed(3),
          active: input.active ?? true,
        },
        { client: trx }
      )

      await this.productCodeService.assertCatalogProductCodeAvailable(Number(product.id))

      if (hasSizes && !input.formula_id) {
        await this.replaceSizesEnTrx(product, normalizedSizes!, trx)
      }

      await product.load('sizes', (q) => q.orderBy('size', 'asc'))
      return product
    })
  }

  async actualizar(
    id: number,
    input: CatalogProductUpdateInput
  ): Promise<CatalogProductUpdateResult> {
    const product = await this.obtener(id)
    const costWarnings: CostWarning[] = []
    const previousFormulaId = product.formulaId

    if (input.formula_id !== undefined) {
      if (input.formula_id === null) {
        product.formulaId = null
      } else {
        await this.assertFormulaExiste(input.formula_id)
        product.formulaId = input.formula_id
        if (input.formula_id !== previousFormulaId) {
          product.stockQuantity = '0.000'
        }
      }
    }

    if (input.sale_price_usd !== undefined) {
      const newPrice = input.sale_price_usd.toFixed(4)
      const currentPrice = product.salePriceUsd

      if (newPrice !== currentPrice && input.sale_price_usd < Number(currentPrice)) {
        product.previousSalePriceUsd = currentPrice
      }

      product.salePriceUsd = newPrice
    }

    if (input.name !== undefined) {
      product.name = input.name.trim()
    }

    if (input.brand !== undefined) {
      product.brand = this.normalizeOptionalText(input.brand)
    }

    if (input.product_model !== undefined) {
      product.productModel = this.normalizeOptionalText(input.product_model)
    }

    if (input.reference !== undefined) {
      product.reference = this.normalizeOptionalText(input.reference)
    }

    if (input.description !== undefined) {
      product.description = input.description?.trim() || null
    }

    if (input.category !== undefined) {
      await this.categoryService.assertCategoriaActiva(input.category)
      product.category = input.category.trim()
    }

    if (input.sale_unit !== undefined) {
      product.saleUnit = input.sale_unit
    }

    if (input.stock_quantity !== undefined && !product.formulaId && input.sizes === undefined) {
      product.stockQuantity = input.stock_quantity.toFixed(3)
    }

    if (input.minimum_stock !== undefined) {
      product.minimumStock = input.minimum_stock.toFixed(3)
    }

    if (input.active !== undefined) {
      product.active = input.active
    }

    if (input.cost_usd !== undefined) {
      product.costUsd = input.cost_usd.toFixed(4)
    } else if (product.formulaId) {
      product.costUsd = await this.calcularCostoFormulaPersistible(product)
    }

    const effectiveCostUsd = Number(product.costUsd)
    const warning = this.buildCostWarningIfNeeded(product, effectiveCostUsd)
    if (warning) {
      costWarnings.push(warning)
    }

    await db.transaction(async (trx) => {
      product.useTransaction(trx)
      await product.save()

      if (input.sizes !== undefined && !product.formulaId) {
        const normalizedSizes = this.normalizeSizesInput(input.sizes)
        await this.replaceSizesEnTrx(product, normalizedSizes, trx)
        if (normalizedSizes.length > 0) {
          const total = normalizedSizes.reduce((sum, item) => sum + item.stock_quantity, 0)
          product.stockQuantity = total.toFixed(3)
        } else if (input.stock_quantity !== undefined) {
          product.stockQuantity = input.stock_quantity.toFixed(3)
        }
        await product.save()
      }

      await product.load('sizes', (q) => q.orderBy('size', 'asc'))
    })

    return { product, costWarnings }
  }

  async reemplazarTallas(id: number, sizes: CatalogProductSizeInput[]): Promise<CatalogProduct> {
    const product = await this.obtener(id)

    if (product.formulaId) {
      throw new ProductoCatalogoStockFormulaException()
    }

    const normalizedSizes = this.normalizeSizesInput(sizes)

    return db.transaction(async (trx) => {
      product.useTransaction(trx)
      await this.replaceSizesEnTrx(product, normalizedSizes, trx)
      const total = normalizedSizes.reduce((sum, item) => sum + item.stock_quantity, 0)
      product.stockQuantity = total.toFixed(3)
      await product.save()
      await product.load('sizes', (q) => q.orderBy('size', 'asc'))
      return product
    })
  }

  async eliminar(id: number): Promise<{ id: number; modo: 'soft' | 'hard' }> {
    return db.transaction(async (trx) => {
      const product = await CatalogProduct.query({ client: trx })
        .where('id', id)
        .forUpdate()
        .first()

      if (!product) {
        throw new ProductoCatalogoNoEncontradoException()
      }

      await this.detachFromDraftOrders(id, trx)
      await this.assertNoPedidosActivos(id, trx)

      if (await this.tieneHistorialVinculado(id, trx)) {
        product.active = false
        product.useTransaction(trx)
        await product.save()
        return { id, modo: 'soft' }
      }

      if (product.imagePath) {
        await drive
          .use()
          .delete(product.imagePath)
          .catch(() => undefined)
      }

      product.useTransaction(trx)
      await product.delete()
      return { id, modo: 'hard' }
    })
  }

  async recalcularCosto(id: number): Promise<CatalogProductUpdateResult> {
    const product = await this.obtener(id)

    if (!product.formulaId) {
      return { product, costWarnings: [] }
    }

    const costUsd = await this.formulaService.calcularCosto(Number(product.formulaId))
    product.costUsd = costUsd.toFixed(4)
    const costWarnings: CostWarning[] = []
    const warning = this.buildCostWarningIfNeeded(product, costUsd)
    if (warning) {
      costWarnings.push(warning)
    }
    await product.save()
    return { product, costWarnings }
  }

  async aplicarMargenGanancia(input: ApplyProfitMarginInput): Promise<ApplyProfitMarginResult> {
    const multiplier = 1 + input.profit_margin_percent / 100
    const skipped: ApplyProfitMarginSkipped[] = []
    let updatedCount = 0

    await db.transaction(async (trx) => {
      for (const productId of input.catalog_product_ids) {
        const product = await CatalogProduct.query({ client: trx })
          .where('id', productId)
          .forUpdate()
          .first()

        if (!product) {
          skipped.push({ id: productId, name: `#${productId}`, reason: 'NOT_FOUND' })
          continue
        }

        const costUsd = product.costUsd
        if (!costUsd || Number(costUsd) <= 0) {
          skipped.push({
            id: Number(product.id),
            name: product.name,
            reason: 'NO_COST_PRICE',
          })
          continue
        }

        const newSalePrice = (Number(costUsd) * multiplier).toFixed(4)
        const currentSalePrice = product.salePriceUsd

        if (currentSalePrice !== null && currentSalePrice !== newSalePrice) {
          product.previousSalePriceUsd = currentSalePrice
        } else if (currentSalePrice === null) {
          product.previousSalePriceUsd = null
        }

        product.salePriceUsd = newSalePrice
        product.useTransaction(trx)
        await product.save()
        updatedCount++
      }
    })

    return { updatedCount, skipped }
  }

  async guardarImagen(id: number, file: MultipartFile): Promise<CatalogProduct> {
    const product = await this.obtener(id)
    const extension = file.extname?.toLowerCase() ?? 'bin'
    const key = `catalog-products/${id}/${randomUUID()}.${extension}`

    if (product.imagePath) {
      await drive
        .use()
        .delete(product.imagePath)
        .catch(() => undefined)
    }

    await file.moveToDisk(key)
    product.imagePath = key
    await product.save()

    return product
  }

  async eliminarImagen(id: number): Promise<CatalogProduct> {
    const product = await this.obtener(id)

    if (product.imagePath) {
      await drive
        .use()
        .delete(product.imagePath)
        .catch(() => undefined)
      product.imagePath = null
      await product.save()
    }

    return product
  }

  async obtenerImagen(id: number): Promise<CatalogProductImageDownload> {
    const product = await this.obtener(id)

    if (!product.imagePath) {
      throw new ProductoCatalogoNoEncontradoException()
    }

    const exists = await drive.use().exists(product.imagePath)
    if (!exists) {
      product.imagePath = null
      await product.save()
      throw new ArchivoImagenNoDisponibleException()
    }

    const bytes = await drive.use().getBytes(product.imagePath)
    const extension = product.imagePath.split('.').pop()?.toLowerCase() ?? 'bin'
    const contentType = IMAGE_MIME[extension] ?? 'application/octet-stream'
    const filename = `catalog-${id}.${extension}`

    return { bytes, contentType, filename }
  }

  async resolverCostosUsdEnLote(products: CatalogProduct[]): Promise<Map<number, string>> {
    const costByProductId = new Map<number, string>()
    const costByFormulaId = new Map<number, string>()

    for (const product of products) {
      const productId = Number(product.id)

      if (!product.formulaId) {
        costByProductId.set(productId, this.normalizeCostUsd(product.costUsd))
        continue
      }

      const formulaId = Number(product.formulaId)
      let formulaCost = costByFormulaId.get(formulaId)

      if (formulaCost === undefined) {
        try {
          const formulaCostValue = await this.formulaService.calcularCosto(formulaId)
          formulaCost = formulaCostValue.toFixed(4)
        } catch {
          formulaCost = this.normalizeCostUsd(product.costUsd)
        }
        costByFormulaId.set(formulaId, formulaCost)
      }

      costByProductId.set(productId, formulaCost)
    }

    return costByProductId
  }

  async resolverCostoUsd(product: CatalogProduct): Promise<string> {
    const resolved = await this.resolverCostosUsdEnLote([product])
    return resolved.get(Number(product.id)) ?? this.normalizeCostUsd(product.costUsd)
  }

  private async calcularCostoFormulaPersistible(product: CatalogProduct): Promise<string> {
    const costUsd = await this.formulaService.calcularCosto(Number(product.formulaId))
    return costUsd.toFixed(4)
  }

  private normalizeOptionalText(value: string | null | undefined): string | null {
    if (value === null || value === undefined) {
      return null
    }

    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  }

  private normalizeCostUsd(value: string | null | undefined): string {
    const parsed = Number(value ?? 0)
    return Number.isFinite(parsed) ? parsed.toFixed(4) : '0.0000'
  }

  private buildCostWarningIfNeeded(product: CatalogProduct, costUsd: number): CostWarning | null {
    const salePrice = Number(product.salePriceUsd)
    if (salePrice > 0 && salePrice < costUsd) {
      return {
        product_id: Number(product.id),
        product_name: product.name,
        sale_price_usd: product.salePriceUsd,
        cost_usd: costUsd.toFixed(4),
      }
    }
    return null
  }

  private async assertFormulaExiste(formulaId: number) {
    const formula = await Formula.find(formulaId)
    if (!formula) {
      throw new FormulaNoEncontradaException()
    }
  }

  private async detachFromDraftOrders(
    catalogProductId: number,
    trx: TransactionClientContract
  ) {
    const draftLines = await OrderLine.query({ client: trx })
      .where('catalogProductId', catalogProductId)
      .whereHas('order', (query) => {
        query.where('status', 'DRAFT')
      })

    if (draftLines.length === 0) {
      return
    }

    const orderIds = [...new Set(draftLines.map((line) => Number(line.orderId)))]

    await OrderLine.query({ client: trx })
      .whereIn(
        'id',
        draftLines.map((line) => Number(line.id))
      )
      .delete()

    for (const orderId of orderIds) {
      const remaining = await OrderLine.query({ client: trx }).where('orderId', orderId)
      const order = await Order.query({ client: trx }).where('id', orderId).first()

      if (!order) {
        continue
      }

      order.useTransaction(trx)

      if (remaining.length === 0) {
        await order.delete()
        continue
      }

      let total = 0
      let qty = 0
      for (const line of remaining) {
        total += Number(line.subtotalUsd)
        qty += Number(line.quantity)
      }

      order.totalPrice = total.toFixed(4)
      order.totalQuantity = Math.max(0, Math.ceil(qty))
      await order.save()
    }
  }

  private async assertNoPedidosActivos(
    catalogProductId: number,
    trx: TransactionClientContract
  ) {
    const activo = await OrderLine.query({ client: trx })
      .where('catalogProductId', catalogProductId)
      .whereHas('order', (query) => {
        query.whereIn('status', ['CONFIRMED', 'IN_PRODUCTION'])
      })
      .first()

    if (activo) {
      throw new ProductoCatalogoEnPedidosActivosException()
    }
  }

  private async tieneHistorialVinculado(
    catalogProductId: number,
    trx: TransactionClientContract
  ): Promise<boolean> {
    const tables = [
      'sale_lines',
      'order_lines',
      'product_inventory_movements',
      'purchase_items',
    ] as const

    for (const table of tables) {
      const row = await db
        .from(table)
        .where('catalog_product_id', catalogProductId)
        .count('* as total')
        .useTransaction(trx)
        .first()

      if (Number(row?.total ?? 0) > 0) {
        return true
      }
    }

    return false
  }

  private normalizeSizesInput(sizes: CatalogProductSizeInput[]): CatalogProductSizeInput[] {
    const seen = new Set<string>()
    const normalized: CatalogProductSizeInput[] = []

    for (const item of sizes) {
      const size = item.size.trim()
      if (!size) {
        continue
      }

      const key = size.toLowerCase()
      if (seen.has(key)) {
        throw new ProductoTallaDuplicadaException(size)
      }
      seen.add(key)

      normalized.push({
        size,
        stock_quantity: Math.max(0, Number(item.stock_quantity) || 0),
      })
    }

    return normalized
  }

  private async replaceSizesEnTrx(
    product: CatalogProduct,
    sizes: CatalogProductSizeInput[],
    trx: TransactionClientContract
  ) {
    await CatalogProductSize.query({ client: trx })
      .where('catalogProductId', Number(product.id))
      .delete()

    for (const item of sizes) {
      await CatalogProductSize.create(
        {
          catalogProductId: Number(product.id),
          size: item.size,
          stockQuantity: item.stock_quantity.toFixed(4),
        },
        { client: trx }
      )
    }
  }
}
