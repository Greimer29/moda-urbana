import { Loader2 } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useDisplayCurrency } from '@/features/currencies/context/display-currency-context'
import { ReportMovementsTable } from '@/features/reports/components/report-movements-table'
import { ReportBreakdownChart } from '@/features/reports/components/report-breakdown-chart'
import { ReportFiltersToolbar } from '@/features/reports/components/report-filters-toolbar'
import { ReportFlowChart } from '@/features/reports/components/report-flow-chart'
import { ReportKpiGrid } from '@/features/reports/components/report-kpi-grid'
import { formatFecha } from '@/features/reports/constants'
import {
  applyPeriodToSearchParams,
  parsePeriodFromSearchParams,
} from '@/features/reports/report-period'
import { buildReportSearchParams } from '@/features/reports/report-search-params'
import { reportUi } from '@/features/reports/report-ui'
import { useAccountStatementQuery } from '@/features/reports/hooks/use-reports'
import { getApiErrorMessage } from '@/lib/api-error'

export function AccountStatementPanel() {
  const { displayCurrency } = useDisplayCurrency()
  const [searchParams, setSearchParams] = useSearchParams()
  const period = useMemo(() => parsePeriodFromSearchParams(searchParams), [searchParams])
  const accountId = useMemo(() => {
    if (searchParams.get('unassigned') === '1') return null
    const raw = searchParams.get('account_id')
    return raw ? Number(raw) : null
  }, [searchParams])
  const unassignedOnly = searchParams.get('unassigned') === '1'
  const [types, setTypes] = useState({
    sales: true,
    purchases: true,
    expenses: true,
    machine_expenses: true,
  })

  const syncSearchParams = useCallback(
    (next: {
      period?: typeof period
      accountId?: number | null
      unassignedOnly?: boolean
    }) => {
      const params = applyPeriodToSearchParams(
        new URLSearchParams(searchParams),
        next.period ?? period
      )

      params.delete('account_id')
      params.delete('unassigned')

      const nextUnassigned = next.unassignedOnly ?? unassignedOnly
      const nextAccountId = next.accountId !== undefined ? next.accountId : accountId

      if (nextUnassigned) {
        params.set('unassigned', '1')
      } else if (nextAccountId != null) {
        params.set('account_id', String(nextAccountId))
      }

      if (displayCurrency) {
        params.set('display_currency', displayCurrency)
      }

      setSearchParams(params, { replace: true })
    },
    [searchParams, period, unassignedOnly, accountId, displayCurrency, setSearchParams]
  )

  const queryParams = useMemo(() => {
    const selectedTypes = (
      Object.entries(types) as Array<[keyof typeof types, boolean]>
    )
      .filter(([, enabled]) => enabled)
      .map(([key]) => key)

    const periodParams =
      period.mode === 'day' && period.date
        ? { from: period.date, to: period.date }
        : period.mode === 'range'
          ? { from: period.from || undefined, to: period.to || undefined }
          : { month: period.month }

    return {
      ...periodParams,
      account_id: unassignedOnly ? undefined : accountId ?? undefined,
      unassigned: unassignedOnly || undefined,
      display_currency: displayCurrency,
      types: selectedTypes,
    }
  }, [period, accountId, unassignedOnly, displayCurrency, types])

  const { data, isLoading, isError, error } = useAccountStatementQuery(queryParams)

  const filterSearch = useMemo(
    () =>
      buildReportSearchParams({
        period,
        accountId,
        unassignedOnly,
        displayCurrency,
      }),
    [period, accountId, unassignedOnly, displayCurrency]
  )

  const periodLabel = data
    ? `${formatFecha(data.period.from)} — ${formatFecha(data.period.to)}`
    : period.mode === 'day' && period.date
      ? formatFecha(period.date)
      : period.mode === 'range' && period.from && period.to
        ? `${formatFecha(period.from)} — ${formatFecha(period.to)}`
        : monthLabel(period.month)

  return (
    <div className="space-y-5">
      <ReportFiltersToolbar
        period={period}
        accountId={accountId}
        unassignedOnly={unassignedOnly}
        types={types}
        onPeriodChange={(nextPeriod) => syncSearchParams({ period: nextPeriod })}
        onAccountIdChange={(value) => syncSearchParams({ accountId: value, unassignedOnly: false })}
        onUnassignedOnlyChange={(value) =>
          syncSearchParams({ unassignedOnly: value, accountId: value ? null : accountId })
        }
        onTypesChange={setTypes}
      />

      {isLoading ? (
        <div
          className={`${reportUi.panel} flex items-center justify-center gap-2 py-20 text-sm text-neutral-400`}
        >
          <Loader2 className="size-4 animate-spin" />
          Generando reporte…
        </div>
      ) : isError ? (
        <div className={reportUi.error}>{getApiErrorMessage(error)}</div>
      ) : !data ? (
        <div className={reportUi.panel}>
          <p className={`${reportUi.body} px-5 py-12 text-center`}>
            No se recibió información del reporte. Intentá actualizar la página o cambiar el período.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <p className={reportUi.muted}>
              Período: <span className="font-medium text-neutral-800">{periodLabel}</span>
            </p>
            <p className={reportUi.muted}>
              Visualización: <span className="font-medium text-neutral-800">{displayCurrency}</span>
              {' · '}
              Tasas:{' '}
              {Object.entries(data.summary.rates)
                .map(([code, rate]) => `${code}=${rate}`)
                .join(' · ')}
            </p>
          </div>

          <ReportKpiGrid summary={data.summary} filterSearch={filterSearch} />

          <div className="grid gap-5 xl:grid-cols-5">
            <div className="xl:col-span-3">
              <ReportFlowChart movements={data.movements} />
            </div>
            <div className="xl:col-span-2">
              <ReportBreakdownChart summary={data.summary} />
            </div>
          </div>

          <ReportMovementsTable
            movements={data.movements}
            subtitle={`${data.movements.length} registro${data.movements.length === 1 ? '' : 's'} en el período`}
            showPeriodHint={data.movements.length === 0}
          />
        </>
      )}
    </div>
  )
}

function monthLabel(isoMonth: string) {
  const [year, month] = isoMonth.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  return date.toLocaleDateString('es-VE', { month: 'long', year: 'numeric' })
}
