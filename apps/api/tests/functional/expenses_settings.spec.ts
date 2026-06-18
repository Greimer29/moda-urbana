import User from '#models/user'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

const TEST_EMAIL = 'test-expenses-settings@hebra.local'
const TEST_PASSWORD = 'password123'

async function resetDatabase() {
  await db.from('inventory_movements').delete()
  await db.from('purchase_items').delete()
  await db.from('purchases').delete()
  await db.from('expenses').delete()
  await db.from('app_settings').delete()
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
      name: 'Admin Test',
      role: 'ADMIN',
      active: true,
    }
  )
}

test.group('Expenses and settings API', (group) => {
  group.setup(async () => {
    await testUtils.db().migrate()
  })

  group.each.setup(async () => {
    await resetDatabase()
    await seedAdminUser()
  })

  test('CRUD /api/v1/expenses', async ({ client }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    const createResponse = await client
      .post('/api/v1/expenses')
      .loginAs(user)
      .json({
        date: '2026-06-01',
        description: 'Transporte',
        amount_usd: 25.5,
      })

    createResponse.assertStatus(200)
    const expenseId = createResponse.body().data.expense.id

    const listResponse = await client.get('/api/v1/expenses').loginAs(user)
    listResponse.assertStatus(200)
    listResponse.assertBodyContains({
      data: {
        expenses: [{ description: 'Transporte', amountUsd: '25.5000' }],
      },
    })

    const updateResponse = await client
      .put(`/api/v1/expenses/${expenseId}`)
      .loginAs(user)
      .json({
        date: '2026-06-02',
        description: 'Transporte actualizado',
        amount_usd: 30,
      })

    updateResponse.assertStatus(200)
    updateResponse.assertBodyContains({
      data: {
        expense: {
          description: 'Transporte actualizado',
          amountUsd: '30.0000',
        },
      },
    })

    const deleteResponse = await client.delete(`/api/v1/expenses/${expenseId}`).loginAs(user)
    deleteResponse.assertStatus(200)
    deleteResponse.assertBodyContains({ data: { eliminado: true } })
  })

  test('GET /api/v1/expenses/summary includes weekly spent', async ({ client }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    await client
      .post('/api/v1/expenses')
      .loginAs(user)
      .json({
        date: new Date().toISOString().slice(0, 10),
        description: 'Gasto semana',
        amount_usd: 100,
      })

    const response = await client.get('/api/v1/expenses/summary').loginAs(user)

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        summary: {
          count: 1,
          weeklySpentUsd: '100.0000',
        },
      },
    })
  })

  test('GET/PUT /api/v1/settings/exchange-rate', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    const getEmpty = await client.get('/api/v1/settings/exchange-rate').loginAs(user)
    getEmpty.assertStatus(200)
    assert.isString(getEmpty.body().data.usdRate)

    const putResponse = await client
      .put('/api/v1/settings/exchange-rate')
      .loginAs(user)
      .json({ usd_rate: 36.5 })

    putResponse.assertStatus(200)
    putResponse.assertBodyContains({ data: { usdRate: '36.5000' } })

    const getResponse = await client.get('/api/v1/settings/exchange-rate').loginAs(user)
    getResponse.assertStatus(200)
    getResponse.assertBodyContains({ data: { usdRate: '36.5000' } })
  })

  test('GET/PUT /api/v1/settings/profit-margin', async ({ client }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    const getEmpty = await client.get('/api/v1/settings/profit-margin').loginAs(user)
    getEmpty.assertStatus(200)
    getEmpty.assertBodyContains({ data: { profitMarginPercent: null } })

    const putResponse = await client
      .put('/api/v1/settings/profit-margin')
      .loginAs(user)
      .json({ profit_margin_percent: 30 })

    putResponse.assertStatus(200)
    putResponse.assertBodyContains({ data: { profitMarginPercent: '30.00' } })

    const getResponse = await client.get('/api/v1/settings/profit-margin').loginAs(user)
    getResponse.assertStatus(200)
    getResponse.assertBodyContains({ data: { profitMarginPercent: '30.00' } })
  })
})
