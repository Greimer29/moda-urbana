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
import { reportUi } from '@/features/reports/report-ui'
import { getInventoryReport } from '@/features/reports/services/inventory-report-service'
import { getApiErrorMessage } from '@/lib/api-error'
import { cn } from '@/lib/utils'

export function InventoryReportPanel() {
  const { formatFromUsd } = useDisplayCurrency()
  const [searchParams, setSearchParams] = useSearchParams()
  const [exporting, setExporting] = useState(false)

  const filters = useMemo(
    () => parseInventoryFiltersFromSearchParams(searchParams),
    [searchParams]
  )

  const queryParams = useMemo(() => inventoryFiltersToQueryParams(filters), [filters])

  const { data, isLoading, isError, error } = useInventoryReportQuery(queryParams)
  const { data: categories = [] } = useActiveCategoriesQuery()

  const syncFilters = useCallback(
    (nextFilters: typeof filters) => {
      const params = applyInventoryFiltersToSearchParams(new URLSearchParams(searchParams), nextFilters)
      params.set('vista', 'inventario')
      setSearchParams(params, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  async function handleExport() {
    setExporting(true)
    try {
      const exportData = await getInventoryReport({ ...queryParams, export: true, page: 1 })
      const { exportInventorySnapshotExcel } = await import(
        '@/features/reports/utils/export-inventory-excel'
      )
      await exportInventorySnapshotExcel(
        exportData.products,
        inventoryFilterSummary(filters),
        (amount) => formatFromUsd(Number(amount ?? 0))
      )
    } finally {
      setExporting(false)
    }
  }

  const meta = data?.meta

  return (
    <div className="space-y-5 md:space-y-6">
      <InventoryReportFilters
        filters={filters}
        categories={categories}
        onFiltersChange={syncFilters}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className={reportUi.muted}>
          {meta ? `${meta.total} productos · Página ${meta.current_page} de ${meta.last_page}` : ' '}
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
          <InventoryReportTable products={data?.products ?? []} />

          {meta && meta.last_page > 1 ? (
            <div className="flex items-center justify-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={meta.current_page <= 1}
                onClick={() => syncFilters({ ...filters, page: meta.current_page - 1 })}
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
                onClick={() => syncFilters({ ...filters, page: meta.current_page + 1 })}
              >
                Siguiente
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
