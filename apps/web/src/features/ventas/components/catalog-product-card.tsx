import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { ChevronDown, DollarSign, Package, Pencil, Tag, Trash2, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DisplayMoneyFromUsd } from '@/features/currencies/components/display-money'
import { PublicImage } from '@/components/public-image'
import { catalogImageUrl } from '@/features/ventas/constants'
import {
  catalogImageTone,
  catalogProductCode,
} from '@/features/ventas/components/ventas-order-cart'
import type { CatalogProduct } from '@/features/ventas/types'
import { cn } from '@/lib/utils'
import { isBelowCost } from '@/lib/cost-warnings'
import { isProductStockLow } from '@/features/ventas/utils/product-stock'
import { productHasSizes } from '@/features/ventas/utils/product-sizes'
import {
  calcProfitMarginPercent,
  formatSignedProfitMarginPercent,
  profitMarginIsNegative,
} from '@/lib/profit-margin'

type CatalogProductCardProps = {
  product: CatalogProduct
  onEdit?: (product: CatalogProduct) => void
  onDelete?: (product: CatalogProduct) => void
  onAddToCart?: (product: CatalogProduct) => void
  onOpen?: (product: CatalogProduct) => void
  showActions?: boolean
}

const IMAGE_TONE_CLASS = {
  orange: 'bg-orange-100',
  violet: 'bg-violet-100',
  amber: 'bg-amber-100',
  sky: 'bg-sky-100',
} as const

const SIZES_PANEL_MS = 180

function formatSizeQty(qty: number) {
  if (Number.isInteger(qty)) return String(qty)
  return qty.toLocaleString('es-VE', { maximumFractionDigits: 3 })
}

