import CatalogProduct from '#models/catalog_product'
import CatalogProductSize from '#models/catalog_product_size'
import Category from '#models/category'
import Customer from '#models/customer'
import Order from '#models/order'
import OrderLine from '#models/order_line'
import User from '#models/user'
import testUtils from '@adonisjs/core/services/test_utils'
import { resetTestDatabase } from '#tests/helpers/reset_test_database'
import { DateTime } from 'luxon'
import { test } from '@japa/runner'

const TEST_EMAIL = 'test-sizes@hebra.local'
const TEST_PASSWORD = 'password123'

async function seedAdminUser() {
  await User.updateOrCreate(
    { email: TEST_EMAIL },
    {
      password: TEST_PASSWORD,
      name: 'Admin Sizes',
      role: 'ADMIN',
      active: true,
    }
  )
}

async function seedCategory() {
  return Category.updateOrCreate(
    { name: 'Calzado' },
    { name: 'Calzado', active: true, sortOrder: 1 }
  )
}

test.group('Catalog sizes and sale discounts', (group) => {
  group.setup(async () => {
    await testUtils.db().migrate()
  })

  group.each.setup(async () => {
    await resetTestDatabase()
    await seedAdminUser()
    await seedCategory()
  })

  test('creates product with sizes and exposes has_sizes + total stock', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    const response = await client.post('/api/v1/catalog-products').loginAs(user).json({
      name: 'Zapato Demo',
      brand: 'Nike',
      product_model: 'Air',
      category: 'Calzado',
      sale_price_usd: 50,
      cost_usd: 20,
      sizes: [
        { size: '12', stock_quantity: 10 },
        { size: '14', stock_quantity: 1 },
      ],
    })

    response.assertStatus(200)
    const product = response.body().data.catalog_product
    assert.isTrue(product.has_sizes)
    assert.lengthOf(product.sizes, 2)
    assert.equal(Number(product.stock_quantity), 11)
  })

  test('filters catalog by size with stock', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const product = await CatalogProduct.create({
      name: 'Bota Filter',
      brand: 'Adidas',
      productModel: 'Ultraboost',
      category: 'Calzado',
      saleUnit: 'UND',
      salePriceUsd: '40.0000',
      costUsd: '15.0000',
      stockQuantity: '5.000',
      minimumStock: '0.000',
      active: true,
    })
    await CatalogProductSize.create({
      catalogProductId: Number(product.id),
      size: '38',
      stockQuantity: '5.0000',
    })

    const hit = await client.get('/api/v1/catalog-products').loginAs(user).qs({ size: '38' })
    hit.assertStatus(200)
    assert.isAtLeast(hit.body().data.catalog_products.length, 1)

    const miss = await client.get('/api/v1/catalog-products').loginAs(user).qs({ size: '99' })
    miss.assertStatus(200)
    assert.equal(miss.body().data.catalog_products.length, 0)
  })

  test('sells sized product with custom unit price and notes', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await Customer.create({
      name: 'Cliente Tallas',
      type: 'CORPORATE',
      active: true,
    })

    const product = await CatalogProduct.create({
      name: 'Zapato Venta',
      brand: 'Puma',
      category: 'Calzado',
      saleUnit: 'UND',
      salePriceUsd: '100.0000',
      costUsd: '40.0000',
      stockQuantity: '11.000',
      minimumStock: '0.000',
      active: true,
    })
    const size12 = await CatalogProductSize.create({
      catalogProductId: Number(product.id),
      size: '12',
      stockQuantity: '10.0000',
    })
    await CatalogProductSize.create({
      catalogProductId: Number(product.id),
      size: '14',
      stockQuantity: '1.0000',
    })

    const createOrder = await client.post('/api/v1/orders').loginAs(user).json({
      customer_id: Number(customer.id),
      modality: 'CORPORATE',
      description: 'Venta zapato',
      total_quantity: 2,
      order_date: '2026-08-09',
      notes: 'Nota factura demo',
      lines: [
        {
          catalog_product_id: Number(product.id),
          catalog_product_size_id: Number(size12.id),
          quantity: 2,
          unit_price_usd: 80,
          notes: 'Nota línea demo',
        },
      ],
    })

    createOrder.assertStatus(200)
    const orderId = createOrder.body().data.order.id as number

    const show = await client.get(`/api/v1/orders/${orderId}`).loginAs(user)
    show.assertStatus(200)
    const order = show.body().data.order
    assert.equal(order.notes, 'Nota factura demo')
    assert.lengthOf(order.lines, 1)
    assert.equal(order.lines[0].size, '12')
    assert.equal(order.lines[0].notes, 'Nota línea demo')
    assert.equal(order.lines[0].unit_price_usd, '80.0000')
    assert.equal(Number(order.lines[0].subtotal_usd), 160)

    const confirm = await client
      .post(`/api/v1/orders/${orderId}/transition`)
      .loginAs(user)
      .json({ new_status: 'CONFIRMED', payment_type: 'CASH' })

    confirm.assertStatus(200)

    await size12.refresh()
    await product.refresh()
    assert.equal(Number(size12.stockQuantity), 8)
    assert.equal(Number(product.stockQuantity), 9)

    const line = await OrderLine.query().where('orderId', orderId).firstOrFail()
    assert.equal(line.size, '12')
    assert.equal(line.notes, 'Nota línea demo')
  })

  test('product without sizes still sells with catalog price', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await Customer.create({
      name: 'Cliente Simple',
      type: 'CORPORATE',
      active: true,
    })
    const product = await CatalogProduct.create({
      name: 'Producto Simple',
      category: 'Calzado',
      saleUnit: 'UND',
      salePriceUsd: '25.0000',
      costUsd: '10.0000',
      stockQuantity: '5.000',
      minimumStock: '0.000',
      active: true,
    })

    const createOrder = await client.post('/api/v1/orders').loginAs(user).json({
      customer_id: Number(customer.id),
      modality: 'CORPORATE',
      description: 'Venta simple',
      total_quantity: 1,
      order_date: DateTime.now().toISODate(),
      lines: [{ catalog_product_id: Number(product.id), quantity: 1 }],
    })

    createOrder.assertStatus(200)
    const orderId = createOrder.body().data.order.id as number
    const order = await Order.findOrFail(orderId)
    const line = await OrderLine.query().where('orderId', orderId).firstOrFail()
    assert.isNull(line.catalogProductSizeId)
    assert.equal(line.unitPriceUsd, '25.0000')
    assert.equal(order.status, 'DRAFT')
  })
})
