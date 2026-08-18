import { Loader2, TrendingUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import { DecimalInput } from '@/components/decimal-input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { formatUsd } from '@/features/purchases/constants'
import { useExchangeRateQuery, useUpdateExchangeRateMutation } from '@/features/purchases/hooks/use-settings'
import { getApiErrorMessage } from '@/lib/api-error'
import { notify } from '@/lib/notify'

export function ExchangeRateConfigCard() {
  const { data: currentRate, isLoading: loadingRate } = useExchangeRateQuery()
  const updateRateMutation = useUpdateExchangeRateMutation()
  const [rateInput, setRateInput] = useState('')

  useEffect(() => {
    if (currentRate && !rateInput) {
      setRateInput(currentRate)
    }
  }, [currentRate, rateInput])

  async function handleSaveRate() {
    const value = Number(rateInput)
    if (!Number.isFinite(value) || value <= 0) {
      notify.error('Ingresá una tasa válida mayor a 0')
      return
    }
    try {
      await updateRateMutation.mutateAsync(value)
      notify.success('Tasa de cambio actualizada.')
    } catch (err) {
      notify.error(getApiErrorMessage(err))
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="size-4" />
          Tasa de cambio
        </CardTitle>
        <CardDescription>
          Bolívares por dólar (Bs/USD) para referencia en compras. Los montos se registran en $; esta
          tasa no modifica registros ya confirmados.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loadingRate ? (
          <Loader2 className="text-muted-foreground size-5 animate-spin" />
        ) : (
          <p className="text-muted-foreground text-sm">
            Tasa actual:{' '}
            <span className="text-foreground font-medium tabular-nums">
              {currentRate ? `Bs ${formatUsd(currentRate)}` : 'Sin configurar'}
            </span>
          </p>
        )}
        <div className="flex max-w-sm flex-col gap-4 sm:flex-row sm:items-end">
          <div className="space-y-2 sm:flex-1">
            <Label htmlFor="exchange-rate">Nueva tasa Bs/USD</Label>
            <DecimalInput
              id="exchange-rate"
              decimals={4}
              min="0"
              placeholder="Ej. 36.50"
              value={rateInput}
              onChange={(e) => setRateInput(e.target.value)}
            />
          </div>
          <Button
            type="button"
            onClick={() => void handleSaveRate()}
            disabled={updateRateMutation.isPending}
          >
            {updateRateMutation.isPending ? <Loader2 className="animate-spin" /> : null}
            Guardar
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
