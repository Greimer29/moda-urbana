import CarpetaDuplicadaException from '#exceptions/carpeta_duplicada_exception'
import CarpetaNoEncontradaException from '#exceptions/carpeta_no_encontrada_exception'
import ProductoCatalogoNoEncontradoException from '#exceptions/producto_catalogo_no_encontrado_exception'
import ProductoYaEnCarpetaException from '#exceptions/producto_ya_en_carpeta_exception'
import CatalogProduct from '#models/catalog_product'
import ProductFolder from '#models/product_folder'
import ProductFolderItem from '#models/product_folder_item'
import db from '@adonisjs/lucid/services/db'

export type ProductFolderInput = {
  name: string
  sort_order?: number
}

export type ProductFolderUpdateInput = {
  name?: string
  sort_order?: number
}

export default class ProductFolderService {
  async listar() {
    const folders = await ProductFolder.query()
      .orderBy('sort_order', 'asc')
      .orderBy('name', 'asc')

    const counts = await db
      .from('product_folder_items')
      .select('product_folder_id')
      .count('* as total')
      .groupBy('product_folder_id')

    const countMap = new Map<number, number>()
    for (const row of counts) {
      countMap.set(Number(row.product_folder_id), Number(row.total ?? 0))
    }

    return folders.map((folder) => ({
      folder,
      products_count: countMap.get(Number(folder.id)) ?? 0,
    }))
  }

  async obtener(id: number): Promise<ProductFolder> {
    const folder = await ProductFolder.find(id)
    if (!folder) {
      throw new CarpetaNoEncontradaException()
    }
    return folder
  }

  async crear(input: ProductFolderInput): Promise<ProductFolder> {
    await this.assertNombreValido(input.name)

    return ProductFolder.create({
      name: input.name.trim(),
      sortOrder: input.sort_order ?? 0,
    })
  }

  async actualizar(id: number, input: ProductFolderUpdateInput): Promise<ProductFolder> {
    const folder = await this.obtener(id)

    if (input.name !== undefined) {
      await this.assertNombreValido(input.name, id)
      folder.name = input.name.trim()
    }

    if (input.sort_order !== undefined) {
      folder.sortOrder = input.sort_order
    }

    await folder.save()
    return folder
  }

  async eliminar(id: number): Promise<{ id: number; eliminado: true }> {
    const folder = await this.obtener(id)
    await folder.delete()
    return { id: Number(folder.id), eliminado: true }
  }

  async agregarProducto(folderId: number, catalogProductId: number): Promise<ProductFolderItem> {
    await this.obtener(folderId)

    const product = await CatalogProduct.find(catalogProductId)
    if (!product) {
      throw new ProductoCatalogoNoEncontradoException()
    }

    const existing = await ProductFolderItem.query()
      .where('productFolderId', folderId)
      .where('catalogProductId', catalogProductId)
      .first()

    if (existing) {
      throw new ProductoYaEnCarpetaException()
    }

    return ProductFolderItem.create({
      productFolderId: folderId,
      catalogProductId,
    })
  }

  async quitarProducto(
    folderId: number,
    catalogProductId: number
  ): Promise<{ product_folder_id: number; catalog_product_id: number; eliminado: true }> {
    await this.obtener(folderId)

    const item = await ProductFolderItem.query()
      .where('productFolderId', folderId)
      .where('catalogProductId', catalogProductId)
      .first()

    if (!item) {
      throw new ProductoCatalogoNoEncontradoException()
    }

    await item.delete()
    return {
      product_folder_id: folderId,
      catalog_product_id: catalogProductId,
      eliminado: true,
    }
  }

  private async assertNombreValido(name: string, excludeId?: number) {
    const query = ProductFolder.query().whereILike('name', name.trim())
    if (excludeId) {
      query.whereNot('id', excludeId)
    }
    const existing = await query.first()
    if (existing) {
      throw new CarpetaDuplicadaException()
    }
  }
}
