import {
  INVENTORY_UNIT_OPTIONS,
  type InventoryUnit,
  inventoryUnitAbrev,
  inventoryUnitLabel,
} from '@/lib/inventory-units'

export type ProductSaleUnit = InventoryUnit

export const PRODUCT_SALE_UNITS = INVENTORY_UNIT_OPTIONS

export const PRODUCT_SALE_UNIT_LABELS = Object.fromEntries(
  INVENTORY_UNIT_OPTIONS.map((u) => [u.value, u.label])
) as Record<ProductSaleUnit, string>

export const PRODUCT_SALE_UNIT_ABREV = Object.fromEntries(
  INVENTORY_UNIT_OPTIONS.map((u) => [u.value, u.value])
) as Record<ProductSaleUnit, string>

export function productSaleUnitLabel(unit: string) {
  return inventoryUnitLabel(unit)
}

export function productSaleUnitAbrev(unit: string) {
  return inventoryUnitAbrev(unit)
}

export const PAYMENT_METHODS = [
  { value: 'CASH_USD', label: 'Efectivo USD' },
  { value: 'CASH_BS', label: 'Efectivo Bs' },
  { value: 'TRANSFER', label: 'Transferencia' },
  { value: 'MOBILE_PAYMENT', label: 'Pago móvil' },
  { value: 'ZELLE', label: 'Zelle' },
  { value: 'BINANCE', label: 'Binance' },
] as const

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]['value']

export function catalogImageUrl(productId: number) {
  const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3333'
  return `${apiUrl}/api/v1/catalog-products/${productId}/image`
}

export function formatUsd(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') {
    return '0.00'
  }
  return Number(value).toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function categoryLabel(category: string) {
  return category
}

export function paymentMethodLabel(method: string) {
  return PAYMENT_METHODS.find((m) => m.value === method)?.label ?? method
}
