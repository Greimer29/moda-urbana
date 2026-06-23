import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'materials'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('image_path', 255).nullable().after('sale_price_usd')
      table.decimal('previous_sale_price_usd', 15, 4).nullable().after('image_path')
      table
        .decimal('previous_purchase_price_usd', 15, 4)
        .nullable()
        .after('previous_sale_price_usd')
      table
        .decimal('reference_sale_price_usd', 15, 4)
        .nullable()
        .after('previous_purchase_price_usd')
      table.decimal('reference_cost_usd', 15, 4).nullable().after('reference_sale_price_usd')
    })

    await this.db.rawQuery(
      `ALTER TABLE materials MODIFY COLUMN unit ENUM('METER', 'KILO', 'UNIT', 'ROLL', 'LITER', 'BOX', 'PACK') NOT NULL`
    )
  }

  async down() {
    await this.db.rawQuery(
      `ALTER TABLE materials MODIFY COLUMN unit ENUM('METER', 'KILO', 'UNIT', 'ROLL', 'LITER') NOT NULL`
    )

    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('reference_cost_usd')
      table.dropColumn('reference_sale_price_usd')
      table.dropColumn('previous_purchase_price_usd')
      table.dropColumn('previous_sale_price_usd')
      table.dropColumn('image_path')
    })
  }
}
