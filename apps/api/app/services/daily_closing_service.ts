import CurrencyService from '#services/currency_service'
import CustomerPayment from '#models/customer_payment'
import Order from '#models/order'
import SalesShift from '#models/sales_shift'
import SalesShiftService from '#services/sales_shift_service'
import TurnoNoEncontradoException from '#exceptions/turno_no_encontrado_exception'
import { todayIsoDate } from '#utils/app_timezone'
import db from '@adonisjs/lucid/services/db'

const SALE_STATUSES = ['CONFIRMED', 'IN_PRODUCTION', 'DELIVERED'] as const

type SalesScope =
  | { kind: 'shift'; shiftId: number; labelDate: string }
  | { kind: 'date'; date: string }

export type DailyClosingShiftMeta = {
  id: number
  openedAt: string
  closedAt: string | null
  status: 'OPEN' | 'CLOSED'
}

export type DailyClosingSummary = {
  date: string
  ticketsCount: number
  unitsSold: number
  grossSalesUsd: string
  returnsUsd: string
  netSalesUsd: string
  cashSalesUsd: string
  creditSalesUsd: string
  creditOrdersCount: number
  profitUsd: string
  paymentsCount: number
  paymentsTotalUsd: string
  expensesCount: number
  expensesTotalUsd: string
  operatingNetUsd: string
}

export type DailyClosingOrderItem = {
  id: number
  code: string
  customerName: string | null
  guestName: string | null
  paymentType: 'CASH' | 'CREDIT'
  status: string
  netTotalUsd: string
  confirmedAt: string | null
}

export type DailyClosingPaymentItem = {
  id: number
  customerName: string
  orderCode: string | null
  amountUsd: string
  accountName: string | null
}

export type DailyClosingExpenseItem = {
  id: number
  kind: 'expense' | 'machine_expense'
  description: string
  amountUsd: string
  machineName: string | null
  category: string | null
}

export type DailyClosingProductItem = {
  id: number
  name: string
  category: string
  saleUnit: string
  quantitySold: number
  unitPriceUsd: string
  totalUsd: string
}

export type DailyClosingSaleLineItem = {
  orderId: number
  orderCode: string
  confirmedAt: string | null
  paymentType: 'CASH' | 'CREDIT'
  status: string
  customerName: string | null
  guestName: string | null
  productId: number | null
  productName: string
  category: string | null
  size: string | null
  quantity: number
  returnedQuantity: number
  netQuantity: number
  unitPriceUsd: string
  grossUsd: string
  returnsUsd: string
  netUsd: string
  costUsd: string
  profitUsd: string
}

export type DailyClosingResult = {
  date: string
  shift: DailyClosingShiftMeta | null
  summary: DailyClosingSummary
  orders: DailyClosingOrderItem[]
  payments: DailyClosingPaymentItem[]
  expenses: DailyClosingExpenseItem[]
  products: DailyClosingProductItem[]
  saleLines: DailyClosingSaleLineItem[]
}

export type DailyClosingInput = {
  salesShiftId?: number
  date?: string
}

export default class DailyClosingService {
  private currencyService = new CurrencyService()
  private salesShiftService = new SalesShiftService()

