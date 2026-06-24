import MaterialService from '#services/material_service'
import CurrencyService from '#services/currency_service'
import CatalogProductStockService from '#services/catalog_product_stock_service'
import CatalogProduct from '#models/catalog_product'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import {
  creditPurchaseCountsTowardPeriodTotal,
  creditPurchaseReportAmountUsd,
  creditPurchaseVisibleInReport,
  type CreditPurchaseReportContext,
} from '#utils/credit_purchase_report'
import { sumMachineExpenseRowsUsd } from '#utils/machine_expense_totals'
import {
  buildDailyVentasBuckets,
  buildMonthlyVentasBuckets,
  buildWeeklyVentasBuckets,
} from '#utils/dashboard_chart_periods'

export type BajoStockItem = {
  id: number
  code: string
  name: string
  category: string
  unit: string
  minimumStock: string
  stockActual: number
}

export type BajoStockProductoItem = {
  id: number
  name: string
  stock: string
  minimumStock: string
  saleUnit: string
}

export type PurchasesMonthSummary = {
  quantity: number
  totalUsd: string
}

export type MachineExpensesMonthSummary = {
  quantity: number
  totalAmount: string
}

export type VentasDelDia = {
  productosVendidos: number
  montoProductosUsd: string
  montoCreditoUsd: string
  pedidosCredito: number
  gastosCantidad: number
  gastosMontoUsd: string
}

export type GananciaDelDia = {
  montoUsd: string
  gananciaCreditoUsd: string
  porcentajeSobreVentas: number
}

export type VentasSeriePoint = {
  label: string
  totalUsd: string
  variacionPct: number | null
}

export type ClienteCreditoItem = {
  id: number
  name: string
  pedidosConSaldo: number
  saldoPendienteUsd: string
  estado: 'vigente' | 'vencida'
}

export type ProveedorCreditoItem = {
  id: number
  name: string
  saldoPendienteUsd: string
  estado: 'vigente' | 'vencida'
}

export type DailySoldProductItem = {
  id: number
  name: string
  category: string
  saleUnit: string
  imagePath: string | null
  stockQuantity: string
  quantitySold: number
  unitPriceUsd: string
  totalUsd: string
}

export type DailyProductSalesResult = {
  date: string
  products: DailySoldProductItem[]
  summary: {
    productosVendidos: number
    montoProductosUsd: string
  }
}

export type DailyExpenseItem = {
  id: number
  kind: 'expense' | 'machine_expense'
  description: string
  amountUsd: string
  machineName: string | null
  category: string | null
}

export type DailyExpensesResult = {
  date: string
  items: DailyExpenseItem[]
  summary: {
    gastosCantidad: number
    gastosMontoUsd: string
  }
}

export type DashboardOverview = {
  bajoStock: BajoStockItem[]
  bajoStockProductos: BajoStockProductoItem[]
  purchasesMonth: PurchasesMonthSummary
  machineExpensesMonth: MachineExpensesMonthSummary
  ventasDelDia: VentasDelDia
  gananciaDelDia: GananciaDelDia
  ventasSeries: VentasSeriePoint[]
  clientesCredito: ClienteCreditoItem[]
  proveedoresCredito: ProveedorCreditoItem[]
}

const SALE_STATUSES = ['CONFIRMED', 'IN_PRODUCTION', 'DELIVERED'] as const

export default class DashboardService {
  private materialService = new MaterialService()
  private currencyService = new CurrencyService()
  private catalogProductStockService = new CatalogProductStockService()

  private sumMachineExpensesUsd(
    rows: Array<{ amount: string | number; currency_code?: string | null }>,
    rates: Record<string, number>
  ): number {
    return sumMachineExpenseRowsUsd(rows, rates, this.currencyService)
  }

