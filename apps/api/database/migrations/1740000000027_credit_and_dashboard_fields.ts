import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('catalog_products', (table) => {
      table.decimal('minimum_stock', 15, 3).notNullable().defaultTo(0).after('stock_quantity')
    })

    this.schema.alterTable('customers', (table) => {
      table.integer('credit_days').unsigned().nullable().after('type')
    })

    this.schema.alterTable('suppliers', (table) => {
      table.integer('credit_days').unsigned().nullable().after('active')
    })

    this.schema.alterTable('orders', (table) => {
      table.timestamp('confirmed_at').nullable().after('status')
      table
        .enum('payment_type', ['CASH', 'CREDIT'])
        .notNullable()
        .defaultTo('CASH')
        .after('confirmed_at')
      table.date('credit_due_date').nullable().after('payment_type')
      table.decimal('amount_paid_usd', 15, 4).notNullable().defaultTo(0).after('credit_due_date')
      table.decimal('balance_usd', 15, 4).notNullable().defaultTo(0).after('amount_paid_usd')
      table.index(['confirmed_at'])
      table.index(['payment_type'])
      table.index(['credit_due_date'])
    })

    this.schema.alterTable('purchases', (table) => {
      table.boolean('is_credit').notNullable().defaultTo(false).after('status')
      table.date('credit_due_date').nullable().after('is_credit')
      table.decimal('amount_paid_usd', 15, 4).notNullable().defaultTo(0).after('credit_due_date')
      table.decimal('balance_usd', 15, 4).notNullable().defaultTo(0).after('amount_paid_usd')
      table.index(['is_credit'])
      table.index(['credit_due_date'])
    })

    this.schema.createTable('customer_payments', (table) => {
      table.bigIncrements('id').primary()
      table
        .bigInteger('customer_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('customers')
        .onDelete('RESTRICT')
      table
        .bigInteger('order_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('orders')
        .onDelete('SET NULL')
      table
        .bigInteger('account_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('accounts')
        .onDelete('SET NULL')
      table.decimal('amount_usd', 15, 4).notNullable()
      table.date('date').notNullable()
      table.string('note', 255).nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
      table.index(['customer_id'])
      table.index(['order_id'])
      table.index(['date'])
    })

    this.schema.createTable('supplier_payments', (table) => {
      table.bigIncrements('id').primary()
      table
        .bigInteger('supplier_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('suppliers')
        .onDelete('RESTRICT')
      table
        .bigInteger('purchase_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('purchases')
        .onDelete('SET NULL')
      table
        .bigInteger('account_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('accounts')
        .onDelete('SET NULL')
      table.decimal('amount_usd', 15, 4).notNullable()
      table.date('date').notNullable()
      table.string('note', 255).nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
      table.index(['supplier_id'])
      table.index(['purchase_id'])
      table.index(['date'])
    })

    this.defer(async (db) => {
      await db.rawQuery(`
        UPDATE orders
        SET confirmed_at = updated_at
        WHERE status IN ('CONFIRMED', 'IN_PRODUCTION', 'DELIVERED', 'RETURNED')
          AND confirmed_at IS NULL
      `)
    })
  }

  async down() {
    this.schema.dropTable('supplier_payments')
    this.schema.dropTable('customer_payments')

    this.schema.alterTable('purchases', (table) => {
      table.dropColumn('balance_usd')
      table.dropColumn('amount_paid_usd')
      table.dropColumn('credit_due_date')
      table.dropColumn('is_credit')
    })

    this.schema.alterTable('orders', (table) => {
      table.dropColumn('balance_usd')
      table.dropColumn('amount_paid_usd')
      table.dropColumn('credit_due_date')
      table.dropColumn('payment_type')
      table.dropColumn('confirmed_at')
    })

    this.schema.alterTable('suppliers', (table) => {
      table.dropColumn('credit_days')
    })

    this.schema.alterTable('customers', (table) => {
      table.dropColumn('credit_days')
    })

    this.schema.alterTable('catalog_products', (table) => {
      table.dropColumn('minimum_stock')
    })
  }
}
