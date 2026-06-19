import DashboardService from '#services/dashboard_service'
import { dashboardOverviewValidator } from '#validators/dashboard'
import type { HttpContext } from '@adonisjs/core/http'

export default class DashboardControleler {
  private service = new DashboardService()

  async resumen({ serialize }: HttpContext) {
    const resumen = await this.service.resumen()

    return serialize({
      bajoStock: resumen.bajoStock,
      purchasesMonth: resumen.purchasesMonth,
      machineExpensesMonth: resumen.machineExpensesMonth,
    })
  }

  async overview({ request, serialize }: HttpContext) {
    const filters = await request.validateUsing(dashboardOverviewValidator)
    const data = await this.service.overview(filters.chart ?? 'weekly')

    return serialize({
      bajoStock: data.bajoStock,
      bajoStockProductos: data.bajoStockProductos,
      purchasesMonth: data.purchasesMonth,
      machineExpensesMonth: data.machineExpensesMonth,
      ventasDelDia: data.ventasDelDia,
      gananciaDelDia: data.gananciaDelDia,
      ventasSeries: data.ventasSeries,
      clientesCredito: data.clientesCredito,
      proveedoresCredito: data.proveedoresCredito,
    })
  }

  async dailyProductSales({ serialize }: HttpContext) {
    const data = await this.service.productosVendidosDelDia()

    return serialize({
      date: data.date,
      products: data.products.map((product) => ({
        id: product.id,
        name: product.name,
        category: product.category,
        sale_unit: product.saleUnit,
        image_path: product.imagePath,
        stock_quantity: product.stockQuantity,
        quantity_sold: product.quantitySold,
        unit_price_usd: product.unitPriceUsd,
        total_usd: product.totalUsd,
      })),
      summary: {
        productos_vendidos: data.summary.productosVendidos,
        monto_productos_usd: data.summary.montoProductosUsd,
      },
    })
  }

  async dailyExpenses({ serialize }: HttpContext) {
    const data = await this.service.gastosDelDiaDetalle()

    return serialize({
      date: data.date,
      items: data.items.map((item) => ({
        id: item.id,
        kind: item.kind,
        description: item.description,
        amount_usd: item.amountUsd,
        machine_name: item.machineName,
        category: item.category,
      })),
      summary: {
        gastos_cantidad: data.summary.gastosCantidad,
        gastos_monto_usd: data.summary.gastosMontoUsd,
      },
    })
  }
}
