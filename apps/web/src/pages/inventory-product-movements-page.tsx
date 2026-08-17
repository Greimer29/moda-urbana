import { ArrowLeft, Download, Loader2, Package } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useDisplayCurrency } from '@/features/currencies/context/display-currency-context'
import { useInventoryMovementsQuery } from '@/features/reports/hooks/use-inventory-report'
import {
  buildInventoryListHref,
  inventoryFilterSummary,
  parseInventoryFiltersFromSearchParams,
} from '@/features/reports/inventory-report-search-params'
import { ReportPeriodFilters } from '@/features/reports/components/report-period-filters'
import {
  applyPeriodToSearchParams,
  parsePeriodFromSearchParams,
  periodLabelFromState,
  periodStateToAccountParams,
} from '@/features/reports/report-period'
import { reportUi } from '@/features/reports/report-ui'
import { getInventoryMovements } from '@/features/reports/services/inventory-report-service'
import type { ProductMovementType } from '@/features/reports/types/inventory-report'
import {
  DEFAULT_INVENTORY_MOVEMENT_TYPES,
  INVENTORY_MOVEMENT_FILTER_OPTIONS,
  INVENTORY_MOVEMENT_LABELS,
} from '@/features/reports/utils/inventory-movement-labels'
import { catalogImageUrl, productSaleUnitAbrev } from '@/features/ventas/constants'
import { getApiErrorMessage } from '@/lib/api-error'
import { formatFechaHora } from '@/lib/format-date'
import { cn } from '@/lib/utils'

function parseMovementTypes(searchParams: URLSearchParams): ProductMovementType[] {
  const raw = searchParams.get('mov_types')
  if (!raw) return DEFAULT_INVENTORY_MOVEMENT_TYPES

  const selected = raw
    .split(',')
    .map((value) => value.trim())
    .filter((value): value is ProductMovementType =>
      DEFAULT_INVENTORY_MOVEMENT_TYPES.includes(value as ProductMovementType)
    )

  return selected.length > 0 ? selected : DEFAULT_INVENTORY_MOVEMENT_TYPES
}

