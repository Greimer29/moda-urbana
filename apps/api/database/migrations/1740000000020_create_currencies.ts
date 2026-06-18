import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('currencies', (table) => {
      table.string('code', 3).primary()
      table.string('name', 64).notNullable()
      table.decimal('rate_per_usd', 15, 4).notNullable()
      table.boolean('is_active').notNullable().defaultTo(true)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['is_active'])
    })

    this.defer(async (db) => {
      const now = new Date()
      const settingsRow = await db.from('app_settings').where('key', 'current_usd_rate').first()
      const vesRate = settingsRow?.value ? Number(settingsRow.value) : 1
      const safeVesRate = Number.isFinite(vesRate) && vesRate > 0 ? vesRate : 1

      await db.table('currencies').insert([
        {
          code: 'USD',
          name: 'Dólar estadounidense',
          rate_per_usd: '1.0000',
          is_active: true,
          created_at: now,
          updated_at: now,
        },
        {
          code: 'VES',
          name: 'Bolívar',
          rate_per_usd: safeVesRate.toFixed(4),
          is_active: true,
          created_at: now,
          updated_at: now,
        },
      ])
    })
  }

  async down() {
    this.schema.dropTable('currencies')
  }
}
