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
})
