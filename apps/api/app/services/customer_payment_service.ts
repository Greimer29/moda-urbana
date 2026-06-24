import PagoClienteExcedeSaldoException from '#exceptions/pago_cliente_excede_saldo_exception'
import ClienteNoEncontradoException from '#exceptions/cliente_no_encontrado_exception'
import OrderNoEncontradoException from '#exceptions/pedido_no_encontrado_exception'
import Customer from '#models/customer'
import CustomerPayment from '#models/customer_payment'
import Order from '#models/order'
import AccountService from '#services/account_service'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

export type CustomerPaymentInput = {
  customer_id: number
  order_id?: number | null
  account_id?: number | null
  amount_usd: number
  date: string
  note?: string
}

export type CustomerAccountStatement = {
  customer: Customer
  orders: Order[]
  payments: CustomerPayment[]
  saldoPendienteUsd: string
}

const BILLABLE_ORDER_STATUSES = ['CONFIRMED', 'IN_PRODUCTION', 'DELIVERED'] as const

export default class CustomerPaymentService {
  private accountService = new AccountService()

  async registrar(input: CustomerPaymentInput): Promise<CustomerPayment> {
    const customer = await Customer.find(input.customer_id)
    if (!customer) {
      throw new ClienteNoEncontradoException()
    }

    if (input.account_id) {
      await this.accountService.assertActiva(input.account_id)
    }

    return db.transaction(async (trx) => {
      let remaining = input.amount_usd

      if (input.order_id) {
        const order = await Order.query({ client: trx })
          .where('id', input.order_id)
          .where('customerId', input.customer_id)
          .forUpdate()
          .first()

        if (!order) {
          throw new OrderNoEncontradoException()
        }

        const balance = Number(order.balanceUsd)
        const applied = Math.min(remaining, balance)
        order.amountPaidUsd = (Number(order.amountPaidUsd) + applied).toFixed(4)
        order.balanceUsd = Math.max(0, balance - applied).toFixed(4)
        order.useTransaction(trx)
        await order.save()
        remaining -= applied
      } else {
        const orders = await Order.query({ client: trx })
          .where('customerId', input.customer_id)
          .where('balanceUsd', '>', 0)
          .whereIn('status', ['CONFIRMED', 'IN_PRODUCTION', 'DELIVERED'])
          .orderBy('creditDueDate', 'asc')
          .orderBy('id', 'asc')
          .forUpdate()

        for (const order of orders) {
          if (remaining <= 0) break
          const balance = Number(order.balanceUsd)
          const applied = Math.min(remaining, balance)
          order.amountPaidUsd = (Number(order.amountPaidUsd) + applied).toFixed(4)
          order.balanceUsd = Math.max(0, balance - applied).toFixed(4)
          order.useTransaction(trx)
          await order.save()
          remaining -= applied
        }
      }

      if (remaining > 0.0001) {
        throw new PagoClienteExcedeSaldoException()
      }

      const appliedAmount = input.amount_usd - remaining

      return CustomerPayment.create(
        {
          customerId: input.customer_id,
          orderId: input.order_id ?? null,
          accountId: input.account_id ?? null,
          amountUsd: appliedAmount.toFixed(4),
          date: DateTime.fromISO(input.date),
          note: input.note?.trim() || null,
        },
        { client: trx }
      )
    })
  }

  async listarPorCliente(customerId: number) {
    return CustomerPayment.query()
      .where('customerId', customerId)
      .preload('order')
      .orderBy('date', 'desc')
      .orderBy('id', 'desc')
  }

  async estadoCuenta(customerId: number): Promise<CustomerAccountStatement> {
    const customer = await Customer.find(customerId)
    if (!customer) {
      throw new ClienteNoEncontradoException()
    }

    const orders = await Order.query()
      .where('customerId', customerId)
      .orderBy('confirmedAt', 'desc')
      .orderBy('createdAt', 'desc')
      .orderBy('id', 'desc')

    const payments = await this.listarPorCliente(customerId)

    const saldo = orders
      .filter(
        (order) =>
          order.paymentType === 'CREDIT' &&
          BILLABLE_ORDER_STATUSES.includes(order.status as (typeof BILLABLE_ORDER_STATUSES)[number])
      )
      .reduce((sum, order) => sum + Number(order.balanceUsd), 0)

    return {
      customer,
      orders,
      payments,
      saldoPendienteUsd: saldo.toFixed(4),
    }
  }
}
