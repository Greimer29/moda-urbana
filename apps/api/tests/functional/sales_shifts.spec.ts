import CatalogProduct from '#models/catalog_product'
import Customer from '#models/customer'
import Order from '#models/order'
import OrderLine from '#models/order_line'
import SalesShift from '#models/sales_shift'
import User from '#models/user'
import testUtils from '@adonisjs/core/services/test_utils'
import { resetTestDatabase } from '#tests/helpers/reset_test_database'
import { DateTime } from 'luxon'
import { test } from '@japa/runner'

const TEST_EMAIL = 'test-sales-shift@hebra.local'
const TEST_PASSWORD = 'password123'

async function seedAdminUser() {
  await User.updateOrCreate(
    { email: TEST_EMAIL },
    {
      password: TEST_PASSWORD,
      name: 'Admin Shift',
      role: 'ADMIN',
      active: true,
    }
  )
}

test.group('Sales shifts API', (group) => {
  group.setup(async () => {
    await testUtils.db().migrate()
  })

  group.each.setup(async () => {
    await resetTestDatabase()
    await seedAdminUser()
  })

  test('POST /sales-shifts/open creates OPEN shift', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const response = await client.post('/api/v1/sales-shifts/open').loginAs(user)

    response.assertStatus(200)
    const body = response.body().data
    assert.equal(body.sales_shift.status, 'OPEN')
    assert.isString(body.sales_shift.opened_at)
    assert.isNull(body.sales_shift.closed_at)
  })

  test('POST /sales-shifts/open fails when one is already OPEN', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    await client.post('/api/v1/sales-shifts/open').loginAs(user)
    const second = await client.post('/api/v1/sales-shifts/open').loginAs(user)

    second.assertStatus(409)
    assert.equal(second.body().error.code, 'TURNO_YA_ABIERTO')
  })

  test('POST /sales-shifts/:id/close closes open shift', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const opened = await client.post('/api/v1/sales-shifts/open').loginAs(user)
    const shiftId = opened.body().data.sales_shift.id

    const closed = await client.post(`/api/v1/sales-shifts/${shiftId}/close`).loginAs(user)
    closed.assertStatus(200)
    assert.equal(closed.body().data.sales_shift.status, 'CLOSED')
    assert.isString(closed.body().data.sales_shift.closed_at)

    const current = await client.get('/api/v1/sales-shifts/current').loginAs(user)
    assert.isNull(current.body().data.sales_shift)
  })

  test('confirming sale without open shift returns 409', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await Customer.create({
      name: 'Cliente turno',
      type: 'CORPORATE',
      active: true,
    })
    const product = await CatalogProduct.create({
      name: 'Producto turno',
      category: 'UNIFORM',
      saleUnit: 'UND',
      salePriceUsd: '10.0000',
      costUsd: '4.0000',
      stockQuantity: '5.000',
      active: true,
    })
    const order = await Order.create({
      code: 'PED-202608-0001',
      customerId: Number(customer.id),
      modality: 'CORPORATE',
      description: 'Venta sin turno',
      totalQuantity: 1,
      orderDate: DateTime.fromISO('2026-08-25'),
      status: 'DRAFT',
    })
    await OrderLine.create({
      orderId: Number(order.id),
      catalogProductId: Number(product.id),
      quantity: '1',
      returnedQuantity: '0',
      unitPriceUsd: '10.0000',
      subtotalUsd: '10.0000',
    })

    const response = await client
      .post(`/api/v1/orders/${order.id}/transition`)
      .loginAs(user)
      .json({ status: 'DELIVERED', payment_type: 'CASH' })

    response.assertStatus(409)
    assert.equal(response.body().error.code, 'TURNO_NO_ABIERTO')
  })

  test('confirmed sale links to open shift and appears in daily-closing by shift', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const opened = await client.post('/api/v1/sales-shifts/open').loginAs(user)
    const shiftId = opened.body().data.sales_shift.id

    const customer = await Customer.create({
      name: 'Cliente cierre turno',
      type: 'CORPORATE',
      active: true,
    })
    const product = await CatalogProduct.create({
      name: 'Producto cierre turno',
      category: 'UNIFORM',
      saleUnit: 'UND',
      salePriceUsd: '25.0000',
      costUsd: '10.0000',
      stockQuantity: '10.000',
      active: true,
    })
    const order = await Order.create({
      code: 'PED-202608-0002',
      customerId: Number(customer.id),
      modality: 'CORPORATE',
      description: 'Venta con turno',
      totalQuantity: 1,
      orderDate: DateTime.fromISO('2026-08-26'),
      status: 'DRAFT',
    })
    await OrderLine.create({
      orderId: Number(order.id),
      catalogProductId: Number(product.id),
      quantity: '1',
      returnedQuantity: '0',
      unitPriceUsd: '25.0000',
      subtotalUsd: '25.0000',
    })

    const transition = await client
      .post(`/api/v1/orders/${order.id}/transition`)
      .loginAs(user)
      .json({ status: 'DELIVERED', payment_type: 'CASH' })

    transition.assertStatus(200)

    await order.refresh()
    assert.equal(Number(order.salesShiftId), shiftId)

    const closing = await client
      .get(`/api/v1/reports/daily-closing?sales_shift_id=${shiftId}`)
      .loginAs(user)

    closing.assertStatus(200)
    const data = closing.body().data
    assert.equal(data.shift.id, shiftId)
    assert.equal(data.summary.tickets_count, 1)
    assert.equal(Number(data.summary.net_sales_usd), 25)
    assert.lengthOf(data.orders, 1)
  })

  test('sale after midnight still belongs to open shift from previous day', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const shift = await SalesShift.create({
      openedAt: DateTime.fromISO('2026-08-24T20:00:00', { zone: 'America/Caracas' }),
      closedAt: null,
      openedByUserId: Number(user.id),
      closedByUserId: null,
      status: 'OPEN',
      notes: null,
    })

    const customer = await Customer.create({
      name: 'Cliente medianoche',
      type: 'CORPORATE',
      active: true,
    })
    const product = await CatalogProduct.create({
      name: 'Producto medianoche',
      category: 'UNIFORM',
      saleUnit: 'UND',
      salePriceUsd: '15.0000',
      costUsd: '5.0000',
      stockQuantity: '3.000',
      active: true,
    })
    const order = await Order.create({
      code: 'PED-202608-0003',
      customerId: Number(customer.id),
      modality: 'CORPORATE',
      description: 'Venta post medianoche',
      totalQuantity: 1,
      orderDate: DateTime.fromISO('2026-08-25'),
      status: 'DRAFT',
    })
    await OrderLine.create({
      orderId: Number(order.id),
      catalogProductId: Number(product.id),
      quantity: '1',
      returnedQuantity: '0',
      unitPriceUsd: '15.0000',
      subtotalUsd: '15.0000',
    })

    const transition = await client
      .post(`/api/v1/orders/${order.id}/transition`)
      .loginAs(user)
      .json({ status: 'DELIVERED', payment_type: 'CASH' })

    transition.assertStatus(200)
    await order.refresh()
    assert.equal(Number(order.salesShiftId), Number(shift.id))

    const closing = await client
      .get(`/api/v1/reports/daily-closing?sales_shift_id=${shift.id}`)
      .loginAs(user)

    assert.equal(closing.body().data.summary.tickets_count, 1)
    assert.equal(Number(closing.body().data.summary.net_sales_usd), 15)
  })
})
