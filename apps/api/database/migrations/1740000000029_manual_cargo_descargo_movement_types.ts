import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.defer(async (db) => {
      await db.rawQuery(
        "ALTER TABLE inventory_movements MODIFY COLUMN type ENUM('PURCHASE_IN', 'ORDER_OUT', 'MANUAL_ADJUSTMENT', 'MANUAL_CARGO', 'MANUAL_DESCARGO', 'REVERSAL_ADJUSTMENT', 'SALE_OUT') NOT NULL"
      )
      await db.rawQuery(
        "ALTER TABLE product_inventory_movements MODIFY COLUMN type ENUM('PURCHASE_IN', 'SALE_OUT', 'MANUAL_ADJUSTMENT', 'MANUAL_CARGO', 'MANUAL_DESCARGO', 'REVERSAL_ADJUSTMENT') NOT NULL"
      )
    })
  }

  async down() {
    this.defer(async (db) => {
      await db
        .from('inventory_movements')
        .where('type', 'MANUAL_CARGO')
        .update({ type: 'MANUAL_ADJUSTMENT' })
      await db
        .from('inventory_movements')
        .where('type', 'MANUAL_DESCARGO')
        .update({ type: 'MANUAL_ADJUSTMENT' })
      await db
        .from('product_inventory_movements')
        .where('type', 'MANUAL_CARGO')
        .update({ type: 'MANUAL_ADJUSTMENT' })
      await db
        .from('product_inventory_movements')
        .where('type', 'MANUAL_DESCARGO')
        .update({ type: 'MANUAL_ADJUSTMENT' })

      await db.rawQuery(
        "ALTER TABLE inventory_movements MODIFY COLUMN type ENUM('PURCHASE_IN', 'ORDER_OUT', 'MANUAL_ADJUSTMENT', 'REVERSAL_ADJUSTMENT', 'SALE_OUT') NOT NULL"
      )
      await db.rawQuery(
        "ALTER TABLE product_inventory_movements MODIFY COLUMN type ENUM('PURCHASE_IN', 'SALE_OUT', 'MANUAL_ADJUSTMENT', 'REVERSAL_ADJUSTMENT') NOT NULL"
      )
    })
  }
}
