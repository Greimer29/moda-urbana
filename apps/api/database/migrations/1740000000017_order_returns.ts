import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'orders'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.timestamp('returned_at').nullable()
    })

    this.defer(async (db) => {
      await db.rawQuery(
        "ALTER TABLE orders MODIFY COLUMN status ENUM('DRAFT', 'CONFIRMED', 'IN_PRODUCTION', 'DELIVERED', 'CANCELLED', 'RETURNED') NOT NULL DEFAULT 'DRAFT'"
      )
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('returned_at')
    })

    this.defer(async (db) => {
      await db.rawQuery(
        "UPDATE orders SET status = 'CANCELLED' WHERE status = 'RETURNED'"
      )
      await db.rawQuery(
        "ALTER TABLE orders MODIFY COLUMN status ENUM('DRAFT', 'CONFIRMED', 'IN_PRODUCTION', 'DELIVERED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT'"
      )
    })
  }
}
