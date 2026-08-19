import { APP_TIMEZONE } from '@/lib/app-timezone'

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/**
 * Calendar date (YYYY-MM-DD) for a datetime ISO in the shop timezone.
 * Plain date strings are returned as-is.
 */
export function isoToBusinessDate(iso: string, timeZone: string = APP_TIMEZONE): string | null {
  const trimmed = iso.trim()
  if (!trimmed) {
    return null
  }

  if (!trimmed.includes('T') && !trimmed.includes(' ')) {
    return ISO_DATE_RE.test(trimmed) ? trimmed : null
  }

  const date = new Date(trimmed)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

/**
 * Formatea una fecha ISO (`YYYY-MM-DD` o datetime con `T`) a `DD/MM/YYYY`.
 */
export function formatFecha(iso: string | null | undefined) {
  if (!iso) {
    return '—'
  }

  const datePart =
    iso.includes('T') || iso.includes(' ') ? isoToBusinessDate(iso) : iso.split(' ')[0]

  if (!datePart) {
    return '—'
  }

  const [year, month, day] = datePart.split('-')

  if (!year || !month || !day) {
    return '—'
  }

  return `${day}/${month}/${year}`
}

/**
 * Fecha y hora en locale venezolano.
 */
export function formatFechaHora(iso: string | null | undefined) {
  if (!iso) {
    return '—'
  }

  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return date.toLocaleString('es-VE', {
    timeZone: APP_TIMEZONE,
    dateStyle: 'short',
    timeStyle: 'short',
  })
}
