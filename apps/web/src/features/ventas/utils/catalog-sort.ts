import type { CatalogListParams } from '@/features/ventas/types'

export type CatalogSortBy = NonNullable<CatalogListParams['sortBy']>
export type CatalogSortDir = NonNullable<CatalogListParams['sortDir']>

export type CatalogSortOption = {
  value: string
  label: string
  sortBy: CatalogSortBy
  sortDir: CatalogSortDir
}

/** Opciones de orden para listados de catálogo (Productos / Ventas). */
export const CATALOG_SORT_OPTIONS: CatalogSortOption[] = [
  { value: 'name:asc', label: 'Descripción A-Z', sortBy: 'name', sortDir: 'asc' },
  { value: 'name:desc', label: 'Descripción Z-A', sortBy: 'name', sortDir: 'desc' },
  { value: 'id:asc', label: 'Código ascendente', sortBy: 'id', sortDir: 'asc' },
  { value: 'id:desc', label: 'Código descendente', sortBy: 'id', sortDir: 'desc' },
  { value: 'sale_price:asc', label: 'Precio: menor a mayor', sortBy: 'sale_price', sortDir: 'asc' },
  {
    value: 'sale_price:desc',
    label: 'Precio: mayor a menor',
    sortBy: 'sale_price',
    sortDir: 'desc',
  },
  { value: 'most_sold:desc', label: 'Más vendidos', sortBy: 'most_sold', sortDir: 'desc' },
]

export function catalogSortValue(sortBy: CatalogSortBy, sortDir: CatalogSortDir): string {
  return `${sortBy}:${sortDir}`
}

export function parseCatalogSortValue(
  value: string,
  fallback: { sortBy: CatalogSortBy; sortDir: CatalogSortDir }
): { sortBy: CatalogSortBy; sortDir: CatalogSortDir } {
  const match = CATALOG_SORT_OPTIONS.find((option) => option.value === value)
  if (!match) return fallback
  return { sortBy: match.sortBy, sortDir: match.sortDir }
}
