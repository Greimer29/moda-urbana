import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('machine_expenses', (table) => {
      table.string('currency_code', 3).notNullable().defaultTo('USD').alter()
    })
  }

  async down() {
    this.schema.alterTable('machine_expenses', (table) => {
      table.string('currency_code', 3).notNullable().defaultTo('VES').alter()
    })
  }
}