  private legacyOrdersQuery(desde: string, hasta: string, paymentType?: 'CREDIT') {
    const query = db
      .from('orders')
      .leftJoin('order_lines', 'order_lines.order_id', 'orders.id')
      .whereIn('orders.status', [...SALE_STATUSES])
      .where('orders.order_date', '>=', desde)
      .where('orders.order_date', '<=', hasta)
      .whereNull('order_lines.id')

    if (paymentType) {
      query.where('orders.payment_type', paymentType)
    }

    return query
  }

  private async sumLegacyOrdersSalesUsd(
    desde: string,
    hasta: string,
    paymentType?: 'CREDIT'
  ): Promise<number> {
    const rates = await this.currencyService.getActiveRates()
    const rows = await this.legacyOrdersQuery(desde, hasta, paymentType).select(
      'orders.total_price as totalPrice'
    )

    let totalUsd = 0
    for (const row of rows) {
      const native = Number(row.totalPrice ?? 0)
      if (native > 0) {
        totalUsd += this.currencyService.toUsd(native, 'VES', rates)
      }
    }

    return totalUsd
  }

  private async sumLegacyOrdersCreditUsd(desde: string, hasta: string): Promise<number> {
    return this.sumLegacyOrdersSalesUsd(desde, hasta, 'CREDIT')
  }

  private async countLegacyCreditOrders(desde: string, hasta: string): Promise<number> {
    const row = await this.legacyOrdersQuery(desde, hasta, 'CREDIT')
      .count('orders.id as total')
      .first()

    return Number(row?.total ?? 0)
  }

  async overview(chart: 'daily' | 'weekly' | 'monthly' = 'weekly'): Promise<DashboardOverview> {
    const [
      bajoStock,
      bajoStockProductos,
      purchasesMonth,
      machineExpensesMonth,
      ventasDelDia,
      gananciaDelDia,
      ventasSeries,
      clientesCredito,
      proveedoresCredito,
    ] = await Promise.all([
      this.materialsBajoStock(),
      this.productosBajoStock(),
      this.comprasDelMes(),
      this.gastosMaquinasDelMes(),
      this.ventasDelDia(),
      this.gananciaDelDia(),
      this.ventasSeries(chart),
      this.clientesConCredito(),
      this.proveedoresConCredito(),
    ])

    return {
      bajoStock,
      bajoStockProductos,
      purchasesMonth,
      machineExpensesMonth,
      ventasDelDia,
      gananciaDelDia,
      ventasSeries,
      clientesCredito,
      proveedoresCredito,
    }
  }

  /** @deprecated use overview */
  async resumen() {
    const data = await this.overview('weekly')
    return {
      bajoStock: data.bajoStock,
      purchasesMonth: data.purchasesMonth,
      machineExpensesMonth: data.machineExpensesMonth,
    }
  }

  private async materialsBajoStock(): Promise<BajoStockItem[]> {
    const rows = await this.materialService.materialsLowStock()
    return rows.map(({ material, stockActual }) => ({
      id: Number(material.id),
      code: material.code,
      name: material.name,
      category: material.category,
      unit: material.unit,
      minimumStock: material.minimumStock,
      stockActual,
    }))
  }

  private async productosBajoStock(): Promise<BajoStockProductoItem[]> {
    const products = await CatalogProduct.query()
      .where('active', true)
      .whereRaw('stock_quantity < minimum_stock')
      .where('minimum_stock', '>', 0)
      .orderBy('name', 'asc')
      .limit(20)

    return products.map((p) => ({
      id: Number(p.id),
      name: p.name,
      stock: p.stockQuantity,
      minimumStock: p.minimumStock,
      saleUnit: p.saleUnit,
    }))
  }

