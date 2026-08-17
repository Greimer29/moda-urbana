import { Download, Loader2 } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useActiveCategoriesQuery } from '@/features/categories/hooks/use-categories'
import { useDisplayCurrency } from '@/features/currencies/context/display-currency-context'
import { InventoryReportFilters } from '@/features/reports/components/inventory-report-filters'
import { InventoryReportTable } from '@/features/reports/components/inventory-report-table'
import { useInventoryReportQuery } from '@/features/reports/hooks/use-inventory-report'
import {
  applyInventoryFiltersToSearchParams,
  inventoryFilterSummary,
  inventoryFiltersToQueryParams,
  parseInventoryFiltersFromSearchParams,
} from '@/features/reports/inventory-report-search-params'
import {
  applyPeriodToSearchParams,
  parsePeriodFromSearchParams,
  periodLabelFromState,
} from '@/features/reports/report-period'
import { reportUi } from '@/features/reports/report-ui'
import { getInventoryReport } from '@/features/reports/services/inventory-report-service'
import { getApiErrorMessage } from '@/lib/api-error'
import { cn } from '@/lib/utils'

export function InventoryReportPanel() {
  const { formatFromUsd } = useDisplayCurrency()
  const [searchParams, setSearchParams] = useSearchParams()
  const [exporting, setExporting] = useState(false)

  const period = useMemo(() => parsePeriodFromSearchParams(searchParams), [searchParams])
  const filters = useMemo(
    () => parseInventoryFiltersFromSearchParams(searchParams),
    [searchParams]
  )

  const queryParams = useMemo(
    () => inventoryFiltersToQueryParams(filters, period),
    [filters, period]
  )

  const { data, isLoading, isError, error } = useInventoryReportQuery(queryParams)
  const { data: categories = [] } = useActiveCategoriesQuery()

  const syncSearchParams = useCallback(
    (next: { filters?: typeof filters; period?: typeof period }) => {
      let params = applyPeriodToSearchParams(
        new URLSearchParams(searchParams),
        next.period ?? period
      )
      params = applyInventoryFiltersToSearchParams(params, next.filters ?? filters)
      params.set('vista', 'inventario')
      setSearchParams(params, { replace: true })
    },
    [searchParams, period, filters, setSearchParams]
  )

  async function handleExport() {
    setExporting(true)
    try {
      const exportData = await getInventoryReport({ ...queryParams, export: true, page: 1 })
      const { exportInventorySnapshotExcel } = await import(
        '@/features/reports/utils/export-inventory-excel'
      )
      await exportInventorySnapshotExcel(
        exportData.rows,
        inventoryFilterSummary(filters, periodLabelFromState(period)),
        (amount) => formatFromUsd(Number(amount ?? 0))
      )
    } finally {
      setExporting(false)
    }
  }

  const periodLabel = periodLabelFromState(period)
  const meta = data?.meta

  return (
    <div className="space-y-5 md:space-y-6">
      <InventoryReportFilters
        filters={filters}
        period={period}
        categories={categories}
        onFiltersChange={(nextFilters) => syncSearchParams({ filters: nextFilters })}
        onPeriodChange={(nextPeriod) => syncSearchParams({ period: nextPeriod })}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className={reportUi.muted}>
          {meta ? `${meta.total} filas · Página ${meta.current_page} de ${meta.last_page}` : ' '}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={reportUi.btnGhost}
          disabled={exporting || isLoading}
          onClick={() => void handleExport()}
        >
          {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          Exportar Excel
        </Button>
      </div>

      {isLoading ? (
        <div
          className={cn(
            reportUi.panel,
            'flex items-center justify-center gap-2 py-20 text-sm text-neutral-400'
          )}
        >
          <Loader2 className="size-4 animate-spin" />
          Cargando inventario…
        </div>
      ) : isError ? (
        <div className={reportUi.error}>{getApiErrorMessage(error)}</div>
      ) : (
        <>
          <InventoryReportTable rows={data?.rows ?? []} />

          {meta && meta.last_page > 1 ? (
            <div className="flex items-center justify-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={meta.current_page <= 1}
                onClick={() =>
                  syncSearchParams({ filters: { ...filters, page: meta.current_page - 1 } })
                }
              >
                Anterior
              </Button>
              <span className={reportUi.muted}>
                Página {meta.current_page} de {meta.last_page}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={meta.current_page >= meta.last_page}
                onClick={() =>
                  syncSearchParams({ filters: { ...filters, page: meta.current_page + 1 } })
                }
              >
                Siguiente
              </Button>
            </div>
          ) : null}
        </>
      )}

      {filters.movementPeriodEnabled ? (
        <p className={reportUi.muted}>Período de movimientos: {periodLabel}</p>
      ) : null}
    </div>
  )
}
