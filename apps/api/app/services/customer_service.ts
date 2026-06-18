import CustomerNoEncontradoException from '#exceptions/cliente_no_encontrado_exception'
import EmailDuplicadoException from '#exceptions/email_duplicado_exception'
import TelefonoDuplicadoException from '#exceptions/telefono_duplicado_exception'
import TelefonoInvalidoException from '#exceptions/telefono_invalido_exception'
import Customer from '#models/customer'
import Order from '#models/order'
import { normalizePhoneToE164 } from '#utils/phone'
import type { ModelPaginatorContract } from '@adonisjs/lucid/types/model'

export type CustomerInput = {
  name: string
  phone?: string | null
  email?: string | null
  type: string
  document?: string | null
  address?: string | null
  notes?: string | null
  active?: boolean
  credit_days?: number | null
}

export type ListCustomersFilters = {
  page?: number
  perPage?: number
  search?: string
  type?: string
  active?: boolean
}

export type EliminarCustomerResult = {
  id: number
  modo: 'soft' | 'hard'
}

export default class CustomerService {
  async listar(filters: ListCustomersFilters = {}): Promise<ModelPaginatorContract<Customer>> {
    const page = filters.page ?? 1
    const perPage = filters.perPage ?? 20

    const query = Customer.query().orderBy('name', 'asc')

    if (filters.search) {
      query.where((builder) => {
        builder
          .whereILike('name', `%${filters.search}%`)
          .orWhereILike('email', `%${filters.search}%`)
          .orWhereILike('document', `%${filters.search}%`)
      })
    }

    if (filters.type) {
      query.where('type', filters.type)
    }

    if (filters.active !== undefined) {
      query.where('active', filters.active)
    }

    return query.paginate(page, perPage)
  }

  async obtener(id: number): Promise<Customer> {
    const customer = await Customer.find(id)
    if (!customer) {
      throw new CustomerNoEncontradoException()
    }
    return customer
  }

  async obtenerConOrders(id: number): Promise<Customer> {
    const customer = await Customer.query()
      .where('id', id)
      .preload('orders', (ordersQuery) => {
        ordersQuery.orderBy('order_date', 'desc').orderBy('id', 'desc')
      })
      .first()

    if (!customer) {
      throw new CustomerNoEncontradoException()
    }

    return customer
  }

  async crear(input: CustomerInput): Promise<Customer> {
    const data = await this.prepareInput(input)
    await this.assertUnicos(data)

    return Customer.create(data)
  }

  async actualizar(id: number, input: CustomerInput): Promise<Customer> {
    const customer = await this.obtener(id)
    const data = await this.prepareInput(input)
    await this.assertUnicos(data, id)

    customer.merge(data)
    await customer.save()

    return customer
  }

  async eliminar(id: number): Promise<EliminarCustomerResult> {
    const customer = await this.obtener(id)

    const tieneOrders = await Order.query().where('customer_id', Number(customer.id)).first()

    if (tieneOrders) {
      customer.active = false
      await customer.save()
      return { id: Number(customer.id), modo: 'soft' }
    }

    await customer.delete()
    return { id: Number(customer.id), modo: 'hard' }
  }

  private async prepareInput(input: CustomerInput) {
    let phone: string | null = input.phone?.trim() || null

    if (phone) {
      try {
        phone = normalizePhoneToE164(phone)
      } catch {
        throw new TelefonoInvalidoException()
      }
    }

    return {
      name: input.name.trim(),
      phone,
      email: input.email?.trim().toLowerCase() || null,
      type: input.type,
      document: input.document?.trim() || null,
      address: input.address?.trim() || null,
      notes: input.notes?.trim() || null,
      active: input.active ?? true,
      creditDays: input.credit_days ?? null,
    }
  }

  private async assertUnicos(
    data: { phone: string | null; email: string | null },
    excludeId?: number
  ) {
    if (data.phone) {
      const query = Customer.query().where('phone', data.phone)
      if (excludeId) {
        query.whereNot('id', excludeId)
      }
      if (await query.first()) {
        throw new TelefonoDuplicadoException()
      }
    }

    if (data.email) {
      const query = Customer.query().where('email', data.email)
      if (excludeId) {
        query.whereNot('id', excludeId)
      }
      if (await query.first()) {
        throw new EmailDuplicadoException()
      }
    }
  }
}
