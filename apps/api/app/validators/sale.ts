import vine from '@vinejs/vine'

const paymentMethods = [
  'CASH_USD',
  'CASH_BS',
  'TRANSFER',
  'MOBILE_PAYMENT',
  'ZELLE',
  'BINANCE',
] as const

export const createSaleValidator = vine.create({
  customer_id: vine.number().min(1).optional(),
  guest_name: vine.string().trim().maxLength(150).optional(),
  payment_method: vine.enum(paymentMethods),
  usd_rate: vine.number().min(0).optional(),
  lines: vine
    .array(
      vine.object({
        catalog_product_id: vine.number().min(1).optional(),
        material_id: vine.number().min(1).optional(),
        quantity: vine.number().min(0.001),
        unit_price_usd: vine.number().min(0),
      })
    )
    .minLength(1),
})

export const listSalesValidator = vine.create({
  page: vine.number().min(1).optional(),
  per_page: vine.number().min(1).max(100).optional(),
  customer_id: vine.number().min(1).optional(),
  date_from: vine.string().trim().optional(),
  date_to: vine.string().trim().optional(),
})
