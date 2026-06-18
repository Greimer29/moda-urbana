import MonedaNoEncontradaException from '#exceptions/moneda_no_encontrada_exception'
import CurrencyService from '#services/currency_service'
import {
  creditPurchaseReportEffectiveDate,
  creditPurchaseReportStatus,
  creditPurchaseVisibleInReport,
} from '#utils/credit_purchase_report'
import Expense from '#models/expense'

import MachineExpense from '#models/machine_expense'

import Order from '#models/order'

import Purchase from '#models/purchase'

import { DateTime } from 'luxon'



export type AccountStatementMovementType =

  | 'sale'

  | 'purchase'

  | 'expense'

  | 'machine_expense'



export type AccountStatementFilters = {

  from?: string

  to?: string

  month?: string

  account_id?: number

  unassigned?: boolean

  types?: Array<'purchases' | 'expenses' | 'machine_expenses' | 'sales'>

  display_currency?: string

}



export type AccountStatementMovement = {

  id: number

  type: AccountStatementMovementType

  date: string

  label: string

  account: { id: number; name: string } | null

  amountNative: string

  currencyCode: string

  amountDisplay: string

  amountUsd: string

  isIncome: boolean

  referenceId: number

  status?: string

  isCreditPurchase?: boolean

  creditDueDate?: string | null

  purchaseDate?: string

  creditOverdue?: boolean

  creditReportStatus?: 'pending' | 'overdue' | 'settled'

}


export type AccountStatementSummary = {

  displayCurrency: string

  salesUsd: string

  purchasesUsd: string

  expensesUsd: string

  machineExpensesUsd: string

  netUsd: string

  sales: string

  purchases: string

  expenses: string

  machineExpenses: string

  net: string

  rates: Record<string, string>

}



export type AccountStatementResult = {

  summary: AccountStatementSummary

  movements: AccountStatementMovement[]

  period: { from: string; to: string }

}



const SALE_STATUSES = ['CONFIRMED', 'IN_PRODUCTION', 'DELIVERED'] as const



export default class ReportService {

  private currencyService = new CurrencyService()



