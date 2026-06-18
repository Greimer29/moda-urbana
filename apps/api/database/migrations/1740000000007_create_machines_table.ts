import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'machines'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id').primary()
      table.string('name', 100).notNullable()
      table
        .enum('type', [
          'STRAIGHT_STITCH',
          'OVERLOCK',
          'COVERSTITCH',
          'CUTTER',
          'EMBROIDERY',
          'OTHER',
        ])
        .notNullable()
      table.string('brand', 80).nullable()
      table.string('model', 80).nullable()
      table.string('serial_number', 80).nullable()
      table.date('acquisition_date').nullable()
      table.decimal('acquisition_cost', 15, 2).nullable()
      table
        .enum('status', ['OPERATIONAL', 'UNDER_REPAIR', 'OUT_OF_SERVICE'])
        .notNullable()
        .defaultTo('OPERATIONAL')
      table.string('location', 100).nullable()
      table.text('notes').nullable()
      table.boolean('active').notNullable().defaultTo(true)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['name'])
      table.index(['type'])
      table.index(['status'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
