import vine from '@vinejs/vine'

export const createOrderLineValidator = vine.create({
  catalog_product_id: vine.number().min(1),
  catalog_product_size_id: vine.number().min(1).optional(),
  size: vine.string().trim().maxLength(20).optional(),
  quantity: vine.number().min(0.001),
  unit_price_usd: vine.number().min(0).optional(),
  notes: vine.string().trim().maxLength(2000).nullable().optional(),
})

export const updateOrderLineValidator = vine.create({
  quantity: vine.number().min(0.001),
  unit_price_usd: vine.number().min(0).optional(),
  notes: vine.string().trim().maxLength(2000).nullable().optional(),
})
