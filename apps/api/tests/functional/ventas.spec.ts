import CatalogProduct from '#models/catalog_product'
import Customer from '#models/customer'
import Formula from '#models/formula'
import FormulaMaterial from '#models/formula_material'
import InventoryMovement from '#models/inventory_movement'
import Material from '#models/material'
import Order from '#models/order'
import User from '#models/user'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import { test } from '@japa/runner'

const TEST_EMAIL = 'test-ventas@hebra.local'
const TEST_PASSWORD = 'password123'

async function resetDatabase() {
  await db.from('sale_lines').delete()
  await db.from('sales').delete()
  await db.from('order_lines').delete()
  await db.from('formula_materials').delete()
  await db.from('formulas').delete()
  await db.from('product_inventory_movements').delete()
  await db.from('inventory_movements').delete()
  await db.from('purchase_items').delete()
  await db.from('catalog_products').delete()
  await db.from('order_materials').delete()
  await db.from('purchases').delete()
  await db.from('orders').delete()
  await db.from('machine_expenses').delete()
  await db.from('materials').delete()
  await db.from('machines').delete()
  await db.from('customers').delete()
  await db.from('counters').delete()
  await db.from('suppliers').delete()
  await db.from('users').delete()
}

async function seedAdminUser() {
  await User.updateOrCreate(
    { email: TEST_EMAIL },
    {
      password: TEST_PASSWORD,
      name: 'Admin Ventas',
      role: 'ADMIN',
      active: true,
    }
  )
}

async function seedCustomer() {
  return Customer.create({
    name: 'Cliente Ventas',
    type: 'CORPORATE',
    active: true,
  })
}

async function seedMaterial(overrides: Partial<Material> = {}) {
  return Material.create({
    code: 'MAT-001',
    name: 'Tela base',
    category: 'FABRIC',
    unit: 'ROL',
    minimumStock: '1',
    lastPurchasePriceUsd: '5.0000',
    salePriceUsd: '8.0000',
    active: true,
    ...overrides,
  })
}