export function CatalogProductCard({
  product,
  onEdit,
  onDelete,
  onAddToCart,
  onOpen,
  showActions = false,
}: CatalogProductCardProps) {
  const [sizesMounted, setSizesMounted] = useState(false)
  const [sizesVisible, setSizesVisible] = useState(false)
  const sizesPanelRef = useRef<HTMLDivElement>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const hasImage = Boolean(product.image_path)
  const priceDropped =
    product.previous_sale_price_usd &&
    Number(product.sale_price_usd) < Number(product.previous_sale_price_usd)
  const belowCost = isBelowCost(product.sale_price_usd, product.cost_usd)
  const profitMargin = calcProfitMarginPercent(product.sale_price_usd, product.cost_usd)
  const stock = Number(product.stock_quantity)
  const stockIsLow = isProductStockLow(product)
  const imageTone = catalogImageTone(product.id)
  const hasSizes = productHasSizes(product)
  const sizeRows = hasSizes ? (product.sizes ?? []) : []
  const cardAction = onOpen
    ? () => onOpen(product)
    : onAddToCart
      ? () => onAddToCart(product)
      : undefined

  const stockBadgeLabel =
    stock <= 0
      ? 'Sin stock'
      : `${stock.toLocaleString('es-VE')} disponibles`

  function openSizesPanel() {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
    setSizesMounted(true)
    requestAnimationFrame(() => setSizesVisible(true))
  }

  function closeSizesPanel() {
    setSizesVisible(false)
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    closeTimerRef.current = setTimeout(() => {
      setSizesMounted(false)
      closeTimerRef.current = null
    }, SIZES_PANEL_MS)
  }

  function toggleSizesPanel(e: ReactMouseEvent) {
    e.stopPropagation()
    e.preventDefault()
    if (!hasSizes) return
    if (sizesVisible) closeSizesPanel()
    else openSizesPanel()
  }

  useEffect(() => {
    if (!sizesMounted) return

    function onPointerDown(event: globalThis.MouseEvent) {
      const target = event.target as Node
      if (sizesPanelRef.current?.contains(target)) return
      closeSizesPanel()
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') closeSizesPanel()
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [sizesMounted])

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    }
  }, [])

  return (
    <article
      className={cn(
        '@container group relative flex h-full flex-col overflow-visible rounded-xl border bg-white p-2 shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-shadow hover:shadow-md',
        cardAction && 'cursor-pointer'
      )}
      onClick={cardAction}
      onKeyDown={
        cardAction
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                cardAction()
              }
            }
          : undefined
      }
      role={cardAction ? 'button' : undefined}
      tabIndex={cardAction ? 0 : undefined}
    >
      {showActions && (onEdit || onDelete) ? (
        <div className="absolute top-2 left-2 z-10 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          {onEdit ? (
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="size-6"
              onClick={(e) => {
                e.stopPropagation()
                onEdit(product)
              }}
            >
              <Pencil className="size-3" />
            </Button>
          ) : null}
          {onDelete ? (
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="size-6"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(product)
              }}
            >
              <Trash2 className="size-3" />
            </Button>
          ) : null}
        </div>
      ) : null}

      <div ref={sizesPanelRef} className="relative mb-2">
        <div
          className={cn(
            'flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg',
            hasImage ? 'bg-muted' : IMAGE_TONE_CLASS[imageTone ?? 'violet']
          )}
        >
          {hasImage ? (
            <PublicImage
              src={catalogImageUrl(product.id)}
              alt={product.name}
              className="size-full object-cover"
              showFallbackIcon
              fallbackClassName="size-full"
            />
          ) : (
            <Package className="text-muted-foreground/60 size-7" />
          )}
        </div>

        <div className="absolute top-1.5 right-1.5 z-20">
          <button
            type="button"
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium shadow-sm transition-colors',
              stock <= 0 || stockIsLow
                ? 'bg-red-50 text-red-700 hover:bg-red-100'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
              hasSizes && 'cursor-pointer',
              !hasSizes && 'cursor-default'
            )}
            onClick={toggleSizesPanel}
            aria-expanded={hasSizes ? sizesVisible : undefined}
            aria-haspopup={hasSizes ? 'dialog' : undefined}
            aria-label={
              hasSizes
                ? `${stockBadgeLabel}. Ver detalle de tallas`
                : stockBadgeLabel
            }
          >
            <span
              className={cn(
                'size-1.5 shrink-0 rounded-full',
                stock <= 0 || stockIsLow ? 'bg-red-500' : 'bg-emerald-500'
              )}
            />
            {stockBadgeLabel}
            {hasSizes ? (
              <ChevronDown
                className={cn(
                  'size-3 transition-transform duration-200',
                  sizesVisible && 'rotate-180'
                )}
              />
            ) : null}
          </button>

          {sizesMounted ? (
            <div
              role="dialog"
              aria-label="Stock por talla"
              className={cn(
                'absolute top-full right-0 mt-1 origin-top-right rounded-md border bg-white/95 px-1.5 py-1 shadow-sm backdrop-blur-sm transition-[opacity,transform] ease-out',
                sizesVisible
                  ? 'translate-y-0 scale-100 opacity-100'
                  : 'pointer-events-none -translate-y-1 scale-95 opacity-0'
              )}
              style={{ transitionDuration: `${SIZES_PANEL_MS}ms` }}
              onClick={(e) => e.stopPropagation()}
            >
              {sizeRows.length > 0 ? (
                <ul className="max-h-28 space-y-0.5 overflow-y-auto">
                  {sizeRows.map((item) => {
                    const qty = Number(item.stock_quantity)
                    return (
                      <li
                        key={item.id}
                        className={cn(
                          'whitespace-nowrap text-[10px] tabular-nums leading-tight',
                          qty <= 0 ? 'text-muted-foreground' : 'text-slate-700'
                        )}
                      >
                        {item.size} x{formatSizeQty(qty)}
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="text-muted-foreground text-[10px]">Sin tallas</p>
              )}
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 px-0.5">
        <div className="space-y-0.5">
          <h3 className="line-clamp-2 min-h-[1.75rem] text-xs leading-snug font-semibold text-slate-800">
            {product.name}
          </h3>
          <p className="text-muted-foreground text-[11px]">
            {catalogProductCode(product.id)}
          </p>
        </div>

        <div className="mt-auto min-w-0 space-y-[clamp(0.25rem,2cqi,0.375rem)] border-t pt-[clamp(0.25rem,2cqi,0.5rem)]">
          <div className="grid min-h-[clamp(2rem,18cqi,2.75rem)] w-full grid-cols-2 gap-[clamp(0.25rem,2.5cqi,0.5rem)] border-b border-slate-100 pb-[clamp(0.25rem,2cqi,0.5rem)]">
            <div className="flex min-h-0 min-w-0 items-center gap-[clamp(0.25rem,2.5cqi,0.5rem)]">
              <span className="flex size-[clamp(1.25rem,13cqi,2rem)] shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
                <DollarSign className="size-[clamp(0.625rem,6.5cqi,1rem)]" />
              </span>
              <div className="min-w-0 flex-1 overflow-hidden">
                <p className="text-muted-foreground truncate text-[clamp(0.5rem,2.2cqi,0.625rem)] leading-tight">
                  Costo
                </p>
                <DisplayMoneyFromUsd
                  amountUsd={product.cost_usd}
                  className="block truncate text-[clamp(0.625rem,3.2cqi,0.875rem)] leading-tight font-semibold text-slate-900"
                />
              </div>
            </div>

            <div className="flex min-h-0 min-w-0 items-center gap-[clamp(0.25rem,2.5cqi,0.5rem)]">
              <span
                className={cn(
                  'flex size-[clamp(1.25rem,13cqi,2rem)] shrink-0 items-center justify-center rounded-lg',
                  profitMargin !== null && profitMarginIsNegative(profitMargin)
                    ? 'bg-red-100 text-red-600'
                    : 'bg-emerald-100 text-emerald-600'
                )}
              >
                <TrendingUp className="size-[clamp(0.625rem,6.5cqi,1rem)]" />
              </span>
              <div className="min-w-0 flex-1 overflow-hidden">
                <p className="text-muted-foreground truncate text-[clamp(0.5rem,2.2cqi,0.625rem)] leading-tight">
                  Margen
                </p>
                {profitMargin !== null ? (
                  <span
                    className={cn(
                      'block truncate text-[clamp(0.625rem,3.2cqi,0.875rem)] leading-tight font-semibold tabular-nums',
                      profitMarginIsNegative(profitMargin) ? 'text-destructive' : 'text-emerald-700'
                    )}
                  >
                    {formatSignedProfitMarginPercent(profitMargin)}
                  </span>
                ) : (
                  <span className="text-muted-foreground block truncate text-[clamp(0.625rem,3.2cqi,0.875rem)] leading-tight font-semibold">
                    —
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex min-w-0 items-end justify-between gap-[clamp(0.25rem,2cqi,0.5rem)]">
            <div className="min-w-0 flex-1">
              {belowCost ? (
                <p className="mb-0.5 text-[10px] font-medium text-destructive">
                  Venta por debajo del costo
                </p>
              ) : null}
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground inline-flex items-center gap-1.5 text-[11px]">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-amber-50 text-amber-700">
                    <Tag className="size-3" />
                  </span>
                  Precio
                </span>
                <div className="flex flex-wrap items-baseline justify-end gap-1.5">
                  <DisplayMoneyFromUsd
                    amountUsd={product.sale_price_usd}
                    size="sm"
                    className={cn(
                      'text-sm font-semibold [&>span]:text-sm [&>span]:font-semibold',
                      belowCost && 'text-destructive'
                    )}
                  />
                  {priceDropped ? (
                    <span className="text-muted-foreground text-[10px] line-through">
                      <DisplayMoneyFromUsd
                        amountUsd={product.previous_sale_price_usd}
                        size="sm"
                        className="text-[10px] [&>span]:text-[10px]"
                      />
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}