  private async comprasDelMes(): Promise<PurchasesMonthSummary> {
    const inicioMes = DateTime.now().startOf('month').toISODate()!
    const finMes = DateTime.now().endOf('month').toISODate()!
    const period = { from: inicioMes, to: finMes }

    const purchases = await db
      .from('purchases')
      .where('status', 'CONFIRMED')
      .select(
        'id',
        'date',
        'is_credit',
        'credit_due_date',
        'balance_usd',
        'total_usd',
        'total_usd_snapshot',
        'total_bs',
        'usd_rate'
      )

    let quantity = 0
    let totalUsd = 0

    for (const purchase of purchases) {
      const purchaseDate =
        purchase.date instanceof Date
          ? DateTime.fromJSDate(purchase.date).toISODate()!
          : String(purchase.date).slice(0, 10)
      const creditDueDate = purchase.credit_due_date
        ? purchase.credit_due_date instanceof Date
          ? DateTime.fromJSDate(purchase.credit_due_date).toISODate()!
          : String(purchase.credit_due_date).slice(0, 10)
        : null

      const reportContext: CreditPurchaseReportContext = {
        isCredit: Boolean(purchase.is_credit),
        purchaseDate,
        creditDueDate,
        balanceUsd: Number(purchase.balance_usd ?? 0),
      }

      if (!creditPurchaseVisibleInReport(reportContext, period)) {
        continue
      }

      const balanceUsdAmount = reportContext.isCredit
        ? creditPurchaseReportAmountUsd(reportContext)
        : this.resolvePurchaseTotalUsd(purchase)

      const countsTowardTotal = reportContext.isCredit
        ? creditPurchaseCountsTowardPeriodTotal(reportContext, period)
        : true

      const contributionUsd = countsTowardTotal ? balanceUsdAmount : 0

      if (contributionUsd > 0) {
        quantity += 1
        totalUsd += contributionUsd
      }
    }

    const supplierPayments = await db
      .from('supplier_payments')
      .where('date', '>=', inicioMes)
      .where('date', '<=', finMes)
      .select('amount_usd')

    for (const payment of supplierPayments) {
      const usd = Number(payment.amount_usd ?? 0)
      if (usd > 0) {
        totalUsd += usd
      }
    }

    return {
      quantity,
      totalUsd: totalUsd.toFixed(2),
    }
  }

  private resolvePurchaseTotalUsd(purchase: {
    total_usd?: string | null
    total_usd_snapshot?: string | null
    total_bs?: string | null
    usd_rate?: string | null
  }): number {
    if (purchase.total_usd) {
      return Number(purchase.total_usd)
    }
    if (purchase.total_usd_snapshot) {
      return Number(purchase.total_usd_snapshot)
    }
    const rate = purchase.usd_rate ? Number(purchase.usd_rate) : null
    if (rate && rate > 0) {
      return Number(purchase.total_bs ?? 0) / rate
    }
    return 0
  }

  private async gastosMaquinasDelMes(): Promise<MachineExpensesMonthSummary> {
    const inicioMes = DateTime.now().startOf('month').toISODate()!
    const finMes = DateTime.now().endOf('month').toISODate()!
    const rates = await this.currencyService.getActiveRates()

    const machineRows = await db
      .from('machine_expenses')
      .where('date', '>=', inicioMes)
      .where('date', '<=', finMes)
      .select('amount', 'currency_code')

    const totalAmount = this.sumMachineExpensesUsd(machineRows, rates)

    return {
      quantity: machineRows.length,
      totalAmount: totalAmount.toFixed(2),
    }
  }

  private async gastosDelDia(): Promise<{ cantidad: number; montoUsd: number }> {
    const hoy = DateTime.now().toISODate()!
    const rates = await this.currencyService.getActiveRates()

    const expenses = await db
      .from('expenses')
      .where('date', hoy)
      .select(db.raw('COUNT(*) as qty'), db.raw('COALESCE(SUM(amount_usd), 0) as total_usd'))
      .first()

    const machineRows = await db
      .from('machine_expenses')
      .where('date', hoy)
      .select('amount', 'currency_code')

    const machineUsd = this.sumMachineExpensesUsd(machineRows, rates)

    return {
      cantidad: Number(expenses?.qty ?? 0) + machineRows.length,
      montoUsd: Number(expenses?.total_usd ?? 0) + machineUsd,
    }
  }

