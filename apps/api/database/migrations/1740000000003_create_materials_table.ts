import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'materials'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id').primary()
      table.string('code', 30).notNullable().unique()
      table.string('supplier_code', 50).nullable()
      table.string('name', 150).notNullable()
      table.string('color', 50).nullable()
      table.text('description').nullable()
      table
        .enum('category', ['FABRIC', 'THREAD', 'BUTTON', 'ELASTIC', 'LABEL', 'BAG', 'OTHER'])
        .notNullable()
      table.enum('unit', ['METER', 'KILO', 'UNIT', 'ROLL', 'LITER']).notNullable()
      table.decimal('minimum_stock', 12, 3).notNullable().defaultTo(1)
      table.string('location', 100).nullable()
      table
        .bigInteger('default_supplier_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('suppliers')
        .onDelete('SET NULL')
      table.decimal('last_purchase_price', 15, 2).nullable()
      table.decimal('last_purchase_price_usd', 15, 4).nullable()
      table.date('last_purchase_date').nullable()
      table.boolean('active').notNullable().defaultTo(true)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['name'])
      table.index(['category'])
      table.index(['supplier_code'])
      table.index(['default_supplier_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
