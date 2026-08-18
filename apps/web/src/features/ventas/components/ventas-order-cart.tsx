import { PublicImage } from '@/components/public-image'
import type { ProductSaleUnit } from '@/features/ventas/constants'
import type { BillingMethod } from '@/features/ventas/constants'
import { useState, type ReactNode } from 'react'
import { MessageSquare, Package, SlidersHorizontal, StickyNote, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DecimalInput, MoneyInput } from '@/components/decimal-input'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { DisplayMoney, DisplayMoneyFromUsd } from '@/features/currencies/components/display-money'
import {
  useDisplayCurrency,
  useFormatMoney,
} from '@/features/currencies/context/display-currency-context'
import { VentasBillingMethodToggle } from '@/features/ventas/components/ventas-billing-method-toggle'
import { inventoryQuantityDecimals } from '@/lib/inventory-units'
import { cn } from '@/lib/utils'
import { parseDecimalInput } from '@/lib/numeric-input'
import {
  buildPriceAdjustmentNote,
  mergeLineNotes,
} from '@/features/ventas/utils/price-adjustment-note'

export type VentasCartLine = {
  key: string
  name: string
  code: string
  quantity: number
  unitPriceUsd: number
  listPriceUsd?: number
  saleUnit?: ProductSaleUnit
  imageUrl?: string | null
  imageTone?: 'orange' | 'violet' | 'amber' | 'sky'
  metaLabel?: string
  notes?: string | null
}

type VentasOrderCartProps = {
  orderLabel: string
  lines: VentasCartLine[]
  subtotalUsd: number
  totalUsd: number
  totalBs?: number | null
  onClear: () => void
  onRemoveLine: (key: string) => void
  onUpdateQuantity?: (key: string, quantity: number) => void
  onUpdateUnitPrice?: (key: string, unitPriceUsd: number) => void
  onUpdateLineNotes?: (key: string, notes: string) => void
  onEditOrderNotes?: () => void
  orderNotes?: string | null
  emptyMessage?: string
  children?: ReactNode
  className?: string
  headerAction?: ReactNode
  onClose?: () => void
  billingMethod?: BillingMethod
  onBillingMethodChange?: (method: BillingMethod) => void
}

const IMAGE_TONE_CLASS: Record<NonNullable<VentasCartLine['imageTone']>, string> = {
  orange: 'bg-orange-100',
  violet: 'bg-violet-100',
  amber: 'bg-amber-100',
  sky: 'bg-sky-100',
}

function lineSubtotal(line: VentasCartLine) {
  return line.quantity * line.unitPriceUsd
}

function CartLineSubtotal({ line }: { line: VentasCartLine }) {
  const { formatFromUsd } = useFormatMoney()
  return <span className="text-sm font-bold tabular-nums">{formatFromUsd(lineSubtotal(line))}</span>
}

