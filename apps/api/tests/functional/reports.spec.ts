import User from '#models/user'
import Account from '#models/account'
import CatalogProduct from '#models/catalog_product'
import CatalogProductSize from '#models/catalog_product_size'
import Customer from '#models/customer'
import CustomerPayment from '#models/customer_payment'
import Expense from '#models/expense'
import Formula from '#models/formula'
import InventoryMovement from '#models/inventory_movement'
import Material from '#models/material'
import Order from '#models/order'
import OrderLine from '#models/order_line'
import ProductInventoryMovement from '#models/product_inventory_movement'
import Purchase from '#models/purchase'
import Supplier from '#models/supplier'
import SupplierPayment from '#models/supplier_payment'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import { test } from '@japa/runner'

const TEST_EMAIL = 'test-reports@hebra.local'
const TEST_PASSWORD = 'password123'

async function resetDatabase() {
  await db.from('inventory_movements').delete()
  await db.from('product_inventory_movements').delete()
  await db.from('purchase_items').delete()
  await db.from('purchases').delete()
  await db.from('expenses').delete()
  await db.from('machine_expenses').delete()
  await db.from('customer_payments').delete()
  await db.from('supplier_payments').delete()
  await db.from('order_lines').delete()
  await db.from('order_materials').delete()
  await db.from('orders').delete()
  await db.from('formula_materials').delete()
  await db.from('formulas').delete()
  await db.from('catalog_product_sizes').delete()
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

  test('GET /api/v1/reports/account-statement returns summary for month', async ({
    client,
    assert,
  }) => {
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
    const dueFuture = dueFutureCandidate <= monthEnd ? dueFutureCandidate : today.plus({ days: 1 })
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
          isCreditPurchaseCarryover?: boolean
          creditBalanceUsd?: string
          creditReportStatus?: string
        }>
      }
    }

    assert.exists(nextBody.data.movements.find((m) => m.amountUsd === '80.0000'))
    if (duePast < nextMonth.startOf('month')) {
      const carryover = nextBody.data.movements.find(
        (m) => m.isCreditPurchase && m.creditBalanceUsd === '100.0000'
      )
      assert.exists(carryover)
      assert.equal(carryover!.amountUsd, '0.0000')
      assert.equal(carryover!.isCreditPurchaseCarryover, true)
    }
  })

  test('GET account-statement does not double-count overdue credit purchases across months', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const supplier = await Supplier.create({ name: 'Proveedor arrastre', active: true })

    await Purchase.create({
      supplierId: supplier.id,
      date: DateTime.fromISO('2026-05-10'),
      invoiceNumber: 'F-CRED-ARR',
      totalUsd: '120.0000',
      totalBs: '4320.00',
      status: 'CONFIRMED',
      isCredit: true,
      creditDueDate: DateTime.fromISO('2026-06-10'),
      balanceUsd: '120.0000',
      amountPaidUsd: '0.0000',
    })

    const dueMonth = await client
      .get('/api/v1/reports/account-statement')
      .qs({ month: '2026-06', types: 'purchases', display_currency: 'USD' })
      .loginAs(user)

    dueMonth.assertStatus(200)
    const dueBody = dueMonth.body() as {
      data: { summary: { purchasesUsd: string } }
    }
    assert.equal(dueBody.data.summary.purchasesUsd, '120.0000')

    const carryoverMonth = await client
      .get('/api/v1/reports/account-statement')
      .qs({ month: '2026-07', types: 'purchases', display_currency: 'USD' })
      .loginAs(user)

    carryoverMonth.assertStatus(200)
    const carryoverBody = carryoverMonth.body() as {
      data: {
        movements: Array<{
          amountUsd: string
          isCreditPurchaseCarryover?: boolean
          creditBalanceUsd?: string
        }>
        summary: { purchasesUsd: string }
      }
    }

    assert.equal(carryoverBody.data.summary.purchasesUsd, '0.0000')
    const carryover = carryoverBody.data.movements.find((m) => m.isCreditPurchaseCarryover)
    assert.exists(carryover)
    assert.equal(carryover!.amountUsd, '0.0000')
    assert.equal(carryover!.creditBalanceUsd, '120.0000')
  })

  test('GET account-statement lists settled credit purchases informatively with zero amount', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const supplier = await Supplier.create({ name: 'Proveedor saldado', active: true })
    const reportMonth = '2026-06'
    const dueDate = DateTime.fromISO('2026-06-15')

    await Purchase.create({
      supplierId: supplier.id,
      date: DateTime.fromISO('2026-05-20'),
      invoiceNumber: 'F-CRED-SALD',
      totalUsd: '100.0000',
      totalBs: '3600.00',
      status: 'CONFIRMED',
      isCredit: true,
      creditDueDate: dueDate,
      balanceUsd: '0.0000',
      amountPaidUsd: '100.0000',
    })

    await Purchase.create({
      supplierId: supplier.id,
      date: DateTime.fromISO('2026-06-10'),
      invoiceNumber: 'F-CONTADO-REF',
      totalUsd: '25.0000',
      totalBs: '900.00',
      status: 'CONFIRMED',
      isCredit: false,
    })

    const response = await client
      .get('/api/v1/reports/account-statement')
      .qs({ month: reportMonth, types: 'purchases', display_currency: 'USD' })
      .loginAs(user)

    response.assertStatus(200)
    const body = response.body() as {
      data: {
        movements: Array<{
          amountUsd: string
          isCreditPurchase?: boolean
          creditReportStatus?: string
        }>
        summary: { purchasesUsd: string }
      }
    }

    const settledCredit = body.data.movements.find((m) => m.amountUsd === '0.0000')
    assert.exists(settledCredit)
    assert.equal(settledCredit!.isCreditPurchase, true)
    assert.equal(settledCredit!.creditReportStatus, 'settled')
    assert.equal(body.data.summary.purchasesUsd, '25.0000')
    assert.exists(body.data.movements.find((m) => m.amountUsd === '25.0000'))
  })

  test('GET account-statement excludes credit sales from summary but lists them informatively', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await Customer.create({
      name: 'Cliente crédito reporte',
      type: 'CORPORATE',
      creditDays: 30,
      active: true,
    })
    const product = await CatalogProduct.create({
      name: 'Producto crédito',
      category: 'Camisas',
      salePriceUsd: '100.0000',
      costUsd: '40.0000',
      active: true,
    })
    const order = await Order.create({
      code: 'PED-CRED-REP',
      customerId: customer.id,
      modality: 'CORPORATE',
      description: 'Venta a crédito',
      totalQuantity: 1,
      orderDate: DateTime.fromISO('2026-06-01'),
      status: 'DELIVERED',
      paymentType: 'CREDIT',
      balanceUsd: '100.0000',
      amountPaidUsd: '0.0000',
      creditDueDate: DateTime.fromISO('2026-07-01'),
      totalPrice: '100.0000',
      confirmedAt: DateTime.fromISO('2026-06-01'),
    })
    await OrderLine.create({
      orderId: order.id,
      catalogProductId: product.id,
      quantity: '1',
      unitPriceUsd: '100.0000',
      subtotalUsd: '100.0000',
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
          type: string
          isIncome: boolean
          isCreditSale?: boolean
          amountUsd: string
        }>
        summary: { sales: string }
      }
    }

    assert.equal(body.data.summary.sales, '0.00')
    assert.lengthOf(body.data.movements, 1)
    assert.equal(body.data.movements[0].type, 'sale')
    assert.equal(body.data.movements[0].isIncome, false)
    assert.equal(body.data.movements[0].isCreditSale, true)
    assert.equal(body.data.movements[0].amountUsd, '100.0000')
  })

  test('GET account-statement counts customer payments as sales income on payment date', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await Customer.create({
      name: 'Cliente abono reporte',
      type: 'CORPORATE',
      creditDays: 30,
      active: true,
    })
    const product = await CatalogProduct.create({
      name: 'Producto abono',
      category: 'Camisas',
      salePriceUsd: '100.0000',
      costUsd: '40.0000',
      active: true,
    })
    const order = await Order.create({
      code: 'PED-ABONO-REP',
      customerId: customer.id,
      modality: 'CORPORATE',
      description: 'Venta a crédito con abono',
      totalQuantity: 1,
      orderDate: DateTime.fromISO('2026-06-01'),
      status: 'DELIVERED',
      paymentType: 'CREDIT',
      balanceUsd: '60.0000',
      amountPaidUsd: '40.0000',
      creditDueDate: DateTime.fromISO('2026-07-01'),
      totalPrice: '100.0000',
      confirmedAt: DateTime.fromISO('2026-06-01'),
    })
    await OrderLine.create({
      orderId: order.id,
      catalogProductId: product.id,
      quantity: '1',
      unitPriceUsd: '100.0000',
      subtotalUsd: '100.0000',
      returnedQuantity: '0',
    })
    await CustomerPayment.create({
      customerId: Number(customer.id),
      orderId: Number(order.id),
      accountId: null,
      amountUsd: '40.0000',
      date: DateTime.fromISO('2026-06-15'),
      note: 'Abono parcial',
    })

    const response = await client
      .get('/api/v1/reports/account-statement')
      .qs({ month: '2026-06', types: 'sales', display_currency: 'USD' })
      .loginAs(user)

    response.assertStatus(200)
    const body = response.body() as {
      data: {
        movements: Array<{
          type: string
          date: string
          isIncome: boolean
          isCreditSale?: boolean
          amountUsd: string
        }>
        summary: { sales: string }
      }
    }

    assert.equal(body.data.summary.sales, '40.00')
    const creditSale = body.data.movements.find((m) => m.type === 'sale')
    assert.exists(creditSale)
    assert.equal(creditSale!.isCreditSale, true)
    assert.equal(creditSale!.amountUsd, '60.0000')
    const paymentMovement = body.data.movements.find((m) => m.type === 'customer_payment')
    assert.exists(paymentMovement)
    assert.equal(paymentMovement!.date, '2026-06-15')
    assert.equal(paymentMovement!.isIncome, true)
    assert.equal(paymentMovement!.amountUsd, '40.0000')
  })

  test('GET account-statement omits customer payments outside period', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await Customer.create({
      name: 'Cliente abono fuera',
      type: 'CORPORATE',
      active: true,
    })
    await CustomerPayment.create({
      customerId: Number(customer.id),
      orderId: null,
      accountId: null,
      amountUsd: '25.0000',
      date: DateTime.fromISO('2026-07-05'),
      note: 'Abono julio',
    })

    const response = await client
      .get('/api/v1/reports/account-statement')
      .qs({ month: '2026-06', types: 'sales', display_currency: 'USD' })
      .loginAs(user)

    response.assertStatus(200)
    const body = response.body() as {
      data: {
        movements: Array<{ type: string }>
        summary: { sales: string }
      }
    }

    assert.equal(body.data.summary.sales, '0.00')
    assert.isEmpty(body.data.movements)
  })

  test('GET account-statement filters customer payments by account', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await Customer.create({
      name: 'Cliente cuenta',
      type: 'CORPORATE',
      active: true,
    })
    const accountA = await Account.create({ name: 'Caja A', description: null, isActive: true })
    const accountB = await Account.create({ name: 'Caja B', description: null, isActive: true })

    await CustomerPayment.create({
      customerId: Number(customer.id),
      orderId: null,
      accountId: Number(accountA.id),
      amountUsd: '30.0000',
      date: DateTime.fromISO('2026-06-10'),
    })
    await CustomerPayment.create({
      customerId: Number(customer.id),
      orderId: null,
      accountId: Number(accountB.id),
      amountUsd: '20.0000',
      date: DateTime.fromISO('2026-06-12'),
    })

    const filtered = await client
      .get('/api/v1/reports/account-statement')
      .qs({ month: '2026-06', types: 'sales', account_id: accountA.id, display_currency: 'USD' })
      .loginAs(user)

    filtered.assertStatus(200)
    const filteredBody = filtered.body() as {
      data: {
        movements: Array<{ amountUsd: string }>
        summary: { sales: string }
      }
    }

    assert.equal(filteredBody.data.summary.sales, '30.00')
    assert.lengthOf(filteredBody.data.movements, 1)
    assert.equal(filteredBody.data.movements[0].amountUsd, '30.0000')
  })

  test('GET account-statement includes cash purchase without account in purchase month only', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const supplier = await Supplier.create({ name: 'Proveedor contado', active: true })

    await Purchase.create({
      supplierId: supplier.id,
      date: DateTime.fromISO('2026-05-18'),
      invoiceNumber: 'F-CONT-SIN-CTA',
      totalUsd: '45.0000',
      totalBs: '1620.00',
      status: 'CONFIRMED',
      isCredit: false,
      accountId: null,
    })

    const previousMonth = await client
      .get('/api/v1/reports/account-statement')
      .qs({ month: '2026-05', types: 'purchases', display_currency: 'USD' })
      .loginAs(user)

    previousMonth.assertStatus(200)
    const previousBody = previousMonth.body() as {
      data: {
        movements: Array<{ type: string; amountUsd: string; account: null | { id: number } }>
        summary: { purchasesUsd: string }
      }
    }

    assert.equal(previousBody.data.summary.purchasesUsd, '45.0000')
    assert.lengthOf(previousBody.data.movements, 1)
    assert.equal(previousBody.data.movements[0].type, 'purchase')
    assert.equal(previousBody.data.movements[0].amountUsd, '45.0000')
    assert.isNull(previousBody.data.movements[0].account)

    const currentMonth = await client
      .get('/api/v1/reports/account-statement')
      .qs({ month: '2026-06', types: 'purchases', display_currency: 'USD' })
      .loginAs(user)

    currentMonth.assertStatus(200)
    const currentBody = currentMonth.body() as {
      data: { movements: unknown[]; summary: { purchasesUsd: string } }
    }

    assert.equal(currentBody.data.summary.purchasesUsd, '0.0000')
    assert.isEmpty(currentBody.data.movements)
  })

  test('GET account-statement includes supplier payments in purchases', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const supplier = await Supplier.create({ name: 'Proveedor pago reporte', active: true })
    const purchase = await Purchase.create({
      supplierId: supplier.id,
      date: DateTime.fromISO('2026-05-20'),
      invoiceNumber: 'F-CRED-PAY',
      totalUsd: '80.0000',
      totalBs: '2880.00',
      status: 'CONFIRMED',
      isCredit: true,
      creditDueDate: DateTime.fromISO('2026-06-20'),
      balanceUsd: '30.0000',
      amountPaidUsd: '50.0000',
    })

    await SupplierPayment.create({
      supplierId: Number(supplier.id),
      purchaseId: Number(purchase.id),
      accountId: null,
      amountUsd: '50.0000',
      date: DateTime.fromISO('2026-06-15'),
      note: 'Pago parcial',
    })

    const response = await client
      .get('/api/v1/reports/account-statement')
      .qs({ month: '2026-06', types: 'purchases', display_currency: 'USD' })
      .loginAs(user)

    response.assertStatus(200)
    const body = response.body() as {
      data: {
        movements: Array<{ type: string; date: string; isIncome: boolean; amountUsd: string }>
        summary: { purchasesUsd: string; purchases: string }
      }
    }

    assert.equal(body.data.summary.purchasesUsd, '80.0000')
    assert.equal(body.data.summary.purchases, '80.00')
    const paymentMovement = body.data.movements.find((m) => m.type === 'supplier_payment')
    assert.exists(paymentMovement)
    assert.equal(paymentMovement!.date, '2026-06-15')
    assert.equal(paymentMovement!.isIncome, false)
    assert.equal(paymentMovement!.amountUsd, '50.0000')
  })

  test('GET account-statement omits supplier payments outside period', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const supplier = await Supplier.create({ name: 'Proveedor pago fuera', active: true })

    await SupplierPayment.create({
      supplierId: Number(supplier.id),
      purchaseId: null,
      accountId: null,
      amountUsd: '35.0000',
      date: DateTime.fromISO('2026-07-05'),
      note: 'Pago julio',
    })

    const response = await client
      .get('/api/v1/reports/account-statement')
      .qs({ month: '2026-06', types: 'purchases', display_currency: 'USD' })
      .loginAs(user)

    response.assertStatus(200)
    const body = response.body() as {
      data: {
        movements: Array<{ type: string }>
        summary: { purchasesUsd: string }
      }
    }

    assert.equal(body.data.summary.purchasesUsd, '0.0000')
    assert.isEmpty(body.data.movements)
  })

  test('GET account-statement shows net credit sale amount after returns without counting as income', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await Customer.create({
      name: 'Cliente devolución crédito',
      type: 'CORPORATE',
      creditDays: 30,
      active: true,
    })
    const product = await CatalogProduct.create({
      name: 'Producto devuelto crédito',
      category: 'Camisas',
      salePriceUsd: '50.0000',
      costUsd: '20.0000',
      active: true,
    })
    const order = await Order.create({
      code: 'PED-CRED-DEV',
      customerId: customer.id,
      modality: 'CORPORATE',
      description: 'Crédito con devolución',
      totalQuantity: 2,
      orderDate: DateTime.fromISO('2026-06-08'),
      status: 'DELIVERED',
      paymentType: 'CREDIT',
      balanceUsd: '50.0000',
      amountPaidUsd: '0.0000',
      creditDueDate: DateTime.fromISO('2026-07-08'),
      totalPrice: '100.0000',
      confirmedAt: DateTime.fromISO('2026-06-08'),
    })
    await OrderLine.create({
      orderId: order.id,
      catalogProductId: product.id,
      quantity: '2',
      unitPriceUsd: '50.0000',
      subtotalUsd: '100.0000',
      returnedQuantity: '1',
    })

    const response = await client
      .get('/api/v1/reports/account-statement')
      .qs({ month: '2026-06', types: 'sales', display_currency: 'USD' })
      .loginAs(user)

    response.assertStatus(200)
    const body = response.body() as {
      data: {
        movements: Array<{ isCreditSale?: boolean; amountUsd: string; isIncome: boolean }>
        summary: { sales: string }
      }
    }

    assert.equal(body.data.summary.sales, '0.00')
    assert.equal(body.data.movements[0].amountUsd, '50.0000')
    assert.equal(body.data.movements[0].isCreditSale, true)
    assert.equal(body.data.movements[0].isIncome, false)
  })
})

