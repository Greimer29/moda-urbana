import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'catalog_products'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('brand', 80).nullable().after('name')
      table.string('product_model', 100).nullable().after('brand')
      table.string('reference', 100).nullable().after('product_model')

      table.index(['brand'])
      table.index(['product_model'])
      table.index(['reference'])
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropIndex(['brand'])
      table.dropIndex(['product_model'])
      table.dropIndex(['reference'])
      table.dropColumn('reference')
      table.dropColumn('product_model')
      table.dropColumn('brand')
    })
  }
}
