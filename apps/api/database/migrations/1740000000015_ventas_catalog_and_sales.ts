import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('catalog_products', (table) => {
      table.bigIncrements('id').primary()
      table.string('name', 150).notNullable()
      table.text('description').nullable()
      table.string('category', 50).notNullable().defaultTo('OTHER')
      table.string('image_path', 255).nullable()
      table.decimal('sale_price_usd', 15, 4).notNullable().defaultTo(0)
      table.decimal('previous_sale_price_usd', 15, 4).nullable()
      table.decimal('cost_usd', 15, 4).notNullable().defaultTo(0)
      table.decimal('stock_quantity', 12, 3).notNullable().defaultTo(0)
      table.boolean('active').notNullable().defaultTo(true)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['name'])
      table.index(['category'])
      table.index(['active'])
    })

    this.schema.createTable('catalog_product_materials', (table) => {
      table.bigIncrements('id').primary()
      table
        .bigInteger('catalog_product_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('catalog_products')
        .onDelete('CASCADE')
      table
        .bigInteger('material_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('materials')
        .onDelete('RESTRICT')
      table.decimal('quantity', 12, 3).notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.unique(['catalog_product_id', 'material_id'])
    })

    this.schema.createTable('sales', (table) => {
      table.bigIncrements('id').primary()
      table.string('code', 24).notNullable().unique()
      table
        .bigInteger('customer_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('customers')
        .onDelete('SET NULL')
      table.string('guest_name', 150).nullable()
      table
        .enum('payment_method', [
          'CASH_USD',
          'CASH_BS',
          'TRANSFER',
          'MOBILE_PAYMENT',
          'ZELLE',
          'BINANCE',
        ])
        .notNullable()
      table.decimal('total_usd', 15, 4).notNullable()
      table.decimal('total_bs', 15, 2).nullable()
      table.decimal('usd_rate', 15, 4).nullable()
      table.enum('status', ['COMPLETED']).notNullable().defaultTo('COMPLETED')
      table.timestamp('sold_at').notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['sold_at'])
      table.index(['customer_id'])
    })

    this.schema.createTable('sale_lines', (table) => {
      table.bigIncrements('id').primary()
      table
        .bigInteger('sale_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('sales')
        .onDelete('CASCADE')
      table
        .bigInteger('catalog_product_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('catalog_products')
        .onDelete('SET NULL')
      table
        .bigInteger('material_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('materials')
        .onDelete('SET NULL')
      table.string('description', 200).notNullable()
      table.decimal('quantity', 12, 3).notNullable()
      table.decimal('unit_price_usd', 15, 4).notNullable()
      table.decimal('subtotal_usd', 15, 4).notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['sale_id'])
    })

    this.schema.createTable('order_lines', (table) => {
      table.bigIncrements('id').primary()
      table
        .bigInteger('order_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('orders')
        .onDelete('CASCADE')
      table
        .bigInteger('catalog_product_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('catalog_products')
        .onDelete('RESTRICT')
      table.decimal('quantity', 12, 3).notNullable()
      table.decimal('unit_price_usd', 15, 4).notNullable()
      table.decimal('subtotal_usd', 15, 4).notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['order_id'])
      table.index(['catalog_product_id'])
    })

    await this.db.rawQuery(
      `ALTER TABLE inventory_movements MODIFY COLUMN type ENUM('PURCHASE_IN', 'ORDER_OUT', 'MANUAL_ADJUSTMENT', 'REVERSAL_ADJUSTMENT', 'SALE_OUT') NOT NULL`
    )
  }

  async down() {
    this.defer(async (db) => {
      await db.from('inventory_movements').where('type', 'SALE_OUT').delete()
    })

    await this.db.rawQuery(
      `ALTER TABLE inventory_movements MODIFY COLUMN type ENUM('PURCHASE_IN', 'ORDER_OUT', 'MANUAL_ADJUSTMENT', 'REVERSAL_ADJUSTMENT') NOT NULL`
    )

    this.schema.dropTable('order_lines')
    this.schema.dropTable('sale_lines')
    this.schema.dropTable('sales')
    this.schema.dropTable('catalog_product_materials')
    this.schema.dropTable('catalog_products')
  }
}
