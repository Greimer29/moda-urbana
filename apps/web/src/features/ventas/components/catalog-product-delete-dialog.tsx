import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { CatalogProduct } from '@/features/ventas/types'

type CatalogProductDeleteDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: CatalogProduct | null
  isPending: boolean
  error?: string | null
  onConfirm: () => void
}

export function CatalogProductDeleteDialog({
  open,
  onOpenChange,
  product,
  isPending,
  error,
  onConfirm,
}: CatalogProductDeleteDialogProps) {
  if (!product) {
    return null
  }

  const hasMovements = (product.movimientos?.length ?? 0) > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Eliminar producto</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2 text-left">
              <p>
                ¿Eliminar{' '}
                <span className="text-foreground font-medium">{product.name}</span>?
              </p>
              {hasMovements ? (
                <p className="text-xs">
                  Si el producto tiene <strong>ventas o movimientos</strong>, se{' '}
                  <strong>desactivará</strong> y dejará de verse en el catálogo, pero el historial se
                  conserva.
                </p>
              ) : (
                <p className="text-xs">
                  Sin ventas ni pedidos, se <strong>elimina permanentemente</strong> de la base de
                  datos. Si ya se vendió, se desactiva y desaparece del catálogo.
                </p>
              )}
              <p className="text-muted-foreground text-xs">
                Las ventas entregadas o devueltas (facturación rápida) no bloquean: el producto se
                desactiva y sale del catálogo. Los borradores de Ventas se cierran solos. Solo
                impide eliminar un pedido confirmado o en producción.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>

        {error ? <p className="text-destructive text-sm whitespace-pre-line">{error}</p> : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="animate-spin" />
                Eliminando…
              </>
            ) : (
              'Sí, eliminar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
