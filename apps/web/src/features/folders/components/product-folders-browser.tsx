import { Folder, FolderOpen, FolderPlus, Loader2, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CreateFolderDialog } from '@/features/folders/components/create-folder-dialog'
import {
  useDeleteProductFolderMutation,
  useProductFoldersQuery,
  useUpdateProductFolderMutation,
} from '@/features/folders/hooks/use-product-folders'
import type { ProductFolder } from '@/features/folders/types'
import { getApiErrorMessage } from '@/lib/api-error'
import { notify } from '@/lib/notify'
import { cn } from '@/lib/utils'

type ProductFoldersBrowserProps = {
  canEdit?: boolean
  onOpenFolder: (folder: ProductFolder) => void
  className?: string
}

export function ProductFoldersBrowser({
  canEdit = false,
  onOpenFolder,
  className,
}: ProductFoldersBrowserProps) {
  const { data: folders = [], isLoading, isError, error } = useProductFoldersQuery()
  const deleteMutation = useDeleteProductFolderMutation()
  const updateMutation = useUpdateProductFolderMutation()
  const [createOpen, setCreateOpen] = useState(false)
  const [renamingId, setRenamingId] = useState<number | null>(null)
  const [renameValue, setRenameValue] = useState('')

  async function handleDelete(folder: ProductFolder) {
    if (
      !window.confirm(
        `¿Eliminar la carpeta "${folder.name}"? Los productos no se borran del catálogo.`
      )
    ) {
      return
    }
    try {
      await deleteMutation.mutateAsync(folder.id)
      notify.success(`Carpeta "${folder.name}" eliminada.`)
    } catch (err) {
      notify.error(getApiErrorMessage(err))
    }
  }

  async function handleRename(folder: ProductFolder) {
    const trimmed = renameValue.trim()
    if (!trimmed || trimmed === folder.name) {
      setRenamingId(null)
      return
    }
    try {
      await updateMutation.mutateAsync({ id: folder.id, payload: { name: trimmed } })
      setRenamingId(null)
      notify.success('Carpeta renombrada.')
    } catch (err) {
      notify.error(getApiErrorMessage(err))
    }
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">
          Agrupá productos para encontrarlos rápido. El catálogo completo sigue disponible aparte.
        </p>
        {canEdit ? (
          <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
            <FolderPlus className="size-4" />
            Nueva carpeta
          </Button>
        ) : null}
      </div>

      {isLoading ? (
        <div className="text-muted-foreground flex items-center justify-center gap-2 py-12 text-sm">
          <Loader2 className="size-4 animate-spin" />
          Cargando carpetas…
        </div>
      ) : isError ? (
        <p className="text-destructive py-8 text-center text-sm whitespace-pre-line">
          {getApiErrorMessage(error)}
        </p>
      ) : folders.length === 0 ? (
        <div className="rounded-xl border border-dashed px-4 py-12 text-center">
          <Folder className="text-muted-foreground/50 mx-auto mb-3 size-10" />
          <p className="text-sm font-medium">Todavía no hay carpetas</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Creá una carpeta y asignale productos del catálogo.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {folders.map((folder) => (
            <div
              key={folder.id}
              className="group relative flex flex-col rounded-xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
            >
              {renamingId === folder.id ? (
                <div className="space-y-2">
                  <Input
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void handleRename(folder)
                      if (e.key === 'Escape') setRenamingId(null)
                    }}
                  />
                  <div className="flex gap-2">
                    <Button type="button" size="sm" onClick={() => void handleRename(folder)}>
                      Guardar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setRenamingId(null)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 flex-col items-start gap-2 text-left"
                    onClick={() => onOpenFolder(folder)}
                  >
                    <span className="flex size-10 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                      <FolderOpen className="size-5" />
                    </span>
                    <span className="line-clamp-2 text-sm font-semibold text-slate-800">
                      {folder.name}
                    </span>
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {folder.products_count} producto
                      {folder.products_count === 1 ? '' : 's'}
                    </span>
                  </button>
                  {canEdit ? (
                    <div className="absolute top-2 right-2 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        className="size-7"
                        onClick={(e) => {
                          e.stopPropagation()
                          setRenamingId(folder.id)
                          setRenameValue(folder.name)
                        }}
                      >
                        <Pencil className="size-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        className="size-7"
                        onClick={(e) => {
                          e.stopPropagation()
                          void handleDelete(folder)
                        }}
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <CreateFolderDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
