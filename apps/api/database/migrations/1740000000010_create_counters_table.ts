import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'counters'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('scope', 50).primary()
      table.integer('value').unsigned().notNullable().defaultTo(0)
      table.timestamp('updated_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
