import { formatFecha } from '@/lib/format-date'

export { formatFecha }

export const COMPRA_ESTADOS = ['DRAFT', 'CONFIRMED', 'VOIDED'] as const

export type PurchaseEstado = (typeof COMPRA_ESTADOS)[number]

export const ESTADO_LABELS: Record<PurchaseEstado, string> = {
  DRAFT: 'Borrador',
  CONFIRMED: 'Confirmada',
  VOIDED: 'Anulada',
}

export type PurchasesHubTab = 'compras' | 'gastos' | 'config'

export const PROFIT_MARGIN_PANEL_ID = 'profit-margin-panel'

export function profitMarginUrl(options?: { productId?: number }) {
  const params = new URLSearchParams({ tab: 'config' })
  if (options?.productId) {
    params.set('productId', String(options.productId))
  }
  return `/purchases?${params.toString()}#${PROFIT_MARGIN_PANEL_ID}`
}

export function formatUsd(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') {
    return '—'
  }
  const num = Number(value)
  return num.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
}

export function formatBs(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') {
    return '—'
  }
  const num = Number(value)
  return num.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
