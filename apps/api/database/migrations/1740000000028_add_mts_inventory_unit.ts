import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.defer(async (db) => {
      await db.rawQuery(
        "ALTER TABLE materials MODIFY COLUMN unit ENUM('UND', 'PAR', 'CAJ', 'ROL', 'SET', 'MTS') NOT NULL"
      )
      await db.rawQuery(
        "ALTER TABLE catalog_products MODIFY COLUMN sale_unit ENUM('UND', 'PAR', 'CAJ', 'ROL', 'SET', 'MTS') NOT NULL DEFAULT 'UND'"
      )
    })
  }

  async down() {
    this.defer(async (db) => {
      await db.from('materials').where('unit', 'MTS').update({ unit: 'UND' })
      await db.from('catalog_products').where('sale_unit', 'MTS').update({ sale_unit: 'UND' })

      await db.rawQuery(
        "ALTER TABLE materials MODIFY COLUMN unit ENUM('UND', 'PAR', 'CAJ', 'ROL', 'SET') NOT NULL"
      )
      await db.rawQuery(
        "ALTER TABLE catalog_products MODIFY COLUMN sale_unit ENUM('UND', 'PAR', 'CAJ', 'ROL', 'SET') NOT NULL DEFAULT 'UND'"
      )
    })
  }
}
