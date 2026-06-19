import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { DashboardCreditTable } from '@/features/dashboard/components/dashboard-credit-table'
import { DashboardDailySalesCard } from '@/features/dashboard/components/dashboard-daily-sales-card'
import { DashboardLowStockList } from '@/features/dashboard/components/dashboard-low-stock-list'
import { DashboardSalesChart } from '@/features/dashboard/components/dashboard-sales-chart'
import { dashboardUi } from '@/features/dashboard/dashboard-ui'
import { useDashboardOverviewQuery } from '@/features/dashboard/hooks/use-dashboard'
import type { DashboardChartMode } from '@/features/dashboard/types'
import { getApiError } from '@/lib/api-error'

function todayLabel() {
  return new Date().toLocaleDateString('es-VE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function DashboardPage() {
  const [chartMode, setChartMode] = useState<DashboardChartMode>('weekly')
  const { data, isLoading, isError, error } = useDashboardOverviewQuery(chartMode)

  return (
    <div className={dashboardUi.page}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Dashboard</h1>
          <p className="text-sm text-neutral-500">Resumen del taller — {todayLabel()}</p>
        </div>
      </div>

      {isError ? <p className="text-destructive text-sm">{getApiError(error).message}</p> : null}

      {isLoading || !data ? (
        <div className="flex justify-center py-24">
          <Loader2 className="text-muted-foreground size-6 animate-spin" />
        </div>
      ) : (
        <>
          <div className={dashboardUi.topGridRow}>
            <div className={dashboardUi.topGridCell}>
              <DashboardDailySalesCard ventas={data.ventasDelDia} ganancia={data.gananciaDelDia} />
            </div>
            <div className={dashboardUi.topGridCell}>
              <DashboardSalesChart
                series={data.ventasSeries}
                mode={chartMode}
                onModeChange={setChartMode}
              />
            </div>
            <div className={dashboardUi.topGridCell}>
              <DashboardLowStockList products={data.bajoStockProductos} />
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <DashboardCreditTable
              title="Créditos clientes"
              description="Saldos pendientes por cobrar"
              rows={data.clientesCredito}
              linkBase="/customers"
              linkSuffix="/cuenta"
              showOrders
            />
            <DashboardCreditTable
              title="Créditos proveedores"
              description="Compras a crédito por cancelar"
              rows={data.proveedoresCredito}
              linkBase="/suppliers"
            />
          </div>
        </>
      )}
    </div>
  )
}
