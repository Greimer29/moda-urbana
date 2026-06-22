import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { MoneyInput } from '@/components/decimal-input'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { AccountSelect } from '@/features/accounts/components/account-select'
import { useCreateCustomerPaymentMutation } from '@/features/customers/hooks/use-customers'
import { getApiErrorMessage } from '@/lib/api-error'

type CustomerPaymentFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  customerId: number
  orderId?: number
  maxAmountUsd?: number
  onSuccess?: () => void
}

export function CustomerPaymentFormDialog({
  open,
  onOpenChange,
  customerId,
  orderId,
  maxAmountUsd,
  onSuccess,
}: CustomerPaymentFormDialogProps) {
  const today = new Date().toISOString().slice(0, 10)
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(today)
  const [accountId, setAccountId] = useState<number | null>(null)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  const paymentMutation = useCreateCustomerPaymentMutation()

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    const amountNum = Number(amount)
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setError('Ingresá un monto válido.')
      return
    }

    if (maxAmountUsd !== undefined && amountNum > maxAmountUsd + 0.0001) {
      setError(`El monto no puede superar el saldo pendiente (${maxAmountUsd.toFixed(2)} USD).`)
      return
    }

    try {
      await paymentMutation.mutateAsync({
        customerId,
        payload: {
          order_id: orderId ?? null,
          account_id: accountId,
          amount_usd: amountNum,
          date,
          note: note.trim() || undefined,
        },
      })
      setAmount('')
      setNote('')
      onOpenChange(false)
      onSuccess?.()
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar abono</DialogTitle>
          <DialogDescription>
            {orderId
              ? 'El abono se aplicará a este pedido.'
              : 'El abono se aplicará a los pedidos a crédito más antiguos.'}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
          <div className="space-y-2">
            <Label htmlFor="customer-payment-amount">Monto (USD) *</Label>
            <MoneyInput
              id="customer-payment-amount"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customer-payment-date">Fecha *</Label>
            <Input
              id="customer-payment-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Cuenta</Label>
            <AccountSelect value={accountId} onChange={setAccountId} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customer-payment-note">Nota</Label>
            <Textarea
              id="customer-payment-note"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {error ? <p className="text-destructive text-sm whitespace-pre-line">{error}</p> : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={paymentMutation.isPending}>
              {paymentMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Registrar abono
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
