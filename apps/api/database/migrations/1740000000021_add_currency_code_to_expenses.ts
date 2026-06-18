import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('expenses', (table) => {
      table
        .string('currency_code', 3)
        .notNullable()
        .defaultTo('USD')
        .references('code')
        .inTable('currencies')
        .onDelete('RESTRICT')
    })

    this.schema.alterTable('machine_expenses', (table) => {
      table
        .string('currency_code', 3)
        .notNullable()
        .defaultTo('VES')
        .references('code')
        .inTable('currencies')
        .onDelete('RESTRICT')
    })
  }

  async down() {
    this.schema.alterTable('expenses', (table) => {
      table.dropForeign(['currency_code'])
      table.dropColumn('currency_code')
    })

    this.schema.alterTable('machine_expenses', (table) => {
      table.dropForeign(['currency_code'])
      table.dropColumn('currency_code')
    })
  }
}