  async generar(input: DailyClosingInput = {}): Promise<DailyClosingResult> {
    const rates = await this.currencyService.getActiveRates()
    let scope: SalesScope
    let shiftMeta: DailyClosingShiftMeta | null = null
    let paymentExpenseDates: string[]

    if (input.salesShiftId) {
      const shift = await SalesShift.find(input.salesShiftId)
      if (!shift) {
        throw new TurnoNoEncontradoException()
      }

      const openedIso = shift.openedAt.toISO()!
      scope = {
        kind: 'shift',
        shiftId: Number(shift.id),
        labelDate: openedIso.slice(0, 10),
      }
      shiftMeta = {
        id: Number(shift.id),
        openedAt: openedIso,
        closedAt: shift.closedAt?.toISO() ?? null,
        status: shift.status,
      }
      paymentExpenseDates = this.salesShiftService.calendarDatesForShift(shift)
    } else {
      const businessDate = input.date ?? todayIsoDate()
      scope = { kind: 'date', date: businessDate }
      paymentExpenseDates = [businessDate]
    }

    const [salesRow, orders, payments, expenses, products, saleLines] = await Promise.all([
      this.queryCatalogSales(scope),
      this.listOrders(scope, rates),
      this.listPayments(paymentExpenseDates),
      this.listExpenses(paymentExpenseDates, rates),
      this.listProducts(scope),
      this.listSaleLines(scope, rates),
    ])

    const legacyTotals = await this.legacyTotals(scope, rates)

    const unitsSold = Number(salesRow?.unitsSold ?? 0)
    const netCatalogUsd = Number(salesRow?.netSalesUsd ?? 0)
    const returnsCatalogUsd = Number(salesRow?.returnsUsd ?? 0)
    const grossCatalogUsd = netCatalogUsd + returnsCatalogUsd
    const cashCatalogUsd = Number(salesRow?.cashSalesUsd ?? 0)
    const creditCatalogUsd = Number(salesRow?.creditSalesUsd ?? 0)
    const profitCatalogUsd = Number(salesRow?.profitUsd ?? 0)
    const creditOrdersCatalog = Number(salesRow?.creditOrdersCount ?? 0)
    const ticketsCatalog = Number(salesRow?.ticketsCount ?? 0)

    const grossSalesUsd = grossCatalogUsd + legacyTotals.grossUsd
    const returnsUsd = returnsCatalogUsd
    const netSalesUsd = netCatalogUsd + legacyTotals.netUsd
    const cashSalesUsd = cashCatalogUsd + legacyTotals.cashUsd
    const creditSalesUsd = creditCatalogUsd + legacyTotals.creditUsd
    const creditOrdersCount = creditOrdersCatalog + legacyTotals.creditOrdersCount
    const profitUsd = profitCatalogUsd
    const ticketsCount = ticketsCatalog + legacyTotals.ticketsCount

    const paymentsTotalUsd = payments.reduce((sum, payment) => sum + Number(payment.amountUsd), 0)
    const expensesTotalUsd = expenses.reduce((sum, expense) => sum + Number(expense.amountUsd), 0)
    const operatingNetUsd = cashSalesUsd + paymentsTotalUsd - expensesTotalUsd
    const labelDate = scope.kind === 'shift' ? scope.labelDate : scope.date

    return {
      date: labelDate,
      shift: shiftMeta,
      summary: {
        date: labelDate,
        ticketsCount,
        unitsSold,
        grossSalesUsd: grossSalesUsd.toFixed(4),
        returnsUsd: returnsUsd.toFixed(4),
        netSalesUsd: netSalesUsd.toFixed(4),
        cashSalesUsd: cashSalesUsd.toFixed(4),
        creditSalesUsd: creditSalesUsd.toFixed(4),
        creditOrdersCount,
        profitUsd: profitUsd.toFixed(4),
        paymentsCount: payments.length,
        paymentsTotalUsd: paymentsTotalUsd.toFixed(4),
        expensesCount: expenses.length,
        expensesTotalUsd: expensesTotalUsd.toFixed(4),
        operatingNetUsd: operatingNetUsd.toFixed(4),
      },
      orders,
      payments,
      expenses,
      products,
      saleLines,
    }
  }

  private applySalesScope(
    query: ReturnType<typeof db.from>,
    scope: SalesScope
  ): ReturnType<typeof db.from> {
    if (scope.kind === 'shift') {
      return query.where('orders.sales_shift_id', scope.shiftId)
    }
    return query.where('orders.order_date', scope.date)
  }

  private async queryCatalogSales(scope: SalesScope) {
    const query = db
      .from('orders')
      .join('order_lines', 'order_lines.order_id', 'orders.id')
      .leftJoin('catalog_products', 'catalog_products.id', 'order_lines.catalog_product_id')
      .whereIn('orders.status', [...SALE_STATUSES])

    this.applySalesScope(query, scope)

    return query
      .select(
        db.raw(
          'COALESCE(SUM(order_lines.quantity - order_lines.returned_quantity), 0) as unitsSold'
        ),
        db.raw(
          'COALESCE(SUM(order_lines.quantity * order_lines.unit_price_usd), 0) as grossSalesUsd'
        ),
        db.raw(
          'COALESCE(SUM(order_lines.returned_quantity * order_lines.unit_price_usd), 0) as returnsUsd'
        ),
        db.raw(
          'COALESCE(SUM((order_lines.quantity - order_lines.returned_quantity) * order_lines.unit_price_usd), 0) as netSalesUsd'
        ),
        db.raw(
          `COALESCE(SUM(CASE WHEN orders.payment_type = 'CASH' THEN (order_lines.quantity - order_lines.returned_quantity) * order_lines.unit_price_usd ELSE 0 END), 0) as cashSalesUsd`
        ),
        db.raw(
          `COALESCE(SUM(CASE WHEN orders.payment_type = 'CREDIT' THEN (order_lines.quantity - order_lines.returned_quantity) * order_lines.unit_price_usd ELSE 0 END), 0) as creditSalesUsd`
        ),
        db.raw(
          `COUNT(DISTINCT CASE WHEN orders.payment_type = 'CREDIT' AND (order_lines.quantity - order_lines.returned_quantity) > 0 THEN orders.id END) as creditOrdersCount`
        ),
        db.raw(
          `COUNT(DISTINCT CASE WHEN (order_lines.quantity - order_lines.returned_quantity) > 0 THEN orders.id END) as ticketsCount`
        ),
        db.raw(
          'COALESCE(SUM((order_lines.unit_price_usd - COALESCE(order_lines.cost_usd, catalog_products.cost_usd)) * (order_lines.quantity - order_lines.returned_quantity)), 0) as profitUsd'
        )
      )
      .first()
  }

