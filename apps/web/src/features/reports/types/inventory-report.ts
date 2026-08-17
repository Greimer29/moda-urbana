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

export type InventoryReportMeta = {
  total: number
  per_page: number
  current_page: number
  last_page: number
}

export type InventoryReportParams = {
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

export type InventoryReportResponse = {
  data: {
    rows: InventoryReportRow[]
    meta: InventoryReportMeta
  }
}

export type ProductMovementType =
  | 'PURCHASE_IN'
  | 'SALE_OUT'
  | 'MANUAL_ADJUSTMENT'
  | 'MANUAL_CARGO'
  | 'MANUAL_DESCARGO'
  | 'REVERSAL_ADJUSTMENT'

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

export type InventoryMovementsParams = {
  from?: string
  to?: string
  month?: string
  types?: ProductMovementType[]
  page?: number
  per_page?: number
  export?: boolean
}

export type InventoryMovementsResponse = {
  data: {
    product: InventoryProductSummary
    movements: InventoryMovementRow[]
    meta: InventoryReportMeta
    period?: { from: string; to: string }
  }
}
