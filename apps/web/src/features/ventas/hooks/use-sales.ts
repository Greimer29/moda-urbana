import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createSale, getSale, listSales } from '@/features/ventas/services/sales-service'
import type { CreateSaleInput, SaleListParams } from '@/features/ventas/types'
import { invalidateSalesFinancials } from '@/lib/query-invalidation'

export function useSalesQuery(params: SaleListParams = {}) {
  return useQuery({
    queryKey: ['sales', params],
    queryFn: () => listSales(params),
  })
}

export function useSaleQuery(id: number | undefined) {
  return useQuery({
    queryKey: ['sales', id],
    queryFn: () => getSale(id!),
    enabled: id !== undefined,
  })
}

export function useCreateSaleMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateSaleInput) => createSale(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sales'] })
      invalidateSalesFinancials(queryClient)
    },
  })
}

export function useVentasSummaryQuery() {
  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  return useQuery({
    queryKey: ['ventas-summary', monthStart],
    queryFn: async () => {
      const salesData = await listSales({ date_from: monthStart, perPage: 1, page: 1 })
      const totalMonth = salesData.meta.total
      return { salesCountMonth: totalMonth }
    },
  })
}