  private async legacyTotals(scope: SalesScope, rates: Record<string, number>) {
    const query = db
      .from('orders')
      .leftJoin('order_lines', 'order_lines.order_id', 'orders.id')
      .whereIn('orders.status', [...SALE_STATUSES])
      .whereNull('order_lines.id')

    this.applySalesScope(query, scope)

    const rows = await query.select(
      'orders.id',
      'orders.total_price as totalPrice',
      'orders.payment_type as paymentType'
    )

    let grossUsd = 0
    let netUsd = 0
    let cashUsd = 0
    let creditUsd = 0
    let creditOrdersCount = 0
    let ticketsCount = 0

    for (const row of rows) {
      const native = Number(row.totalPrice ?? 0)
      if (native <= 0) {
        continue
      }

      const usd = this.currencyService.toUsd(native, 'VES', rates)
      grossUsd += usd
      netUsd += usd
      ticketsCount += 1

      if (row.paymentType === 'CREDIT') {
        creditUsd += usd
        creditOrdersCount += 1
      } else {
        cashUsd += usd
      }
    }

    return { grossUsd, netUsd, cashUsd, creditUsd, creditOrdersCount, ticketsCount }
  }

  private async listOrders(
    scope: SalesScope,
    rates: Record<string, number>
  ): Promise<DailyClosingOrderItem[]> {
    const query = Order.query().whereIn('status', [...SALE_STATUSES])

    if (scope.kind === 'shift') {
      query.where('salesShiftId', scope.shiftId)
    } else {
      query.where('orderDate', scope.date)
    }

    const orders = await query
      .preload('customer')
      .preload('orderLines')
      .orderBy('confirmedAt', 'desc')
      .orderBy('id', 'desc')

    const items: DailyClosingOrderItem[] = []

    for (const order of orders) {
      const lines = order.orderLines ?? []
      let netTotalUsd = 0

      if (lines.length > 0) {
        netTotalUsd = lines.reduce((sum, line) => {
          const active = Math.max(0, Number(line.quantity) - Number(line.returnedQuantity ?? 0))
          return sum + active * Number(line.unitPriceUsd)
        }, 0)
      } else {
        const native = Number(order.totalPrice ?? 0)
        if (native > 0) {
          netTotalUsd = this.currencyService.toUsd(native, 'VES', rates)
        }
      }

      if (netTotalUsd <= 0) {
        continue
      }

      items.push({
        id: Number(order.id),
        code: order.code,
        customerName: order.customer?.name ?? null,
        guestName: order.guestName ?? null,
        paymentType: order.paymentType === 'CREDIT' ? 'CREDIT' : 'CASH',
        status: order.status,
        netTotalUsd: netTotalUsd.toFixed(4),
        confirmedAt: order.confirmedAt?.toISO() ?? null,
      })
    }

    return items
  }

  private async listPayments(dates: string[]): Promise<DailyClosingPaymentItem[]> {
    if (dates.length === 0) {
      return []
    }

    const payments = await CustomerPayment.query()
      .whereIn('date', dates)
      .preload('customer')
      .preload('order')
      .preload('account')
      .orderBy('id', 'desc')

    return payments.map((payment) => ({
      id: Number(payment.id),
      customerName: payment.customer?.name ?? 'Cliente',
      orderCode: payment.order?.code ?? null,
      amountUsd: Number(payment.amountUsd).toFixed(4),
      accountName: payment.account?.name ?? null,
    }))
  }

