import { BaseSchema } from '@adonisjs/lucid/schema'

const SEED = [
  { name: 'Uniforme', sort_order: 1 },
  { name: 'Camisa', sort_order: 2 },
  { name: 'Pantalón', sort_order: 3 },
  { name: 'Accesorio', sort_order: 4 },
  { name: 'Otro', sort_order: 99 },
]

const LEGACY_MAP: Record<string, string> = {
  UNIFORM: 'Uniforme',
  SHIRT: 'Camisa',
  PANTS: 'Pantalón',
  ACCESSORY: 'Accesorio',
  OTHER: 'Otro',
}

export default class extends BaseSchema {
  protected tableName = 'categories'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id').primary()
      table.string('name', 100).notNullable().unique()
      table.boolean('active').notNullable().defaultTo(true)
      table.integer('sort_order').notNullable().defaultTo(0)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })

    this.defer(async (db) => {
      const now = new Date()
      for (const row of SEED) {
        await db.table('categories').insert({
          name: row.name,
          active: true,
          sort_order: row.sort_order,
          created_at: now,
          updated_at: now,
        })
      }

      for (const [legacy, name] of Object.entries(LEGACY_MAP)) {
        await db.from('catalog_products').where('category', legacy).update({ category: name })
      }
    })
  }

  async down() {
    this.defer(async (db) => {
      const reverseMap = Object.fromEntries(
        Object.entries(LEGACY_MAP).map(([legacy, name]) => [name, legacy])
      )

      for (const [name, legacy] of Object.entries(reverseMap)) {
        await db.from('catalog_products').where('category', name).update({ category: legacy })
      }
    })

    this.schema.dropTable(this.tableName)
  }
}
