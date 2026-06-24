export function parsePositiveIntRouteParam(value: string | undefined): {
  id: number
  isValid: boolean
} {
  if (!value) {
    return { id: 0, isValid: false }
  }

  const id = Number(value)
  return {
    id,
    isValid: Number.isFinite(id) && id > 0,
  }
}
