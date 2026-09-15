import { useMemo, useState } from 'react'
import { Folder, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  useAddProductToFolderMutation,
  useProductFoldersQuery,
} from '@/features/folders/hooks/use-product-folders'
import type { CatalogProduct } from '@/features/ventas/types'
import { getApiErrorMessage } from '@/lib/api-error'
import { notify } from '@/lib/notify'
import { cn } from '@/lib/utils'

type AssignProductToFolderDialogProps = {
  open: boolean
  product: CatalogProduct | null
  onOpenChange: (open: boolean) => void
}

export function AssignProductToFolderDialog({
  open,
  product,
  onOpenChange,
}: AssignProductToFolderDialogProps) {
  const { data: folders = [], isLoading } = useProductFoldersQuery()
  const addMutation = useAddProductToFolderMutation()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const sorted = useMemo(
    () => [...folders].sort((a, b) => a.name.localeCompare(b.name, 'es')),
    [folders]
  )

  async function handleAssign() {
    if (!product || selectedId == null) return
    setError(null)
    try {
      await addMutation.mutateAsync({
        folderId: selectedId,
        catalogProductId: product.id,
      })
      notify.success(`"${product.name}" agregado a la carpeta.`)
      setSelectedId(null)
      onOpenChange(false)
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setSelectedId(null)
          setError(null)
        }
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Agregar a carpeta</DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground text-sm">{product?.name}</p>

        {isLoading ? (
          <div className="text-muted-foreground flex items-center gap-2 py-6 text-sm">
            <Loader2 className="size-4 animate-spin" />
            Cargando carpetas…
          </div>
        ) : sorted.length === 0 ? (
          <p className="text-muted-foreground py-4 text-sm">
            Todavía no hay carpetas. Creá una desde la vista Carpetas.
          </p>
        ) : (
          <ul className="max-h-64 space-y-1 overflow-y-auto">
            {sorted.map((folder) => (
              <li key={folder.id}>
                <button
                  type="button"
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors',
                    selectedId === folder.id
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-muted/60'
                  )}
                  onClick={() => setSelectedId(folder.id)}
                >
                  <Folder className="size-4 shrink-0 text-amber-600" />
                  <span className="min-w-0 flex-1 truncate font-medium">{folder.name}</span>
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {folder.products_count}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {error ? <p className="text-destructive text-sm">{error}</p> : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={selectedId == null || addMutation.isPending || !product}
            onClick={() => void handleAssign()}
          >
            {addMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Agregar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
