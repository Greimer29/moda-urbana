import CatalogProduct from '#models/catalog_product'
import Category from '#models/category'
import User from '#models/user'
import testUtils from '@adonisjs/core/services/test_utils'
import { resetTestDatabase } from '#tests/helpers/reset_test_database'
import { test } from '@japa/runner'

const TEST_EMAIL = 'test-folders@hebra.local'
const TEST_PASSWORD = 'password123'

async function seedAdminUser() {
  await User.updateOrCreate(
    { email: TEST_EMAIL },
    {
      password: TEST_PASSWORD,
      name: 'Admin Folders',
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

test.group('Product folders', (group) => {
  group.setup(async () => {
    await testUtils.db().migrate()
  })

  group.each.setup(async () => {
    await resetTestDatabase()
    await seedAdminUser()
    await seedCategory()
  })

  test('creates folder, assigns product and filters catalog by folder_id', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    const productA = await CatalogProduct.create({
      name: 'Zapato A',
      category: 'Calzado',
      salePriceUsd: '40.0000',
      costUsd: '20.0000',
      stockQuantity: '5.000',
      saleUnit: 'PAR',
      active: true,
    })
    const productB = await CatalogProduct.create({
      name: 'Zapato B',
      category: 'Calzado',
      salePriceUsd: '45.0000',
      costUsd: '22.0000',
      stockQuantity: '3.000',
      saleUnit: 'PAR',
      active: true,
    })

    const createFolder = await client.post('/api/v1/product-folders').loginAs(user).json({
      name: 'Nike Running',
    })
    createFolder.assertStatus(200)
    const folderId = createFolder.body().data.product_folder.id
    assert.equal(createFolder.body().data.product_folder.name, 'Nike Running')
    assert.equal(createFolder.body().data.product_folder.products_count, 0)

    const add = await client
      .post(`/api/v1/product-folders/${folderId}/products`)
      .loginAs(user)
      .json({ catalog_product_id: productA.id })
    add.assertStatus(200)

    const list = await client.get('/api/v1/product-folders').loginAs(user)
    list.assertStatus(200)
    assert.equal(list.body().data.product_folders[0].products_count, 1)

    const filtered = await client
      .get('/api/v1/catalog-products')
      .loginAs(user)
      .qs({ folder_id: folderId, active: true })
    filtered.assertStatus(200)
    const products = filtered.body().data.catalog_products
    assert.lengthOf(products, 1)
    assert.equal(Number(products[0].id), Number(productA.id))

    const remove = await client
      .delete(`/api/v1/product-folders/${folderId}/products/${productA.id}`)
      .loginAs(user)
    remove.assertStatus(200)

    const filteredEmpty = await client
      .get('/api/v1/catalog-products')
      .loginAs(user)
      .qs({ folder_id: folderId, active: true })
    filteredEmpty.assertStatus(200)
    assert.lengthOf(filteredEmpty.body().data.catalog_products, 0)

    // productB never assigned — sanity that catalog still has both without filter
    const all = await client.get('/api/v1/catalog-products').loginAs(user).qs({ active: true })
    all.assertStatus(200)
    assert.isAtLeast(all.body().data.catalog_products.length, 2)
    assert.ok(
      all.body().data.catalog_products.some((p: { id: number }) => Number(p.id) === Number(productB.id))
    )
  })

  test('rejects duplicate folder name and duplicate product in folder', async ({ client }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const product = await CatalogProduct.create({
      name: 'Zapato Dup',
      category: 'Calzado',
      salePriceUsd: '30.0000',
      costUsd: '10.0000',
      stockQuantity: '1.000',
      saleUnit: 'PAR',
      active: true,
    })

    const first = await client.post('/api/v1/product-folders').loginAs(user).json({
      name: 'Promo',
    })
    first.assertStatus(200)
    const folderId = first.body().data.product_folder.id

    const dupName = await client.post('/api/v1/product-folders').loginAs(user).json({
      name: 'promo',
    })
    dupName.assertStatus(409)

    await client
      .post(`/api/v1/product-folders/${folderId}/products`)
      .loginAs(user)
      .json({ catalog_product_id: product.id })
      .then((res) => res.assertStatus(200))

    const dupProduct = await client
      .post(`/api/v1/product-folders/${folderId}/products`)
      .loginAs(user)
      .json({ catalog_product_id: product.id })
    dupProduct.assertStatus(409)
  })
})
