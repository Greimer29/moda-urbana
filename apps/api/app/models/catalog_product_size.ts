import { CatalogProductSizeSchema } from '#database/schema'
import CatalogProduct from '#models/catalog_product'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class CatalogProductSize extends CatalogProductSizeSchema {
  static table = 'catalog_product_sizes'

  @belongsTo(() => CatalogProduct)
  declare catalogProduct: BelongsTo<typeof CatalogProduct>
}