test.group('Ventas API — catálogo y ventas', (group) => {
  group.setup(async () => {
    await testUtils.db().migrate()
  })

  group.each.setup(async () => {
    await resetDatabase()
    await seedAdminUser()
  })

  test('PUT catalog product allows sale price below cost', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const material = await seedMaterial()

    const createResponse = await client
      .post('/api/v1/catalog-products')
      .loginAs(user)
      .json({
        name: 'Uniforme escolar',
        category: 'Uniforme',
        sale_price_usd: 20,
      })

    createResponse.assertStatus(200)
    const productId = createResponse.body().data.catalog_product.id

    const formulaResponse = await client.post('/api/v1/formulas').loginAs(user).json({
      name: 'Fórmula uniforme',
    })

    formulaResponse.assertStatus(200)
    const formulaId = formulaResponse.body().data.formula.id

    await client.put(`/api/v1/formulas/${formulaId}/materials`).loginAs(user).json({
      items: [{ material_id: Number(material.id), quantity: 2 }],
    })

    await client.put(`/api/v1/catalog-products/${productId}`).loginAs(user).json({
      name: 'Uniforme escolar',
      category: 'Uniforme',
      sale_price_usd: 20,
      formula_id: formulaId,
    })

    const updateResponse = await client
      .put(`/api/v1/catalog-products/${productId}`)
      .loginAs(user)
      .json({
        name: 'Uniforme escolar',
        category: 'Uniforme',
        sale_price_usd: 5,
      })

    updateResponse.assertStatus(200)
    assert.equal(updateResponse.body().data.catalog_product.sale_price_usd, '5.0000')
  })

  test('PUT catalog product allows manual cost override', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    const createResponse = await client
      .post('/api/v1/catalog-products')
      .loginAs(user)
      .json({
        name: 'Camisa básica',
        category: 'Camisa',
        sale_price_usd: 25,
        cost_usd: 10,
      })

    createResponse.assertStatus(200)
    assert.equal(createResponse.body().data.catalog_product.cost_usd, '10.0000')

    const productId = createResponse.body().data.catalog_product.id

    const updateResponse = await client
      .put(`/api/v1/catalog-products/${productId}`)
      .loginAs(user)
      .json({
        name: 'Camisa básica',
        category: 'Camisa',
        sale_price_usd: 25,
        cost_usd: 15,
      })

    updateResponse.assertStatus(200)
    assert.equal(updateResponse.body().data.catalog_product.cost_usd, '15.0000')

    const belowCostResponse = await client
      .put(`/api/v1/catalog-products/${productId}`)
      .loginAs(user)
      .json({
        name: 'Camisa básica',
        category: 'Camisa',
        cost_usd: 30,
      })

    belowCostResponse.assertStatus(200)
    assert.equal(belowCostResponse.body().data.catalog_product.cost_usd, '30.0000')
    assert.lengthOf(belowCostResponse.body().data.cost_warnings, 1)
  })

  test('POST catalog-products/apply-profit-margin updates sale price from cost', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    const withCost = await CatalogProduct.create({
      name: 'Producto con costo',
      category: 'Camisa',
      salePriceUsd: '12.0000',
      costUsd: '10.0000',
      stockQuantity: '0',
      active: true,
    })

    const withoutCost = await CatalogProduct.create({
      name: 'Producto sin costo',
      category: 'Camisa',
      salePriceUsd: '5.0000',
      costUsd: '0.0000',
      stockQuantity: '0',
      active: true,
    })

    const response = await client
      .post('/api/v1/catalog-products/apply-profit-margin')
      .loginAs(user)
      .json({
        catalog_product_ids: [Number(withCost.id), Number(withoutCost.id)],
        profit_margin_percent: 60,
      })

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        updatedCount: 1,
        skipped: [{ name: 'Producto sin costo', reason: 'NO_COST_PRICE' }],
      },
    })

    await withCost.refresh()
    assert.equal(withCost.salePriceUsd, '16.0000')
    assert.equal(withCost.previousSalePriceUsd, '12.0000')
  })

  test('POST sale with catalog and material lines deducts stock', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const material = await seedMaterial({ code: 'MAT-002' })

    await InventoryMovement.create({
      materialId: Number(material.id),
      type: 'PURCHASE_IN',
      quantity: '20',
    })

    const catalog = await CatalogProduct.create({
      name: 'Producto terminado',
      category: 'Uniforme',
      salePriceUsd: '15.0000',
      costUsd: '0.0000',
      stockQuantity: '5.000',
      active: true,
    })

    const response = await client.post('/api/v1/sales').loginAs(user).json({
      guest_name: 'Walk-in Test',
      payment_method: 'CASH_USD',
      lines: [
        {
          catalog_product_id: Number(catalog.id),
          quantity: 2,
          unit_price_usd: 15,
        },
        {
          material_id: Number(material.id),
          quantity: 3,
          unit_price_usd: 8,
        },
      ],
    })

    response.assertStatus(200)
    assert.match(response.body().data.sale.code, /^VTA-\d{6}-\d{4}$/)

    await catalog.refresh()
    assert.equal(catalog.stockQuantity, '3.000')

    const stockResult = await InventoryMovement.query()
      .where('materialId', Number(material.id))
      .sum('quantity as total')
      .first()

    assert.equal(Number(stockResult?.$extras.total), 17)

    const saleOut = await InventoryMovement.query()
      .where('materialId', Number(material.id))
      .where('type', 'SALE_OUT')
      .first()

    assert.exists(saleOut)
  })

  test('order lines and production expand catalog formulas', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await seedCustomer()
    const material = await seedMaterial({ code: 'MAT-003', lastPurchasePriceUsd: '4.0000' })

    await InventoryMovement.create({
      materialId: Number(material.id),
      type: 'PURCHASE_IN',
      quantity: '100',
    })

    const catalog = await CatalogProduct.create({
      name: 'Camisa corporativa',
      category: 'Camisa',
      salePriceUsd: '25.0000',
      costUsd: '8.0000',
      stockQuantity: '15.000',
      active: true,
    })

    const formulaResponse = await client.post('/api/v1/formulas').loginAs(user).json({
      name: 'Fórmula camisa',
    })

    formulaResponse.assertStatus(200)
    const formulaId = formulaResponse.body().data.formula.id

    await client.put(`/api/v1/formulas/${formulaId}/materials`).loginAs(user).json({
      items: [{ material_id: Number(material.id), quantity: 1.5 }],
    })

    await client.put(`/api/v1/catalog-products/${catalog.id}`).loginAs(user).json({
      name: 'Camisa corporativa',
      category: 'Camisa',
      sale_price_usd: 25,
      formula_id: formulaId,
      stock_quantity: 15,
    })

    const orderResponse = await client.post('/api/v1/orders').loginAs(user).json({
      customer_id: Number(customer.id),
      modality: 'CORPORATE',
      description: 'Pedido catálogo',
      total_quantity: 10,
      order_date: '2026-06-01',
    })

    orderResponse.assertStatus(200)
    const orderId = orderResponse.body().data.order.id

    await client.post(`/api/v1/orders/${orderId}/lines`).loginAs(user).json({
      catalog_product_id: Number(catalog.id),
      quantity: 10,
    })

    const budgetResponse = await client.get(`/api/v1/orders/${orderId}/budget`).loginAs(user)
    budgetResponse.assertStatus(200)
    assert.equal(budgetResponse.body().data.budget.lines.length, 1)

    await client
      .post(`/api/v1/orders/${orderId}/transition`)
      .loginAs(user)
      .json({ new_status: 'CONFIRMED' })

    const confirmCheck = await client.get(`/api/v1/orders/${orderId}`).loginAs(user)
    assert.equal(confirmCheck.body().data.order.status, 'CONFIRMED')

    const productionResponse = await client
      .post(`/api/v1/orders/${orderId}/transition`)
      .loginAs(user)
      .json({ new_status: 'IN_PRODUCTION' })

    productionResponse.assertStatus(200)

    const stockAfterProduction = await client
      .get(`/api/v1/materials/${material.id}`)
      .loginAs(user)
    assert.equal(stockAfterProduction.body().data.material.stockActual, 85)

    const orderOut = await InventoryMovement.query()
      .where('orderId', orderId)
      .where('type', 'ORDER_OUT')
      .where('materialId', Number(material.id))
      .first()

    assert.exists(orderOut)
    assert.equal(Number(orderOut!.quantity), -15)
  })

  test('DELETE catalog blocked when product in active order', async ({ client }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await seedCustomer()

    const catalog = await CatalogProduct.create({
      name: 'Pantalón',
      category: 'Pantalón',
      salePriceUsd: '30.0000',
      costUsd: '0.0000',
      stockQuantity: '0.000',
      active: true,
    })

    const order = await Order.create({
      code: 'PED-202606-0001',
      customerId: Number(customer.id),
      modality: 'CORPORATE',
      description: 'Test',
      totalQuantity: 5,
      orderDate: DateTime.fromISO('2026-06-01'),
      status: 'DRAFT',
    })

    await client.post(`/api/v1/orders/${order.id}/lines`).loginAs(user).json({
      catalog_product_id: Number(catalog.id),
      quantity: 5,
    })

    const deleteResponse = await client
      .delete(`/api/v1/catalog-products/${catalog.id}`)
      .loginAs(user)

    deleteResponse.assertStatus(409)
    deleteResponse.assertBodyContains({
      error: { code: 'PRODUCTO_CATALOGO_EN_PEDIDOS_ACTIVOS' },
    })
  })

  test('GET catalog product with formula exposes stock derived from materials', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const material = await seedMaterial({ code: 'MAT-FORM-STK' })

    await InventoryMovement.create({
      materialId: Number(material.id),
      type: 'PURCHASE_IN',
      quantity: '6',
    })

    const formula = await Formula.create({ name: 'Fórmula stock', active: true })
    await FormulaMaterial.create({
      formulaId: Number(formula.id),
      materialId: Number(material.id),
      quantity: '2.000',
    })

    const catalog = await CatalogProduct.create({
      name: 'Producto fórmula stock',
      category: 'Uniforme',
      formulaId: Number(formula.id),
      salePriceUsd: '20.0000',
      costUsd: '8.0000',
      stockQuantity: '0.000',
      active: true,
    })

    const response = await client.get(`/api/v1/catalog-products/${catalog.id}`).loginAs(user)

    response.assertStatus(200)
    assert.equal(response.body().data.catalog_product.stock_quantity, '3.000')
    assert.equal(response.body().data.catalog_product.stock_source, 'formula')
  })

  test('POST sale rejects catalog product without stock', async ({ client }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    const catalog = await CatalogProduct.create({
      name: 'Sin stock manual',
      category: 'Uniforme',
      salePriceUsd: '10.0000',
      costUsd: '5.0000',
      stockQuantity: '0.000',
      active: true,
    })

    const response = await client.post('/api/v1/sales').loginAs(user).json({
      guest_name: 'Cliente sin stock',
      payment_method: 'CASH_USD',
      lines: [
        {
          catalog_product_id: Number(catalog.id),
          quantity: 1,
          unit_price_usd: 10,
        },
      ],
    })

    response.assertStatus(409)
    response.assertBodyContains({
      error: { code: 'STOCK_INSUFICIENTE' },
    })
  })

  test('POST sale with formula product deducts materials not product stock', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const material = await seedMaterial({ code: 'MAT-FORM-SALE' })

    await InventoryMovement.create({
      materialId: Number(material.id),
      type: 'PURCHASE_IN',
      quantity: '6',
    })

    const formula = await Formula.create({ name: 'Fórmula venta', active: true })
    await FormulaMaterial.create({
      formulaId: Number(formula.id),
      materialId: Number(material.id),
      quantity: '2.000',
    })

    const catalog = await CatalogProduct.create({
      name: 'Venta con fórmula',
      category: 'Uniforme',
      formulaId: Number(formula.id),
      salePriceUsd: '20.0000',
      costUsd: '8.0000',
      stockQuantity: '0.000',
      active: true,
    })

    const response = await client.post('/api/v1/sales').loginAs(user).json({
      guest_name: 'Cliente fórmula',
      payment_method: 'CASH_USD',
      lines: [
        {
          catalog_product_id: Number(catalog.id),
          quantity: 2,
          unit_price_usd: 20,
        },
      ],
    })

    response.assertStatus(200)

    await catalog.refresh()
    assert.equal(catalog.stockQuantity, '0.000')

    const materialStock = await InventoryMovement.query()
      .where('materialId', Number(material.id))
      .sum('quantity as total')
      .first()

    assert.equal(Number(materialStock?.$extras.total), 2)
  })

  test('POST catalog product adjustment blocked when product has formula', async ({ client }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const formula = await Formula.create({ name: 'Fórmula bloqueo', active: true })

    const catalog = await CatalogProduct.create({
      name: 'Producto bloqueado',
      category: 'Uniforme',
      formulaId: Number(formula.id),
      salePriceUsd: '15.0000',
      costUsd: '5.0000',
      stockQuantity: '0.000',
      active: true,
    })

    const response = await client
      .post(`/api/v1/catalog-products/${catalog.id}/adjustment`)
      .loginAs(user)
      .json({ mode: 'CARGO', quantity: 5 })

    response.assertStatus(409)
    response.assertBodyContains({
      error: { code: 'PRODUCTO_CON_FORMULA_SIN_STOCK_MANUAL' },
    })
  })
})
