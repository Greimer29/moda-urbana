import User from '#models/user'
import CatalogProduct from '#models/catalog_product'
import Customer from '#models/customer'
import Order from '#models/order'
import OrderLine from '#models/order_line'
import Purchase from '#models/purchase'
import Supplier from '#models/supplier'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import { test } from '@japa/runner'

const TEST_EMAIL = 'test-reports@hebra.local'
const TEST_PASSWORD = 'password123'

async function resetDatabase() {
  await db.from('inventory_movements').delete()
  await db.from('purchase_items').delete()
  await db.from('purchases').delete()
  await db.from('expenses').delete()
  await db.from('machine_expenses').delete()
  await db.from('order_lines').delete()
  await db.from('order_materials').delete()
  await db.from('orders').delete()
  await db.from('formula_materials').delete()
  await db.from('formulas').delete()
  await db.from('catalog_products').delete()
  await db.from('materials').delete()
  await db.from('machines').delete()
  await db.from('customers').delete()
  await db.from('counters').delete()
  await db.from('suppliers').delete()
  await db.from('accounts').delete()
  await db.from('users').delete()
  await db.from('currencies').where('code', 'USD').update({
    rate_per_usd: '1.0000',
    is_active: true,
  })
  await db.from('currencies').where('code', 'VES').update({
    rate_per_usd: '1.0000',
    is_active: true,
  })
}

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

