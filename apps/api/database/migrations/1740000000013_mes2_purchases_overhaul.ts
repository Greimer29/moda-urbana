import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('materials', (table) => {
      table.decimal('sale_price_usd', 15, 4).nullable().after('last_purchase_date')
    })

    this.schema.alterTable('purchases', (table) => {
      table.decimal('total_usd', 15, 4).nullable().after('total_bs')
      table.timestamp('voided_at').nullable().after('updated_at')
    })

    this.defer(async (db) => {
      await db.rawQuery(
        "ALTER TABLE purchases MODIFY COLUMN status ENUM('DRAFT', 'CONFIRMED', 'VOIDED') NOT NULL DEFAULT 'DRAFT'"
      )
    })

    this.schema.alterTable('purchase_items', (table) => {
      table.decimal('unit_price_usd', 15, 4).nullable().after('quantity')
      table.decimal('subtotal_usd', 15, 4).nullable().after('unit_price_bs')
    })

    this.schema.createTable('expenses', (table) => {
      table.bigIncrements('id').primary()
      table.date('date').notNullable()
      table.string('description', 255).notNullable()
      table.decimal('amount_usd', 15, 4).notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['date'])
    })

    this.schema.createTable('app_settings', (table) => {
      table.string('key', 64).primary()
      table.text('value').notNullable()
      table.timestamp('updated_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable('app_settings')
    this.schema.dropTable('expenses')

    this.schema.alterTable('purchase_items', (table) => {
      table.dropColumn('unit_price_usd')
      table.dropColumn('subtotal_usd')
    })

    this.defer(async (db) => {
      await db.rawQuery(
        "ALTER TABLE purchases MODIFY COLUMN status ENUM('DRAFT', 'CONFIRMED') NOT NULL DEFAULT 'DRAFT'"
      )
    })

    this.schema.alterTable('purchases', (table) => {
      table.dropColumn('total_usd')
      table.dropColumn('voided_at')
    })

    this.schema.alterTable('materials', (table) => {
      table.dropColumn('sale_price_usd')
    })
  }
}
