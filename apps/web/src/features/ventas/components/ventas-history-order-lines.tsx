import { Loader2 } from 'lucide-react'
import { DisplayMoneyFromUsd } from '@/features/currencies/components/display-money'
import { useOrderQuery } from '@/features/orders/hooks/use-orders'
import { catalogProductCode } from '@/features/ventas/components/ventas-order-cart'
import { getApiErrorMessage } from '@/lib/api-error'

type VentasHistoryOrderLinesProps = {
  orderId: number
}

export function VentasHistoryOrderLines({ orderId }: VentasHistoryOrderLinesProps) {
  const { data: order, isLoading, isError, error } = useOrderQuery(orderId)
  const lines = order?.lines ?? []

  return (
    <tr className="bg-muted/20 border-b last:border-b-0">
      <td colSpan={7} className="px-4 py-3">
        {isLoading ? (
          <div className="text-muted-foreground flex items-center gap-2 py-2 text-sm">
            <Loader2 className="size-4 animate-spin" />
            Cargando productos…
          </div>
        ) : isError ? (
          <p className="text-destructive py-2 text-sm whitespace-pre-line">{getApiErrorMessage(error)}</p>
        ) : lines.length === 0 ? (
          <p className="text-muted-foreground py-2 text-sm">Este pedido no tiene líneas de catálogo.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border bg-white">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="bg-muted/40">
                <tr className="border-b text-left">
                  <th className="px-3 py-2 font-medium">Código</th>
                  <th className="px-3 py-2 font-medium">Producto</th>
                  <th className="px-3 py-2 text-right font-medium">Cantidad</th>
                  <th className="px-3 py-2 text-right font-medium">Precio</th>
                  <th className="px-3 py-2 text-right font-medium">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => {
                  const netQty =
                    Number(line.quantity) - Number(line.returned_quantity ?? 0)

                  return (
                    <tr key={line.id} className="border-b last:border-b-0">
                      <td className="text-muted-foreground px-3 py-2 font-mono text-xs">
                        {catalogProductCode(line.catalog_product_id)}
                      </td>
                      <td className="px-3 py-2">
                        {line.catalog_product?.name ?? `Producto #${line.catalog_product_id}`}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{netQty}</td>
                      <td className="px-3 py-2 text-right">
                        <DisplayMoneyFromUsd amountUsd={line.unit_price_usd} size="sm" />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <DisplayMoneyFromUsd amountUsd={line.subtotal_usd} size="sm" />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </td>
    </tr>
  )
}
