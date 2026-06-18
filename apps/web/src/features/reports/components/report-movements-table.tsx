import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { CreditPurchaseBadge } from '@/features/purchases/components/credit-purchase-badge'
import { useDisplayCurrency } from '@/features/currencies/context/display-currency-context'
import {
  MOVEMENT_TYPE_LABELS,
  formatFecha,
} from '@/features/reports/constants'
import {
  formatReportDisplayAmount,
  formatReportOriginalAmount,
} from '@/features/reports/utils/format-report-amount'
import { movementTheme, reportUi } from '@/features/reports/report-ui'
import type { AccountStatementMovement, AccountStatementMovementType } from '@/features/reports/types'
import { cn } from '@/lib/utils'

function movementLink(type: AccountStatementMovementType, id: number) {
  switch (type) {
    case 'sale':
      return `/ventas/${id}`
    case 'purchase':
      return `/purchases/${id}`
    case 'machine_expense':
      return `/machines`
    default:
      return null
  }
}

function PurchasePaymentCell({ movement }: { movement: AccountStatementMovement }) {
  if (movement.type !== 'purchase') {
    return <span className={reportUi.muted}>—</span>
  }

  if (movement.isCreditPurchase) {
    return (
      <CreditPurchaseBadge
        creditDueDate={movement.creditDueDate ?? null}
        reportStatus={movement.creditReportStatus}
      />
    )
  }

  return (
    <span className="inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-700">
      Contado
    </span>
  )
}

type ReportMovementsTableProps = {
  movements: AccountStatementMovement[]
  title?: string
  subtitle?: string
}

export function ReportMovementsTable({
  movements,
  title = 'Historial de movimientos',
  subtitle,
}: ReportMovementsTableProps) {
  const { displayCurrency, formatFromUsd, formatNative } = useDisplayCurrency()

  const meta =
    subtitle ??
    `${movements.length} registro${movements.length === 1 ? '' : 's'} · mostrado en ${displayCurrency}`

  return (
    <div className={cn(reportUi.panel, 'overflow-hidden p-0')}>
      <div className={cn('flex items-center justify-between gap-3 border-b px-5 py-4', reportUi.divider)}>
        <div>
          <h3 className={reportUi.sectionTitle}>{title}</h3>
          <p className={reportUi.muted}>{meta}</p>
        </div>
      </div>

      {movements.length === 0 ? (
        <p className={`${reportUi.body} px-5 py-12 text-center`}>
          No hay movimientos para los filtros seleccionados.
        </p>
      ) : (
        <div className="scrollbar-subtle overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={cn('border-b bg-neutral-50 text-left text-xs', reportUi.divider, reportUi.muted)}>
                <th className="px-5 py-3 font-semibold">Concepto</th>
                <th className="px-5 py-3 font-semibold">Fecha</th>
                <th className="px-5 py-3 font-semibold">Pago</th>
                <th className="px-5 py-3 font-semibold">Original</th>
                <th className="px-5 py-3 font-semibold">Cuenta</th>
                <th className="px-5 py-3 text-right font-semibold">Monto</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((movement) => {
                const href = movementLink(movement.type, movement.referenceId)
                const theme = movementTheme[movement.type]

                return (
                  <tr
                    key={`${movement.type}-${movement.id}`}
                    className={cn('border-b bg-white transition-colors last:border-b-0', reportUi.divider, reportUi.rowHover)}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'flex size-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold',
                            theme.badge
                          )}
                        >
                          {MOVEMENT_TYPE_LABELS[movement.type].slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-neutral-900">
                            {href ? (
                              <Link
                                to={href}
                                className="inline-flex items-center gap-1 hover:text-neutral-600 hover:underline"
                              >
                                {movement.label}
                                <ArrowUpRight className="size-3 opacity-50" />
                              </Link>
                            ) : (
                              movement.label
                            )}
                          </p>
                          <p className={reportUi.muted}>{MOVEMENT_TYPE_LABELS[movement.type]}</p>
                        </div>
                      </div>
                    </td>
                    <td className={`px-5 py-4 whitespace-nowrap ${reportUi.muted}`}>
                      {formatFecha(movement.date)}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <PurchasePaymentCell movement={movement} />
                    </td>
                    <td className={`px-5 py-4 tabular-nums whitespace-nowrap ${reportUi.body}`}>
                      {formatReportOriginalAmount(
                        movement.amountNative,
                        movement.currencyCode,
                        formatNative
                      )}
                    </td>
                    <td className={`px-5 py-4 ${reportUi.muted}`}>
                      {movement.account?.name ?? '—'}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span
                        className={cn(
                          'tabular-nums',
                          movement.isIncome ? reportUi.income : reportUi.expense
                        )}
                      >
                        {movement.isIncome ? '+' : '−'}{' '}
                        {formatReportDisplayAmount(movement.amountUsd, formatFromUsd)}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
