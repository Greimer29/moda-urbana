import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'inventory_movements'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id').primary()
      table
        .bigInteger('material_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('materials')
        .onDelete('RESTRICT')
      table
        .enum('type', ['PURCHASE_IN', 'ORDER_OUT', 'MANUAL_ADJUSTMENT', 'REVERSAL_ADJUSTMENT'])
        .notNullable()
      table.decimal('quantity', 12, 3).notNullable()
      table
        .bigInteger('purchase_item_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('purchase_items')
        .onDelete('RESTRICT')
      table.bigInteger('order_id').unsigned().nullable()
      table.string('note', 255).nullable()
      table.timestamp('created_at').notNullable()

      table.index(['material_id', 'created_at'])
      table.index(['order_id'])
      table.index(['purchase_item_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
