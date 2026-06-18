import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.defer(async (db) => {
      await db.rawQuery(
        "ALTER TABLE catalog_products ADD COLUMN sale_unit ENUM('UNIT', 'PAIR', 'KIT') NOT NULL DEFAULT 'UNIT' AFTER category"
      )
    })
  }

  async down() {
    this.schema.alterTable('catalog_products', (table) => {
      table.dropColumn('sale_unit')
    })
  }
}
