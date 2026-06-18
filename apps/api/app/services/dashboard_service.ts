import MaterialService from '#services/material_service'
import CatalogProduct from '#models/catalog_product'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

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
  totalBs: string
}

export type MachineExpensesMonthSummary = {
  quantity: number
  totalAmount: string
}

export type VentasDelDia = {
  productosVendidos: number
  montoProductosUsd: string
  gastosCantidad: number
  gastosMontoUsd: string
}

export type GananciaDelDia = {
  montoUsd: string
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

  async overview(chart: 'weekly' | 'monthly' = 'weekly'): Promise<DashboardOverview> {
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
    const hoy = DateTime.now().toISODate()!

    const stats = await db
      .from('purchases')
      .where('status', 'CONFIRMED')
      .where((builder) => {
        builder
          .where((cashBuilder) => {
            cashBuilder
              .where('is_credit', false)
              .where('date', '>=', inicioMes)
              .where('date', '<=', finMes)
          })
          .orWhere((creditBuilder) => {
            creditBuilder
              .where('is_credit', true)
              .whereNotNull('credit_due_date')
              .where('credit_due_date', '>=', inicioMes)
              .where('credit_due_date', '<=', finMes)
              .where('credit_due_date', '<=', hoy)
          })
      })
      .select(db.raw('COALESCE(SUM(total_bs), 0) as total_bs'), db.raw('COUNT(*) as quantity'))
      .first()

    return {
      quantity: Number(stats?.quantity ?? 0),
      totalBs: Number(stats?.total_bs ?? 0).toFixed(2),
    }
  }

  private async gastosMaquinasDelMes(): Promise<MachineExpensesMonthSummary> {
    const inicioMes = DateTime.now().startOf('month').toISODate()!
    const finMes = DateTime.now().endOf('month').toISODate()!

    const machineExpenses = await db
      .from('machine_expenses')
      .where('date', '>=', inicioMes)
      .where('date', '<=', finMes)
      .select(db.raw('COALESCE(SUM(amount), 0) as total_amount'), db.raw('COUNT(*) as quantity'))
      .first()

    return {
      quantity: Number(machineExpenses?.quantity ?? 0),
      totalAmount: Number(machineExpenses?.total_amount ?? 0).toFixed(2),
    }
  }

  private todayRange() {
    const hoy = DateTime.now().toISODate()!
    return { desde: `${hoy} 00:00:00`, hasta: `${hoy} 23:59:59` }
  }

  private async ventasDelDia(): Promise<VentasDelDia> {
    const { desde, hasta } = this.todayRange()

    const ventas = await db
      .from('orders')
      .join('order_lines', 'order_lines.order_id', 'orders.id')
      .whereIn('orders.status', [...SALE_STATUSES])
      .whereNotNull('orders.confirmed_at')
      .whereBetween('orders.confirmed_at', [desde, hasta])
      .select(
        db.raw(
          'COALESCE(SUM(order_lines.quantity - order_lines.returned_quantity), 0) as qty'
        ),
        db.raw(
          'COALESCE(SUM((order_lines.quantity - order_lines.returned_quantity) * order_lines.unit_price_usd), 0) as total_usd'
        )
      )
      .first()

    const hoy = DateTime.now().toISODate()!

    const expenses = await db
      .from('expenses')
      .where('date', hoy)
      .select(
        db.raw('COUNT(*) as qty'),
        db.raw('COALESCE(SUM(amount_usd), 0) as total_usd')
      )
      .first()

    const machine = await db
      .from('machine_expenses')
      .where('date', hoy)
      .select(db.raw('COUNT(*) as qty'), db.raw('COALESCE(SUM(amount), 0) as total_amount'))
      .first()

    const gastosCantidad = Number(expenses?.qty ?? 0) + Number(machine?.qty ?? 0)
    const gastosMontoUsd = Number(expenses?.total_usd ?? 0) + Number(machine?.total_amount ?? 0)

    return {
      productosVendidos: Number(ventas?.qty ?? 0),
      montoProductosUsd: Number(ventas?.total_usd ?? 0).toFixed(4),
      gastosCantidad,
      gastosMontoUsd: gastosMontoUsd.toFixed(4),
    }
  }

  async productosVendidosDelDia(): Promise<DailyProductSalesResult> {
    const hoy = DateTime.now().toISODate()!
    const { desde, hasta } = this.todayRange()

    const rows = await db
      .from('orders')
      .join('order_lines', 'order_lines.order_id', 'orders.id')
      .join('catalog_products', 'catalog_products.id', 'order_lines.catalog_product_id')
      .whereIn('orders.status', [...SALE_STATUSES])
      .whereNotNull('orders.confirmed_at')
      .whereBetween('orders.confirmed_at', [desde, hasta])
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

    const products: DailySoldProductItem[] = rows.map((row) => {
      const quantitySold = Number(row.quantitySold ?? 0)
      const totalUsd = Number(row.totalUsd ?? 0)
      const unitPriceUsd =
        quantitySold > 0 ? (totalUsd / quantitySold).toFixed(4) : '0.0000'

      return {
        id: Number(row.id),
        name: String(row.name),
        category: String(row.category),
        saleUnit: String(row.saleUnit),
        imagePath: row.imagePath ? String(row.imagePath) : null,
        stockQuantity: String(row.stockQuantity ?? '0'),
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

  private async gananciaDelDia(): Promise<GananciaDelDia> {
    const { desde, hasta } = this.todayRange()

    const row = await db
      .from('orders')
      .join('order_lines', 'order_lines.order_id', 'orders.id')
      .join('catalog_products', 'catalog_products.id', 'order_lines.catalog_product_id')
      .whereIn('orders.status', [...SALE_STATUSES])
      .whereNotNull('orders.confirmed_at')
      .whereBetween('orders.confirmed_at', [desde, hasta])
      .select(
        db.raw(
          'COALESCE(SUM((order_lines.unit_price_usd - catalog_products.cost_usd) * (order_lines.quantity - order_lines.returned_quantity)), 0) as profit'
        ),
        db.raw(
          'COALESCE(SUM((order_lines.quantity - order_lines.returned_quantity) * order_lines.unit_price_usd), 0) as sales'
        )
      )
      .first()

    const profit = Number(row?.profit ?? 0)
    const sales = Number(row?.sales ?? 0)
    const porcentaje = sales > 0 ? (profit / sales) * 100 : 0

    return {
      montoUsd: profit.toFixed(4),
      porcentajeSobreVentas: Math.round(porcentaje * 100) / 100,
    }
  }

  private async ventasSeries(chart: 'weekly' | 'monthly'): Promise<VentasSeriePoint[]> {
    const hoy = DateTime.now()
    const buckets: { desde: string; hasta: string; label: string }[] = []

    if (chart === 'weekly') {
      for (let i = 7; i >= 0; i--) {
        const start = hoy.minus({ weeks: i }).startOf('week')
        const end = start.endOf('week')
        buckets.push({
          desde: start.toISODate()!,
          hasta: end.toISODate()!,
          label: String(8 - i),
        })
      }
    } else {
      for (let i = 5; i >= 0; i--) {
        const start = hoy.minus({ months: i }).startOf('month')
        const end = start.endOf('month')
        buckets.push({
          desde: start.toISODate()!,
          hasta: end.toISODate()!,
          label: start.setLocale('es').toFormat('MMMM'),
        })
      }
    }

    const points: VentasSeriePoint[] = []
    let prevTotal = 0

    for (const bucket of buckets) {
      const row = await db
        .from('orders')
        .join('order_lines', 'order_lines.order_id', 'orders.id')
        .whereIn('orders.status', [...SALE_STATUSES])
        .whereNotNull('orders.confirmed_at')
        .where('orders.confirmed_at', '>=', `${bucket.desde} 00:00:00`)
        .where('orders.confirmed_at', '<=', `${bucket.hasta} 23:59:59`)
        .select(
          db.raw(
            'COALESCE(SUM((order_lines.quantity - order_lines.returned_quantity) * order_lines.unit_price_usd), 0) as total_usd'
          )
        )
        .first()

      const total = Number(row?.total_usd ?? 0)
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
