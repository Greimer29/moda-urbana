import { useState } from 'react'
import { FolderPlus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCreateProductFolderMutation } from '@/features/folders/hooks/use-product-folders'
import { getApiErrorMessage } from '@/lib/api-error'

type CreateFolderDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: (folderId: number) => void
}

export function CreateFolderDialog({ open, onOpenChange, onCreated }: CreateFolderDialogProps) {
  const createMutation = useCreateProductFolderMutation()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    setError(null)
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Ingresá un nombre para la carpeta.')
      return
    }

    try {
      const folder = await createMutation.mutateAsync({ name: trimmed })
      setName('')
      onOpenChange(false)
      onCreated?.(folder.id)
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setName('')
          setError(null)
        }
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Nueva carpeta</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="folder-name">Nombre</Label>
          <Input
            id="folder-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Nike Running"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void handleSubmit()
              }
            }}
          />
          {error ? <p className="text-destructive text-sm">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" disabled={createMutation.isPending} onClick={() => void handleSubmit()}>
            {createMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <FolderPlus className="size-4" />}
            Crear
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
