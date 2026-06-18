import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'customers'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id').primary()
      table.string('name', 150).notNullable()
      table.string('phone', 20).nullable().unique()
      table.string('email', 150).nullable().unique()
      table.enum('type', ['WHITE_LABEL', 'CORPORATE', 'OTHER']).notNullable()
      table.string('document', 30).nullable()
      table.string('address', 255).nullable()
      table.text('notes').nullable()
      table.boolean('active').notNullable().defaultTo(true)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['name'])
      table.index(['type'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
