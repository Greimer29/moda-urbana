import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('accounts', (table) => {
      table.bigIncrements('id').primary()
      table.string('name', 150).notNullable().unique()
      table.string('description', 255).nullable()
      table.boolean('is_active').notNullable().defaultTo(true)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['is_active'])
    })
  }

  async down() {
    this.schema.dropTable('accounts')
  }
}
