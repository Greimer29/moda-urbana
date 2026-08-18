export const APP_TIMEZONE = 'America/Caracas'

/**
 * Calendar date in the shop timezone (Venezuela, UTC-4, no DST).
 * Do not use `Date#toISOString()` for business days: after 8pm local that is the next UTC day.
 */
export function todayIsoDate(timeZone: string = APP_TIMEZONE): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

export function startOfMonthIsoDate(timeZone: string = APP_TIMEZONE): string {
  return `${todayIsoDate(timeZone).slice(0, 7)}-01`
}

export function currentMonthIso(timeZone: string = APP_TIMEZONE): string {
  return todayIsoDate(timeZone).slice(0, 7)
}

export function previousMonthIso(timeZone: string = APP_TIMEZONE): string {
  const [year, month] = currentMonthIso(timeZone).split('-').map(Number)
  const utc = new Date(Date.UTC(year, month - 2, 1))
  return `${utc.getUTCFullYear()}-${String(utc.getUTCMonth() + 1).padStart(2, '0')}`
}

export function addDaysIsoDate(baseIso: string, days: number): string {
  const [year, month, day] = baseIso.split('-').map(Number)
  const utc = new Date(Date.UTC(year, month - 1, day + days))
  return `${utc.getUTCFullYear()}-${String(utc.getUTCMonth() + 1).padStart(2, '0')}-${String(
    utc.getUTCDate()
  ).padStart(2, '0')}`
}
