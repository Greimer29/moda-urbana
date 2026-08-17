import type {
  InventoryMovementsParams,
  InventoryMovementsResponse,
  InventoryReportParams,
  InventoryReportResponse,
} from '@/features/reports/types/inventory-report'
import { api } from '@/lib/api'

function buildInventoryQueryParams(params: InventoryReportParams) {
  const search = new URLSearchParams()

  if (params.search) search.set('search', params.search)
  if (params.category) search.set('category', params.category)
  if (params.active !== undefined) search.set('active', String(params.active))
  if (params.low_stock) search.set('low_stock', 'true')
  if (params.hide_zero) search.set('hide_zero', 'true')
  if (params.sort_by) search.set('sort_by', params.sort_by)
  if (params.sort_dir) search.set('sort_dir', params.sort_dir)
  if (params.page) search.set('page', String(params.page))
  if (params.per_page) search.set('per_page', String(params.per_page))
  if (params.export) search.set('export', 'true')

  return search
}

function buildMovementsQueryParams(params: InventoryMovementsParams) {
  const search = new URLSearchParams()

  if (params.from) search.set('from', params.from)
  if (params.to) search.set('to', params.to)
  if (params.month) search.set('month', params.month)
  if (params.types?.length) search.set('types', params.types.join(','))
  if (params.page) search.set('page', String(params.page))
  if (params.per_page) search.set('per_page', String(params.per_page))
  if (params.export) search.set('export', 'true')

  return search
}

export async function getInventoryReport(params: InventoryReportParams = {}) {
  const query = buildInventoryQueryParams(params)
  const url = query.size > 0 ? `/reports/inventory?${query.toString()}` : '/reports/inventory'
  const { data } = await api.get<InventoryReportResponse>(url)

  return data.data
}

export async function getInventoryMovements(
  productId: number,
  params: InventoryMovementsParams = {}
) {
  const query = buildMovementsQueryParams(params)
  const url =
    query.size > 0
      ? `/reports/inventory/${productId}/movements?${query.toString()}`
      : `/reports/inventory/${productId}/movements`
  const { data } = await api.get<InventoryMovementsResponse>(url)

  return data.data
}
