import type { InventoryReportParams } from '@/features/reports/types/inventory-report'

export type InventoryReportFilterState = {
  search: string
  category: string
  activeOnly: boolean
  lowStock: boolean
  hideZero: boolean
  sortBy: NonNullable<InventoryReportParams['sort_by']>
  sortDir: NonNullable<InventoryReportParams['sort_dir']>
  page: number
}

export function defaultInventoryFilterState(): InventoryReportFilterState {
  return {
    search: '',
    category: '',
    activeOnly: true,
    lowStock: false,
    hideZero: false,
    sortBy: 'id',
    sortDir: 'asc',
    page: 1,
  }
}

export function parseInventoryFiltersFromSearchParams(
  searchParams: URLSearchParams
): InventoryReportFilterState {
  return {
    search: searchParams.get('inv_search') ?? '',
    category: searchParams.get('inv_category') ?? '',
    activeOnly: searchParams.get('inv_active') !== '0',
    lowStock: searchParams.get('inv_low_stock') === '1',
    hideZero: searchParams.get('inv_hide_zero') === '1',
    sortBy: (searchParams.get('inv_sort_by') as InventoryReportFilterState['sortBy']) ?? 'id',
    sortDir: (searchParams.get('inv_sort_dir') as InventoryReportFilterState['sortDir']) ?? 'asc',
    page: Number(searchParams.get('inv_page') ?? '1') || 1,
  }
}

export function applyInventoryFiltersToSearchParams(
  params: URLSearchParams,
  filters: InventoryReportFilterState
) {
  const setOrDelete = (key: string, value: string | null) => {
    if (value) params.set(key, value)
    else params.delete(key)
  }

  setOrDelete('inv_search', filters.search.trim() || null)
  setOrDelete('inv_category', filters.category || null)
  setOrDelete('inv_active', filters.activeOnly ? null : '0')
  setOrDelete('inv_low_stock', filters.lowStock ? '1' : null)
  setOrDelete('inv_hide_zero', filters.hideZero ? '1' : null)
  setOrDelete('inv_sort_by', filters.sortBy === 'id' ? null : filters.sortBy)
  setOrDelete('inv_sort_dir', filters.sortDir === 'asc' ? null : filters.sortDir)
  setOrDelete('inv_page', filters.page > 1 ? String(filters.page) : null)

  params.delete('inv_mov_period')
  params.delete('month')
  params.delete('range')
  params.delete('day')
  params.delete('date')
  params.delete('from')
  params.delete('to')

  return params
}

export function inventoryFiltersToQueryParams(
  filters: InventoryReportFilterState
): InventoryReportParams {
  return {
    search: filters.search.trim() || undefined,
    category: filters.category || undefined,
    active: filters.activeOnly ? true : undefined,
    low_stock: filters.lowStock || undefined,
    hide_zero: filters.hideZero || undefined,
    sort_by: filters.sortBy,
    sort_dir: filters.sortDir,
    page: filters.page,
    per_page: 30,
  }
}

export function buildInventoryListHref(searchParams: URLSearchParams) {
  const params = new URLSearchParams(searchParams)
  params.set('vista', 'inventario')
  return params.toString() ? `/reportes?${params.toString()}` : '/reportes?vista=inventario'
}

export function inventoryFilterSummary(filters: InventoryReportFilterState): string {
  const parts: string[] = ['Inventario global']

  if (filters.search.trim()) parts.push(`Búsqueda: ${filters.search.trim()}`)
  if (filters.category) parts.push(`Categoría: ${filters.category}`)
  if (filters.activeOnly) parts.push('Solo activos')
  if (filters.lowStock) parts.push('Solo bajo stock')
  if (filters.hideZero) parts.push('Ocultar sin stock')
  parts.push(`Orden: ${filters.sortBy} ${filters.sortDir}`)

  return parts.join(' · ')
}
