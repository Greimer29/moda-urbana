import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Restaurada: esta migración se ejecutó en batch 2 y luego el archivo se reemplazó
 * por 1740000000013_mes2_purchases_overhaul.ts. Las tablas siguen en la BD pero el
 * registro en adonis_schema quedaba como "corrupt" sin este archivo.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.createTable('purchase_operating_expenses', (table) => {
      table.bigIncrements('id').primary()
      table.decimal('amount_usd', 15, 2).notNullable()
      table.string('description', 255).notNullable()
      table.date('date').notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })

    this.schema.createTable('purchase_weekly_expense_limits', (table) => {
      table.bigIncrements('id').primary()
      table.date('week_start').notNullable()
      table.decimal('limit_usd', 15, 2).notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })

    this.schema.createTable('system_settings', (table) => {
      table.string('key', 64).primary()
      table.decimal('value', 15, 4).notNullable()
      table.timestamp('updated_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable('system_settings')
    this.schema.dropTable('purchase_weekly_expense_limits')
    this.schema.dropTable('purchase_operating_expenses')
  }
}
