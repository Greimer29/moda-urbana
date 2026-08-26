import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/hooks/use-auth'
import {
  useCloseSalesShiftMutation,
  useCurrentSalesShiftQuery,
  useOpenSalesShiftMutation,
} from '@/features/ventas/hooks/use-sales-shifts'
import { getApiErrorMessage } from '@/lib/api-error'

function formatShiftDateTime(iso: string) {
  return new Date(iso).toLocaleString('es-VE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function VentasShiftControls() {
  const { can } = useAuth()
  const canConfirm = can('ventas.confirm')
  const { data: shift, isLoading } = useCurrentSalesShiftQuery()
  const openMutation = useOpenSalesShiftMutation()
  const closeMutation = useCloseSalesShiftMutation()
  const [error, setError] = useState<string | null>(null)

  const busy = openMutation.isPending || closeMutation.isPending

  async function handleOpen() {
    setError(null)
    try {
      await openMutation.mutateAsync(undefined)
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }

  async function handleClose() {
    if (!shift) return
    if (!window.confirm('¿Cerrar el turno actual? Las ventas nuevas requerirán abrir otro turno.')) {
      return
    }

    setError(null)
    try {
      await closeMutation.mutateAsync(shift.id)
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }

  if (!canConfirm) {
    return null
  }

  if (isLoading) {
    return (
      <Button type="button" size="sm" variant="outline" disabled>
        <Loader2 className="size-4 animate-spin" />
        Turno…
      </Button>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {!shift ? (
        <Button type="button" size="sm" disabled={busy} onClick={() => void handleOpen()}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : null}
          Abrir turno
        </Button>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy}
          title={`Abierto desde ${formatShiftDateTime(shift.opened_at)}`}
          onClick={() => void handleClose()}
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : null}
          Cerrar turno
        </Button>
      )}
      {error ? <p className="text-destructive max-w-[12rem] text-right text-xs">{error}</p> : null}
    </div>
  )
}
