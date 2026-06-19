import { Loader2, TrendingUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatUsd } from '@/features/purchases/constants'
import { useExchangeRateQuery, useUpdateExchangeRateMutation } from '@/features/purchases/hooks/use-settings'
import { getApiError } from '@/lib/api-error'

export function ExchangeRateConfigCard() {
  const { data: currentRate, isLoading: loadingRate } = useExchangeRateQuery()
  const updateRateMutation = useUpdateExchangeRateMutation()
  const [rateInput, setRateInput] = useState('')
  const [rateError, setRateError] = useState<string | null>(null)

  useEffect(() => {
    if (currentRate && !rateInput) {
      setRateInput(currentRate)
    }
  }, [currentRate, rateInput])

  async function handleSaveRate() {
    setRateError(null)
    const value = Number(rateInput)
    if (!Number.isFinite(value) || value <= 0) {
      setRateError('Ingresá una tasa válida mayor a 0')
      return
    }
    try {
      await updateRateMutation.mutateAsync(value)
    } catch (err) {
      setRateError(getApiError(err).message)
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
            <Input
              id="exchange-rate"
              type="number"
              step="0.0001"
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
        {rateError ? <p className="text-destructive text-sm">{rateError}</p> : null}
      </CardContent>
    </Card>
  )
}
