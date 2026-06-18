import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('purchases', (table) => {
      table
        .bigInteger('account_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('accounts')
        .onDelete('SET NULL')
        .after('supplier_id')

      table.index(['account_id'])
    })

    this.schema.alterTable('expenses', (table) => {
      table
        .bigInteger('account_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('accounts')
        .onDelete('SET NULL')
        .after('amount_usd')

      table.index(['account_id'])
    })

    this.schema.alterTable('machine_expenses', (table) => {
      table
        .bigInteger('account_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('accounts')
        .onDelete('SET NULL')
        .after('machine_id')

      table.index(['account_id'])
    })
  }

  async down() {
    this.schema.alterTable('machine_expenses', (table) => {
      table.dropForeign(['account_id'])
      table.dropColumn('account_id')
    })

    this.schema.alterTable('expenses', (table) => {
      table.dropForeign(['account_id'])
      table.dropColumn('account_id')
    })

    this.schema.alterTable('purchases', (table) => {
      table.dropForeign(['account_id'])
      table.dropColumn('account_id')
    })
  }
}
