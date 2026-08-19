import vine from '@vinejs/vine'

const isoDate = vine.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const month = vine.string().regex(/^\d{4}-\d{2}$/)
const movementTypes = ['purchases', 'expenses', 'machine_expenses', 'sales'] as const

function normalizeMovementTypes(value: string | string[] | undefined) {
  if (!value) return undefined

  const parts = (Array.isArray(value) ? value : value.split(',')).map((part) => part.trim())

  return parts.filter((part): part is (typeof movementTypes)[number] =>
    (movementTypes as readonly string[]).includes(part)
  )
}

const productMovementTypes = [
  'PURCHASE_IN',
  'SALE_OUT',
  'MANUAL_ADJUSTMENT',
  'MANUAL_CARGO',
  'MANUAL_DESCARGO',
  'REVERSAL_ADJUSTMENT',
] as const

function normalizeProductMovementTypes(value: string | string[] | undefined) {
  if (!value) return undefined

  const parts = (Array.isArray(value) ? value : value.split(',')).map((part) => part.trim())

  return parts.filter((part): part is (typeof productMovementTypes)[number] =>
    (productMovementTypes as readonly string[]).includes(part)
  )
}

export const inventoryReportValidator = vine.create({
  search: vine.string().trim().optional(),
  category: vine.string().trim().optional(),
  active: vine.boolean().optional(),
  low_stock: vine.boolean().optional(),
  hide_zero: vine.boolean().optional(),
  sort_by: vine.enum(['id', 'name', 'sale_price', 'quantity']).optional(),
  sort_dir: vine.enum(['asc', 'desc']).optional(),
  page: vine.number().min(1).optional(),
  per_page: vine.number().min(1).max(200).optional(),
  export: vine.boolean().optional(),
})

export const inventoryMovementsValidator = vine.create({
  from: isoDate.optional(),
  to: isoDate.optional(),
  month: month.optional(),
  types: vine
    .any()
    .optional()
    .transform((value: unknown) => {
      if (value === undefined || value === null || value === '') {
        return undefined
      }

      return normalizeProductMovementTypes(value as string | string[])
    }),
  page: vine.number().min(1).optional(),
  per_page: vine.number().min(1).max(200).optional(),
  export: vine.boolean().optional(),
})

export const dailyClosingValidator = vine.create({
  date: isoDate.optional(),
})

export const accountStatementValidator = vine.create({
  from: isoDate.optional(),
  to: isoDate.optional(),
  month: month.optional(),
  account_id: vine.number().min(1).optional(),
  unassigned: vine.boolean().optional(),
  display_currency: vine.string().trim().toUpperCase().fixedLength(3).optional(),
  types: vine
    .any()
    .optional()
    .transform((value: unknown) => {
      if (value === undefined || value === null || value === '') {
        return undefined
      }

      return normalizeMovementTypes(value as string | string[])
    }),
})
