import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import CatalogProduct from '#models/catalog_product'
import ProductFolder from '#models/product_folder'

export default class ProductFolderItem extends BaseModel {
  static table = 'product_folder_items'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare productFolderId: number

  @column()
  declare catalogProductId: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => ProductFolder)
  declare folder: BelongsTo<typeof ProductFolder>

  @belongsTo(() => CatalogProduct)
  declare catalogProduct: BelongsTo<typeof CatalogProduct>
}
