import SaleService from '#services/sale_service'
import { serializeSale, serializeSaleListItem } from '#transformers/sale_transformer'
import { createSaleValidator, listSalesValidator } from '#validators/sale'
import type { HttpContext } from '@adonisjs/core/http'

export default class SalesController {
  private service = new SaleService()

  async index({ request, serialize }: HttpContext) {
    const filters = await request.validateUsing(listSalesValidator)
    const paginator = await this.service.listar({
      page: filters.page,
      perPage: filters.per_page,
      customer_id: filters.customer_id,
      date_from: filters.date_from,
      date_to: filters.date_to,
    })

    return serialize({
      sales: paginator.all().map((sale) => serializeSaleListItem(sale)),
      meta: paginator.getMeta(),
    })
  }

  async show({ params, serialize }: HttpContext) {
    const sale = await this.service.obtenerDetalle(Number(params.id))

    return serialize({
      sale: serializeSale(sale),
    })
  }

  async store({ request, serialize }: HttpContext) {
    const payload = await request.validateUsing(createSaleValidator)
    const sale = await this.service.crear(payload)

    return serialize({
      sale: serializeSale(sale),
    })
  }
}