  async estadoCuenta(filters: AccountStatementFilters): Promise<AccountStatementResult> {

    const period = this.resolvePeriod(filters)

    const types = new Set(

      filters.types ?? ['purchases', 'expenses', 'machine_expenses', 'sales']

    )

    const rates = await this.currencyService.getActiveRates()

    const displayCurrency = (filters.display_currency ?? 'USD').toUpperCase()



    if (!rates[displayCurrency]) {
      throw new MonedaNoEncontradaException('La moneda de visualización no está configurada o activa')
    }



    const movements: AccountStatementMovement[] = []



    let salesUsd = 0

    let purchasesUsd = 0

    let expensesUsd = 0

    let machineExpensesUsd = 0



    if (types.has('sales')) {

      const orders = await Order.query()

        .whereIn('status', [...SALE_STATUSES])

        .where('orderDate', '>=', period.from)

        .where('orderDate', '<=', period.to)

        .preload('orderLines')

        .orderBy('orderDate', 'desc')

        .orderBy('id', 'desc')



      for (const order of orders) {

        const { usd, native, currencyCode } = this.resolveOrderSaleAmount(order, rates)

        if (usd <= 0) {

          continue

        }

        salesUsd += usd

        movements.push(

          this.buildMovement({

            id: Number(order.id),

            type: 'sale',

            date: order.orderDate.toISODate()!,

            label: `Venta ${order.code} — ${order.description}`,

            account: null,

            native,

            currencyCode,

            usd,

            displayCurrency,

            rates,

            referenceId: Number(order.id),

            status: order.status,

            isIncome: true,

          })

        )

      }

    }



    if (types.has('purchases')) {

      const query = Purchase.query()

        .where('status', 'CONFIRMED')

        .where((builder) => {

          builder

            .where((cashBuilder) => {

              cashBuilder

                .where('isCredit', false)

                .where('date', '>=', period.from)

                .where('date', '<=', period.to)

            })

            .orWhere((creditBuilder) => {

              creditBuilder

                .where('isCredit', true)

                .whereNotNull('creditDueDate')

                .where('creditDueDate', '<=', period.to)

            })

        })

        .preload('account')

        .orderBy('date', 'desc')

        .orderBy('id', 'desc')



      this.applyAccountFilter(query, filters)



      const purchases = await query



      for (const purchase of purchases) {

        const purchaseDate = purchase.date.toISODate()!

        const creditDueDate = purchase.creditDueDate?.toISODate() ?? null

        const balanceUsd = Number(purchase.balanceUsd ?? 0)

        const reportContext = {

          isCredit: purchase.isCredit,

          purchaseDate,

          creditDueDate,

          balanceUsd,

        }

        if (!creditPurchaseVisibleInReport(reportContext, period)) {

          continue

        }

        const reportDate = creditPurchaseReportEffectiveDate(reportContext)

        const creditStatus = creditPurchaseReportStatus(reportContext)

        const usd = purchase.isCredit

          ? balanceUsd > 0

            ? balanceUsd

            : Number(purchase.totalUsd ?? purchase.totalUsdSnapshot ?? 0) ||

              this.currencyService.toUsd(Number(purchase.totalBs ?? 0), 'VES', rates)

          : Number(purchase.totalUsd ?? purchase.totalUsdSnapshot ?? 0) ||

            this.currencyService.toUsd(Number(purchase.totalBs ?? 0), 'VES', rates)

        const nativeUsd = usd

        purchasesUsd += usd

        movements.push(

          this.buildMovement({

            id: Number(purchase.id),

            type: 'purchase',

            date: reportDate,

            label: `Compra #${purchase.id}${purchase.invoiceNumber ? ` — Factura ${purchase.invoiceNumber}` : ''}`,

            account: purchase.account

              ? { id: Number(purchase.account.id), name: purchase.account.name }

              : null,

            native: nativeUsd,

            currencyCode: 'USD',

            usd,

            displayCurrency,

            rates,

            referenceId: Number(purchase.id),

            status: purchase.status,

            isIncome: false,

            isCreditPurchase: Boolean(purchase.isCredit),

            creditDueDate,

            purchaseDate,

            creditOverdue: creditStatus === 'overdue',

            creditReportStatus: creditStatus ?? undefined,

          })

        )

      }

    }


    if (types.has('expenses')) {

      const query = Expense.query()

        .where('date', '>=', period.from)

        .where('date', '<=', period.to)

        .preload('account')

        .orderBy('date', 'desc')

        .orderBy('id', 'desc')



      this.applyAccountFilter(query, filters)



      const expenses = await query



      for (const expense of expenses) {

        const currencyCode = expense.currencyCode ?? 'USD'

        const native = Number(expense.amountUsd ?? 0)

        const usd = this.currencyService.toUsd(native, currencyCode, rates)

        expensesUsd += usd

        movements.push(

          this.buildMovement({

            id: Number(expense.id),

            type: 'expense',

            date: expense.date.toISODate()!,

            label: expense.description,

            account: expense.account

              ? { id: Number(expense.account.id), name: expense.account.name }

              : null,

            native,

            currencyCode,

            usd,

            displayCurrency,

            rates,

            referenceId: Number(expense.id),

            isIncome: false,

          })

        )

      }

    }



    if (types.has('machine_expenses')) {

      const query = MachineExpense.query()

        .where('date', '>=', period.from)

        .where('date', '<=', period.to)

        .preload('account')

        .preload('machine')

        .orderBy('date', 'desc')

        .orderBy('id', 'desc')



      this.applyAccountFilter(query, filters)



      const machineExpenses = await query



      for (const expense of machineExpenses) {

        const currencyCode = expense.currencyCode ?? 'VES'

        const native = Number(expense.amount ?? 0)

        const usd = this.currencyService.toUsd(native, currencyCode, rates)

        machineExpensesUsd += usd

        const machineName = expense.machine?.name ?? 'Máquina'

        movements.push(

          this.buildMovement({

            id: Number(expense.id),

            type: 'machine_expense',

            date: expense.date.toISODate()!,

            label: `${machineName} — ${expense.description}`,

            account: expense.account

              ? { id: Number(expense.account.id), name: expense.account.name }

              : null,

            native,

            currencyCode,

            usd,

            displayCurrency,

            rates,

            referenceId: Number(expense.id),

            isIncome: false,

          })

        )

      }

    }



    movements.sort((a, b) => {

      const dateCompare = b.date.localeCompare(a.date)

      if (dateCompare !== 0) {

        return dateCompare

      }

      return b.id - a.id

    })



    const netUsd = salesUsd - purchasesUsd - expensesUsd - machineExpensesUsd



    return {

      period,

      summary: {

        displayCurrency,

        salesUsd: salesUsd.toFixed(4),

        purchasesUsd: purchasesUsd.toFixed(4),

        expensesUsd: expensesUsd.toFixed(4),

        machineExpensesUsd: machineExpensesUsd.toFixed(4),

        netUsd: netUsd.toFixed(4),

        sales: this.formatDisplay(this.currencyService.fromUsd(salesUsd, displayCurrency, rates), displayCurrency),

        purchases: this.formatDisplay(

          this.currencyService.fromUsd(purchasesUsd, displayCurrency, rates),

          displayCurrency

        ),

        expenses: this.formatDisplay(

          this.currencyService.fromUsd(expensesUsd, displayCurrency, rates),

          displayCurrency

        ),

        machineExpenses: this.formatDisplay(

          this.currencyService.fromUsd(machineExpensesUsd, displayCurrency, rates),

          displayCurrency

        ),

        net: this.formatDisplay(

          this.currencyService.fromUsd(netUsd, displayCurrency, rates),

          displayCurrency

        ),

        rates: this.currencyService.formatRates(rates),

      },

      movements,

    }

  }



