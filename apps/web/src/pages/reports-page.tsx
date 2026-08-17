import { BarChart3, CalendarDays, Package } from 'lucide-react'
import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AccountStatementPanel } from '@/features/reports/components/account-statement-panel'
import { InventoryReportPanel } from '@/features/reports/components/inventory-report-panel'
import type { ReportsHubTab } from '@/features/reports/constants'
import {
  applyPeriodToSearchParams,
  parsePeriodFromSearchParams,
  periodLabelFromState,
} from '@/features/reports/report-period'
import { reportUi } from '@/features/reports/report-ui'
import { cn } from '@/lib/utils'

const HUB_TABS: Array<{ id: ReportsHubTab; label: string }> = [
  { id: 'financiero', label: 'Reportes financieros' },
  { id: 'inventario', label: 'Inventario' },
]

function parseReportsHubTab(searchParams: URLSearchParams): ReportsHubTab {
  return searchParams.get('vista') === 'inventario' ? 'inventario' : 'financiero'
}

export function ReportsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = useMemo(() => parseReportsHubTab(searchParams), [searchParams])
  const periodLabel = useMemo(
    () => periodLabelFromState(parsePeriodFromSearchParams(searchParams)),
    [searchParams]
  )

  const setActiveTab = useCallback(
    (tab: ReportsHubTab) => {
      const params = applyPeriodToSearchParams(new URLSearchParams(searchParams), parsePeriodFromSearchParams(searchParams))
      if (tab === 'inventario') {
        params.set('vista', 'inventario')
      } else {
        params.delete('vista')
      }
      setSearchParams(params, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  const isInventory = activeTab === 'inventario'

  return (
    <div
      className={cn(
        reportUi.page,
        '-m-4 flex min-h-full flex-col gap-5 p-4 md:-m-6 md:gap-6 md:p-6'
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className={reportUi.pillTrack}>
            {HUB_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={activeTab === tab.id ? reportUi.pillActive : reportUi.pillInactive}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <h1 className={`${reportUi.title} mt-4`}>
            {isInventory ? 'Inventario' : 'Estado de cuenta'}
          </h1>
          <p className={`${reportUi.subtitle} mt-2 max-w-xl`}>
            {isInventory
              ? 'Stock actual de productos desglosado por talla, con acceso al historial de movimientos.'
              : 'Ingresos, egresos y balance consolidado a partir de ventas, compras y gastos.'}
          </p>
        </div>

        <div className={cn(reportUi.panel, 'flex items-center gap-2 px-4 py-2.5 shadow-none')}>
          {isInventory ? (
            <Package className="size-4 text-neutral-500" />
          ) : (
            <CalendarDays className="size-4 text-neutral-500" />
          )}
          {!isInventory ? (
            <span className="text-sm capitalize text-neutral-700">{periodLabel}</span>
          ) : (
            <span className="inline-flex items-center gap-2 text-sm text-neutral-700">
              <BarChart3 className="size-4 text-[#0d3d2e]" />
              Stock actual
            </span>
          )}
        </div>
      </header>

      {isInventory ? <InventoryReportPanel /> : <AccountStatementPanel />}
    </div>
  )
}