test.group('Reports API', (group) => {
  group.setup(async () => {
    await testUtils.db().migrate()
  })

  group.each.setup(async () => {
    await resetDatabase()
    await seedAdminUser()
  })

  test('GET /api/v1/reports/account-statement returns summary for month', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    const response = await client
      .get('/api/v1/reports/account-statement')
      .qs({ month: '2026-06', types: 'sales,purchases,expenses,machine_expenses' })
      .loginAs(user)

    response.assertStatus(200)
    assert.exists(response.body().data.summary)
    assert.exists(response.body().data.period)
    assert.isArray(response.body().data.movements)
  })

  test('GET /api/v1/reports/account-statement accepts unassigned filter', async ({ client }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    const response = await client
      .get('/api/v1/reports/account-statement')
      .qs({ month: '2026-06', unassigned: true })
      .loginAs(user)

    response.assertStatus(200)
  })

  test('GET /api/v1/reports/account-statement accepts types as repeated query params', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    const response = await client
      .get('/api/v1/reports/account-statement')
      .qs({ month: '2026-06', types: ['sales', 'purchases'] })
      .loginAs(user)

    response.assertStatus(200)
    assert.exists(response.body().data.summary)
  })

  test('GET /api/v1/reports/account-statement uses USD for catalog sales with returns', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await Customer.create({
      name: 'Cliente reporte',
      type: 'CORPORATE',
      active: true,
    })
    const product = await CatalogProduct.create({
      name: 'Zapatos Adidas',
      category: 'Calzado',
      salePriceUsd: '7.0000',
      costUsd: '4.0000',
      active: true,
    })
    const order = await Order.create({
      code: 'PED-202606-0008',
      customerId: customer.id,
      modality: 'CORPORATE',
      description: 'Zapatos Adidas',
      totalQuantity: 1,
      orderDate: DateTime.fromISO('2026-06-16'),
      status: 'DELIVERED',
      totalPrice: '7.0000',
      confirmedAt: DateTime.fromISO('2026-06-16'),
    })
    await OrderLine.create({
      orderId: order.id,
      catalogProductId: product.id,
      quantity: '1',
      unitPriceUsd: '7.0000',
      subtotalUsd: '7.0000',
      returnedQuantity: '0',
    })

    const response = await client
      .get('/api/v1/reports/account-statement')
      .qs({ month: '2026-06', types: 'sales', display_currency: 'USD' })
      .loginAs(user)

    response.assertStatus(200)
    const body = response.body() as {
      data: {
        movements: Array<{
          amountUsd: string
          amountNative: string
          currencyCode: string
          amountDisplay: string
        }>
        summary: { sales: string }
      }
    }

    assert.lengthOf(body.data.movements, 1)
    assert.equal(body.data.movements[0].currencyCode, 'USD')
    assert.equal(body.data.movements[0].amountUsd, '7.0000')
    assert.equal(body.data.movements[0].amountNative, '7.0000')
    assert.equal(body.data.movements[0].amountDisplay, '7.00')
    assert.equal(body.data.summary.sales, '7.00')
  })

  test('GET /api/v1/reports/account-statement subtracts returned catalog quantity', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await Customer.create({
      name: 'Cliente devolución',
      type: 'CORPORATE',
      active: true,
    })
    const product = await CatalogProduct.create({
      name: 'Zapatos Adidas',
      category: 'Calzado',
      salePriceUsd: '7.0000',
      costUsd: '4.0000',
      active: true,
    })
    const order = await Order.create({
      code: 'PED-202606-0009',
      customerId: customer.id,
      modality: 'CORPORATE',
      description: 'Zapatos Adidas',
      totalQuantity: 2,
      orderDate: DateTime.fromISO('2026-06-16'),
      status: 'DELIVERED',
      totalPrice: '7.0000',
      confirmedAt: DateTime.fromISO('2026-06-16'),
    })
    await OrderLine.create({
      orderId: order.id,
      catalogProductId: product.id,
      quantity: '2',
      unitPriceUsd: '7.0000',
      subtotalUsd: '14.0000',
      returnedQuantity: '1',
    })

    const response = await client
      .get('/api/v1/reports/account-statement')
      .qs({ month: '2026-06', types: 'sales', display_currency: 'USD' })
      .loginAs(user)

    response.assertStatus(200)
    const body = response.body() as {
      data: { movements: Array<{ amountUsd: string }>; summary: { sales: string } }
    }

    assert.equal(body.data.movements[0].amountUsd, '7.0000')
    assert.equal(body.data.summary.sales, '7.00')
  })

  test('GET account-statement includes credit purchases by due date and unpaid carryover', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const supplier = await Supplier.create({ name: 'Proveedor crédito', active: true })
    const today = DateTime.now()
    const month = today.toFormat('yyyy-MM')
    const monthStart = today.startOf('month')
    const monthEnd = today.endOf('month')
    const nextMonth = today.plus({ months: 1 })
    const nextMonthKey = nextMonth.toFormat('yyyy-MM')

    const duePast = DateTime.max(monthStart, today.minus({ days: 2 }))
    const dueFutureCandidate = today.plus({ days: 5 })
    const dueFuture =
      dueFutureCandidate <= monthEnd ? dueFutureCandidate : today.plus({ days: 1 })
    const dueNextMonth = nextMonth.startOf('month').plus({ days: 14 })

    await Purchase.create({
      supplierId: supplier.id,
      date: today.minus({ days: 20 }),
      invoiceNumber: 'F-CRED-VENC',
      totalUsd: '100.0000',
      totalBs: '3600.00',
      status: 'CONFIRMED',
      isCredit: true,
      creditDueDate: duePast,
      balanceUsd: '100.0000',
      amountPaidUsd: '0.0000',
    })

    await Purchase.create({
      supplierId: supplier.id,
      date: today.minus({ days: 5 }),
      invoiceNumber: 'F-CRED-PEND',
      totalUsd: '50.0000',
      totalBs: '1800.00',
      status: 'CONFIRMED',
      isCredit: true,
      creditDueDate: dueFuture,
      balanceUsd: '50.0000',
      amountPaidUsd: '0.0000',
    })

    await Purchase.create({
      supplierId: supplier.id,
      date: today.minus({ days: 10 }),
      invoiceNumber: 'F-CRED-PROX',
      totalUsd: '80.0000',
      totalBs: '2880.00',
      status: 'CONFIRMED',
      isCredit: true,
      creditDueDate: dueNextMonth,
      balanceUsd: '80.0000',
      amountPaidUsd: '0.0000',
    })

    await Purchase.create({
      supplierId: supplier.id,
      date: today,
      invoiceNumber: 'F-CONTADO',
      totalUsd: '25.0000',
      totalBs: '900.00',
      status: 'CONFIRMED',
      isCredit: false,
    })

    const currentMonthResponse = await client
      .get('/api/v1/reports/account-statement')
      .qs({ month, types: 'purchases', display_currency: 'USD' })
      .loginAs(user)

    currentMonthResponse.assertStatus(200)
    const currentBody = currentMonthResponse.body() as {
      data: {
        movements: Array<{
          amountUsd: string
          isCreditPurchase?: boolean
          creditReportStatus?: string
        }>
        summary: { purchasesUsd: string }
      }
    }

    const currentCredit = currentBody.data.movements.filter((m) => m.isCreditPurchase)
    assert.isAtLeast(currentCredit.length, 1)
    assert.exists(currentBody.data.movements.find((m) => m.amountUsd === '100.0000'))
    if (dueFuture <= monthEnd) {
      const pending = currentBody.data.movements.find((m) => m.amountUsd === '50.0000')
      assert.exists(pending)
      assert.equal(pending!.creditReportStatus, 'pending')
    }

    const nextMonthResponse = await client
      .get('/api/v1/reports/account-statement')
      .qs({ month: nextMonthKey, types: 'purchases', display_currency: 'USD' })
      .loginAs(user)

    nextMonthResponse.assertStatus(200)
    const nextBody = nextMonthResponse.body() as {
      data: {
        movements: Array<{
          amountUsd: string
          isCreditPurchase?: boolean
          creditReportStatus?: string
        }>
      }
    }

    assert.exists(nextBody.data.movements.find((m) => m.amountUsd === '80.0000'))
    if (duePast < nextMonth.startOf('month')) {
      assert.exists(nextBody.data.movements.find((m) => m.amountUsd === '100.0000'))
    }
  })
})
