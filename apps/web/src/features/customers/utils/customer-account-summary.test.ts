import { describe, expect, it } from 'vitest'
import { computeCustomerAccountSummary } from '@/features/customers/utils/customer-account-summary'
import type { CustomerAccountStatement } from '@/features/customers/types'

type Order = CustomerAccountStatement['orders'][number]

function order(overrides: Partial<Order> & Pick<Order, 'id' | 'code'>): Order {
  return {
    description: 'Pedido',
    status: 'CONFIRMED',
    paymentType: 'CASH',
    orderDate: '2026-01-01',
    confirmedAt: '2026-01-01T12:00:00.000Z',
    totalUsd: '0',
    amountPaidUsd: '0',
    balanceUsd: '0',
    creditDueDate: null,
    ...overrides,
  }
}

describe('computeCustomerAccountSummary', () => {
  it('excludes draft and cancelled from facturado amount but counts all operations', () => {
    const summary = computeCustomerAccountSummary(
      [
        order({ id: 1, code: 'DRAFT', status: 'DRAFT', totalUsd: '100' }),
        order({ id: 2, code: 'CANC', status: 'CANCELLED', totalUsd: '50' }),
        order({ id: 3, code: 'OK', totalUsd: '200', balanceUsd: '0' }),
      ],
      []
    )

    expect(summary.facturado.montoUsd).toBe(200)
    expect(summary.facturado.operacionesTotal).toBe(3)
    expect(summary.facturado.pagadoUsd).toBe(200)
    expect(summary.facturado.creditoSaldoUsd).toBe(0)
  })

  it('treats cash billable order as fully paid', () => {
    const summary = computeCustomerAccountSummary(
      [order({ id: 1, code: 'CASH', totalUsd: '80', balanceUsd: '0' })],
      []
    )

    expect(summary.abonado.montoUsd).toBe(80)
    expect(summary.abonado.operaciones).toBe(1)
    expect(summary.pendiente.montoUsd).toBe(0)
  })

  it('splits credit order into abonado and pendiente segments', () => {
    const summary = computeCustomerAccountSummary(
      [
        order({
          id: 1,
          code: 'CRED',
          paymentType: 'CREDIT',
          totalUsd: '100',
          amountPaidUsd: '40',
          balanceUsd: '60',
        }),
      ],
      [{ id: 1, orderId: 1, amountUsd: '40', date: '2026-01-02', note: null }]
    )

    expect(summary.facturado.montoUsd).toBe(100)
    expect(summary.facturado.pagadoUsd).toBe(40)
    expect(summary.facturado.creditoSaldoUsd).toBe(60)
    expect(summary.facturado.pagadoUsd + summary.facturado.creditoSaldoUsd).toBe(100)
    expect(summary.abonado.operaciones).toBe(1)
    expect(summary.abonado.porcentajeSobreFacturado).toBe(40)
    expect(summary.pendiente.porcentajeSobreFacturado).toBe(60)
  })

  it('returns zero percentages when there are no billable orders', () => {
    const summary = computeCustomerAccountSummary(
      [order({ id: 1, code: 'DRAFT', status: 'DRAFT', totalUsd: '50' })],
      []
    )

    expect(summary.facturado.montoUsd).toBe(0)
    expect(summary.abonado.porcentajeSobreFacturado).toBe(0)
    expect(summary.pendiente.porcentajeSobreFacturado).toBe(0)
  })
})
