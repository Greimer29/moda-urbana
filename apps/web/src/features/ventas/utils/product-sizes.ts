import type { CatalogProduct, CatalogProductSize } from '@/features/ventas/types'

export function productHasSizes(
  product: Pick<CatalogProduct, 'has_sizes' | 'sizes'>
): boolean {
  return Boolean(product.has_sizes || (product.sizes && product.sizes.length > 0))
}

export function formatSizeStockSummary(
  sizes: CatalogProductSize[] | undefined,
  options?: { onlyPositive?: boolean }
): string {
  if (!sizes?.length) {
    return ''
  }

  const onlyPositive = options?.onlyPositive ?? false
  const rows = onlyPositive
    ? sizes.filter((item) => Number(item.stock_quantity) > 0)
    : sizes

  return rows
    .map((item) => {
      const qty = Number(item.stock_quantity)
      const qtyLabel = Number.isInteger(qty)
        ? String(qty)
        : qty.toLocaleString('es-VE', { maximumFractionDigits: 3 })
      return `${item.size}×${qtyLabel}`
    })
    .join(' · ')
}
