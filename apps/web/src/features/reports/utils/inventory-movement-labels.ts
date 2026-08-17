import type { ProductMovementType } from '@/features/reports/types/inventory-report'

export const INVENTORY_MOVEMENT_LABELS: Record<ProductMovementType, string> = {
  PURCHASE_IN: 'Compra',
  SALE_OUT: 'Venta',
  MANUAL_CARGO: 'Cargo',
  MANUAL_DESCARGO: 'Descargo',
  MANUAL_ADJUSTMENT: 'Ajuste',
  REVERSAL_ADJUSTMENT: 'Devolución',
}

export const INVENTORY_MOVEMENT_FILTER_OPTIONS: Array<{
  key: ProductMovementType
  label: string
}> = [
  { key: 'PURCHASE_IN', label: 'Compra' },
  { key: 'SALE_OUT', label: 'Venta' },
  { key: 'MANUAL_CARGO', label: 'Cargo' },
  { key: 'MANUAL_DESCARGO', label: 'Descargo' },
  { key: 'MANUAL_ADJUSTMENT', label: 'Ajuste' },
  { key: 'REVERSAL_ADJUSTMENT', label: 'Devolución' },
]

export const DEFAULT_INVENTORY_MOVEMENT_TYPES: ProductMovementType[] =
  INVENTORY_MOVEMENT_FILTER_OPTIONS.map((option) => option.key)
