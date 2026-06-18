import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'machine_expenses'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id').primary()
      table
        .bigInteger('machine_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('machines')
        .onDelete('RESTRICT')
      table.date('date').notNullable()
      table.enum('category', ['REPAIR', 'SUPPLY', 'MAINTENANCE', 'OTHER']).notNullable()
      table.string('description', 255).notNullable()
      table.decimal('amount', 15, 2).notNullable()
      table
        .bigInteger('supplier_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('suppliers')
        .onDelete('SET NULL')
      table.string('receipt_file', 255).nullable()
      table.text('notes').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['machine_id', 'date'])
      table.index(['category'])
      table.index(['date'])
      table.index(['supplier_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
