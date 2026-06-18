import { api } from '@/lib/api'
import type {
  CreateSaleInput,
  Sale,
  SaleListParams,
  SaleListResponse,
  SaleResponse,
} from '@/features/ventas/types'

export async function listSales(params: SaleListParams = {}) {
  const { data } = await api.get<SaleListResponse>('/sales', {
    params: {
      page: params.page,
      per_page: params.perPage,
      customer_id: params.customer_id,
      date_from: params.date_from,
      date_to: params.date_to,
    },
  })

  return data.data
}

export async function getSale(id: number) {
  const { data } = await api.get<SaleResponse>(`/sales/${id}`)
  return data.data.sale
}

export async function createSale(payload: CreateSaleInput) {
  const { data } = await api.post<SaleResponse>('/sales', payload)
  return data.data.sale
}

export type { Sale }
