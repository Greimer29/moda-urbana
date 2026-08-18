import { Package } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useDisplayCurrency } from '@/features/currencies/context/display-currency-context'
import { catalogImageUrl, productSaleUnitAbrev } from '@/features/ventas/constants'
import { catalogProductCode } from '@/features/ventas/components/ventas-order-cart'
import type { InventoryReportProduct } from '@/features/reports/types/inventory-report'
import { reportUi } from '@/features/reports/report-ui'
import { cn } from '@/lib/utils'

type InventoryReportTableProps = {
  products: InventoryReportProduct[]
}

function formatQty(value: string) {
  const num = Number(value)
  return Number.isInteger(num) ? String(num) : num.toLocaleString('es-VE', { maximumFractionDigits: 3 })
}

export function InventoryReportTable({ products }: InventoryReportTableProps) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { formatFromUsd } = useDisplayCurrency()

  function openProductMovements(productId: number) {
    const params = new URLSearchParams(searchParams)
    params.set('vista', 'inventario')
    navigate(`/reportes/inventario/${productId}?${params.toString()}`)
  }

  if (products.length === 0) {
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
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50 text-left">
              <th className="px-4 py-3 font-medium">Código / Imagen</th>
              <th className="px-4 py-3 font-medium">Descripción</th>
              <th className="px-4 py-3 font-medium">Talla</th>
              <th className="px-4 py-3 font-medium text-right">Cantidad</th>
              <th className="px-4 py-3 font-medium">Unidad</th>
              <th className="px-4 py-3 font-medium text-right">Precio</th>
              <th className="px-4 py-3 font-medium text-right">Costo</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => {
              const lineCount = product.lines.length
              const unitLabel = productSaleUnitAbrev(product.sale_unit)

              return product.lines.map((line, lineIndex) => {
                const isFirstLine = lineIndex === 0
                const rowKey = `${product.product_id}-${line.size ?? 'none'}-${lineIndex}`

                return (
                  <tr
                    key={rowKey}
                    className={cn(
                      'cursor-pointer border-b border-neutral-100',
                      reportUi.rowHover,
                      product.low_stock && 'bg-red-50/40',
                      lineIndex === lineCount - 1 && 'last:border-b-0'
                    )}
                    onClick={() => openProductMovements(product.product_id)}
                  >
                    {isFirstLine ? (
                      <>
                        <td className="px-4 py-3 align-top" rowSpan={lineCount}>
                          <div className="flex items-center gap-3">
                            <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50">
                              {product.image_path ? (
                                <img
                                  src={catalogImageUrl(product.product_id)}
                                  alt=""
                                  className="size-full object-cover"
                                />
                              ) : (
                                <Package className="size-4 text-neutral-400" />
                              )}
                            </div>
                            <span className="font-medium tabular-nums text-neutral-900">
                              {catalogProductCode(product.product_id)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top" rowSpan={lineCount}>
                          <div>
                            <p className="font-medium text-neutral-900">{product.description}</p>
                            <p className="text-xs text-neutral-500">{product.category}</p>
                            {product.has_sizes && lineCount > 1 ? (
                              <p className="mt-1 text-[11px] text-neutral-400">
                                {lineCount} tallas · total {formatQty(product.total_quantity)}
                              </p>
                            ) : null}
                          </div>
                        </td>
                      </>
                    ) : null}

                    <td className="px-4 py-2.5 tabular-nums text-neutral-800">
                      {line.size ?? '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium tabular-nums text-neutral-900">
                      {formatQty(line.quantity)}
                    </td>
                    <td className="px-4 py-2.5 text-neutral-700">{unitLabel}</td>

                    {isFirstLine ? (
                      <>
                        <td className="px-4 py-3 align-top text-right tabular-nums" rowSpan={lineCount}>
                          {formatFromUsd(Number(product.sale_price_usd))}
                        </td>
                        <td className="px-4 py-3 align-top text-right tabular-nums" rowSpan={lineCount}>
                          {product.cost_usd ? formatFromUsd(Number(product.cost_usd)) : '—'}
                        </td>
                      </>
                    ) : null}
                  </tr>
                )
              })
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
