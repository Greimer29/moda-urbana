import Customer from '#models/customer'
import Order from '#models/order'
import User from '#models/user'
import testUtils from '@adonisjs/core/services/test_utils'
import { resetTestDatabase } from '#tests/helpers/reset_test_database'
import { DateTime } from 'luxon'
import { test } from '@japa/runner'

const TEST_EMAIL = 'test-customers@hebra.local'
const TEST_PASSWORD = 'password123'

async function seedAdminUser() {
  await User.updateOrCreate(
    { email: TEST_EMAIL },
    {
      password: TEST_PASSWORD,
      name: 'Admin Test',
      role: 'ADMIN',
      active: true,
    }
  )
}

test.group('Customers API', (group) => {
  group.setup(async () => {
    await testUtils.db().migrate()
  })

  group.each.setup(async () => {
    await resetTestDatabase()
    await seedAdminUser()
  })

  test('GET /api/v1/customers requires authentication', async ({ client }) => {
    const response = await client.get('/api/v1/customers')
    response.assertStatus(401)
  })

  test('POST /api/v1/customers creates customer with normalized phone and email', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    const response = await client.post('/api/v1/customers').loginAs(user).json({
      name: 'Acme Corp',
      phone: '04128332238',
      email: 'Contacto@Acme.com',
      type: 'CORPORATE',
      document: 'J-12345678-9',
      address: 'Av. Principal 123',
      notes: 'Customer frecuente',
    })

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        customer: {
          name: 'Acme Corp',
          phone: '+584128332238',
          email: 'contacto@acme.com',
          type: 'CORPORATE',
          document: 'J-12345678-9',
          active: true,
        },
      },
    })

    const body = response.body() as { data: { customer: { id: number } } }
    assert.exists(body.data.customer.id)
  })

  test('POST /api/v1/customers rejects duplicate email', async ({ client }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    await Customer.create({
      name: 'Existente',
      email: 'duplicado@example.com',
      type: 'OTHER',
      active: true,
    })

    const response = await client.post('/api/v1/customers').loginAs(user).json({
      name: 'Duplicado',
      email: 'Duplicado@Example.com',
      type: 'OTHER',
    })

    response.assertStatus(422)
    response.assertBodyContains({
      error: {
        code: 'EMAIL_DUPLICADO',
      },
    })
  })

  test('POST /api/v1/customers rejects duplicate phone', async ({ client }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    await Customer.create({
      name: 'Existente',
      phone: '+584128332238',
      type: 'OTHER',
      active: true,
    })

    const response = await client.post('/api/v1/customers').loginAs(user).json({
      name: 'Duplicado Tel',
      phone: '04128332238',
      type: 'OTHER',
    })

    response.assertStatus(422)
    response.assertBodyContains({
      error: {
        code: 'TELEFONO_DUPLICADO',
      },
    })
  })

  test('POST /api/v1/customers rejects invalid phone', async ({ client }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    const response = await client.post('/api/v1/customers').loginAs(user).json({
      name: 'Customer Mal Tel',
      phone: '123',
      type: 'OTHER',
    })

    response.assertStatus(422)
    response.assertBodyContains({
      error: {
        code: 'TELEFONO_INVALIDO',
      },
    })
  })

  test('GET /api/v1/customers/:id returns customer with orders history', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await Customer.create({
      name: 'Customer Detalle',
      type: 'WHITE_LABEL',
      active: true,
    })

    await Order.create({
      code: 'PED-202605-0001',
      customerId: customer.id,
      modality: 'WHITE_LABEL',
      description: 'Camisetas polo',
      totalQuantity: 100,
      orderDate: DateTime.fromISO('2026-05-01'),
      status: 'CONFIRMED',
    })

    const response = await client.get(`/api/v1/customers/${customer.id}`).loginAs(user)

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        customer: {
          id: Number(customer.id),
          name: 'Customer Detalle',
          orders: [
            {
              code: 'PED-202605-0001',
              status: 'CONFIRMED',
            },
          ],
        },
      },
    })

    const body = response.body() as { data: { customer: { orders: unknown[] } } }
    assert.lengthOf(body.data.customer.orders, 1)
  })

  test('GET /api/v1/customers/:id returns 404 for missing customer', async ({ client }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    const response = await client.get('/api/v1/customers/99999').loginAs(user)

    response.assertStatus(404)
    response.assertBodyContains({
      error: {
        code: 'CLIENTE_NO_ENCONTRADO',
      },
    })
  })

  test('PUT /api/v1/customers/:id updates customer', async ({ client }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await Customer.create({
      name: 'Antes',
      type: 'OTHER',
      active: true,
    })

    const response = await client.put(`/api/v1/customers/${customer.id}`).loginAs(user).json({
      name: 'Después',
      type: 'CORPORATE',
      notes: 'Actualizado',
    })

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        customer: {
          name: 'Después',
          type: 'CORPORATE',
          notes: 'Actualizado',
        },
      },
    })
  })

  test('DELETE /api/v1/customers/:id hard deletes when no orders', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await Customer.create({
      name: 'Para Borrar',
      type: 'OTHER',
      active: true,
    })

    const response = await client.delete(`/api/v1/customers/${customer.id}`).loginAs(user)

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        eliminado: true,
        modo: 'hard',
      },
    })

    const deleted = await Customer.find(customer.id)
    assert.isNull(deleted)
  })

  test('DELETE /api/v1/customers/:id soft deletes when has orders', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await Customer.create({
      name: 'Con Orders',
      type: 'OTHER',
      active: true,
    })

    await Order.create({
      code: 'PED-202605-0002',
      customerId: customer.id,
      modality: 'CORPORATE',
      description: 'Uniformes',
      totalQuantity: 50,
      orderDate: DateTime.now(),
      status: 'DRAFT',
    })

    const response = await client.delete(`/api/v1/customers/${customer.id}`).loginAs(user)

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        eliminado: true,
        modo: 'soft',
      },
    })

    await customer.refresh()
    assert.isFalse(Boolean(customer.active))
  })

  test('GET /api/v1/customers lists customers with pagination and filters', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    await Customer.create({ name: 'Listado Alpha', type: 'CORPORATE', active: true })
    await Customer.create({ name: 'Listado Beta', type: 'WHITE_LABEL', active: true })
    await Customer.create({ name: 'Otro Customer', type: 'OTHER', active: false })

    const response = await client
      .get('/api/v1/customers?search=Listado&type=CORPORATE')
      .loginAs(user)

    response.assertStatus(200)

    const body = response.body()
    assert.equal(body.data.meta.total, 1)
    assert.lengthOf(body.data.customers, 1)
    assert.equal(body.data.customers[0].name, 'Listado Alpha')
  })

  test('POST /api/v1/customers/:id/image stores customer photo', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await Customer.create({
      name: 'Cliente con foto',
      type: 'CORPORATE',
      active: true,
    })

    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64'
    )

    const response = await client
      .post(`/api/v1/customers/${customer.id}/image`)
      .loginAs(user)
      .file('image', png, {
        filename: 'cliente.png',
        contentType: 'image/png',
      })

    response.assertStatus(200)

    const body = response.body() as { data: { customer: { imagePath: string | null } } }
    assert.isNotNull(body.data.customer.imagePath)

    const downloadResponse = await client
      .get(`/api/v1/customers/${customer.id}/image`)
      .loginAs(user)

    downloadResponse.assertStatus(200)
    downloadResponse.assertHeader('content-type', 'image/png')
  })

  test('GET /api/v1/customers/:id/account-statement lists orders and saldo pendiente', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await Customer.create({
      name: 'Cliente Cuenta',
      type: 'CORPORATE',
      creditDays: 30,
      active: true,
    })

    await Order.create({
      code: 'PED-DRAFT-001',
      customerId: customer.id,
      modality: 'CORPORATE',
      description: 'Borrador',
      totalQuantity: 1,
      orderDate: DateTime.now().minus({ days: 10 }),
      status: 'DRAFT',
      paymentType: 'CASH',
      amountPaidUsd: '0.0000',
      balanceUsd: '0.0000',
      totalPrice: '100.0000',
    })

    await Order.create({
      code: 'PED-CASH-001',
      customerId: customer.id,
      modality: 'CORPORATE',
      description: 'Contado',
      totalQuantity: 1,
      orderDate: DateTime.now().minus({ days: 5 }),
      status: 'DELIVERED',
      paymentType: 'CASH',
      amountPaidUsd: '25.0000',
      balanceUsd: '0.0000',
      totalPrice: '25.0000',
      confirmedAt: DateTime.now().minus({ days: 5 }),
    })

    await Order.create({
      code: 'PED-CRED-001',
      customerId: customer.id,
      modality: 'CORPORATE',
      description: 'Crédito',
      totalQuantity: 1,
      orderDate: DateTime.now().minus({ days: 3 }),
      status: 'CONFIRMED',
      paymentType: 'CREDIT',
      amountPaidUsd: '10.0000',
      balanceUsd: '40.0000',
      creditDueDate: DateTime.now().plus({ days: 15 }),
      totalPrice: '50.0000',
      confirmedAt: DateTime.now().minus({ days: 3 }),
    })

    await Order.create({
      code: 'PED-CANC-001',
      customerId: customer.id,
      modality: 'CORPORATE',
      description: 'Cancelado',
      totalQuantity: 1,
      orderDate: DateTime.now().minus({ days: 1 }),
      status: 'CANCELLED',
      paymentType: 'CREDIT',
      amountPaidUsd: '0.0000',
      balanceUsd: '15.0000',
      totalPrice: '15.0000',
    })

    const response = await client
      .get(`/api/v1/customers/${customer.id}/account-statement`)
      .loginAs(user)

    response.assertStatus(200)

    const body = response.body() as {
      data: {
        orders: Array<{ code: string; status: string; paymentType: string }>
        saldoPendienteUsd: string
      }
    }

    assert.lengthOf(body.data.orders, 4)
    assert.exists(body.data.orders.find((order) => order.status === 'DRAFT'))
    assert.exists(body.data.orders.find((order) => order.status === 'CANCELLED'))
    assert.exists(
      body.data.orders.find((order) => order.paymentType === 'CASH' && order.status === 'DELIVERED')
    )
    assert.exists(
      body.data.orders.find(
        (order) => order.paymentType === 'CREDIT' && order.status === 'CONFIRMED'
      )
    )
    assert.equal(body.data.saldoPendienteUsd, '40.0000')
  })

  test('GET /api/v1/customers/:id/account-statement excludes cash orders from saldo', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await Customer.create({
      name: 'Cliente Solo Contado',
      type: 'CORPORATE',
      creditDays: 30,
      active: true,
    })

    await Order.create({
      code: 'PED-CASH-ONLY',
      customerId: customer.id,
      modality: 'CORPORATE',
      description: 'Solo contado',
      totalQuantity: 1,
      orderDate: DateTime.now(),
      status: 'DELIVERED',
      paymentType: 'CASH',
      amountPaidUsd: '80.0000',
      balanceUsd: '0.0000',
      totalPrice: '80.0000',
      confirmedAt: DateTime.now(),
    })

    const response = await client
      .get(`/api/v1/customers/${customer.id}/account-statement`)
      .loginAs(user)

    response.assertStatus(200)

    const body = response.body() as { data: { saldoPendienteUsd: string } }
    assert.equal(body.data.saldoPendienteUsd, '0.0000')
  })

  test('POST /api/v1/customers/:id/payments registers payment without account', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await Customer.create({
      name: 'Cliente Abono',
      type: 'CORPORATE',
      creditDays: 30,
      active: true,
    })

    const order = await Order.create({
      code: 'PED-ABONO-001',
      customerId: customer.id,
      modality: 'CORPORATE',
      description: 'Pedido a crédito',
      totalQuantity: 1,
      orderDate: DateTime.now().minus({ days: 2 }),
      status: 'CONFIRMED',
      paymentType: 'CREDIT',
      amountPaidUsd: '0.0000',
      balanceUsd: '12.0000',
      creditDueDate: DateTime.fromISO('2026-06-20'),
      totalPrice: '12.0000',
      confirmedAt: DateTime.now().minus({ days: 2 }),
    })

    const response = await client
      .post(`/api/v1/customers/${customer.id}/payments`)
      .loginAs(user)
      .json({
        order_id: order.id,
        account_id: null,
        amount_usd: 12,
        date: '2026-06-20',
      })

    response.assertStatus(200)

    const body = response.body() as {
      data: { payment: { customerId: number; orderId: number; amountUsd: string } }
    }

    assert.equal(body.data.payment.customerId, customer.id)
    assert.equal(body.data.payment.orderId, order.id)
    assert.equal(body.data.payment.amountUsd, '12.0000')

    await order.refresh()
    assert.equal(order.balanceUsd, '0.0000')
    assert.equal(order.amountPaidUsd, '12.0000')
  })
})
