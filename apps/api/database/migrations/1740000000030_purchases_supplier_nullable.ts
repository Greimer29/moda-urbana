import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'purchases'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.bigInteger('supplier_id').unsigned().nullable().alter()
    })
  }

  async down() {
    this.defer(async (db) => {
      const fallback = await db.from('suppliers').select('id').orderBy('id', 'asc').first()
      if (fallback) {
        await db.from('purchases').whereNull('supplier_id').update({ supplier_id: fallback.id })
      } else {
        await db.from('purchases').whereNull('supplier_id').delete()
      }
    })

    this.schema.alterTable(this.tableName, (table) => {
      table.bigInteger('supplier_id').unsigned().notNullable().alter()
    })
  }
}