  private async listExpenses(
    dates: string[],
    rates: Record<string, number>
  ): Promise<DailyClosingExpenseItem[]> {
    if (dates.length === 0) {
      return []
    }

    const expenseRows = await db
      .from('expenses')
      .whereIn('date', dates)
      .select('id', 'description', 'amount_usd as amountUsd')
      .orderBy('amount_usd', 'desc')

    const machineRows = await db
      .from('machine_expenses')
      .join('machines', 'machines.id', 'machine_expenses.machine_id')
      .whereIn('machine_expenses.date', dates)
      .select(
        'machine_expenses.id',
        'machine_expenses.description',
        'machine_expenses.amount',
        'machine_expenses.currency_code as currencyCode',
        'machine_expenses.category',
        'machines.name as machineName'
      )
      .orderBy('machine_expenses.amount', 'desc')

    const items: DailyClosingExpenseItem[] = [
      ...expenseRows.map((row) => ({
        id: Number(row.id),
        kind: 'expense' as const,
        description: String(row.description),
        amountUsd: Number(row.amountUsd ?? 0).toFixed(4),
        machineName: null,
        category: null,
      })),
      ...machineRows.map((row) => {
        const currencyCode = row.currencyCode ? String(row.currencyCode) : 'USD'
        const amountUsd = this.currencyService.toUsd(Number(row.amount ?? 0), currencyCode, rates)

        return {
          id: Number(row.id),
          kind: 'machine_expense' as const,
          description: String(row.description),
          amountUsd: amountUsd.toFixed(4),
          machineName: row.machineName ? String(row.machineName) : null,
          category: row.category ? String(row.category) : null,
        }
      }),
    ]

    return items.sort((a, b) => Number(b.amountUsd) - Number(a.amountUsd))
  }

  private async listProducts(scope: SalesScope): Promise<DailyClosingProductItem[]> {
    const query = db
      .from('orders')
      .join('order_lines', 'order_lines.order_id', 'orders.id')
      .join('catalog_products', 'catalog_products.id', 'order_lines.catalog_product_id')
      .whereIn('orders.status', [...SALE_STATUSES])
      .whereNotNull('order_lines.catalog_product_id')

    this.applySalesScope(query, scope)

    const rows = await query
      .groupBy(
        'catalog_products.id',
        'catalog_products.name',
        'catalog_products.category',
        'catalog_products.sale_unit'
      )
      .select(
        'catalog_products.id',
        'catalog_products.name',
        'catalog_products.category',
        'catalog_products.sale_unit as saleUnit',
        db.raw(
          'COALESCE(SUM(order_lines.quantity - order_lines.returned_quantity), 0) as quantitySold'
        ),
        db.raw(
          'COALESCE(SUM((order_lines.quantity - order_lines.returned_quantity) * order_lines.unit_price_usd), 0) as totalUsd'
        )
      )
      .orderBy('totalUsd', 'desc')

    return rows
      .map((row) => {
        const quantitySold = Number(row.quantitySold ?? 0)
        if (quantitySold <= 0) {
          return null
        }

        const totalUsd = Number(row.totalUsd ?? 0)
        const unitPriceUsd = quantitySold > 0 ? (totalUsd / quantitySold).toFixed(4) : '0.0000'

        return {
          id: Number(row.id),
          name: String(row.name),
          category: String(row.category),
          saleUnit: String(row.saleUnit),
          quantitySold,
          unitPriceUsd,
          totalUsd: totalUsd.toFixed(4),
        }
      })
      .filter((item): item is DailyClosingProductItem => item !== null)
  }