  /** Ventas del dashboard usan order_date (mismo criterio que reportes), no confirmed_at. */
  private async ventasDelDia(): Promise<VentasDelDia> {
    const hoy = DateTime.now().toISODate()!

    const ventas = await db
      .from('orders')
      .join('order_lines', 'order_lines.order_id', 'orders.id')
      .whereIn('orders.status', [...SALE_STATUSES])
      .where('orders.order_date', hoy)
      .select(
        db.raw('COALESCE(SUM(order_lines.quantity - order_lines.returned_quantity), 0) as qty'),
        db.raw(
          'COALESCE(SUM((order_lines.quantity - order_lines.returned_quantity) * order_lines.unit_price_usd), 0) as total_usd'
        ),
        db.raw(
          `COALESCE(SUM(CASE WHEN orders.payment_type = 'CREDIT' THEN (order_lines.quantity - order_lines.returned_quantity) * order_lines.unit_price_usd ELSE 0 END), 0) as credit_usd`
        ),
        db.raw(
          `COUNT(DISTINCT CASE WHEN orders.payment_type = 'CREDIT' THEN orders.id END) as pedidos_credito`
        )
      )
      .first()

    const gastos = await this.gastosDelDia()
    const legacySalesUsd = await this.sumLegacyOrdersSalesUsd(hoy, hoy)
    const legacyCreditUsd = await this.sumLegacyOrdersCreditUsd(hoy, hoy)
    const legacyCreditCount = await this.countLegacyCreditOrders(hoy, hoy)

    return {
      productosVendidos: Number(ventas?.qty ?? 0),
      montoProductosUsd: (Number(ventas?.total_usd ?? 0) + legacySalesUsd).toFixed(4),
      montoCreditoUsd: (Number(ventas?.credit_usd ?? 0) + legacyCreditUsd).toFixed(4),
      pedidosCredito: Number(ventas?.pedidos_credito ?? 0) + legacyCreditCount,
      gastosCantidad: gastos.cantidad,
      gastosMontoUsd: gastos.montoUsd.toFixed(4),
    }
  }

  async productosVendidosDelDia(): Promise<DailyProductSalesResult> {
    const hoy = DateTime.now().toISODate()!

    const rows = await db
      .from('orders')
      .join('order_lines', 'order_lines.order_id', 'orders.id')
      .join('catalog_products', 'catalog_products.id', 'order_lines.catalog_product_id')
      .whereIn('orders.status', [...SALE_STATUSES])
      .where('orders.order_date', hoy)
      .whereNotNull('order_lines.catalog_product_id')
      .groupBy(
        'catalog_products.id',
        'catalog_products.name',
        'catalog_products.category',
        'catalog_products.sale_unit',
        'catalog_products.image_path',
        'catalog_products.stock_quantity'
      )
      .select(
        'catalog_products.id',
        'catalog_products.name',
        'catalog_products.category',
        'catalog_products.sale_unit as saleUnit',
        'catalog_products.image_path as imagePath',
        'catalog_products.stock_quantity as stockQuantity',
        db.raw(
          'COALESCE(SUM(order_lines.quantity - order_lines.returned_quantity), 0) as quantitySold'
        ),
        db.raw(
          'COALESCE(SUM((order_lines.quantity - order_lines.returned_quantity) * order_lines.unit_price_usd), 0) as totalUsd'
        )
      )
      .orderBy('totalUsd', 'desc')

    const productIds = rows.map((row) => Number(row.id))
    const catalogProducts =
      productIds.length > 0
        ? await CatalogProduct.query()
            .whereIn('id', productIds)
            .preload('formula', (query) =>
              query.preload('materials', (materialQuery) => materialQuery.preload('material'))
            )
        : []
    const stockByProductId =
      await this.catalogProductStockService.calcularStockForProducts(catalogProducts)

    const products: DailySoldProductItem[] = rows.map((row) => {
      const quantitySold = Number(row.quantitySold ?? 0)
      const totalUsd = Number(row.totalUsd ?? 0)
      const unitPriceUsd = quantitySold > 0 ? (totalUsd / quantitySold).toFixed(4) : '0.0000'
      const productId = Number(row.id)
      const stock = stockByProductId.get(productId)

      return {
        id: productId,
        name: String(row.name),
        category: String(row.category),
        saleUnit: String(row.saleUnit),
        imagePath: row.imagePath ? String(row.imagePath) : null,
        stockQuantity: (stock?.quantity ?? Number(row.stockQuantity ?? 0)).toFixed(3),
        quantitySold,
        unitPriceUsd,
        totalUsd: totalUsd.toFixed(4),
      }
    })

    const summary = await this.ventasDelDia()

    return {
      date: hoy,
      products,
      summary: {
        productosVendidos: summary.productosVendidos,
        montoProductosUsd: summary.montoProductosUsd,
      },
    }
  }

