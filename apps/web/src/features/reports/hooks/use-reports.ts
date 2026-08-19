import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import { getAccountStatement, getDailyClosing } from '@/features/reports/services/report-service'
import type { AccountStatementParams } from '@/features/reports/types'

export const reportsQueryKey = ['reports'] as const
export const dailyClosingQueryKey = ['reports', 'daily-closing'] as const

export function useAccountStatementQuery(
  params: AccountStatementParams,
  options?: Pick<UseQueryOptions<Awaited<ReturnType<typeof getAccountStatement>>>, 'enabled'>
) {
  return useQuery({
    queryKey: [...reportsQueryKey, 'account-statement', params],
    queryFn: () => getAccountStatement(params),
    enabled: options?.enabled ?? true,
  })
}

export function useDailyClosingQuery(date?: string) {
  return useQuery({
    queryKey: [...dailyClosingQueryKey, date ?? 'today'],
    queryFn: () => getDailyClosing(date),
  })
}
