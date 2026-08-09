import type { CatalogProduct } from '@/features/ventas/types'

export type CartStockLine = {
  product: CatalogProduct
  quantity: number
  sizeId?: number | null
  size?: string | null
}

export function isProductStockLow(product: CatalogProduct): boolean {
  const stock = Number(product.stock_quantity)
  const minimum = Number(product.minimum_stock ?? 0)
  return stock <= 0 || (minimum > 0 && stock < minimum)
}

function availableStockForLine(line: CartStockLine): number {
  if (line.sizeId && line.product.sizes?.length) {
    const size = line.product.sizes.find((item) => item.id === line.sizeId)
    return Number(size?.stock_quantity ?? 0)
  }
  return Number(line.product.stock_quantity)
}

export function cartLineHasStockIssue(line: CartStockLine): boolean {
  const stock = availableStockForLine(line)
  if (stock <= 0) {
    return true
  }
  return line.quantity > stock
}

export function cartHasStockIssues(lines: CartStockLine[]): boolean {
  return lines.some(cartLineHasStockIssue)
}
