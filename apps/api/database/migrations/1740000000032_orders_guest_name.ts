import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'orders'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('guest_name', 150).nullable().after('customer_id')
    })

    this.defer(async (db) => {
      await db.rawQuery('ALTER TABLE orders MODIFY COLUMN customer_id BIGINT UNSIGNED NULL')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('guest_name')
    })

    this.defer(async (db) => {
      const fallback = await db.from('customers').select('id').orderBy('id', 'asc').first()
      if (fallback) {
        await db.from('orders').whereNull('customer_id').update({ customer_id: fallback.id })
      } else {
        await db.from('orders').whereNull('customer_id').delete()
      }
      await db.rawQuery('ALTER TABLE orders MODIFY COLUMN customer_id BIGINT UNSIGNED NOT NULL')
    })
  }
}
