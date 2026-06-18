import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'purchase_items'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id').primary()
      table
        .bigInteger('purchase_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('purchases')
        .onDelete('CASCADE')
      table
        .bigInteger('material_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('materials')
        .onDelete('RESTRICT')
      table.decimal('quantity', 12, 3).notNullable()
      table.decimal('unit_price_bs', 15, 2).notNullable()
      table.decimal('unit_price_usd_snapshot', 15, 4).nullable()
      table.decimal('subtotal_bs', 15, 2).notNullable()
      table.decimal('subtotal_usd_snapshot', 15, 4).nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['purchase_id'])
      table.index(['material_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