  private async listSaleLines(
    scope: SalesScope,
    rates: Record<string, number>
  ): Promise<DailyClosingSaleLineItem[]> {
    const linesQuery = db
      .from('orders')
      .join('order_lines', 'order_lines.order_id', 'orders.id')
      .leftJoin('catalog_products', 'catalog_products.id', 'order_lines.catalog_product_id')
      .leftJoin('customers', 'customers.id', 'orders.customer_id')
      .whereIn('orders.status', [...SALE_STATUSES])

    this.applySalesScope(linesQuery, scope)

    const rows = await linesQuery
      .orderBy('orders.confirmed_at', 'desc')
      .orderBy('orders.id', 'desc')
      .orderBy('order_lines.id', 'asc')
      .select(
        'orders.id as orderId',
        'orders.code as orderCode',
        'orders.confirmed_at as confirmedAt',
        'orders.payment_type as paymentType',
        'orders.status as status',
        'customers.name as customerName',
        'orders.guest_name as guestName',
        'catalog_products.id as productId',
        'catalog_products.name as productName',
        'catalog_products.category as category',
        'order_lines.size as size',
        'order_lines.quantity as quantity',
        'order_lines.returned_quantity as returnedQuantity',
        'order_lines.unit_price_usd as unitPriceUsd',
        'order_lines.cost_usd as lineCostUsd',
        'catalog_products.cost_usd as productCostUsd'
      )

    const items: DailyClosingSaleLineItem[] = []

    for (const row of rows) {
      const quantity = Number(row.quantity ?? 0)
      const returnedQuantity = Number(row.returnedQuantity ?? 0)
      const netQuantity = Math.max(0, quantity - returnedQuantity)
      if (netQuantity <= 0 && returnedQuantity <= 0) {
        continue
      }

      const unitPriceUsd = Number(row.unitPriceUsd ?? 0)
      const costUsd = Number(row.lineCostUsd ?? row.productCostUsd ?? 0)
      const grossUsd = quantity * unitPriceUsd
      const returnsUsd = returnedQuantity * unitPriceUsd
      const netUsd = netQuantity * unitPriceUsd
      const profitUsd = (unitPriceUsd - costUsd) * netQuantity

      items.push({
        orderId: Number(row.orderId),
        orderCode: String(row.orderCode),
        confirmedAt: row.confirmedAt ? new Date(row.confirmedAt).toISOString() : null,
        paymentType: row.paymentType === 'CREDIT' ? 'CREDIT' : 'CASH',
        status: String(row.status),
        customerName: row.customerName ? String(row.customerName) : null,
        guestName: row.guestName ? String(row.guestName) : null,
        productId: row.productId ? Number(row.productId) : null,
        productName: row.productName ? String(row.productName) : 'Producto',
        category: row.category ? String(row.category) : null,
        size: row.size ? String(row.size) : null,
        quantity,
        returnedQuantity,
        netQuantity,
        unitPriceUsd: unitPriceUsd.toFixed(4),
        grossUsd: grossUsd.toFixed(4),
        returnsUsd: returnsUsd.toFixed(4),
        netUsd: netUsd.toFixed(4),
        costUsd: costUsd.toFixed(4),
        profitUsd: profitUsd.toFixed(4),
      })
    }

    const legacyQuery = db
      .from('orders')
      .leftJoin('order_lines', 'order_lines.order_id', 'orders.id')
      .leftJoin('customers', 'customers.id', 'orders.customer_id')
      .whereIn('orders.status', [...SALE_STATUSES])
      .whereNull('order_lines.id')

    this.applySalesScope(legacyQuery, scope)

    const legacyOrders = await legacyQuery
      .select(
        'orders.id as orderId',
        'orders.code as orderCode',
        'orders.confirmed_at as confirmedAt',
        'orders.payment_type as paymentType',
        'orders.status as status',
        'orders.description as description',
        'orders.total_price as totalPrice',
        'customers.name as customerName',
        'orders.guest_name as guestName'
      )
      .orderBy('orders.confirmed_at', 'desc')
      .orderBy('orders.id', 'desc')

    for (const row of legacyOrders) {
      const native = Number(row.totalPrice ?? 0)
      if (native <= 0) {
        continue
      }

      const netUsd = this.currencyService.toUsd(native, 'VES', rates)

      items.push({
        orderId: Number(row.orderId),
        orderCode: String(row.orderCode),
        confirmedAt: row.confirmedAt ? new Date(row.confirmedAt).toISOString() : null,
        paymentType: row.paymentType === 'CREDIT' ? 'CREDIT' : 'CASH',
        status: String(row.status),
        customerName: row.customerName ? String(row.customerName) : null,
        guestName: row.guestName ? String(row.guestName) : null,
        productId: null,
        productName: String(row.description ?? 'Pedido legacy'),
        category: null,
        size: null,
        quantity: 1,
        returnedQuantity: 0,
        netQuantity: 1,
        unitPriceUsd: netUsd.toFixed(4),
        grossUsd: netUsd.toFixed(4),
        returnsUsd: '0.0000',
        netUsd: netUsd.toFixed(4),
        costUsd: '0.0000',
        profitUsd: '0.0000',
      })
    }

    return items
  }
}
