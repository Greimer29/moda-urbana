import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'order_lines'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.decimal('returned_quantity', 12, 3).notNullable().defaultTo(0).after('quantity')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('returned_quantity')
    })
  }
}
