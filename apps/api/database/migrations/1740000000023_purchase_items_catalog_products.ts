import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('purchase_items', (table) => {
      table.bigInteger('material_id').unsigned().nullable().alter()
      table
        .bigInteger('catalog_product_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('catalog_products')
        .onDelete('RESTRICT')
        .after('material_id')

      table.index(['catalog_product_id'])
    })
  }

  async down() {
    this.defer(async (db) => {
      await db.from('purchase_items').whereNull('material_id').delete()
    })

    this.schema.alterTable('purchase_items', (table) => {
      table.dropForeign(['catalog_product_id'])
      table.dropColumn('catalog_product_id')
      table.bigInteger('material_id').unsigned().notNullable().alter()
    })
  }
}