test.group('Inventory Reports API', (group) => {
  group.setup(async () => {
    await testUtils.db().migrate()
  })

  group.each.setup(async () => {
    await resetDatabase()
    await seedAdminUser()
  })

  test('GET /api/v1/reports/inventory returns grouped products with size lines', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const product = await CatalogProduct.create({
      name: 'Zapato Reporte',
      brand: 'Nike',
      productModel: 'Air',
      category: 'Calzado',
      saleUnit: 'PAR',
      salePriceUsd: '60.0000',
      costUsd: '25.0000',
      stockQuantity: '3.000',
      minimumStock: '1.000',
      active: true,
    })
    await CatalogProductSize.createMany([
      {
        catalogProductId: Number(product.id),
        size: '40',
        stockQuantity: '1.0000',
      },
      {
        catalogProductId: Number(product.id),
        size: '41',
        stockQuantity: '2.0000',
      },
    ])

    const response = await client.get('/api/v1/reports/inventory').loginAs(user)

    response.assertStatus(200)
    const products = response.body().data.products as Array<{
      product_id: number
      has_sizes: boolean
      lines: Array<{ size: string | null; talla: string | null; quantity: string }>
      description: string
    }>

    assert.lengthOf(products, 1)
    assert.isTrue(products[0].has_sizes)
    assert.lengthOf(products[0].lines, 2)
    assert.equal(products[0].lines[0].size, '40')
    assert.equal(products[0].lines[0].talla, '40')
    assert.equal(products[0].lines[0].quantity, '1.000')
    assert.equal(products[0].lines[1].size, '41')
    assert.equal(products[0].lines[1].talla, '41')
    assert.equal(products[0].lines[1].quantity, '2.000')
    assert.equal(products[0].description, 'Zapato Reporte')
  })

  test('GET /api/v1/reports/inventory includes all products and materials with kind', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    const sized = await CatalogProduct.create({
      name: 'Nike Pegasus',
      category: 'Zapatos',
      saleUnit: 'PAR',
      salePriceUsd: '60.0000',
      costUsd: '20.0000',
      stockQuantity: '2.000',
      minimumStock: '0.000',
      active: true,
    })
    await CatalogProductSize.createMany([
      { catalogProductId: Number(sized.id), size: '38', stockQuantity: '1.0000' },
      { catalogProductId: Number(sized.id), size: '39', stockQuantity: '1.0000' },
    ])

    await CatalogProduct.create({
      name: 'Camisa Básica',
      category: 'Ropa',
      saleUnit: 'UND',
      salePriceUsd: '15.0000',
      costUsd: '5.0000',
      stockQuantity: '8.000',
      minimumStock: '2.000',
      active: true,
    })

    const material = await Material.create({
      code: '5810',
      name: 'Atlética',
      category: 'FABRIC',
      unit: 'ROL',
      minimumStock: '1',
      active: true,
    })
    await InventoryMovement.create({
      materialId: Number(material.id),
      type: 'PURCHASE_IN',
      quantity: '4',
    })

    const response = await client.get('/api/v1/reports/inventory').loginAs(user)
    response.assertStatus(200)

    const items = response.body().data.products as Array<{
      kind: string
      description: string
      sale_unit: string
      has_sizes: boolean
      lines: Array<{ size: string | null; talla?: string | null; quantity: string }>
    }>

    assert.lengthOf(items, 3)

    const shoes = items.find((item) => item.description === 'Nike Pegasus')
    const shirt = items.find((item) => item.description === 'Camisa Básica')
    const fabric = items.find((item) => item.description === 'Atlética')

    assert.exists(shoes)
    assert.equal(shoes!.kind, 'product')
    assert.isTrue(shoes!.has_sizes)
    assert.lengthOf(shoes!.lines, 2)
    assert.equal(shoes!.sale_unit, 'PAR')
    assert.equal(shoes!.lines[0].size, '38')
    assert.equal(shoes!.lines[0].talla, '38')
    assert.equal(shoes!.lines[1].size, '39')
    assert.equal(shoes!.lines[1].talla, '39')

    assert.exists(shirt)
    assert.equal(shirt!.kind, 'product')
    assert.isFalse(shirt!.has_sizes)
    assert.equal(shirt!.lines[0].size, null)
    assert.equal(shirt!.sale_unit, 'UND')

    assert.exists(fabric)
    assert.equal(fabric!.kind, 'material')
    assert.equal(fabric!.sale_unit, 'ROL')
    assert.equal(Number(fabric!.lines[0].quantity), 4)
  })

  test('GET /api/v1/reports/inventory filters low stock and hide zero', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const low = await CatalogProduct.create({
      name: 'Bajo Stock',
      category: 'Calzado',
      saleUnit: 'UND',
      salePriceUsd: '10.0000',
      costUsd: '5.0000',
      stockQuantity: '1.000',
      minimumStock: '5.000',
      active: true,
    })
    await CatalogProduct.create({
      name: 'Sin Stock',
      category: 'Calzado',
      saleUnit: 'UND',
      salePriceUsd: '10.0000',
      costUsd: '5.0000',
      stockQuantity: '0.000',
      minimumStock: '0.000',
      active: true,
    })

    const lowStockResponse = await client
      .get('/api/v1/reports/inventory')
      .qs({ low_stock: true })
      .loginAs(user)
    lowStockResponse.assertStatus(200)
    const lowRows = lowStockResponse.body().data.products
    assert.lengthOf(lowRows, 1)
    assert.equal(lowRows[0].product_id, Number(low.id))

    const hideZeroResponse = await client
      .get('/api/v1/reports/inventory')
      .qs({ hide_zero: true })
      .loginAs(user)
    hideZeroResponse.assertStatus(200)
    const hideProducts = hideZeroResponse.body().data.products
    assert.isTrue(
      hideProducts.every((product: { lines: Array<{ quantity: string }> }) =>
        product.lines.every((line) => Number(line.quantity) > 0)
      )
    )
  })

  test('GET /api/v1/reports/inventory/:id/movements returns filtered movements', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const product = await CatalogProduct.create({
      name: 'Producto Movimientos',
      category: 'Calzado',
      saleUnit: 'UND',
      salePriceUsd: '20.0000',
      costUsd: '10.0000',
      stockQuantity: '5.000',
      minimumStock: '0.000',
      active: true,
    })

    await ProductInventoryMovement.createMany([
      {
        catalogProductId: Number(product.id),
        type: 'MANUAL_CARGO',
        quantity: '5.000',
        note: 'Carga inicial',
      },
      {
        catalogProductId: Number(product.id),
        type: 'SALE_OUT',
        quantity: '-2.000',
        note: 'Venta demo',
      },
    ])

    const response = await client
      .get(`/api/v1/reports/inventory/${product.id}/movements`)
      .qs({ types: 'MANUAL_CARGO' })
      .loginAs(user)

    response.assertStatus(200)
    const body = response.body().data
    assert.equal(body.product.product_id, Number(product.id))
    assert.lengthOf(body.movements, 1)
    assert.equal(body.movements[0].type, 'MANUAL_CARGO')
    assert.equal(body.movements[0].note, 'Carga inicial')
  })

  test('GET /api/v1/reports/daily-closing returns empty summary for date', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    const response = await client
      .get('/api/v1/reports/daily-closing')
      .qs({ date: '2026-06-16' })
      .loginAs(user)

    response.assertStatus(200)
    const body = response.body().data
    assert.equal(body.date, '2026-06-16')
    assert.equal(body.summary.net_sales_usd, '0.0000')
    assert.equal(body.summary.operating_net_usd, '0.0000')
    assert.isArray(body.orders)
    assert.isArray(body.payments)
    assert.isArray(body.expenses)
    assert.isArray(body.products)
    assert.isArray(body.sale_lines)
  })

  test('GET /api/v1/reports/daily-closing splits cash, credit, payments and returns', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await Customer.create({
      name: 'Cliente cierre',
      type: 'CORPORATE',
      active: true,
      creditDays: 30,
    })
    const product = await CatalogProduct.create({
      name: 'Producto cierre',
      category: 'Calzado',
      salePriceUsd: '10.0000',
      costUsd: '4.0000',
      active: true,
    })

    const cashOrder = await Order.create({
      code: 'PED-202606-0100',
      customerId: customer.id,
      modality: 'CORPORATE',
      description: 'Venta contado',
      totalQuantity: 1,
      orderDate: DateTime.fromISO('2026-06-16'),
      status: 'DELIVERED',
      paymentType: 'CASH',
      amountPaidUsd: '10.0000',
      balanceUsd: '0.0000',
      totalPrice: '10.0000',
      confirmedAt: DateTime.fromISO('2026-06-16T15:00:00.000Z'),
    })
    await OrderLine.create({
      orderId: cashOrder.id,
      catalogProductId: product.id,
      quantity: '1',
      unitPriceUsd: '10.0000',
      subtotalUsd: '10.0000',
      costUsd: '4.0000',
      returnedQuantity: '0',
    })

    const creditOrder = await Order.create({
      code: 'PED-202606-0101',
      customerId: customer.id,
      modality: 'CORPORATE',
      description: 'Venta crédito',
      totalQuantity: 2,
      orderDate: DateTime.fromISO('2026-06-16'),
      status: 'DELIVERED',
      paymentType: 'CREDIT',
      amountPaidUsd: '0.0000',
      balanceUsd: '20.0000',
      totalPrice: '20.0000',
      creditDueDate: DateTime.fromISO('2026-07-16'),
      confirmedAt: DateTime.fromISO('2026-06-16T16:00:00.000Z'),
    })
    await OrderLine.create({
      orderId: creditOrder.id,
      catalogProductId: product.id,
      quantity: '2',
      unitPriceUsd: '10.0000',
      subtotalUsd: '20.0000',
      costUsd: '4.0000',
      returnedQuantity: '1',
    })

    await CustomerPayment.create({
      customerId: Number(customer.id),
      amountUsd: '5.0000',
      date: DateTime.fromISO('2026-06-16'),
    })

    await Expense.create({
      description: 'Gasto operativo',
      amountUsd: '3.0000',
      currencyCode: 'USD',
      date: DateTime.fromISO('2026-06-16'),
    })

    const response = await client
      .get('/api/v1/reports/daily-closing')
      .qs({ date: '2026-06-16' })
      .loginAs(user)

    response.assertStatus(200)
    const body = response.body().data

    assert.equal(body.summary.tickets_count, 2)
    assert.equal(body.summary.units_sold, 2)
    assert.equal(body.summary.gross_sales_usd, '30.0000')
    assert.equal(body.summary.returns_usd, '10.0000')
    assert.equal(body.summary.net_sales_usd, '20.0000')
    assert.equal(body.summary.cash_sales_usd, '10.0000')
    assert.equal(body.summary.credit_sales_usd, '10.0000')
    assert.equal(body.summary.credit_orders_count, 1)
    assert.equal(body.summary.profit_usd, '12.0000')
    assert.equal(body.summary.payments_count, 1)
    assert.equal(body.summary.payments_total_usd, '5.0000')
    assert.equal(body.summary.expenses_count, 1)
    assert.equal(body.summary.expenses_total_usd, '3.0000')
    assert.equal(body.summary.operating_net_usd, '12.0000')
    assert.lengthOf(body.orders, 2)
    assert.lengthOf(body.payments, 1)
    assert.lengthOf(body.expenses, 1)
    assert.lengthOf(body.products, 1)
    assert.lengthOf(body.sale_lines, 2)

    assert.equal(body.products[0].name, 'Producto cierre')
    assert.equal(body.products[0].quantity_sold, 2)
    assert.equal(body.products[0].total_usd, '20.0000')

    const saleLinesNetTotal = body.sale_lines.reduce(
      (sum: number, line: { net_usd: string }) => sum + Number(line.net_usd),
      0
    )
    assert.equal(saleLinesNetTotal.toFixed(4), body.summary.net_sales_usd)

    const creditLine = body.sale_lines.find(
      (line: { order_code: string }) => line.order_code === 'PED-202606-0101'
    )
    assert.exists(creditLine)
    assert.equal(creditLine.returned_quantity, 1)
    assert.equal(creditLine.net_quantity, 1)
    assert.equal(creditLine.net_usd, '10.0000')
  })

  test('GET /api/v1/reports/inventory/:id/movements marks formula products unavailable', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const formula = await Formula.create({ name: 'Formula Reporte', active: true })
    const product = await CatalogProduct.create({
      name: 'Producto Formula',
      category: 'Calzado',
      saleUnit: 'UND',
      salePriceUsd: '20.0000',
      costUsd: '10.0000',
      stockQuantity: '0.000',
      minimumStock: '0.000',
      formulaId: Number(formula.id),
      active: true,
    })

    const response = await client
      .get(`/api/v1/reports/inventory/${product.id}/movements`)
      .loginAs(user)

    response.assertStatus(200)
    const body = response.body().data
    assert.isTrue(body.product.movements_unavailable)
    assert.lengthOf(body.movements, 0)
  })
})
