import ProductFolderService from '#services/product_folder_service'
import {
  addProductToFolderValidator,
  createProductFolderValidator,
  updateProductFolderValidator,
} from '#validators/product_folder'
import type { HttpContext } from '@adonisjs/core/http'
import type ProductFolder from '#models/product_folder'

function serializeFolder(
  folder: ProductFolder,
  extras?: { products_count?: number }
) {
  return {
    id: Number(folder.id),
    name: folder.name,
    sort_order: folder.sortOrder,
    products_count: extras?.products_count ?? 0,
    created_at: folder.createdAt.toISO(),
    updated_at: folder.updatedAt.toISO(),
  }
}

export default class ProductFoldersController {
  private service = new ProductFolderService()

  async index({ serialize }: HttpContext) {
    const rows = await this.service.listar()

    return serialize({
      product_folders: rows.map(({ folder, products_count }) =>
        serializeFolder(folder, { products_count })
      ),
    })
  }

  async show({ params, serialize }: HttpContext) {
    const folder = await this.service.obtener(Number(params.id))
    const rows = await this.service.listar()
    const match = rows.find((row) => Number(row.folder.id) === Number(folder.id))

    return serialize({
      product_folder: serializeFolder(folder, {
        products_count: match?.products_count ?? 0,
      }),
    })
  }

  async store({ request, serialize }: HttpContext) {
    const payload = await request.validateUsing(createProductFolderValidator)
    const folder = await this.service.crear(payload)

    return serialize({
      product_folder: serializeFolder(folder, { products_count: 0 }),
    })
  }

  async update({ params, request, serialize }: HttpContext) {
    const payload = await request.validateUsing(updateProductFolderValidator)
    const folder = await this.service.actualizar(Number(params.id), payload)
    const rows = await this.service.listar()
    const match = rows.find((row) => Number(row.folder.id) === Number(folder.id))

    return serialize({
      product_folder: serializeFolder(folder, {
        products_count: match?.products_count ?? 0,
      }),
    })
  }

  async destroy({ params, serialize }: HttpContext) {
    const result = await this.service.eliminar(Number(params.id))
    return serialize(result)
  }

  async addProduct({ params, request, serialize }: HttpContext) {
    const payload = await request.validateUsing(addProductToFolderValidator)
    const item = await this.service.agregarProducto(
      Number(params.id),
      payload.catalog_product_id
    )

    return serialize({
      product_folder_item: {
        id: Number(item.id),
        product_folder_id: Number(item.productFolderId),
        catalog_product_id: Number(item.catalogProductId),
        created_at: item.createdAt.toISO(),
        updated_at: item.updatedAt.toISO(),
      },
    })
  }

  async removeProduct({ params, serialize }: HttpContext) {
    const result = await this.service.quitarProducto(
      Number(params.id),
      Number(params.catalogProductId)
    )
    return serialize(result)
  }
}
