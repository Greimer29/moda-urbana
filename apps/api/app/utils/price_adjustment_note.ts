export const PRICE_ADJUSTMENT_NOTE_PREFIX = 'Ajuste de precio:'

const CENTS_EPSILON = 0.005

function round2(value: number): number {
  return Math.round((Number(value) || 0) * 100) / 100
}

function formatUsdEs(value: number): string {
  return round2(value).toFixed(2).replace('.', ',')
}

export function buildPriceAdjustmentNote(
  listPriceUsd: number,
  soldPriceUsd: number
): string | null {
  const list = round2(listPriceUsd)
  const sold = round2(soldPriceUsd)
  const delta = round2(sold - list)

  if (Math.abs(delta) < CENTS_EPSILON) {
    return null
  }

  const kind = delta < 0 ? 'descuento' : 'aumento'
  return `${PRICE_ADJUSTMENT_NOTE_PREFIX} ${kind} de ${formatUsdEs(Math.abs(delta))} USD (lista ${formatUsdEs(list)} → ${formatUsdEs(sold)})`
}

export function mergeLineNotes(
  existing: string | null | undefined,
  autoNote: string | null
): string | null {
  const userPart = (existing ?? '')
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => {
      const trimmed = line.trim()
      return trimmed !== '' && !trimmed.startsWith(PRICE_ADJUSTMENT_NOTE_PREFIX)
    })
    .join('\n')
    .trim()

  if (!autoNote) {
    return userPart || null
  }

  if (!userPart) {
    return autoNote
  }

  return `${userPart}\n${autoNote}`
}
