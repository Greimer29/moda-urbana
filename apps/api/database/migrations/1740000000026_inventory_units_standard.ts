import { BaseSchema } from '@adonisjs/lucid/schema'

const MATERIAL_MAP: Record<string, string> = {
  METER: 'UND',
  KILO: 'UND',
  UNIT: 'UND',
  ROLL: 'ROL',
  LITER: 'UND',
  BOX: 'CAJ',
  PACK: 'CAJ',
}

const PRODUCT_UNIT_MAP: Record<string, string> = {
  UNIT: 'UND',
  PAIR: 'PAR',
  KIT: 'SET',
}

const MATERIAL_REVERSE_MAP: Record<string, string> = {
  UND: 'UNIT',
  PAR: 'UNIT',
  CAJ: 'BOX',
  ROL: 'ROLL',
  SET: 'UNIT',
  MTS: 'METER',
}

const PRODUCT_UNIT_REVERSE_MAP: Record<string, string> = {
  UND: 'UNIT',
  PAR: 'PAIR',
  CAJ: 'UNIT',
  ROL: 'UNIT',
  SET: 'KIT',
  MTS: 'UNIT',
}

export default class extends BaseSchema {
  async up() {
    this.defer(async (db) => {
      await db.rawQuery(
        "ALTER TABLE materials MODIFY COLUMN unit ENUM('METER', 'KILO', 'UNIT', 'ROLL', 'LITER', 'BOX', 'PACK', 'UND', 'PAR', 'CAJ', 'ROL', 'SET') NOT NULL"
      )
      await db.rawQuery(
        "ALTER TABLE catalog_products MODIFY COLUMN sale_unit ENUM('UNIT', 'PAIR', 'KIT', 'UND', 'PAR', 'CAJ', 'ROL', 'SET') NOT NULL DEFAULT 'UNIT'"
      )

      const materials = await db.from('materials').select('id', 'unit')
      for (const row of materials) {
        const next = MATERIAL_MAP[String(row.unit)] ?? String(row.unit)
        if (next !== row.unit) {
          await db.from('materials').where('id', row.id).update({ unit: next })
        }
      }

      const products = await db.from('catalog_products').select('id', 'sale_unit')
      for (const row of products) {
        const next = PRODUCT_UNIT_MAP[String(row.sale_unit)] ?? String(row.sale_unit)
        if (next !== row.sale_unit) {
          await db.from('catalog_products').where('id', row.id).update({ sale_unit: next })
        }
      }

      await db.rawQuery(
        "ALTER TABLE materials MODIFY COLUMN unit ENUM('UND', 'PAR', 'CAJ', 'ROL', 'SET') NOT NULL"
      )
      await db.rawQuery(
        "ALTER TABLE catalog_products MODIFY COLUMN sale_unit ENUM('UND', 'PAR', 'CAJ', 'ROL', 'SET') NOT NULL DEFAULT 'UND'"
      )
    })
  }

  async down() {
    this.defer(async (db) => {
      await db.rawQuery(
        "ALTER TABLE materials MODIFY COLUMN unit ENUM('METER', 'KILO', 'UNIT', 'ROLL', 'LITER', 'BOX', 'PACK', 'UND', 'PAR', 'CAJ', 'ROL', 'SET', 'MTS') NOT NULL"
      )
      await db.rawQuery(
        "ALTER TABLE catalog_products MODIFY COLUMN sale_unit ENUM('UNIT', 'PAIR', 'KIT', 'UND', 'PAR', 'CAJ', 'ROL', 'SET', 'MTS') NOT NULL DEFAULT 'UNIT'"
      )

      const materials = await db.from('materials').select('id', 'unit')
      for (const row of materials) {
        const next = MATERIAL_REVERSE_MAP[String(row.unit)] ?? String(row.unit)
        if (next !== row.unit) {
          await db.from('materials').where('id', row.id).update({ unit: next })
        }
      }

      const products = await db.from('catalog_products').select('id', 'sale_unit')
      for (const row of products) {
        const next = PRODUCT_UNIT_REVERSE_MAP[String(row.sale_unit)] ?? String(row.sale_unit)
        if (next !== row.sale_unit) {
          await db.from('catalog_products').where('id', row.id).update({ sale_unit: next })
        }
      }

      await db.rawQuery(
        "ALTER TABLE materials MODIFY COLUMN unit ENUM('METER', 'KILO', 'UNIT', 'ROLL', 'LITER', 'BOX', 'PACK') NOT NULL"
      )
      await db.rawQuery(
        "ALTER TABLE catalog_products MODIFY COLUMN sale_unit ENUM('UNIT', 'PAIR', 'KIT') NOT NULL DEFAULT 'UNIT'"
      )
    })
  }
}
