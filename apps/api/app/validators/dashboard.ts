import vine from '@vinejs/vine'

export const dashboardOverviewValidator = vine.create({
  chart: vine.enum(['daily', 'weekly', 'monthly'] as const).optional(),
})
