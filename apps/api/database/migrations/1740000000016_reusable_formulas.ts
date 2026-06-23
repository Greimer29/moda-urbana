import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('formulas', (table) => {
      table.bigIncrements('id').primary()
      table.string('name', 150).notNullable()
      table.text('description').nullable()
      table.boolean('active').notNullable().defaultTo(true)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['name'])
      table.index(['active'])
    })

    this.schema.createTable('formula_materials', (table) => {
      table.bigIncrements('id').primary()
      table
        .bigInteger('formula_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('formulas')
        .onDelete('CASCADE')
      table
        .bigInteger('material_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('materials')
        .onDelete('RESTRICT')
      table.decimal('quantity', 12, 3).notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.unique(['formula_id', 'material_id'])
    })

    this.schema.alterTable('catalog_products', (table) => {
      table
        .bigInteger('formula_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('formulas')
        .onDelete('SET NULL')

      table.index(['formula_id'])
    })

    this.defer(async (db) => {
      const legacyRows = await db.from('catalog_product_materials').select('*')
      const byProduct = new Map<number, typeof legacyRows>()

      for (const row of legacyRows) {
        const productId = Number(row.catalog_product_id)
        const list = byProduct.get(productId) ?? []
        list.push(row)
        byProduct.set(productId, list)
      }

      const now = new Date()

      for (const [productId, items] of byProduct.entries()) {
        const product = await db.from('catalog_products').where('id', productId).first()
        if (!product) {
          continue
        }

        const [formulaId] = await db.table('formulas').insert({
          name: `${product.name} — fórmula`,
          description: null,
          active: true,
          created_at: now,
          updated_at: now,
        })

        const resolvedFormulaId = Number(formulaId)

        for (const item of items) {
          await db.table('formula_materials').insert({
            formula_id: resolvedFormulaId,
            material_id: item.material_id,
            quantity: item.quantity,
            created_at: now,
            updated_at: now,
          })
        }

        await db
          .from('catalog_products')
          .where('id', productId)
          .update({ formula_id: resolvedFormulaId, updated_at: now })
      }
    })

    this.schema.dropTable('catalog_product_materials')
  }

  async down() {
    this.schema.dropTableIfExists('catalog_product_materials')

    this.schema.createTable('catalog_product_materials', (table) => {
      table.bigIncrements('id').primary()
      table
        .bigInteger('catalog_product_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('catalog_products')
        .onDelete('CASCADE')
      table
        .bigInteger('material_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('materials')
        .onDelete('RESTRICT')
      table.decimal('quantity', 12, 3).notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.unique(['catalog_product_id', 'material_id'])
    })

    this.defer(async (db) => {
      const products = await db
        .from('catalog_products')
        .whereNotNull('formula_id')
        .select('id', 'formula_id')

      const now = new Date()

      for (const product of products) {
        const items = await db
          .from('formula_materials')
          .where('formula_id', product.formula_id)
          .select('*')

        for (const item of items) {
          await db.table('catalog_product_materials').insert({
            catalog_product_id: product.id,
            material_id: item.material_id,
            quantity: item.quantity,
            created_at: now,
            updated_at: now,
          })
        }
      }
    })

    this.schema.alterTable('catalog_products', (table) => {
      table.dropForeign(['formula_id'])
      table.dropColumn('formula_id')
    })

    this.schema.dropTable('formula_materials')
    this.schema.dropTable('formulas')
  }
}
