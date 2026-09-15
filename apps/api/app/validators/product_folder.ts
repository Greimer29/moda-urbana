import vine from '@vinejs/vine'

export const listProductFoldersValidator = vine.create({})

export const createProductFolderValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(100),
  sort_order: vine.number().optional(),
})

export const updateProductFolderValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(100).optional(),
  sort_order: vine.number().optional(),
})

export const addProductToFolderValidator = vine.create({
  catalog_product_id: vine.number().min(1),
})
