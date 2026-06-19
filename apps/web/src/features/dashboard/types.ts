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

export type DashboardOverview = {
  bajoStock: BajoStockItem[]
  bajoStockProductos: BajoStockProductoItem[]
  purchasesMonth: { quantity: number; totalUsd: string }
  machineExpensesMonth: { quantity: number; totalAmount: string }
  ventasDelDia: VentasDelDia
  gananciaDelDia: GananciaDelDia
  ventasSeries: VentasSeriePoint[]
  clientesCredito: ClienteCreditoItem[]
  proveedoresCredito: ProveedorCreditoItem[]
}

export type DashboardOverviewResponse = {
  data: DashboardOverview
}

export type DashboardChartMode = 'weekly' | 'monthly'

export type DailySoldProduct = {
  id: number
  name: string
  category: string
  sale_unit: string
  image_path: string | null
  stock_quantity: string
  quantity_sold: number
  unit_price_usd: string
  total_usd: string
}

export type DailyProductSales = {
  date: string
  products: DailySoldProduct[]
  summary: {
    productos_vendidos: number
    monto_productos_usd: string
  }
}

export type DailyProductSalesResponse = {
  data: DailyProductSales
}

export type DailyExpenseItem = {
  id: number
  kind: 'expense' | 'machine_expense'
  description: string
  amount_usd: string
  machine_name: string | null
  category: string | null
}

export type DailyExpenses = {
  date: string
  items: DailyExpenseItem[]
  summary: {
    gastos_cantidad: number
    gastos_monto_usd: string
  }
}

export type DailyExpensesResponse = {
  data: DailyExpenses
}
