import { formatFecha } from '@/lib/format-date'

export { formatFecha }

export const MOVEMENT_TYPE_LABELS = {
  sale: 'Venta',
  customer_payment: 'Abono cliente',
  purchase: 'Compra',
  supplier_payment: 'Pago proveedor',
  expense: 'Gasto empresa',
  machine_expense: 'Gasto máquina',
} as const

export type ReportsHubTab = 'financiero' | 'inventario'

export function formatMoney(value: string | number | null | undefined, currency = 'USD') {
  if (value === null || value === undefined || value === '') return '—'
  const num = Number(value)
  const symbol = currency === 'USD' ? '$' : currency === 'VES' ? 'Bs' : currency
  return `${symbol} ${num.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: currency === 'USD' ? 4 : 2,
  })}`
}

export function currencySymbol(code: string) {
  if (code === 'USD') return '$'
  if (code === 'VES') return 'Bs'
  return code
}

export {
  currentMonthIso,
  previousMonthIso,
  todayIsoDate as todayIso,
} from '@/lib/app-timezone'
