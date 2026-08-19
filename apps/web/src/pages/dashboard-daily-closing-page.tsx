import { ArrowLeft, Download, Loader2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DisplayMoneyFromUsd } from '@/features/currencies/components/display-money'
import { useDailyClosingQuery } from '@/features/reports/hooks/use-reports'
import type { DailyClosingExpenseItem } from '@/features/reports/types'
import { getApiErrorMessage } from '@/lib/api-error'
import { todayIsoDate } from '@/lib/app-timezone'
import { cn } from '@/lib/utils'

function formatBusinessDateLabel(date: string) {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('es-VE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatConfirmedTime(value: string | null) {
  if (!value) return null
  return new Date(value).toLocaleTimeString('es-VE', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function expenseKindLabel(item: DailyClosingExpenseItem) {
  return item.kind === 'machine_expense' ? 'Gasto máquina' : 'Gasto empresa'
}

function SummaryMetric({
  label,
  amountUsd,
  detail,
}: {
  label: string
  amountUsd: string
  detail?: string
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <p className="text-muted-foreground text-sm">{label}</p>
      <DisplayMoneyFromUsd amountUsd={amountUsd} className="mt-1 text-xl font-semibold text-neutral-900" />
      {detail ? <p className="text-muted-foreground mt-1 text-xs">{detail}</p> : null}
    </div>
  )
}

export function DashboardDailyClosingPage() {
  const defaultDate = useMemo(() => todayIsoDate(), [])
  const [selectedDate, setSelectedDate] = useState(defaultDate)
  const [exporting, setExporting] = useState(false)
  const { data, isLoading, isError, error, isFetching } = useDailyClosingQuery(selectedDate)

  async function handleExport() {
    if (!data) return

    setExporting(true)
    try {
      const { exportDailyClosingExcel } = await import(
        '@/features/reports/utils/export-daily-closing-excel'
      )
      await exportDailyClosingExcel(data)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-2">
        <Button variant="ghost" size="sm" className="-ml-2 w-fit" asChild>
          <Link to="/dashboard">
            <ArrowLeft />
            Dashboard
          </Link>
        </Button>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Cierre del día</h1>
            <p className="text-muted-foreground text-sm capitalize">
              {formatBusinessDateLabel(selectedDate)}
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-end">
            <div className="flex w-full max-w-xs flex-col gap-1.5">
              <Label htmlFor="daily-closing-date">Fecha</Label>
              <Input
                id="daily-closing-date"
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              disabled={exporting || isLoading || !data}
              onClick={() => void handleExport()}
            >
              {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              Exportar Excel
            </Button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground flex items-center justify-center gap-2 py-24 text-sm">
          <Loader2 className="size-4 animate-spin" />
          Cargando cierre del día…
        </div>
      ) : isError ? (
        <p className="text-destructive text-sm whitespace-pre-line">{getApiErrorMessage(error)}</p>
      ) : !data ? (
        <p className="text-muted-foreground py-24 text-center text-sm">
          No se recibió información del cierre. Intentá actualizar la página.
        </p>
      ) : (
        <>
          <Card className="border-violet-200 bg-gradient-to-br from-violet-50 to-white">
            <CardHeader>
              <CardTitle className="text-base">Resultado operativo</CardTitle>
              <CardDescription>
                Ventas contado + abonos cobrados − gastos del día
                {isFetching ? ' · actualizando…' : null}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DisplayMoneyFromUsd
                amountUsd={data.summary.operating_net_usd}
                className="text-3xl font-bold text-violet-950"
              />
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryMetric label="Ventas netas" amountUsd={data.summary.net_sales_usd} detail={`${data.summary.tickets_count} tickets · ${data.summary.units_sold} uds.`} />
            <SummaryMetric label="Ventas contado" amountUsd={data.summary.cash_sales_usd} />
            <SummaryMetric label="Ventas crédito" amountUsd={data.summary.credit_sales_usd} detail={`${data.summary.credit_orders_count} pedidos`} />
            <SummaryMetric label="Abonos cobrados" amountUsd={data.summary.payments_total_usd} detail={`${data.summary.payments_count} pagos`} />
            <SummaryMetric label="Devoluciones" amountUsd={data.summary.returns_usd} />
            <SummaryMetric label="Ganancia" amountUsd={data.summary.profit_usd} />
            <SummaryMetric label="Gastos" amountUsd={data.summary.expenses_total_usd} detail={`${data.summary.expenses_count} registros`} />
            <SummaryMetric label="Ventas brutas" amountUsd={data.summary.gross_sales_usd} />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tickets del día</CardTitle>
                <CardDescription>{data.orders.length} ventas con monto neto</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.orders.length === 0 ? (
                  <p className="text-muted-foreground py-8 text-center text-sm">No hay ventas este día.</p>
                ) : (
                  data.orders.map((order) => {
                    const buyer = order.customer_name ?? order.guest_name ?? 'Cliente'
                    const time = formatConfirmedTime(order.confirmed_at)

                    return (
                      <div
                        key={order.id}
                        className="flex items-start justify-between gap-4 rounded-xl border border-neutral-200 p-4"
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-neutral-900">{order.code}</p>
                            <span
                              className={cn(
                                'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                                order.payment_type === 'CREDIT'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              )}
                            >
                              {order.payment_type === 'CREDIT' ? 'Crédito' : 'Contado'}
                            </span>
                          </div>
                          <p className="text-muted-foreground text-sm">{buyer}</p>
                          {time ? <p className="text-muted-foreground text-xs">{time}</p> : null}
                        </div>
                        <DisplayMoneyFromUsd
                          amountUsd={order.net_total_usd}
                          className="shrink-0 text-sm font-semibold text-neutral-900"
                        />
                      </div>
                    )
                  })
                )}
              </CardContent>
            </Card>

            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Abonos</CardTitle>
                  <CardDescription>Cobranza registrada en la fecha</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.payments.length === 0 ? (
                    <p className="text-muted-foreground py-8 text-center text-sm">No hay abonos este día.</p>
                  ) : (
                    data.payments.map((payment) => (
                      <div
                        key={payment.id}
                        className="flex items-start justify-between gap-4 rounded-xl border border-neutral-200 p-4"
                      >
                        <div className="min-w-0 space-y-1">
                          <p className="font-medium text-neutral-900">{payment.customer_name}</p>
                          {payment.order_code ? (
                            <p className="text-muted-foreground text-sm">Pedido {payment.order_code}</p>
                          ) : null}
                          {payment.account_name ? (
                            <p className="text-muted-foreground text-xs">Cuenta: {payment.account_name}</p>
                          ) : null}
                        </div>
                        <DisplayMoneyFromUsd
                          amountUsd={payment.amount_usd}
                          className="shrink-0 text-sm font-semibold text-neutral-900"
                        />
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Gastos</CardTitle>
                  <CardDescription>Egresos del día</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.expenses.length === 0 ? (
                    <p className="text-muted-foreground py-8 text-center text-sm">No hay gastos este día.</p>
                  ) : (
                    data.expenses.map((item) => (
                      <div
                        key={`${item.kind}-${item.id}`}
                        className="flex items-start justify-between gap-4 rounded-xl border border-neutral-200 p-4"
                      >
                        <div className="min-w-0 space-y-1">
                          <span
                            className={cn(
                              'inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                              item.kind === 'machine_expense'
                                ? 'bg-teal-50 text-teal-800'
                                : 'bg-slate-100 text-slate-700'
                            )}
                          >
                            {expenseKindLabel(item)}
                          </span>
                          <p className="font-medium text-neutral-900">{item.description}</p>
                          {item.machine_name ? (
                            <p className="text-muted-foreground text-sm">{item.machine_name}</p>
                          ) : null}
                        </div>
                        <DisplayMoneyFromUsd
                          amountUsd={item.amount_usd}
                          className="shrink-0 text-sm font-semibold text-neutral-900"
                        />
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
