import User from '#models/user'
import testUtils from '@adonisjs/core/services/test_utils'
import { resetTestDatabase } from '#tests/helpers/reset_test_database'
import { DateTime } from 'luxon'
import { test } from '@japa/runner'

const TEST_EMAIL = 'test-users@hebra.local'
const TEST_PASSWORD = 'password123'

async function seedAdminUser() {
  await User.updateOrCreate(
    { email: TEST_EMAIL },
    {
      password: TEST_PASSWORD,
      name: 'Admin Test',
      role: 'ADMIN',
      active: true,
      permissions: null,
    }
  )
}

test.group('Users API', (group) => {
  group.setup(async () => {
    await testUtils.db().migrate()
  })

  group.each.setup(async () => {
    await resetTestDatabase()
    await seedAdminUser()
  })

  test('GET /api/v1/auth/me returns permissions for admin', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    const response = await client.get('/api/v1/auth/me').loginAs(user)

    response.assertStatus(200)

    const body = response.body() as { data: { user: { permissions: string[] } } }
    assert.deepEqual(body.data.user.permissions, ['*'])
  })

  test('admin creates operator with partial permissions', async ({ client, assert }) => {
    const admin = await User.findByOrFail('email', TEST_EMAIL)

    const response = await client.post('/api/v1/users').loginAs(admin).json({
      name: 'Operador Ventas',
      email: 'operador@hebra.local',
      password: 'password123',
      role: 'OPERATOR',
      permissions: ['dashboard.view', 'ventas.view'],
    })

    response.assertStatus(200)

    const body = response.body() as {
      data: { user: { role: string; permissions: string[] } }
    }
    assert.equal(body.data.user.role, 'OPERATOR')
    assert.includeMembers(body.data.user.permissions, ['dashboard.view', 'ventas.view'])
  })

  test('operator without users.manage cannot create users', async ({ client }) => {
    const admin = await User.findByOrFail('email', TEST_EMAIL)

    await client.post('/api/v1/users').loginAs(admin).json({
      name: 'Operador Limitado',
      email: 'limitado@hebra.local',
      password: 'password123',
      role: 'OPERATOR',
      permissions: ['dashboard.view'],
    })

    const operator = await User.findByOrFail('email', 'limitado@hebra.local')

    const response = await client.post('/api/v1/users').loginAs(operator).json({
      name: 'Otro',
      email: 'otro@hebra.local',
      password: 'password123',
      role: 'OPERATOR',
      permissions: ['dashboard.view'],
    })

    response.assertStatus(403)
    response.assertBodyContains({
      error: { code: 'PERMISO_DENEGADO' },
    })
  })

  test('operator without ventas.confirm cannot create orders', async ({ client }) => {
    const admin = await User.findByOrFail('email', TEST_EMAIL)

    await client.post('/api/v1/users').loginAs(admin).json({
      name: 'Solo Ver Ventas',
      email: 'verventas@hebra.local',
      password: 'password123',
      role: 'OPERATOR',
      permissions: ['ventas.view'],
    })

    const operator = await User.findByOrFail('email', 'verventas@hebra.local')

    const response = await client.post('/api/v1/orders').loginAs(operator).json({
      modality: 'CORPORATE',
      description: 'Pedido bloqueado',
      total_quantity: 1,
      order_date: DateTime.now().toISODate(),
    })

    response.assertStatus(403)
  })

  test('GET /api/v1/users lists users for admin', async ({ client, assert }) => {
    const admin = await User.findByOrFail('email', TEST_EMAIL)

    await User.create({
      name: 'Operador Lista',
      email: 'lista@hebra.local',
      password: TEST_PASSWORD,
      role: 'OPERATOR',
      permissions: ['dashboard.view'],
      active: true,
    })

    const response = await client.get('/api/v1/users').loginAs(admin)

    response.assertStatus(200)

    const body = response.body() as { data: { users: unknown[]; meta: { total: number } } }
    assert.isAtLeast(body.data.meta.total, 2)
  })
})
