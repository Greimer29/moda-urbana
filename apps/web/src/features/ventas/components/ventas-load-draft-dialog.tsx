import { Loader2, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { DisplayMoneyFromUsd } from '@/features/currencies/components/display-money'
import { formatFecha } from '@/features/orders/constants'
import { useOrdersQuery } from '@/features/orders/hooks/use-orders'
import type { Order } from '@/features/orders/types'
import { getOrder } from '@/features/orders/services/order-service'
import { getCatalogProduct } from '@/features/ventas/services/catalog-service'
import type { CatalogProduct } from '@/features/ventas/types'
import { getApiErrorMessage } from '@/lib/api-error'

export type LoadedDraft = {
  orderId: number
  orderCode: string
  customerId: number | null
  customerName: string | null
  customerCreditDays: number | null
  guestName: string | null
  cart: { product: CatalogProduct; quantity: number }[]
}

type VentasLoadDraftDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onLoaded: (draft: LoadedDraft) => void
}

export function VentasLoadDraftDialog({ open, onOpenChange, onLoaded }: VentasLoadDraftDialogProps) {
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [loadingId, setLoadingId] = useState<number | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  const { data, isLoading } = useOrdersQuery(
    {
      page: 1,
      perPage: 20,
      status: 'DRAFT',
      modalidad: 'CORPORATE',
      search: debouncedSearch || undefined,
      sort_by: 'created_at',
      direction: 'desc',
    },
    { enabled: open }
  )

  const drafts = data?.orders ?? []

  async function handleSelect(order: Order) {
    setLoadingId(order.id)
    setLoadError(null)
    try {
      const detail = await getOrder(order.id)
      const lines = detail.lines ?? []
      if (lines.length === 0) {
        setLoadError('El borrador no tiene productos.')
        return
      }

      const cart: LoadedDraft['cart'] = []
      for (const line of lines) {
        const product = await getCatalogProduct(line.catalog_product_id)
        cart.push({
          product,
          quantity: Number(line.quantity),
        })
      }

      onLoaded({
        orderId: detail.id,
        orderCode: detail.code,
        customerId: detail.customerId,
        customerName: detail.customer?.name ?? null,
        customerCreditDays: detail.customer?.creditDays ?? null,
        guestName: detail.guestName,
        cart,
      })
      onOpenChange(false)
    } catch (error) {
      setLoadError(getApiErrorMessage(error))
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Cargar factura</DialogTitle>
          <DialogDescription>
            Elegí un presupuesto o pedido en borrador para editarlo en el carrito.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            className="pl-9"
            placeholder="Buscar por código o cliente…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>

        <div className="scrollbar-subtle max-h-72 space-y-2 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="text-muted-foreground size-5 animate-spin" />
            </div>
          ) : drafts.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              No hay borradores disponibles.
            </p>
          ) : (
            drafts.map((order) => (
              <button
                key={order.id}
                type="button"
                disabled={loadingId !== null}
                className="hover:bg-muted flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors"
                onClick={() => void handleSelect(order)}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{order.code}</p>
                  <p className="text-muted-foreground truncate text-xs">
                    {order.customer?.name ?? order.guestName ?? 'Sin cliente'} ·{' '}
                    {formatFecha(order.dateOrder)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {order.totalPrice ? (
                    <DisplayMoneyFromUsd amountUsd={order.totalPrice} size="sm" />
                  ) : null}
                  {loadingId === order.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : null}
                </div>
              </button>
            ))
          )}
        </div>

        {loadError ? <p className="text-destructive text-sm whitespace-pre-line">{loadError}</p> : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
