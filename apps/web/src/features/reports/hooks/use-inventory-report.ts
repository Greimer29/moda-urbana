import { useQuery } from '@tanstack/react-query'
import {
  getInventoryMovements,
  getInventoryReport,
} from '@/features/reports/services/inventory-report-service'
import type {
  InventoryMovementsParams,
  InventoryReportParams,
} from '@/features/reports/types/inventory-report'
import { reportsQueryKey } from '@/features/reports/hooks/use-reports'

export function useInventoryReportQuery(params: InventoryReportParams) {
  return useQuery({
    queryKey: [...reportsQueryKey, 'inventory', params],
    queryFn: () => getInventoryReport(params),
  })
}

export function useInventoryMovementsQuery(
  productId: number,
  params: InventoryMovementsParams,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: [...reportsQueryKey, 'inventory-movements', productId, params],
    queryFn: () => getInventoryMovements(productId, params),
    enabled: options?.enabled ?? true,
  })
}
