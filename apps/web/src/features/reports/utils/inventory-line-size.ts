type InventorySizeFields = {
  size?: string | null
  talla?: string | null
}

export function inventoryLineSizeLabel(line: InventorySizeFields): string {
  const raw = line.talla ?? line.size
  if (raw == null) {
    return '—'
  }

  const label = String(raw).trim()
  return label.length > 0 ? label : '—'
}
