import CustomerService from '#services/customer_service'
import CustomerPaymentService from '#services/customer_payment_service'
import { serializeCustomer, serializeCustomerConOrders } from '#transformers/customer_transformer'
import {
  createCustomerValidator,
  listCustomersValidator,
  updateCustomerValidator,
} from '#validators/customer'
import { createCustomerPaymentValidator } from '#validators/payment'
import type { HttpContext } from '@adonisjs/core/http'

export default class CustomersControleler {
  private service = new CustomerService()
  private paymentService = new CustomerPaymentService()

  /**
   * GET /api/v1/customers
   */
  async index({ request, serialize }: HttpContext) {
    const filters = await request.validateUsing(listCustomersValidator)
    const paginator = await this.service.listar({
      page: filters.page,
      perPage: filters.per_page,
      search: filters.search,
      type: filters.type,
      active: filters.active,
    })

    return serialize({
      customers: paginator.all().map((customer) => serializeCustomer(customer)),
      meta: paginator.getMeta(),
    })
  }

  /**
   * GET /api/v1/customers/:id
   */
  async show({ params, serialize }: HttpContext) {
    const customer = await this.service.obtenerConOrders(Number(params.id))

    return serialize({
      customer: serializeCustomerConOrders(customer),
    })
  }

  /**
   * POST /api/v1/customers
   */
  async store({ request, serialize }: HttpContext) {
    const payload = await request.validateUsing(createCustomerValidator)
    const customer = await this.service.crear(payload)

    return serialize({
      customer: serializeCustomer(customer),
    })
  }

  /**
   * PUT /api/v1/customers/:id
   */
  async update({ params, request, serialize }: HttpContext) {
    const payload = await request.validateUsing(updateCustomerValidator)
    const customer = await this.service.actualizar(Number(params.id), payload)

    return serialize({
      customer: serializeCustomer(customer),
    })
  }

  /**
   * DELETE /api/v1/customers/:id
   */
  async destroy({ params, serialize }: HttpContext) {
    const result = await this.service.eliminar(Number(params.id))

    return serialize({
      id: result.id,
      eliminado: true,
      modo: result.modo,
    })
  }

  async storePayment({ params, request, serialize }: HttpContext) {
    const payload = await request.validateUsing(createCustomerPaymentValidator)
    const payment = await this.paymentService.registrar({
      ...payload,
      customer_id: Number(params.id),
    })

    return serialize({
      payment: {
        id: Number(payment.id),
        customerId: Number(payment.customerId),
        orderId: payment.orderId ? Number(payment.orderId) : null,
        amountUsd: payment.amountUsd,
        date: payment.date.toISODate(),
        note: payment.note,
      },
    })
  }
}