function CartLineCard({
  line,
  onRemove,
  onUpdateQuantity,
  onUpdateUnitPrice,
  onUpdateLineNotes,
}: {
  line: VentasCartLine
  onRemove: () => void
  onUpdateQuantity?: (quantity: number) => void
  onUpdateUnitPrice?: (unitPriceUsd: number) => void
  onUpdateLineNotes?: (notes: string) => void
}) {
  const { formatFromUsd } = useFormatMoney()
  const { displayCurrency, fromUsdAmount, toUsdAmount, symbol } = useDisplayCurrency()
  const [priceOpen, setPriceOpen] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)
  const [draftPrice, setDraftPrice] = useState('')
  const [draftNotes, setDraftNotes] = useState(line.notes ?? '')

  const listPrice = line.listPriceUsd ?? line.unitPriceUsd
  const hasDiscount = listPrice > line.unitPriceUsd + 0.0001
  const hasIncrease = line.unitPriceUsd > listPrice + 0.0001
  const hasPriceAdjustment = hasDiscount || hasIncrease
  const hasNotes = Boolean(line.notes?.trim())
  const unit = line.saleUnit ?? 'UND'
  const decimals = inventoryQuantityDecimals(unit)
  const isIntegerUnit = decimals === 0
  const priceDecimals = displayCurrency === 'USD' ? 4 : 6

  function formatDraftFromUsd(amountUsd: number) {
    const converted = fromUsdAmount(amountUsd, displayCurrency)
    return Number(converted.toFixed(priceDecimals)).toString()
  }

  function openPriceModal() {
    setDraftPrice(formatDraftFromUsd(line.unitPriceUsd))
    setPriceOpen(true)
  }

  function openNotesModal() {
    setDraftNotes(line.notes ?? '')
    setNotesOpen(true)
  }

  function applyPrice() {
    const parsedDisplay = parseDecimalInput(draftPrice, priceDecimals) ?? 0
    const usd = toUsdAmount(Math.max(0, parsedDisplay), displayCurrency)
    onUpdateUnitPrice?.(Math.max(0, Number(usd.toFixed(4))))
    setPriceOpen(false)
  }

  function applyPercentOff(pct: number) {
    const discountedUsd = Math.max(0, listPrice * (1 - pct / 100))
    setDraftPrice(formatDraftFromUsd(discountedUsd))
  }

  function applyNotes() {
    const merged =
      mergeLineNotes(draftNotes, buildPriceAdjustmentNote(listPrice, line.unitPriceUsd)) ?? ''
    onUpdateLineNotes?.(merged)
    setNotesOpen(false)
  }

  return (
    <>
      <div className="relative rounded-xl border bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-muted-foreground absolute top-2 right-2 size-7 rounded-full"
          onClick={onRemove}
          aria-label={`Quitar ${line.name}`}
        >
          <X className="size-3.5" />
        </Button>

        <div className="flex gap-3 pr-6">
          <div
            className={cn(
              'flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl',
              line.imageUrl ? 'bg-muted' : IMAGE_TONE_CLASS[line.imageTone ?? 'violet']
            )}
          >
            {line.imageUrl ? (
              <PublicImage
                src={line.imageUrl}
                alt={line.name}
                className="size-full object-cover"
                showFallbackIcon
                fallbackClassName="size-full"
              />
            ) : (
              <Package className="text-muted-foreground/70 size-7" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 pr-2 text-sm leading-snug font-semibold">{line.name}</p>
            <p className="text-muted-foreground mt-0.5 text-xs">Código: {line.code}</p>
            {line.metaLabel ? (
              <p className="text-muted-foreground mt-0.5 text-xs">{line.metaLabel}</p>
            ) : null}

            <div className="mt-2 flex flex-wrap items-center gap-2">
              {onUpdateQuantity ? (
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span>Cantidad:</span>
                  <DecimalInput
                    min={isIntegerUnit ? 1 : 0.01}
                    step={isIntegerUnit ? 1 : 0.01}
                    decimals={decimals}
                    className={cn('h-7 px-2 text-xs', isIntegerUnit ? 'w-12' : 'w-16')}
                    value={line.quantity}
                    onChange={(e) =>
                      onUpdateQuantity(parseDecimalInput(e.target.value, decimals) ?? 0)
                    }
                  />
                </div>
              ) : (
                <span className="text-xs text-slate-500">Cantidad: {line.quantity}</span>
              )}

              {onUpdateUnitPrice ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'size-7',
                    hasPriceAdjustment ? 'text-violet-700' : 'text-muted-foreground'
                  )}
                  title="Precio, descuento o aumento"
                  aria-label="Precio, descuento o aumento"
                  onClick={openPriceModal}
                >
                  <SlidersHorizontal className="size-3.5" />
                </Button>
              ) : null}

              {onUpdateLineNotes ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn('size-7', hasNotes ? 'text-violet-700' : 'text-muted-foreground')}
                  title="Nota de línea"
                  aria-label="Nota de línea"
                  onClick={openNotesModal}
                >
                  <MessageSquare className="size-3.5" />
                </Button>
              ) : null}
            </div>

            <div className="mt-2 flex items-end justify-between gap-2">
              <div className="min-w-0">
                {hasDiscount ? (
                  <p className="text-muted-foreground text-[11px] line-through">
                    {formatFromUsd(listPrice)} c/u
                  </p>
                ) : hasIncrease ? (
                  <p className="text-muted-foreground text-[11px]">
                    Lista {formatFromUsd(listPrice)} c/u
                  </p>
                ) : null}
                {hasNotes ? (
                  <p className="text-muted-foreground whitespace-pre-line line-clamp-2 text-[11px]">
                    {line.notes}
                  </p>
                ) : null}
              </div>
              <CartLineSubtotal line={line} />
            </div>
          </div>
        </div>
      </div>

      <Dialog open={priceOpen} onOpenChange={setPriceOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Precio de venta</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-muted-foreground text-sm">{line.name}</p>
            <div className="space-y-1.5">
              <Label htmlFor={`cart-price-${line.key}`}>
                Precio unitario ({symbol(displayCurrency)})
              </Label>
              <MoneyInput
                id={`cart-price-${line.key}`}
                min={0}
                decimals={priceDecimals}
                value={draftPrice}
                onChange={(e) => setDraftPrice(e.target.value)}
              />
              <p className="text-muted-foreground text-xs">
                Precio de lista: {formatFromUsd(listPrice)}
              </p>
              <p className="text-muted-foreground text-xs">
                Si cambia el precio, la venta guarda una nota de descuento o aumento.
              </p>
              {displayCurrency !== 'USD' ? (
                <p className="text-muted-foreground text-xs">
                  Equiv. USD: {symbol('USD')}{' '}
                  {toUsdAmount(
                    parseDecimalInput(draftPrice, priceDecimals) ?? 0,
                    displayCurrency
                  ).toFixed(4)}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {[5, 10, 20].map((pct) => (
                <Button
                  key={pct}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyPercentOff(pct)}
                >
                  -{pct}%
                </Button>
              ))}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setDraftPrice(formatDraftFromUsd(listPrice))}
              >
                Precio lista
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPriceOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={applyPrice}>
              Aplicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={notesOpen} onOpenChange={setNotesOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Nota del producto</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">{line.name}</p>
            <Textarea
              rows={4}
              value={draftNotes}
              onChange={(e) => setDraftNotes(e.target.value)}
              placeholder="Observación de esta línea…"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setNotesOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={applyNotes}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function VentasOrderCart({
  orderLabel,
  lines,
  subtotalUsd,
  totalUsd,
  totalBs,
  onClear,
  onRemoveLine,
  onUpdateQuantity,
  onUpdateUnitPrice,
  onUpdateLineNotes,
  onEditOrderNotes,
  orderNotes,
  emptyMessage = 'El carrito está vacío.',
  children,
  className,
  headerAction,
  onClose,
  billingMethod,
  onBillingMethodChange,
}: VentasOrderCartProps) {
  const { displayCurrency } = useFormatMoney()

  return (
    <div
      className={cn(
        'flex min-h-0 flex-col overflow-hidden rounded-2xl border bg-white shadow-sm',
        className
      )}
    >
      <div className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 border-b px-4 py-3">
        <p className="text-sm font-semibold tracking-tight">{orderLabel}</p>

        {billingMethod != null && onBillingMethodChange ? (
          <VentasBillingMethodToggle value={billingMethod} onChange={onBillingMethodChange} />
        ) : (
          <span aria-hidden />
        )}

        <div className="flex items-center justify-end gap-1">
          {onEditOrderNotes ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn('size-8', orderNotes ? 'text-violet-700' : 'text-muted-foreground')}
              title={orderNotes ? 'Editar nota de factura' : 'Nota de factura'}
              aria-label="Nota de factura"
              onClick={onEditOrderNotes}
            >
              <StickyNote className="size-4" />
            </Button>
          ) : null}
          {headerAction}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive size-8"
            disabled={lines.length === 0}
            onClick={onClear}
            title="Vaciar carrito"
            aria-label="Vaciar carrito"
          >
            <Trash2 className="size-4" />
          </Button>
          {onClose ? (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-9"
              title="Cerrar carrito"
              aria-label="Cerrar carrito"
              onClick={onClose}
            >
              <X className="size-4" />
            </Button>
          ) : null}
        </div>
      </div>

      <div className="scrollbar-subtle min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {lines.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">{emptyMessage}</p>
        ) : (
          lines.map((line) => (
            <CartLineCard
              key={line.key}
              line={line}
              onRemove={() => onRemoveLine(line.key)}
              onUpdateQuantity={
                onUpdateQuantity ? (quantity) => onUpdateQuantity(line.key, quantity) : undefined
              }
              onUpdateUnitPrice={
                onUpdateUnitPrice
                  ? (unitPriceUsd) => onUpdateUnitPrice(line.key, unitPriceUsd)
                  : undefined
              }
              onUpdateLineNotes={
                onUpdateLineNotes ? (notes) => onUpdateLineNotes(line.key, notes) : undefined
              }
            />
          ))
        )}
      </div>

      <div className="shrink-0 space-y-3 bg-violet-50/80 px-4 py-4">
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <DisplayMoneyFromUsd amountUsd={subtotalUsd} />
          </div>
          <div className="border-violet-200/80 border-t pt-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Total</span>
              <DisplayMoneyFromUsd amountUsd={totalUsd} />
            </div>
            {totalBs != null && totalBs > 0 && displayCurrency !== 'VES' ? (
              <p className="text-muted-foreground mt-1 text-right text-xs">
                <DisplayMoney amount={totalBs} currencyCode="VES" size="sm" />
              </p>
            ) : null}
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}

export function catalogProductCode(productId: number) {
  return String(productId).padStart(7, '0')
}
export function catalogImageTone(productId: number): VentasCartLine['imageTone'] {
  const tones: NonNullable<VentasCartLine['imageTone']>[] = ['orange', 'violet', 'amber', 'sky']
  return tones[productId % tones.length]
}
