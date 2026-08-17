import { Package } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useDisplayCurrency } from '@/features/currencies/context/display-currency-context'
import { catalogImageUrl, productSaleUnitAbrev } from '@/features/ventas/constants'
import { catalogProductCode } from '@/features/ventas/components/ventas-order-cart'
import type { InventoryReportRow } from '@/features/reports/types/inventory-report'
import { reportUi } from '@/features/reports/report-ui'
import { cn } from '@/lib/utils'

type InventoryReportTableProps = {
  rows: InventoryReportRow[]
}

export function InventoryReportTable({ rows }: InventoryReportTableProps) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { formatFromUsd } = useDisplayCurrency()

  function openProductMovements(productId: number) {
    const params = new URLSearchParams(searchParams)
    params.set('vista', 'inventario')
    navigate(`/reportes/inventario/${productId}?${params.toString()}`)
  }

  if (rows.length === 0) {
    return (
      <div className={cn(reportUi.panel, 'px-5 py-12 text-center')}>
        <Package className="mx-auto mb-3 size-8 text-neutral-300" />
        <p className={reportUi.body}>No hay productos que coincidan con los filtros.</p>
      </div>
    )
  }

  return (
    <div className={cn(reportUi.panel, 'overflow-hidden')}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50 text-left">
              <th className="px-4 py-3 font-medium">Código / Imagen</th>
              <th className="px-4 py-3 font-medium">Descripción</th>
              <th className="px-4 py-3 font-medium">Talla</th>
              <th className="px-4 py-3 font-medium">Cantidad</th>
              <th className="px-4 py-3 font-medium">Precio</th>
              <th className="px-4 py-3 font-medium">Costo</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const rowKey = `${row.product_id}-${row.size ?? 'none'}`
              return (
                <tr
                  key={rowKey}
                  className={cn(
                    'cursor-pointer border-b border-neutral-100 last:border-b-0',
                    reportUi.rowHover,
                    row.low_stock && 'bg-red-50/40'
                  )}
                  onClick={() => openProductMovements(row.product_id)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50">
                        {row.image_path ? (
                          <img
                            src={catalogImageUrl(row.product_id)}
                            alt=""
                            className="size-full object-cover"
                          />
                        ) : (
                          <Package className="size-4 text-neutral-400" />
                        )}
                      </div>
                      <span className="font-medium tabular-nums text-neutral-900">
                        {catalogProductCode(row.product_id)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-neutral-900">{row.description}</p>
                      <p className="text-xs text-neutral-500">{row.category}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">{row.size ?? '—'}</td>
                  <td className="px-4 py-3 font-medium tabular-nums">
                    {Number(row.quantity).toLocaleString('es-VE')}{' '}
                    {productSaleUnitAbrev(row.sale_unit)}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{formatFromUsd(Number(row.sale_price_usd))}</td>
                  <td className="px-4 py-3 tabular-nums">
                    {row.cost_usd ? formatFromUsd(Number(row.cost_usd)) : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
