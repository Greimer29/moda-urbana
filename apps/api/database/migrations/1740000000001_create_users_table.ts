import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id').primary()
      table.string('email', 150).notNullable().unique()
      table.string('password', 255).notNullable()
      table.string('name', 100).notNullable()
      table.enum('role', ['OPERATOR', 'ADMIN']).notNullable().defaultTo('OPERATOR')
      table.boolean('active').notNullable().defaultTo(true)
      table.dateTime('created_at').notNullable()
      table.dateTime('updated_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
