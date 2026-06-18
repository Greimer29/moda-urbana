import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'orders'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id').primary()
      table.string('code', 20).notNullable().unique()
      table
        .bigInteger('customer_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('customers')
        .onDelete('RESTRICT')
      table.enum('modality', ['WHITE_LABEL', 'CORPORATE']).notNullable()
      table.text('description').notNullable()
      table.integer('total_quantity').unsigned().notNullable()
      table.date('order_date').notNullable()
      table.date('estimated_delivery_date').nullable()
      table
        .enum('status', ['DRAFT', 'CONFIRMED', 'IN_PRODUCTION', 'DELIVERED', 'CANCELLED'])
        .notNullable()
        .defaultTo('DRAFT')
      table.decimal('total_price', 15, 2).nullable()
      table.text('notes').nullable()
      table.string('reference_file', 255).nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['customer_id'])
      table.index(['status'])
      table.index(['order_date'])
      table.index(['modality'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
