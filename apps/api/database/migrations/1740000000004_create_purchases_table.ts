import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'purchases'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id').primary()
      table
        .bigInteger('supplier_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('suppliers')
        .onDelete('RESTRICT')
      table.date('date').notNullable()
      table.date('received_date').nullable()
      table.string('invoice_number', 50).nullable()
      table.string('invoice_file', 255).nullable()
      table.decimal('usd_rate', 15, 4).nullable()
      table.decimal('total_bs', 15, 2).notNullable().defaultTo(0)
      table.decimal('total_usd_snapshot', 15, 4).nullable()
      table.enum('status', ['DRAFT', 'CONFIRMED']).notNullable().defaultTo('DRAFT')
      table.text('notes').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['supplier_id'])
      table.index(['date'])
      table.index(['status'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
