import vine from '@vinejs/vine'

export const updateExchangeRateValidator = vine.create({
  usd_rate: vine.number().positive(),
})

export const updateProfitMarginValidator = vine.create({
  profit_margin_percent: vine.number().min(0),
})
