import { Camera as CameraIcon, ImageIcon, Loader2, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { isNativePlatform } from '@/lib/capacitor'
import { pickImageFromCamera, pickImageFromGallery } from '@/lib/native-camera'
import { cn } from '@/lib/utils'

type CircularImageFieldProps = {
  imageUrl?: string | null
  pendingPreviewUrl?: string | null
  alt?: string
  size?: number
  pending?: boolean
  error?: string | null
  onSelectFile: (file: File) => void
  onRemove?: () => void
  className?: string
}

export function CircularImageField({
  imageUrl,
  pendingPreviewUrl,
  alt = '',
  size = 150,
  pending = false,
  error,
  onSelectFile,
  onRemove,
  className,
}: CircularImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [picking, setPicking] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const previewUrl = pendingPreviewUrl ?? imageUrl ?? null
  const native = isNativePlatform()
  const busy = pending || picking

  async function handleNativePick(source: 'camera' | 'gallery') {
    setLocalError(null)
    setPicking(true)
    try {
      const file =
        source === 'camera' ? await pickImageFromCamera() : await pickImageFromGallery()
      if (file) onSelectFile(file)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'No se pudo obtener la imagen. Intentá de nuevo.'
      setLocalError(message)
    } finally {
      setPicking(false)
    }
  }

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          if (native) {
            void handleNativePick('camera')
            return
          }
          inputRef.current?.click()
        }}
        className="bg-muted hover:bg-muted/80 relative shrink-0 overflow-hidden rounded-full border-2 border-dashed border-neutral-300 transition-colors"
        style={{ width: Math.max(size, 120), height: Math.max(size, 120), minWidth: 44, minHeight: 44 }}
        aria-label={previewUrl ? 'Cambiar imagen' : native ? 'Tomar foto' : 'Subir imagen'}
      >
        {previewUrl ? (
          <img src={previewUrl} alt={alt} className="size-full object-cover" />
        ) : (
          <span className="text-muted-foreground flex size-full flex-col items-center justify-center gap-1 px-2">
            <CameraIcon className="size-6 opacity-60" />
            <span className="text-[10px] font-medium">{native ? 'Tomar foto' : 'Subir foto'}</span>
          </span>
        )}
        {busy ? (
          <span className="absolute inset-0 flex items-center justify-center bg-black/30">
            <Loader2 className="size-6 animate-spin text-white" />
          </span>
        ) : null}
      </button>

      {native ? (
        <div className="flex w-full max-w-[220px] flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-11 min-h-11 w-full gap-2 text-sm"
            disabled={busy}
            onClick={() => void handleNativePick('camera')}
          >
            <CameraIcon className="size-4" />
            Tomar foto
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 min-h-11 w-full gap-2 text-sm"
            disabled={busy}
            onClick={() => void handleNativePick('gallery')}
          >
            <ImageIcon className="size-4" />
            Elegir de galería
          </Button>
        </div>
      ) : (
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) onSelectFile(file)
            e.target.value = ''
          }}
        />
      )}

      {previewUrl && onRemove ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-destructive hover:text-destructive h-10 min-h-10 gap-1.5 text-xs"
          disabled={busy}
          onClick={onRemove}
        >
          <Trash2 className="size-3.5" />
          Eliminar foto
        </Button>
      ) : null}
      {localError || error ? (
        <p className="text-destructive max-w-[220px] text-center text-xs">{localError ?? error}</p>
      ) : null}
    </div>
  )
}
