import Purchase from '#models/purchase'
import Material from '#models/material'
import InventoryMovement from '#models/inventory_movement'
import Machine from '#models/machine'
import MachineExpense from '#models/machine_expense'
import Expense from '#models/expense'
import Supplier from '#models/supplier'
import User from '#models/user'
import Customer from '#models/customer'
import CatalogProduct from '#models/catalog_product'
import Order from '#models/order'
import OrderLine from '#models/order_line'
import testUtils from '@adonisjs/core/services/test_utils'
import { resetTestDatabase } from '#tests/helpers/reset_test_database'
import { DateTime } from 'luxon'
import { test } from '@japa/runner'

const TEST_EMAIL = 'test-dashboard@hebra.local'
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

test.group('Dashboard API', (group) => {
  group.setup(async () => {
    await testUtils.db().migrate()
  })

  group.each.setup(async () => {
    await resetTestDatabase()
    await seedAdminUser()
  })

  test('GET /api/v1/dashboard/summary requires authentication', async ({ client }) => {
    const response = await client.get('/api/v1/dashboard/summary')
    response.assertStatus(401)
  })

  test('GET /api/v1/dashboard/summary returns empty summary', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    const response = await client.get('/api/v1/dashboard/summary').loginAs(user)

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        bajoStock: [],
        purchasesMonth: {
          quantity: 0,
          totalBs: '0.00',
        },
        machineExpensesMonth: {
          quantity: 0,
          totalAmount: '0.00',
        },
      },
    })

    const body = response.body()
    assert.isArray(body.data.bajoStock)
  })

  test('GET /api/v1/dashboard/summary lists materials below minimum stock', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const material = await Material.create({
      code: '5810',
      name: 'Atlética',
      category: 'FABRIC',
      unit: 'ROL',
      minimumStock: '5',
      active: true,
    })

    await InventoryMovement.create({
      materialId: Number(material.id),
      type: 'MANUAL_ADJUSTMENT',
      quantity: '2',
    })

    const response = await client.get('/api/v1/dashboard/summary').loginAs(user)

    response.assertStatus(200)
    const body = response.body()
    assert.lengthOf(body.data.bajoStock, 1)
    assert.equal(body.data.bajoStock[0].code, '5810')
    assert.equal(body.data.bajoStock[0].stockActual, 2)
  })

  test('GET /api/v1/dashboard/summary sums confirmed purchases of current month', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const supplier = await Supplier.create({ name: 'El Castillo', active: true })
    const mesActual = DateTime.now().toISODate()!

    await Purchase.create({
      supplierId: supplier.id,
      date: DateTime.fromISO(mesActual),
      invoiceNumber: 'F-100',
      totalBs: '1500.50',
      status: 'CONFIRMED',
    })
    await Purchase.create({
      supplierId: supplier.id,
      date: DateTime.fromISO(mesActual),
      invoiceNumber: 'F-101',
      totalBs: '500.00',
      status: 'CONFIRMED',
    })
    await Purchase.create({
      supplierId: supplier.id,
      date: DateTime.fromISO('2020-01-15'),
      invoiceNumber: 'F-VIEJA',
      totalBs: '9999.00',
      status: 'CONFIRMED',
    })
    await Purchase.create({
      supplierId: supplier.id,
      date: DateTime.fromISO(mesActual),
      totalBs: '300.00',
      status: 'DRAFT',
    })

    const response = await client.get('/api/v1/dashboard/summary').loginAs(user)

    response.assertStatus(200)
    assert.equal(response.body().data.purchasesMonth.quantity, 2)
    assert.equal(response.body().data.purchasesMonth.totalBs, '2000.50')
  })

  test('GET /api/v1/dashboard/summary sums machine expenses of current month', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const mesActual = DateTime.now().toISODate()!
    const machine = await Machine.create({
      name: 'Overlock',
      type: 'OVERLOCK',
      status: 'OPERATIONAL',
      active: true,
    })

    await MachineExpense.create({
      machineId: Number(machine.id),
      date: DateTime.fromISO(mesActual),
      category: 'REPAIR',
      description: 'Needles replacement',
      amount: '150.50',
    })
    await MachineExpense.create({
      machineId: Number(machine.id),
      date: DateTime.fromISO(mesActual),
      category: 'SUPPLY',
      description: 'Machine oil',
      amount: '49.50',
    })
    await MachineExpense.create({
      machineId: Number(machine.id),
      date: DateTime.fromISO('2020-01-15'),
      category: 'MAINTENANCE',
      description: 'Old service',
      amount: '999.00',
    })

    const response = await client.get('/api/v1/dashboard/summary').loginAs(user)

    response.assertStatus(200)
    assert.equal(response.body().data.machineExpensesMonth.quantity, 2)
    assert.equal(response.body().data.machineExpensesMonth.totalAmount, '200.00')
  })

  test('GET /api/v1/dashboard/daily-product-sales returns products sold today', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await Customer.create({
      name: 'Cliente Dashboard',
      active: true,
    })
    const product = await CatalogProduct.create({
      name: 'Camisa vendida hoy',
      category: 'Camisas',
      saleUnit: 'UND',
      salePriceUsd: '12.0000',
      costUsd: '5.0000',
      stockQuantity: '8.000',
      active: true,
    })
    const order = await Order.create({
      code: 'PED-DASH-1',
      customerId: customer.id,
      modality: 'CORPORATE',
      description: 'Venta hoy',
      totalQuantity: 2,
      orderDate: DateTime.now(),
      status: 'DELIVERED',
      totalPrice: '24.0000',
      confirmedAt: DateTime.now(),
    })
    await OrderLine.create({
      orderId: order.id,
      catalogProductId: product.id,
      quantity: '2',
      unitPriceUsd: '12.0000',
      subtotalUsd: '24.0000',
      returnedQuantity: '0',
    })

    const response = await client.get('/api/v1/dashboard/daily-product-sales').loginAs(user)

    response.assertStatus(200)
    const body = response.body() as {
      data: {
        products: Array<{ id: number; quantity_sold: number; total_usd: string }>
        summary: { productos_vendidos: number; monto_productos_usd: string }
      }
    }

    assert.lengthOf(body.data.products, 1)
    assert.equal(body.data.products[0].id, Number(product.id))
    assert.equal(body.data.products[0].quantity_sold, 2)
    assert.equal(body.data.products[0].total_usd, '24.0000')
    assert.equal(body.data.summary.productos_vendidos, 2)
    assert.equal(body.data.summary.monto_productos_usd, '24.0000')
  })

  test('GET /api/v1/dashboard/overview subtracts daily expenses from ganancia del dia', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const hoy = DateTime.now().toISODate()!
    const customer = await Customer.create({
      name: 'Cliente Ganancia',
      active: true,
    })
    const product = await CatalogProduct.create({
      name: 'Producto ganancia',
      category: 'Camisas',
      saleUnit: 'UND',
      salePriceUsd: '12.0000',
      costUsd: '5.0000',
      stockQuantity: '10.000',
      active: true,
    })
    const order = await Order.create({
      code: 'PED-GAN-1',
      customerId: customer.id,
      modality: 'CORPORATE',
      description: 'Venta hoy',
      totalQuantity: 2,
      orderDate: DateTime.now(),
      status: 'DELIVERED',
      totalPrice: '24.0000',
      confirmedAt: DateTime.now(),
    })
    await OrderLine.create({
      orderId: order.id,
      catalogProductId: product.id,
      quantity: '2',
      unitPriceUsd: '12.0000',
      subtotalUsd: '24.0000',
      returnedQuantity: '0',
    })

    await Expense.create({
      date: DateTime.fromISO(hoy),
      description: 'Transporte',
      amountUsd: '4.0000',
      currencyCode: 'USD',
    })

    const machine = await Machine.create({
      name: 'Overlock ganancia',
      type: 'OVERLOCK',
      status: 'OPERATIONAL',
      active: true,
    })
    await MachineExpense.create({
      machineId: Number(machine.id),
      date: DateTime.fromISO(hoy),
      category: 'REPAIR',
      description: 'Repuesto',
      amount: '6.0000',
    })

    const response = await client.get('/api/v1/dashboard/overview').loginAs(user)

    response.assertStatus(200)
    const body = response.body() as {
      data: {
        ventasDelDia: { gastosMontoUsd: string }
        gananciaDelDia: { montoUsd: string; porcentajeSobreVentas: number }
      }
    }

    assert.equal(body.data.ventasDelDia.gastosMontoUsd, '10.0000')
    assert.equal(body.data.gananciaDelDia.montoUsd, '4.0000')
    assert.equal(body.data.gananciaDelDia.porcentajeSobreVentas, 16.67)
  })
})