export function InventoryProductMovementsPage() {
  const { productId: productIdParam } = useParams()
  const productId = Number(productIdParam)
  const [searchParams, setSearchParams] = useSearchParams()
  const [exporting, setExporting] = useState(false)
  const { formatFromUsd } = useDisplayCurrency()

  const period = useMemo(() => parsePeriodFromSearchParams(searchParams), [searchParams])
  const filters = useMemo(
    () => parseInventoryFiltersFromSearchParams(searchParams),
    [searchParams]
  )
  const movementTypes = useMemo(() => parseMovementTypes(searchParams), [searchParams])
  const page = Number(searchParams.get('mov_page') ?? '1') || 1

  const queryParams = useMemo(() => {
    const periodParams = periodStateToAccountParams(period)
    return {
      ...periodParams,
      types: movementTypes,
      page,
      per_page: 30,
    }
  }, [period, movementTypes, page])

  const { data, isLoading, isError, error } = useInventoryMovementsQuery(productId, queryParams, {
    enabled: Number.isInteger(productId) && productId > 0,
  })

  const syncSearchParams = useCallback(
    (next: {
      period?: typeof period
      types?: ProductMovementType[]
      page?: number
    }) => {
      const params = applyPeriodToSearchParams(
        new URLSearchParams(searchParams),
        next.period ?? period
      )

      const nextTypes = next.types ?? movementTypes
      if (nextTypes.length === DEFAULT_INVENTORY_MOVEMENT_TYPES.length) {
        params.delete('mov_types')
      } else {
        params.set('mov_types', nextTypes.join(','))
      }

      const nextPage = next.page ?? page
      if (nextPage > 1) params.set('mov_page', String(nextPage))
      else params.delete('mov_page')

      params.set('vista', 'inventario')
      setSearchParams(params, { replace: true })
    },
    [searchParams, period, movementTypes, page, setSearchParams]
  )

  function toggleMovementType(type: ProductMovementType) {
    const next = movementTypes.includes(type)
      ? movementTypes.filter((value) => value !== type)
      : [...movementTypes, type]

    if (next.length === 0) return
    syncSearchParams({ types: next, page: 1 })
  }

  async function handleExport() {
    if (!data?.product) return
    setExporting(true)
    try {
      const exportData = await getInventoryMovements(productId, {
        ...queryParams,
        export: true,
        page: 1,
      })
      const { exportInventoryMovementsExcel } = await import(
        '@/features/reports/utils/export-inventory-excel'
      )
      await exportInventoryMovementsExcel(
        exportData.product,
        exportData.movements,
        `Período: ${periodLabelFromState(period)} · Tipos: ${movementTypes
          .map((type) => INVENTORY_MOVEMENT_LABELS[type])
          .join(', ')}`,
        (quantity, unit) =>
          `${Number(quantity) > 0 ? '+' : ''}${quantity} ${productSaleUnitAbrev(unit)}`
      )
    } finally {
      setExporting(false)
    }
  }

  if (!Number.isInteger(productId) || productId <= 0) {
    return <Navigate to="/reportes?vista=inventario" replace />
  }

  const backHref = buildInventoryListHref(searchParams)
  const product = data?.product
  const movements = data?.movements ?? []
  const meta = data?.meta

  return (
    <div
      className={cn(
        reportUi.page,
        '-m-4 flex min-h-full flex-col gap-5 p-4 md:-m-6 md:gap-6 md:p-6'
      )}
    >
      <header className="space-y-4">
        <Link
          to={backHref}
          className="inline-flex items-center gap-2 text-sm font-medium text-neutral-600 transition-colors duration-500 ease-out hover:text-neutral-900"
        >
          <ArrowLeft className="size-4" />
          Volver a inventario
        </Link>

        {product ? (
          <div className="flex flex-wrap items-start gap-4">
            <div className="flex size-16 items-center justify-center overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50">
              {product.image_path ? (
                <img
                  src={catalogImageUrl(product.product_id)}
                  alt=""
                  className="size-full object-cover"
                />
              ) : (
                <Package className="size-6 text-neutral-400" />
              )}
            </div>
            <div>
              <p className={reportUi.chip}>Movimientos de inventario</p>
              <h1 className={`${reportUi.title} mt-3`}>
                {product.code} — {product.description}
              </h1>
              <p className={`${reportUi.subtitle} mt-2`}>
                Stock actual: {Number(product.stock_quantity).toLocaleString('es-VE')}{' '}
                {productSaleUnitAbrev(product.sale_unit)} · Precio{' '}
                {formatFromUsd(Number(product.sale_price_usd))} · Costo{' '}
                {product.cost_usd ? formatFromUsd(Number(product.cost_usd)) : '—'}
              </p>
            </div>
          </div>
        ) : null}
      </header>

      {product?.movements_unavailable ? (
        <div className={cn(reportUi.panel, 'border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900')}>
          Stock derivado de materiales; no hay movimientos directos del producto.
        </div>
      ) : (
        <>
          <div className={cn(reportUi.panel, 'p-5 md:p-6')}>
            <p className={`mb-3 ${reportUi.muted}`}>Filtrar por fecha</p>
            <ReportPeriodFilters
              value={period}
              onChange={(nextPeriod) => syncSearchParams({ period: nextPeriod, page: 1 })}
            />

            <div className="mt-5 border-t border-neutral-200 pt-5">
              <p className={`mb-3 ${reportUi.muted}`}>Tipos de movimiento</p>
              <div className="flex flex-wrap gap-2">
                {INVENTORY_MOVEMENT_FILTER_OPTIONS.map((option) => {
                  const active = movementTypes.includes(option.key)
                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => toggleMovementType(option.key)}
                      className={active ? reportUi.pillActive : reportUi.pillInactive}
                    >
                      {option.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className={reportUi.muted}>
              {meta ? `${meta.total} movimientos · Página ${meta.current_page} de ${meta.last_page}` : ' '}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={reportUi.btnGhost}
              disabled={exporting || isLoading}
              onClick={() => void handleExport()}
            >
              {exporting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              Exportar Excel
            </Button>
          </div>

          {isLoading ? (
            <div
              className={cn(
                reportUi.panel,
                'flex items-center justify-center gap-2 py-20 text-sm text-neutral-400'
              )}
            >
              <Loader2 className="size-4 animate-spin" />
              Cargando movimientos…
            </div>
          ) : isError ? (
            <div className={reportUi.error}>{getApiErrorMessage(error)}</div>
          ) : movements.length === 0 ? (
            <div className={cn(reportUi.panel, 'px-5 py-12 text-center')}>
              <p className={reportUi.body}>No hay movimientos para el período y filtros seleccionados.</p>
            </div>
          ) : (
            <div className={cn(reportUi.panel, 'overflow-hidden')}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200 bg-neutral-50 text-left">
                      <th className="px-4 py-3 font-medium">Fecha</th>
                      <th className="px-4 py-3 font-medium">Tipo</th>
                      <th className="px-4 py-3 font-medium">Cantidad</th>
                      <th className="px-4 py-3 font-medium">Referencia</th>
                      <th className="px-4 py-3 font-medium">Detalle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map((movement) => (
                      <tr key={movement.id} className="border-b border-neutral-100 last:border-b-0">
                        <td className="px-4 py-3 text-neutral-600">
                          {formatFechaHora(movement.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          {INVENTORY_MOVEMENT_LABELS[movement.type] ?? movement.type}
                        </td>
                        <td
                          className={cn(
                            'px-4 py-3 font-medium tabular-nums',
                            Number(movement.quantity) > 0 ? 'text-emerald-700' : 'text-red-600'
                          )}
                        >
                          {Number(movement.quantity) > 0 ? '+' : ''}
                          {movement.quantity} {product ? productSaleUnitAbrev(product.sale_unit) : ''}
                        </td>
                        <td className="px-4 py-3">
                          {movement.order_id ? (
                            <Link
                              to={`/ventas/${movement.order_id}`}
                              className="font-medium text-[#0d3d2e] hover:underline"
                            >
                              {movement.order_code ?? `Pedido #${movement.order_id}`}
                            </Link>
                          ) : movement.purchase_id ? (
                            <Link
                              to={`/purchases/${movement.purchase_id}`}
                              className="font-medium text-[#0d3d2e] hover:underline"
                            >
                              Compra #{movement.purchase_id}
                            </Link>
                          ) : movement.sale_id ? (
                            <span className="text-neutral-700">Venta #{movement.sale_id}</span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-4 py-3 text-neutral-600">{movement.note ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {meta && meta.last_page > 1 ? (
            <div className="flex items-center justify-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={meta.current_page <= 1}
                onClick={() => syncSearchParams({ page: meta.current_page - 1 })}
              >
                Anterior
              </Button>
              <span className={reportUi.muted}>
                Página {meta.current_page} de {meta.last_page}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={meta.current_page >= meta.last_page}
                onClick={() => syncSearchParams({ page: meta.current_page + 1 })}
              >
                Siguiente
              </Button>
            </div>
          ) : null}
        </>
      )}

      <p className={reportUi.muted}>{inventoryFilterSummary(filters)}</p>
    </div>
  )
}