  async gastosDelDiaDetalle(): Promise<DailyExpensesResult> {
    const hoy = DateTime.now().toISODate()!
    const rates = await this.currencyService.getActiveRates()

    const expenseRows = await db
      .from('expenses')
      .where('date', hoy)
      .select('id', 'description', 'amount_usd as amountUsd')
      .orderBy('amount_usd', 'desc')

    const machineRows = await db
      .from('machine_expenses')
      .join('machines', 'machines.id', 'machine_expenses.machine_id')
      .where('machine_expenses.date', hoy)
      .select(
        'machine_expenses.id',
        'machine_expenses.description',
        'machine_expenses.amount',
        'machine_expenses.currency_code as currencyCode',
        'machine_expenses.category',
        'machines.name as machineName'
      )
      .orderBy('machine_expenses.amount', 'desc')

    const items: DailyExpenseItem[] = [
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
    ].sort((a, b) => Number(b.amountUsd) - Number(a.amountUsd))

    const summary = await this.gastosDelDia()

    return {
      date: hoy,
      items,
      summary: {
        gastosCantidad: summary.cantidad,
        gastosMontoUsd: summary.montoUsd.toFixed(4),
      },
    }
  }

  private async gananciaDelDia(): Promise<GananciaDelDia> {
    const hoy = DateTime.now().toISODate()!

    const row = await db
      .from('orders')
      .join('order_lines', 'order_lines.order_id', 'orders.id')
      .join('catalog_products', 'catalog_products.id', 'order_lines.catalog_product_id')
      .whereIn('orders.status', [...SALE_STATUSES])
      .where('orders.order_date', hoy)
      .select(
        db.raw(
          'COALESCE(SUM((order_lines.unit_price_usd - COALESCE(order_lines.cost_usd, catalog_products.cost_usd)) * (order_lines.quantity - order_lines.returned_quantity)), 0) as profit'
        ),
        db.raw(
          'COALESCE(SUM((order_lines.quantity - order_lines.returned_quantity) * order_lines.unit_price_usd), 0) as sales'
        ),
        db.raw(
          `COALESCE(SUM(CASE WHEN orders.payment_type = 'CREDIT' THEN (order_lines.unit_price_usd - COALESCE(order_lines.cost_usd, catalog_products.cost_usd)) * (order_lines.quantity - order_lines.returned_quantity) ELSE 0 END), 0) as credit_profit`
        ),
        db.raw(
          `COALESCE(SUM(CASE WHEN orders.payment_type = 'CREDIT' THEN (order_lines.quantity - order_lines.returned_quantity) * order_lines.unit_price_usd ELSE 0 END), 0) as credit_sales`
        )
      )
      .first()

    const profit = Number(row?.profit ?? 0)
    const sales = Number(row?.sales ?? 0)
    const creditProfit = Number(row?.credit_profit ?? 0)
    const creditSales = Number(row?.credit_sales ?? 0)
    const gastos = await this.gastosDelDia()
    const netProfit = profit - creditProfit - gastos.montoUsd
    const ventasContado = sales - creditSales
    const porcentaje = ventasContado > 0 ? (netProfit / ventasContado) * 100 : 0

    return {
      montoUsd: netProfit.toFixed(4),
      gananciaCreditoUsd: creditProfit.toFixed(4),
      porcentajeSobreVentas: Math.round(porcentaje * 100) / 100,
    }
  }

