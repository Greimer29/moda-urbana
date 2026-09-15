import { DateTime } from 'luxon'
import { BaseModel, column, hasMany, manyToMany } from '@adonisjs/lucid/orm'
import type { HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'
import CatalogProduct from '#models/catalog_product'
import ProductFolderItem from '#models/product_folder_item'

export default class ProductFolder extends BaseModel {
  static table = 'product_folders'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare sortOrder: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @hasMany(() => ProductFolderItem)
  declare items: HasMany<typeof ProductFolderItem>

  @manyToMany(() => CatalogProduct, {
    pivotTable: 'product_folder_items',
    localKey: 'id',
    pivotForeignKey: 'product_folder_id',
    relatedKey: 'id',
    pivotRelatedForeignKey: 'catalog_product_id',
  })
  declare products: ManyToMany<typeof CatalogProduct>
}
