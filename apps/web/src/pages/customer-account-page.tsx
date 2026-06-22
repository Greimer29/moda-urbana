import { ArrowLeft, Loader2, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CustomerAccountSummaryCards } from '@/features/customers/components/customer-account-summary-cards'
import { CustomerPaymentFormDialog } from '@/features/customers/components/customer-payment-form-dialog'
import { useCustomerAccountStatementQuery } from '@/features/customers/hooks/use-customers'
import { computeCustomerAccountSummary } from '@/features/customers/utils/customer-account-summary'
import { DisplayMoneyFromUsd } from '@/features/currencies/components/display-money'
import { OrderEstadoBadge } from '@/features/orders/components/order-status-badge'
import { formatFecha } from '@/features/orders/constants'
import type { OrderEstado } from '@/features/orders/types'
import { CreditPurchaseBadge } from '@/features/purchases/components/credit-purchase-badge'
import { getApiErrorMessage } from '@/lib/api-error'

const BILLABLE_STATUSES = new Set<OrderEstado>(['CONFIRMED', 'IN_PRODUCTION', 'DELIVERED'])

function creditEstado(creditDueDate: string | null, balanceUsd: string) {
  if (Number(balanceUsd) <= 0) return { label: 'Pagada', className: 'bg-emerald-100 text-emerald-800' }
  if (!creditDueDate) return { label: 'Vigente', className: 'bg-amber-100 text-amber-800' }
  const today = new Date().toISOString().slice(0, 10)
  if (creditDueDate < today) return { label: 'Vencida', className: 'bg-red-100 text-red-800' }
  return { label: 'Vigente', className: 'bg-amber-100 text-amber-800' }
}

export function CustomerAccountPage() {
  const { id } = useParams<{ id: string }>()
  const customerId = Number(id)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [paymentOrderId, setPaymentOrderId] = useState<number | undefined>()
  const [paymentMaxUsd, setPaymentMaxUsd] = useState<number | undefined>()

  const { data, isLoading, isError, error, refetch } = useCustomerAccountStatementQuery(customerId)

  const summary = useMemo(
    () => (data ? computeCustomerAccountSummary(data.orders, data.payments) : null),
    [data]
  )

  if (isLoading) {
    return (
      <div className="text-muted-foreground flex items-center justify-center gap-2 py-24 text-sm">
        <Loader2 className="size-4 animate-spin" />
        Cargando estado de cuenta…
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center gap-4 py-24">
        <p className="text-destructive text-sm whitespace-pre-line">{getApiErrorMessage(error)}</p>
        <Button variant="outline" asChild>
          <Link to="/customers">Volver a clientes</Link>
        </Button>
      </div>
    )
  }

  const { customer, orders, payments } = data

  function openPayment(orderId?: number, maxUsd?: number) {
    setPaymentOrderId(orderId)
    setPaymentMaxUsd(maxUsd)
    setPaymentDialogOpen(true)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Button variant="ghost" size="sm" className="-ml-2 w-fit" asChild>
            <Link to="/customers">
              <ArrowLeft />
              Clientes
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">Estado de cuenta</h1>
          <p className="text-muted-foreground text-sm">{customer.name}</p>
          {(customer.creditDays ?? 0) > 0 ? (
            <p className="text-muted-foreground text-xs">
              Plazo de crédito: {customer.creditDays} días
            </p>
          ) : null}
        </div>
        <Button onClick={() => openPayment()}>
          <Plus />
          Registrar abono
        </Button>
      </div>

      <CustomerAccountSummaryCards summary={summary!} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historial de ventas</CardTitle>
          <CardDescription>
            Borradores, confirmados, cancelados y ventas a crédito o contado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <p className="text-muted-foreground text-sm">No hay ventas registradas.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-[880px] text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b text-left">
                    <th className="px-4 py-3 font-medium">Pedido</th>
                    <th className="px-4 py-3 font-medium">Fecha</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 font-medium">Pago</th>
                    <th className="px-4 py-3 font-medium">Vencimiento</th>
                    <th className="px-4 py-3 text-right font-medium">Total</th>
                    <th className="px-4 py-3 text-right font-medium">Saldo</th>
                    <th className="px-4 py-3 text-right font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => {
                    const orderStatus = order.status as OrderEstado
                    const isCreditBillable =
                      order.paymentType === 'CREDIT' && BILLABLE_STATUSES.has(orderStatus)
                    const creditStatus = isCreditBillable
                      ? creditEstado(order.creditDueDate, order.balanceUsd)
                      : null
                    const balance = Number(order.balanceUsd)
                    const canPay = isCreditBillable && balance > 0

                    return (
                      <tr key={order.id} className="border-b last:border-b-0">
                        <td className="px-4 py-3 font-medium">
                          <Link to={`/ventas/${order.id}`} className="hover:underline">
                            {order.code}
                          </Link>
                        </td>
                        <td className="text-muted-foreground px-4 py-3">
                          {formatFecha(order.orderDate)}
                        </td>
                        <td className="px-4 py-3">
                          <OrderEstadoBadge status={orderStatus} />
                        </td>
                        <td className="px-4 py-3">
                          {order.paymentType === 'CREDIT' ? (
                            <CreditPurchaseBadge
                              creditDueDate={order.creditDueDate}
                              reportStatus={
                                creditStatus?.label === 'Vencida'
                                  ? 'overdue'
                                  : creditStatus?.label === 'Pagada'
                                    ? 'settled'
                                    : creditStatus
                                      ? 'pending'
                                      : undefined
                              }
                              compact
                            />
                          ) : (
                            <span className="inline-flex rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700">
                              Contado
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {order.paymentType === 'CREDIT' ? formatFecha(order.creditDueDate) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <DisplayMoneyFromUsd amountUsd={order.totalUsd} size="sm" />
                        </td>
                        <td className="px-4 py-3 text-right">
                          {order.paymentType === 'CREDIT' ? (
                            <DisplayMoneyFromUsd amountUsd={order.balanceUsd} size="sm" />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {canPay ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openPayment(order.id, balance)}
                            >
                              Abonar
                            </Button>
                          ) : null}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Abonos registrados</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-muted-foreground text-sm">No hay abonos registrados.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b text-left">
                    <th className="px-4 py-3 font-medium">Fecha</th>
                    <th className="px-4 py-3 font-medium">Pedido</th>
                    <th className="px-4 py-3 text-right font-medium">Monto</th>
                    <th className="px-4 py-3 font-medium">Nota</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => {
                    const linkedOrder = payment.orderId
                      ? orders.find((order) => order.id === payment.orderId)
                      : null

                    return (
                      <tr key={payment.id} className="border-b last:border-b-0">
                        <td className="px-4 py-3">{formatFecha(payment.date)}</td>
                        <td className="px-4 py-3">
                          {payment.orderId ? (
                            <Link to={`/ventas/${payment.orderId}`} className="hover:underline">
                              {linkedOrder?.code ?? `#${payment.orderId}`}
                            </Link>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <DisplayMoneyFromUsd amountUsd={payment.amountUsd} size="sm" />
                        </td>
                        <td className="text-muted-foreground px-4 py-3">{payment.note ?? '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <CustomerPaymentFormDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        customerId={customerId}
        orderId={paymentOrderId}
        maxAmountUsd={paymentMaxUsd}
        onSuccess={() => void refetch()}
      />
    </div>
  )
}
