import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('product_folders', (table) => {
      table.bigIncrements('id').primary()
      table.string('name', 100).notNullable()
      table.integer('sort_order').notNullable().defaultTo(0)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['sort_order'])
      table.index(['name'])
    })

    this.schema.createTable('product_folder_items', (table) => {
      table.bigIncrements('id').primary()
      table
        .bigInteger('product_folder_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('product_folders')
        .onDelete('CASCADE')
      table
        .bigInteger('catalog_product_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('catalog_products')
        .onDelete('CASCADE')
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.unique(['product_folder_id', 'catalog_product_id'])
      table.index(['catalog_product_id'])
    })
  }

  async down() {
    this.schema.dropTable('product_folder_items')
    this.schema.dropTable('product_folders')
  }
}