  private resolveOrderSaleAmount(

    order: Order,

    rates: Record<string, number>

  ): { usd: number; native: number; currencyCode: string } {

    const lines = order.orderLines ?? []



    if (lines.length > 0) {

      const usd = lines.reduce((sum, line) => {

        const active = Math.max(0, Number(line.quantity) - Number(line.returnedQuantity ?? 0))

        return sum + active * Number(line.unitPriceUsd)

      }, 0)



      return { usd, native: usd, currencyCode: 'USD' }

    }



    const native = Number(order.totalPrice ?? 0)

    if (native <= 0) {

      return { usd: 0, native: 0, currencyCode: 'USD' }

    }



    // Pedidos legacy sin líneas de catálogo: total_price en bolívares.

    const usd = this.currencyService.toUsd(native, 'VES', rates)

    return { usd, native, currencyCode: 'VES' }

  }



  private buildMovement(options: {

    id: number

    type: AccountStatementMovementType

    date: string

    label: string

    account: { id: number; name: string } | null

    native: number

    currencyCode: string

    usd: number

    displayCurrency: string

    rates: Record<string, number>

    referenceId: number

    status?: string

    isIncome: boolean

    isCreditPurchase?: boolean

    creditDueDate?: string | null

    purchaseDate?: string

    creditOverdue?: boolean

    creditReportStatus?: 'pending' | 'overdue' | 'settled'

  }): AccountStatementMovement {
    const displayAmount = this.currencyService.fromUsd(

      options.usd,

      options.displayCurrency,

      options.rates

    )



    return {

      id: options.id,

      type: options.type,

      date: options.date,

      label: options.label,

      account: options.account,

      amountNative: this.formatNative(options.native, options.currencyCode),

      currencyCode: options.currencyCode,

      amountDisplay: this.formatDisplay(displayAmount, options.displayCurrency),

      amountUsd: options.usd.toFixed(4),

      isIncome: options.isIncome,

      referenceId: options.referenceId,

      ...(options.status ? { status: options.status } : {}),

      ...(options.type === 'purchase'

        ? {

            isCreditPurchase: options.isCreditPurchase ?? false,

            ...(options.isCreditPurchase

              ? {

                  creditDueDate: options.creditDueDate ?? null,

                  purchaseDate: options.purchaseDate,

                  creditOverdue: options.creditOverdue ?? false,

                  ...(options.creditReportStatus

                    ? { creditReportStatus: options.creditReportStatus }

                    : {}),

                }

              : {}),

          }

        : {}),

    }
  }



  private formatNative(value: number, currencyCode: string): string {

    return currencyCode === 'USD' ? value.toFixed(4) : value.toFixed(2)

  }



  private formatDisplay(value: number, currencyCode: string): string {

    return currencyCode === 'USD' ? value.toFixed(2) : value.toFixed(2)

  }



  private resolvePeriod(filters: AccountStatementFilters) {

    if (filters.month) {

      const start = DateTime.fromISO(`${filters.month}-01`)

      return {

        from: start.startOf('month').toISODate()!,

        to: start.endOf('month').toISODate()!,

      }

    }



    const now = DateTime.now()

    return {

      from: filters.from ?? now.startOf('month').toISODate()!,

      to: filters.to ?? now.endOf('month').toISODate()!,

    }

  }



  private applyAccountFilter(

    query: ReturnType<typeof Purchase.query>,

    filters: AccountStatementFilters

  ) {

    if (filters.unassigned) {

      query.whereNull('accountId')

    } else if (filters.account_id) {

      query.where('accountId', filters.account_id)

    }

  }

}

