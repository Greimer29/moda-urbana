import type { CustomerAccountStatement } from '@/features/customers/types'

const BILLABLE_STATUSES = new Set(['CONFIRMED', 'IN_PRODUCTION', 'DELIVERED'])

export type CustomerAccountSummary = {
  facturado: {
    montoUsd: number
    operacionesTotal: number
    creditoMontoUsd: number
    creditoOperaciones: number
    pagadoUsd: number
    creditoSaldoUsd: number
  }
  abonado: {
    montoUsd: number
    operaciones: number
    porcentajeSobreFacturado: number
  }
  pendiente: {
    montoUsd: number
    porcentajeSobreFacturado: number
  }
}

function orderTotalUsd(order: CustomerAccountStatement['orders'][number]) {
  return Number(order.totalUsd ?? 0)
}

function orderPaidUsd(order: CustomerAccountStatement['orders'][number]) {
  const total = orderTotalUsd(order)
  const balance = Number(order.balanceUsd ?? 0)
  return Math.max(0, total - balance)
}

function isBillable(order: CustomerAccountStatement['orders'][number]) {
  return BILLABLE_STATUSES.has(order.status)
}

function isCredit(order: CustomerAccountStatement['orders'][number]) {
  return order.paymentType === 'CREDIT'
}

export function computeCustomerAccountSummary(
  orders: CustomerAccountStatement['orders'],
  payments: CustomerAccountStatement['payments']
): CustomerAccountSummary {
  const billable = orders.filter(isBillable)
  const billableCredit = billable.filter(isCredit)

  const montoFacturado = billable.reduce((sum, order) => sum + orderTotalUsd(order), 0)
  const montoAbonado = billable.reduce((sum, order) => sum + orderPaidUsd(order), 0)
  const creditoSaldoUsd = billableCredit.reduce(
    (sum, order) => sum + Number(order.balanceUsd ?? 0),
    0
  )
  const creditoMontoUsd = billableCredit.reduce((sum, order) => sum + orderTotalUsd(order), 0)

  const abonadoOperaciones =
    payments.length + billable.filter((order) => !isCredit(order)).length

  const porcentajeAbonado = montoFacturado > 0 ? (montoAbonado / montoFacturado) * 100 : 0
  const porcentajePendiente = montoFacturado > 0 ? (creditoSaldoUsd / montoFacturado) * 100 : 0

  return {
    facturado: {
      montoUsd: montoFacturado,
      operacionesTotal: orders.length,
      creditoMontoUsd,
      creditoOperaciones: billableCredit.length,
      pagadoUsd: montoAbonado,
      creditoSaldoUsd,
    },
    abonado: {
      montoUsd: montoAbonado,
      operaciones: abonadoOperaciones,
      porcentajeSobreFacturado: porcentajeAbonado,
    },
    pendiente: {
      montoUsd: creditoSaldoUsd,
      porcentajeSobreFacturado: porcentajePendiente,
    },
  }
}
