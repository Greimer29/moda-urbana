import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DecimalInput } from '@/components/decimal-input'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Category } from '@/features/categories/types'
import { CATALOG_SORT_OPTIONS } from '@/features/ventas/utils/catalog-sort'

type VentasCatalogFiltersOverlayProps = {
  open: boolean
  onClose: () => void
  onClear: () => void
  category: string
  onCategoryChange: (value: string) => void
  categories: Category[]
  brandFilter: string
  onBrandChange: (value: string) => void
  brandOptions: string[]
  modelFilter: string
  onModelChange: (value: string) => void
  modelOptions: string[]
  sizeFilter: string
  onSizeChange: (value: string) => void
  sizeOptions: string[]
  priceMinFilter: string
  onPriceMinChange: (value: string) => void
  priceMaxFilter: string
  onPriceMaxChange: (value: string) => void
  sortValue: string
  onSortChange: (value: string) => void
}

export function VentasCatalogFiltersOverlay({
  open,
  onClose,
  onClear,
  category,
  onCategoryChange,
  categories,
  brandFilter,
  onBrandChange,
  brandOptions,
  modelFilter,
  onModelChange,
  modelOptions,
  sizeFilter,
  onSizeChange,
  sizeOptions,
  priceMinFilter,
  onPriceMinChange,
  priceMaxFilter,
  onPriceMaxChange,
  sortValue,
  onSortChange,
}: VentasCatalogFiltersOverlayProps) {
  if (!open) {
    return null
  }

  return (
    <>
      <button
        type="button"
        className="absolute inset-0 z-20 bg-black/45"
        aria-label="Cerrar filtros"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ventas-catalog-filters-title"
        className="absolute inset-0 z-30 flex flex-col bg-white"
      >
        <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
          <h3 id="ventas-catalog-filters-title" className="text-sm font-semibold">
            Filtros
          </h3>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Cerrar">
            <X className="size-4" />
          </Button>
        </div>

        <div className="scrollbar-subtle flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="ventas-filter-category">Categoría</Label>
            <select
              id="ventas-filter-category"
              className="border-input flex h-9 w-full rounded-md border bg-white px-3 text-sm"
              value={category}
              onChange={(e) => onCategoryChange(e.target.value)}
            >
              <option value="">Todas las categorías</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="ventas-filter-brand">Marca</Label>
            <Input
              id="ventas-filter-brand"
              placeholder="Ej. Nike"
              value={brandFilter}
              list="ventas-overlay-brand-options"
              onChange={(e) => onBrandChange(e.target.value)}
              className="bg-white"
            />
            <datalist id="ventas-overlay-brand-options">
              {brandOptions.map((brand) => (
                <option key={brand} value={brand} />
              ))}
            </datalist>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="ventas-filter-model">Modelo</Label>
            <Input
              id="ventas-filter-model"
              placeholder="Ej. Air Max"
              value={modelFilter}
              list="ventas-overlay-model-options"
              onChange={(e) => onModelChange(e.target.value)}
              className="bg-white"
            />
            <datalist id="ventas-overlay-model-options">
              {modelOptions.map((model) => (
                <option key={model} value={model} />
              ))}
            </datalist>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="ventas-filter-size">Talla</Label>
            <Input
              id="ventas-filter-size"
              placeholder="Ej. 38"
              value={sizeFilter}
              list="ventas-overlay-size-options"
              onChange={(e) => onSizeChange(e.target.value)}
              className="bg-white"
            />
            <datalist id="ventas-overlay-size-options">
              {sizeOptions.map((size) => (
                <option key={size} value={size} />
              ))}
            </datalist>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Rango de precio (USD)</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <span className="text-muted-foreground text-xs">Desde</span>
                <DecimalInput
                  min="0"
                  placeholder="0"
                  value={priceMinFilter}
                  onChange={(e) => onPriceMinChange(e.target.value)}
                  className="bg-white"
                />
              </div>
              <div className="space-y-1.5">
                <span className="text-muted-foreground text-xs">Hasta</span>
                <DecimalInput
                  min="0"
                  placeholder="999"
                  value={priceMaxFilter}
                  onChange={(e) => onPriceMaxChange(e.target.value)}
                  className="bg-white"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="ventas-filter-sort">Ordenar por</Label>
            <select
              id="ventas-filter-sort"
              className="border-input flex h-9 w-full rounded-md border bg-white px-3 text-sm"
              value={sortValue}
              onChange={(e) => onSortChange(e.target.value)}
            >
              {CATALOG_SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex shrink-0 gap-2 border-t p-4">
          <Button type="button" variant="outline" className="shrink-0" onClick={onClear}>
            Limpiar
          </Button>
          <Button type="button" className="flex-1" onClick={onClose}>
            Ver resultados
          </Button>
        </div>
      </div>
    </>
  )
}
