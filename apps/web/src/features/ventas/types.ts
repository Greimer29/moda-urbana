import type { PaymentMethod, ProductSaleUnit } from '@/features/ventas/constants'
import type { PaginationMeta } from '@/features/orders/types'

export type { PaymentMethod, ProductSaleUnit }

export type CatalogProduct = {
  id: number
  name: string
  description: string | null
  category: string
  sale_unit: ProductSaleUnit
  formula_id: number | null
  image_path: string | null
  sale_price_usd: string
  previous_sale_price_usd: string | null
  cost_usd: string
  stock_quantity: string
  stock_source?: 'manual' | 'formula'
  minimum_stock?: string
  active: boolean
  sold_qty?: number
  created_at: string
  updated_at: string
  formula?: CatalogFormulaRef | null
  movimientos?: ProductInventoryMovement[]
}

export type ProductInventoryMovement = {
  id: number
  type: 'PURCHASE_IN' | 'SALE_OUT' | 'MANUAL_ADJUSTMENT' | 'MANUAL_CARGO' | 'MANUAL_DESCARGO' | 'REVERSAL_ADJUSTMENT'
  quantity: string
  note: string | null
  purchase_item_id: number | null
  order_id: number | null
  sale_id: number | null
  created_at: string
}

export type CatalogFormulaRef = {
  id: number
  name: string
  description: string | null
  active: boolean
  materials?: CatalogFormulaItem[]
  products_count?: number
  created_at: string
  updated_at: string
}

export type CatalogFormulaItem = {
  id: number
  material_id: number
  quantity: string
  material?: {
    id: number
    code: string
    name: string
    unit: string
    last_purchase_price_usd: string | null
  }
}

export type CatalogProductInput = {
  name: string
  description?: string
  category: string
  sale_unit?: ProductSaleUnit
  sale_price_usd: number
  cost_usd?: number
  formula_id?: number | null
  stock_quantity?: number
}

export type CatalogListParams = {
  page?: number
  perPage?: number
  search?: string
  category?: string
  active?: boolean
  sortBy?: 'name' | 'most_sold'
  sortDir?: 'asc' | 'desc'
}

export type CatalogListResponse = {
  data: {
    catalog_products: CatalogProduct[]
    meta: PaginationMeta
  }
}

export type CatalogProductResponse = {
  data: {
    catalog_product: CatalogProduct
  }
}

export type CatalogFormulaResponse = {
  data: {
    formula: CatalogFormulaItem[]
  }
}

export type SaleLine = {
  id: number
  catalog_product_id: number | null
  material_id: number | null
  description: string
  quantity: string
  unit_price_usd: string
  subtotal_usd: string
  catalog_product?: { id: number; name: string } | null
  material?: { id: number; name: string; code: string } | null
}

export type Sale = {
  id: number
  code: string
  customer_id: number | null
  guest_name: string | null
  payment_method: PaymentMethod
  total_usd: string
  total_bs: string | null
  usd_rate: string | null
  status: string
  sold_at: string
  customer?: { id: number; name: string; type: string; active: boolean } | null
  lines?: SaleLine[]
  created_at: string
  updated_at: string
}

export type CreateSaleInput = {
  customer_id?: number
  guest_name?: string
  payment_method: PaymentMethod
  usd_rate?: number
  lines: {
    catalog_product_id?: number
    material_id?: number
    quantity: number
    unit_price_usd: number
  }[]
}

export type SaleListParams = {
  page?: number
  perPage?: number
  customer_id?: number
  date_from?: string
  date_to?: string
}

export type SaleListResponse = {
  data: {
    sales: Sale[]
    meta: PaginationMeta
  }
}

export type SaleResponse = {
  data: {
    sale: Sale
  }
}

export type CartItem = {
  key: string
  type: 'catalog' | 'material'
  id: number
  name: string
  quantity: number
  unit_price_usd: number
}

export type OrderLine = {
  id: number
  order_id: number
  catalog_product_id: number
  quantity: string
  unit_price_usd: string
  subtotal_usd: string
  catalog_product?: CatalogProduct
}

export type OrderBudget = {
  lines: {
    id: number
    catalog_product_id: number
    product_name: string
    quantity: string
    unit_price_usd: string
    subtotal_usd: string
  }[]
  total_usd: string
}