  private async ventasSeries(chart: 'daily' | 'weekly' | 'monthly'): Promise<VentasSeriePoint[]> {
    const hoy = DateTime.now()
    const buckets =
      chart === 'daily'
        ? buildDailyVentasBuckets(hoy)
        : chart === 'weekly'
          ? buildWeeklyVentasBuckets(hoy)
          : buildMonthlyVentasBuckets(hoy)

    const points: VentasSeriePoint[] = []
    let prevTotal = 0

    for (const bucket of buckets) {
      const row = await db
        .from('orders')
        .join('order_lines', 'order_lines.order_id', 'orders.id')
        .whereIn('orders.status', [...SALE_STATUSES])
        .where('orders.order_date', '>=', bucket.desde)
        .where('orders.order_date', '<=', bucket.hasta)
        .select(
          db.raw(
            'COALESCE(SUM((order_lines.quantity - order_lines.returned_quantity) * order_lines.unit_price_usd), 0) as total_usd'
          )
        )
        .first()

      const legacyTotal = await this.sumLegacyOrdersSalesUsd(bucket.desde, bucket.hasta)
      const total = Number(row?.total_usd ?? 0) + legacyTotal
      const variacionPct = prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : null

      points.push({
        label: bucket.label,
        totalUsd: total.toFixed(4),
        variacionPct: variacionPct !== null ? Math.round(variacionPct * 100) / 100 : null,
      })
      prevTotal = total
    }

    return points
  }

  private async clientesConCredito(): Promise<ClienteCreditoItem[]> {
    const hoy = DateTime.now().toISODate()!

    const rows = await db
      .from('customers')
      .join('orders', 'orders.customer_id', 'customers.id')
      .where('orders.balance_usd', '>', 0)
      .whereIn('orders.status', [...SALE_STATUSES])
      .groupBy('customers.id', 'customers.name')
      .select(
        'customers.id',
        'customers.name',
        db.raw('COUNT(orders.id) as pedidos'),
        db.raw('SUM(orders.balance_usd) as saldo'),
        db.raw(
          `MAX(CASE WHEN orders.credit_due_date < ? AND orders.balance_usd > 0 THEN 1 ELSE 0 END) as vencida`,
          [hoy]
        )
      )

    return rows.map((row) => ({
      id: Number(row.id),
      name: String(row.name),
      pedidosConSaldo: Number(row.pedidos),
      saldoPendienteUsd: Number(row.saldo).toFixed(4),
      estado: Number(row.vencida) > 0 ? 'vencida' : 'vigente',
    }))
  }

  private async proveedoresConCredito(): Promise<ProveedorCreditoItem[]> {
    const hoy = DateTime.now().toISODate()!

    const rows = await db
      .from('suppliers')
      .join('purchases', 'purchases.supplier_id', 'suppliers.id')
      .where('purchases.is_credit', true)
      .where('purchases.status', 'CONFIRMED')
      .where('purchases.balance_usd', '>', 0)
      .groupBy('suppliers.id', 'suppliers.name')
      .select(
        'suppliers.id',
        'suppliers.name',
        db.raw('SUM(purchases.balance_usd) as saldo'),
        db.raw(
          `MAX(CASE WHEN purchases.credit_due_date < ? AND purchases.balance_usd > 0 THEN 1 ELSE 0 END) as vencida`,
          [hoy]
        )
      )

    return rows.map((row) => ({
      id: Number(row.id),
      name: String(row.name),
      saldoPendienteUsd: Number(row.saldo).toFixed(4),
      estado: Number(row.vencida) > 0 ? 'vencida' : 'vigente',
    }))
  }
}
