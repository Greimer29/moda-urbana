import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'machines'

  async up() {
    this.defer(async (db) => {
      await db.rawQuery('ALTER TABLE machines MODIFY COLUMN type VARCHAR(80) NOT NULL')
    })
  }

  async down() {
    this.defer(async (db) => {
      await db.rawQuery(`
        ALTER TABLE machines MODIFY COLUMN type ENUM(
          'STRAIGHT_STITCH',
          'OVERLOCK',
          'COVERSTITCH',
          'CUTTER',
          'EMBROIDERY',
          'OTHER'
        ) NOT NULL
      `)
    })
  }
}
