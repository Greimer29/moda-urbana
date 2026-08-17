import { SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { InventoryReportFilterState } from '@/features/reports/inventory-report-search-params'
import { reportUi } from '@/features/reports/report-ui'
import { cn } from '@/lib/utils'

type InventoryReportFiltersProps = {
  filters: InventoryReportFilterState
  categories: Array<{ id: number; name: string }>
  onFiltersChange: (value: InventoryReportFilterState) => void
}

const SORT_OPTIONS: Array<{
  value: `${InventoryReportFilterState['sortBy']}:${InventoryReportFilterState['sortDir']}`
  label: string
}> = [
  { value: 'id:asc', label: 'Código ascendente' },
  { value: 'id:desc', label: 'Código descendente' },
  { value: 'name:asc', label: 'Descripción A-Z' },
  { value: 'name:desc', label: 'Descripción Z-A' },
  { value: 'sale_price:asc', label: 'Precio menor a mayor' },
  { value: 'sale_price:desc', label: 'Precio mayor a menor' },
  { value: 'quantity:asc', label: 'Cantidad menor a mayor' },
  { value: 'quantity:desc', label: 'Cantidad mayor a menor' },
]

export function InventoryReportFilters({
  filters,
  categories,
  onFiltersChange,
}: InventoryReportFiltersProps) {
  const [expanded, setExpanded] = useState(true)
  const sortValue = `${filters.sortBy}:${filters.sortDir}`

  function updateFilters(partial: Partial<InventoryReportFilterState>) {
    onFiltersChange({ ...filters, ...partial, page: partial.page ?? 1 })
  }

  return (
    <div className={cn(reportUi.panel, 'p-5 md:p-6')}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className={reportUi.muted}>Stock actual de todo el catálogo registrado</p>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setExpanded((value) => !value)}
          className={reportUi.btnGhost}
        >
          <SlidersHorizontal className="size-4" />
          Filtros
        </Button>
      </div>

      {expanded ? (
        <div className={cn('mt-5 space-y-4 border-t pt-5', reportUi.divider)}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="inv-search">Buscar</Label>
              <Input
                id="inv-search"
                value={filters.search}
                onChange={(event) => updateFilters({ search: event.target.value })}
                placeholder="Código, descripción, marca…"
                className={reportUi.input}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="inv-category">Categoría</Label>
              <select
                id="inv-category"
                value={filters.category}
                onChange={(event) => updateFilters({ category: event.target.value })}
                className={cn(reportUi.input, 'w-full px-3')}
              >
                <option value="">Todas</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="inv-sort">Ordenar</Label>
              <select
                id="inv-sort"
                value={sortValue}
                onChange={(event) => {
                  const [sortBy, sortDir] = event.target.value.split(':') as [
                    InventoryReportFilterState['sortBy'],
                    InventoryReportFilterState['sortDir'],
                  ]
                  updateFilters({ sortBy, sortDir })
                }}
                className={cn(reportUi.input, 'w-full px-3')}
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="inline-flex items-center gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={filters.activeOnly}
                onChange={(event) => updateFilters({ activeOnly: event.target.checked })}
              />
              Solo activos
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={filters.lowStock}
                onChange={(event) => updateFilters({ lowStock: event.target.checked })}
              />
              Solo bajo stock
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={filters.hideZero}
                onChange={(event) => updateFilters({ hideZero: event.target.checked })}
              />
              Ocultar tallas sin stock
            </label>
          </div>
        </div>
      ) : null}
    </div>
  )
}
