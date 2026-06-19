import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('order_lines', (table) => {
      table.decimal('cost_usd', 15, 4).nullable()
    })

    this.defer(async (db) => {
      await db.rawQuery(`
        UPDATE order_lines ol
        INNER JOIN catalog_products cp ON cp.id = ol.catalog_product_id
        SET ol.cost_usd = cp.cost_usd
        WHERE ol.cost_usd IS NULL AND ol.catalog_product_id IS NOT NULL
      `)
    })
  }

  async down() {
    this.schema.alterTable('order_lines', (table) => {
      table.dropColumn('cost_usd')
    })
  }
}
