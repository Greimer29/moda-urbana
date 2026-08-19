import DailyClosingService from '#services/daily_closing_service'
import InventoryReportService from '#services/inventory_report_service'
import ReportService from '#services/report_service'
import {
  accountStatementValidator,
  dailyClosingValidator,
  inventoryMovementsValidator,
  inventoryReportValidator,
} from '#validators/report'
import type { HttpContext } from '@adonisjs/core/http'

export default class ReportsController {
  private service = new ReportService()
  private dailyClosingService = new DailyClosingService()
  private inventoryService = new InventoryReportService()

  async dailyClosing({ request, serialize }: HttpContext) {
    const filters = await request.validateUsing(dailyClosingValidator)
    const result = await this.dailyClosingService.generar(filters.date)

    return serialize({
      date: result.date,
      summary: {
        date: result.summary.date,
        tickets_count: result.summary.ticketsCount,
        units_sold: result.summary.unitsSold,
        gross_sales_usd: result.summary.grossSalesUsd,
        returns_usd: result.summary.returnsUsd,
        net_sales_usd: result.summary.netSalesUsd,
        cash_sales_usd: result.summary.cashSalesUsd,
        credit_sales_usd: result.summary.creditSalesUsd,
        credit_orders_count: result.summary.creditOrdersCount,
        profit_usd: result.summary.profitUsd,
        payments_count: result.summary.paymentsCount,
        payments_total_usd: result.summary.paymentsTotalUsd,
        expenses_count: result.summary.expensesCount,
        expenses_total_usd: result.summary.expensesTotalUsd,
        operating_net_usd: result.summary.operatingNetUsd,
      },
      orders: result.orders.map((order) => ({
        id: order.id,
        code: order.code,
        customer_name: order.customerName,
        guest_name: order.guestName,
        payment_type: order.paymentType,
        status: order.status,
        net_total_usd: order.netTotalUsd,
        confirmed_at: order.confirmedAt,
      })),
      payments: result.payments.map((payment) => ({
        id: payment.id,
        customer_name: payment.customerName,
        order_code: payment.orderCode,
        amount_usd: payment.amountUsd,
        account_name: payment.accountName,
      })),
      expenses: result.expenses.map((expense) => ({
        id: expense.id,
        kind: expense.kind,
        description: expense.description,
        amount_usd: expense.amountUsd,
        machine_name: expense.machineName,
        category: expense.category,
      })),
      products: result.products.map((product) => ({
        id: product.id,
        name: product.name,
        category: product.category,
        sale_unit: product.saleUnit,
        quantity_sold: product.quantitySold,
        unit_price_usd: product.unitPriceUsd,
        total_usd: product.totalUsd,
      })),
      sale_lines: result.saleLines.map((line) => ({
        order_id: line.orderId,
        order_code: line.orderCode,
        confirmed_at: line.confirmedAt,
        payment_type: line.paymentType,
        status: line.status,
        customer_name: line.customerName,
        guest_name: line.guestName,
        product_id: line.productId,
        product_name: line.productName,
        category: line.category,
        size: line.size,
        quantity: line.quantity,
        returned_quantity: line.returnedQuantity,
        net_quantity: line.netQuantity,
        unit_price_usd: line.unitPriceUsd,
        gross_usd: line.grossUsd,
        returns_usd: line.returnsUsd,
        net_usd: line.netUsd,
        cost_usd: line.costUsd,
        profit_usd: line.profitUsd,
      })),
    })
  }

  async accountStatement({ request, serialize }: HttpContext) {
    const filters = await request.validateUsing(accountStatementValidator)

    const result = await this.service.estadoCuenta({
      from: filters.from,
      to: filters.to,
      month: filters.month,
      account_id: filters.account_id,
      unassigned: filters.unassigned,
      types: filters.types,
      display_currency: filters.display_currency,
    })

    return serialize({
      period: result.period,
      summary: result.summary,
      movements: result.movements,
    })
  }

  async inventory({ request, serialize }: HttpContext) {
    const filters = await request.validateUsing(inventoryReportValidator)
    const result = await this.inventoryService.listarSnapshot(filters)

    return serialize({
      products: result.products,
      meta: result.meta,
    })
  }

  async inventoryMovements({ request, params, serialize }: HttpContext) {
    const filters = await request.validateUsing(inventoryMovementsValidator)
    const result = await this.inventoryService.listarMovimientos(Number(params.catalogProductId), filters)

    return serialize({
      product: result.product,
      movements: result.movements,
      meta: result.meta,
      period: result.period,
    })
  }
}
