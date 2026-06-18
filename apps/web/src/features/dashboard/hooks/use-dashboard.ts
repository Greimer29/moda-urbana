import { useQuery } from '@tanstack/react-query'
import {
  getDailyProductSales,
  getDashboardOverview,
} from '@/features/dashboard/services/dashboard-service'
import type { DashboardChartMode } from '@/features/dashboard/types'

export const dashboardOverviewQueryKey = ['dashboard', 'overview'] as const
export const dashboardQueryKey = ['dashboard'] as const
export const dailyProductSalesQueryKey = ['dashboard', 'daily-product-sales'] as const

export function useDashboardOverviewQuery(chart: DashboardChartMode = 'weekly') {
  return useQuery({
    queryKey: [...dashboardOverviewQueryKey, chart],
    queryFn: () => getDashboardOverview(chart),
  })
}

export function useDailyProductSalesQuery() {
  return useQuery({
    queryKey: dailyProductSalesQueryKey,
    queryFn: () => getDailyProductSales(),
  })
}
