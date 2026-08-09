import { useEffect, useMemo, useState } from 'react'
import { FileText, FolderOpen, Loader2, Plus, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CustomerFormDialog } from '@/features/customers/components/customer-form-dialog'
import type { Customer } from '@/features/customers/types'
import { useAuth } from '@/features/auth/hooks/use-auth'
import {
  useCreateOrderMutation,
} from '@/features/orders/hooks/use-orders'
import {
  getOrder,
  getOrderMaterialAvailability,
  transicionarOrder,
  updateOrder,
} from '@/features/orders/services/order-service'
import { CatalogFormDialog } from '@/features/ventas/components/catalog-form-dialog'
import { CatalogProductCard } from '@/features/ventas/components/catalog-product-card'
import { VentasCustomerPickDialog } from '@/features/ventas/components/ventas-customer-pick-dialog'
import {
  VentasLoadDraftDialog,
  type LoadedDraft,
} from '@/features/ventas/components/ventas-load-draft-dialog'
import {
  catalogImageTone,
  catalogProductCode,
  VentasOrderCart,
  type VentasCartLine,
} from '@/features/ventas/components/ventas-order-cart'
import { useActiveCategoriesQuery } from '@/features/categories/hooks/use-categories'
import { catalogImageUrl } from '@/features/ventas/constants'
import type { BillingMethod } from '@/features/ventas/constants'
import { useCatalogProductsQuery } from '@/features/ventas/hooks/use-catalog'
import type { CatalogProduct, CatalogProductSize } from '@/features/ventas/types'
import { cartHasStockIssues } from '@/features/ventas/utils/product-stock'
import { getApiErrorMessage } from '@/lib/api-error'
import { normalizeInventoryQuantity } from '@/lib/inventory-units'
import { cn } from '@/lib/utils'
import { formatDraftMaterialNotice } from '@/lib/material-availability'

type CartLine = {
  key: string
  product: CatalogProduct
  quantity: number
  sizeId: number | null
  size: string | null
  unitPriceUsd: number
  notes: string
}

function cartLineKey(productId: number, sizeId: number | null) {
  return `${productId}:${sizeId ?? 'nosize'}`
}

const CATALOG_PER_PAGE = 30

export function VentasPanel() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <VentasCreateView />
    </div>
  )
}

function VentasCreateView() {
  const navigate = useNavigate()
  const { can } = useAuth()
  const canConfirmSale = can('ventas.confirm')
  const canCreditSale = can('ventas.credit')
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [category, setCategory] = useState('')
  const [brandFilter, setBrandFilter] = useState('')
  const [modelFilter, setModelFilter] = useState('')
  const [sizeFilter, setSizeFilter] = useState('')
  const [page, setPage] = useState(1)
  const [customerId, setCustomerId] = useState<number | ''>('')
  const [clientName, setClientName] = useState('')
  const [customerCreditDays, setCustomerCreditDays] = useState<number | null>(null)
  const [paymentType, setPaymentType] = useState<'CASH' | 'CREDIT'>('CASH')
  const [billingMethod, setBillingMethod] = useState<BillingMethod>('FAST')
  const [cart, setCart] = useState<CartLine[]>([])
  const [orderNotes, setOrderNotes] = useState('')
  const [orderNotesOpen, setOrderNotesOpen] = useState(false)
  const [sizePickerProduct, setSizePickerProduct] = useState<CatalogProduct | null>(null)
  const [sourceOrderId, setSourceOrderId] = useState<number | null>(null)
  const [sourceOrderCode, setSourceOrderCode] = useState<string | null>(null)
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false)
  const [customerPickOpen, setCustomerPickOpen] = useState(false)
  const [loadDraftOpen, setLoadDraftOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<CatalogProduct | null>(null)
  const [editProductOpen, setEditProductOpen] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [orderDraftNo] = useState(() => String(Math.floor(100000 + Math.random() * 900000)))

  const createOrderMutation = useCreateOrderMutation()
  const { data: categories = [] } = useActiveCategoriesQuery()

  const {
    data: catalogData,
    isLoading: loadingCatalog,
    isError: catalogError,
    error: catalogQueryError,
  } = useCatalogProductsQuery({
    page,
    perPage: CATALOG_PER_PAGE,
    search: debouncedSearch || undefined,
    category: category || undefined,
    brand: brandFilter || undefined,
    productModel: modelFilter || undefined,
    size: sizeFilter || undefined,
    active: true,
    sortBy: 'most_sold',
    sortDir: 'desc',
  })

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim())
      setPage(1)
    }, 300)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  const products = catalogData?.catalog_products ?? []
  const catalogMeta = catalogData?.meta
  const brandOptions = useMemo(() => {
    const values = new Set<string>()
    for (const product of products) {
      if (product.brand?.trim()) values.add(product.brand.trim())
    }
    return [...values].sort((a, b) => a.localeCompare(b, 'es'))
  }, [products])
  const modelOptions = useMemo(() => {
    const values = new Set<string>()
    for (const product of products) {
      if (product.product_model?.trim()) values.add(product.product_model.trim())
    }
    return [...values].sort((a, b) => a.localeCompare(b, 'es'))
  }, [products])
  const sizeOptions = useMemo(() => {
    const values = new Set<string>()
    for (const product of products) {
      for (const size of product.sizes ?? []) {
        if (size.size.trim()) values.add(size.size.trim())
      }
    }
    return [...values].sort((a, b) => a.localeCompare(b, 'es', { numeric: true }))
  }, [products])

  const cartTotal = useMemo(
    () => cart.reduce((sum, line) => sum + line.quantity * line.unitPriceUsd, 0),
    [cart]
  )
  const stockBlocked = cartHasStockIssues(cart)

  const cartLines = useMemo<VentasCartLine[]>(
    () =>
      cart.map((line) => ({
        key: line.key,
        name: line.product.name,
        code: catalogProductCode(line.product.id),
        quantity: line.quantity,
        unitPriceUsd: line.unitPriceUsd,
        listPriceUsd: Number(line.product.sale_price_usd),
        saleUnit: line.product.sale_unit ?? 'UND',
        imageUrl: line.product.image_path ? catalogImageUrl(line.product.id) : null,
        imageTone: catalogImageTone(line.product.id),
        metaLabel: line.size ? `Talla ${line.size}` : undefined,
        notes: line.notes || null,
      })),
    [cart]
  )

  const orderLabel = sourceOrderCode
    ? `Borrador ${sourceOrderCode}`
    : `Venta N° ${orderDraftNo}`

  function pushCartLine(product: CatalogProduct, size: CatalogProductSize | null) {
    setSuccessMessage(null)
    const sizeId = size?.id ?? null
    const key = cartLineKey(product.id, sizeId)
    setCart((prev) => {
      const existing = prev.find((line) => line.key === key)
      if (existing) {
        return prev.map((line) =>
          line.key === key ? { ...line, quantity: line.quantity + 1 } : line
        )
      }
      return [
        ...prev,
        {
          key,
          product,
          quantity: 1,
          sizeId,
          size: size?.size ?? null,
          unitPriceUsd: Number(product.sale_price_usd),
          notes: '',
        },
      ]
    })
  }

  function addToCart(product: CatalogProduct) {
    const hasSizes = Boolean(product.has_sizes || (product.sizes && product.sizes.length > 0))
    if (hasSizes) {
      setSizePickerProduct(product)
      return
    }
    pushCartLine(product, null)
  }

  function openEditProduct(product: CatalogProduct) {
    setEditProduct(product)
    setEditProductOpen(true)
  }

  function removeCartLine(key: string) {
    setSuccessMessage(null)
    setCart((prev) => prev.filter((item) => item.key !== key))
  }

  function updateCartQty(key: string, quantity: number) {
    setSuccessMessage(null)
    if (!Number.isFinite(quantity) || quantity <= 0) {
      removeCartLine(key)
      return
    }

    const line = cart.find((item) => item.key === key)
    const unit = line?.product.sale_unit ?? 'UND'
    const normalized = normalizeInventoryQuantity(quantity, unit)

    setCart((prev) =>
      prev.map((item) => (item.key === key ? { ...item, quantity: normalized } : item))
    )
  }

  function updateCartUnitPrice(key: string, unitPriceUsd: number) {
    setSuccessMessage(null)
    setCart((prev) =>
      prev.map((item) =>
        item.key === key ? { ...item, unitPriceUsd: Math.max(0, unitPriceUsd) } : item
      )
    )
  }

  function updateCartLineNotes(key: string, notes: string) {
    setCart((prev) => prev.map((item) => (item.key === key ? { ...item, notes } : item)))
  }

  function linkRegisteredCustomer(
    customer: Pick<Customer, 'id' | 'name'> & { creditDays?: number | null }
  ) {
    if (!customer.id) return
    setCustomerId(customer.id)
    setClientName(customer.name)
    setCustomerCreditDays(customer.creditDays ?? null)
  }

  function handleClientNameChange(value: string) {
    setClientName(value)
    if (customerId) {
      setCustomerId('')
      setCustomerCreditDays(null)
      if (paymentType === 'CREDIT') {
        setPaymentType('CASH')
      }
    }
  }

  function buildClientPayload() {
    if (customerId) {
      return { customer_id: Number(customerId) }
    }
    const name = clientName.trim()
    if (!name) {
      throw new Error('Ingresá el nombre del cliente.')
    }
    return { guest_name: name }
  }

  function handleLoadedDraft(draft: LoadedDraft) {
    setCart(draft.cart)
    setOrderNotes(draft.notes ?? '')
    if (draft.customerId) {
      linkRegisteredCustomer({
        id: draft.customerId,
        name: draft.customerName ?? '',
        creditDays: draft.customerCreditDays,
      })
    } else {
      setCustomerId('')
      setCustomerCreditDays(null)
      setClientName(draft.guestName ?? '')
    }
    setPaymentType(draft.paymentType)
    setSourceOrderId(draft.orderId)
    setSourceOrderCode(draft.orderCode)
    setActionError(null)
    setSuccessMessage(`Cargaste ${draft.orderCode} para editar.`)
  }

  function resetLoadedDraft() {
    setSourceOrderId(null)
    setSourceOrderCode(null)
  }

  async function persistDraftOrder(): Promise<number> {
    const clientPayload = buildClientPayload()
    if (cart.length === 0) {
      throw new Error('Agregá al menos un producto al carrito.')
    }

    const today = new Date().toISOString().slice(0, 10)
    const totalQty = cart.reduce((sum, line) => sum + line.quantity, 0)
    const description = cart.map((line) => line.product.name).join(', ').slice(0, 200)
    const orderPayload = {
      ...clientPayload,
      modalidad: 'CORPORATE' as const,
      description: description || 'Venta desde catálogo',
      quantity_total: totalQty,
      total_price: cartTotal,
      payment_type: paymentType,
      notes: orderNotes.trim() || undefined,
    }

    const lines = cart.map((item) => ({
      catalog_product_id: item.product.id,
      catalog_product_size_id: item.sizeId ?? undefined,
      size: item.size ?? undefined,
      quantity: item.quantity,
      unit_price_usd: item.unitPriceUsd,
      notes: item.notes.trim() || null,
    }))

    if (sourceOrderId) {
      const order = await getOrder(sourceOrderId)
      await updateOrder(sourceOrderId, {
        ...orderPayload,
        date_order: order.dateOrder,
        lines,
      })
      return sourceOrderId
    }

    const order = await createOrderMutation.mutateAsync({
      ...orderPayload,
      date_order: today,
      lines,
    })

    setSourceOrderId(order.id)
    setSourceOrderCode(order.code)
    return order.id
  }

  async function saveBudget() {
    setActionError(null)
    setSuccessMessage(null)
    setIsSubmitting(true)

    try {
      const orderId = await persistDraftOrder()
      const order = await getOrder(orderId)
      setSuccessMessage(`Presupuesto guardado (${order.code}). No se descontó stock.`)
    } catch (error) {
      setActionError(getApiErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function confirmOrder() {
    if (cart.length === 0) {
      setActionError('Agregá al menos un producto al carrito.')
      return
    }
    if (stockBlocked) {
      setActionError('Hay productos sin stock suficiente en el carrito.')
      return
    }

    if (!customerId && !clientName.trim()) {
      setActionError('Ingresá el nombre del cliente o buscá uno registrado.')
      return
    }

    if (paymentType === 'CREDIT') {
      if (!customerId) {
        setActionError('El crédito solo está disponible para clientes registrados.')
        return
      }
      if (!customerCreditDays || customerCreditDays <= 0) {
        setActionError('El cliente no tiene días de crédito configurados.')
        return
      }
    }

    setActionError(null)
    setSuccessMessage(null)
    setIsSubmitting(true)

    try {
      const orderId = await persistDraftOrder()

      const availability = await getOrderMaterialAvailability(orderId)

      if (availability.has_recipe && !availability.sufficient) {
        const notice = formatDraftMaterialNotice(availability.missing)
        setActionError(notice)
        void navigate(`/ventas/${orderId}`, {
          state: { paymentType },
        })
        return
      }

      await transicionarOrder(orderId, {
        new_status: billingMethod === 'FAST' ? 'DELIVERED' : 'CONFIRMED',
        payment_type: paymentType,
      })

      void navigate(`/ventas/${orderId}`)
    } catch (submitError) {
      setActionError(getApiErrorMessage(submitError))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="grid min-h-0 flex-1 items-stretch gap-6 xl:grid-cols-3">
        <div className="flex min-h-0 xl:col-span-1">
          <VentasOrderCart
            className="h-full min-h-0 w-full"
            orderLabel={orderLabel}
            lines={cartLines}
            subtotalUsd={cartTotal}
            totalUsd={cartTotal}
            onClear={() => {
              setCart([])
              setOrderNotes('')
              resetLoadedDraft()
            }}
            onRemoveLine={removeCartLine}
            onUpdateQuantity={(key, qty) => updateCartQty(key, qty)}
            onUpdateUnitPrice={updateCartUnitPrice}
            onUpdateLineNotes={updateCartLineNotes}
            onEditOrderNotes={() => setOrderNotesOpen(true)}
            orderNotes={orderNotes}
            emptyMessage="Agregá productos desde el catálogo."
            billingMethod={billingMethod}
            onBillingMethodChange={setBillingMethod}
            headerAction={
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                title="Cargar factura"
                aria-label="Cargar factura"
                onClick={() => setLoadDraftOpen(true)}
              >
                <FolderOpen className="size-4" />
              </Button>
            }
          >
            <div className="space-y-3 pt-1">
              <div className="space-y-2">
                <Label className="text-xs">Cliente</Label>
                <div className="flex gap-2">
                  <Input
                    className="min-w-0 flex-1"
                    placeholder="Nombre del cliente"
                    value={clientName}
                    onChange={(e) => handleClientNameChange(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    title="Registrar cliente"
                    aria-label="Registrar cliente"
                    onClick={() => setCustomerDialogOpen(true)}
                  >
                    <Plus className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    title="Buscar cliente registrado"
                    aria-label="Buscar cliente registrado"
                    onClick={() => setCustomerPickOpen(true)}
                  >
                    <Search className="size-4" />
                  </Button>
                </div>
                {customerId ? (
                  <p className="text-muted-foreground text-xs">Cliente registrado vinculado</p>
                ) : null}
              </div>

              <div className="flex items-start justify-between gap-2">
                <div className="space-y-2">
                  <Label className="text-xs">Forma de pago</Label>
                  <div className="bg-muted inline-flex rounded-lg p-1">
                    <button
                      type="button"
                      className={cn(
                        'rounded-md px-3 py-1.5 text-xs font-medium',
                        paymentType === 'CASH' ? 'bg-background shadow-sm' : 'text-muted-foreground'
                      )}
                      onClick={() => setPaymentType('CASH')}
                    >
                      Contado
                    </button>
                    <button
                      type="button"
                      disabled={!customerId || !canCreditSale}
                      className={cn(
                        'rounded-md px-3 py-1.5 text-xs font-medium',
                        paymentType === 'CREDIT'
                          ? 'bg-background shadow-sm'
                          : 'text-muted-foreground',
                        (!customerId || !canCreditSale) && 'cursor-not-allowed opacity-50'
                      )}
                      onClick={() => setPaymentType('CREDIT')}
                    >
                      Crédito
                    </button>
                  </div>
                  {paymentType === 'CREDIT' && customerId ? (
                    <p className="text-muted-foreground text-xs">
                      Plazo: {customerCreditDays ?? 0} días
                    </p>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-foreground shrink-0"
                  title="Generar presupuesto"
                  aria-label="Generar presupuesto"
                  disabled={isSubmitting || cart.length === 0}
                  onClick={() => void saveBudget()}
                >
                  {isSubmitting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <FileText className="size-4" />
                  )}
                </Button>
              </div>

              {stockBlocked ? (
                <p className="text-destructive text-xs">
                  Hay productos sin stock o por debajo del mínimo en el carrito.
                </p>
              ) : null}

              {successMessage ? (
                <p className="text-emerald-700 text-sm">{successMessage}</p>
              ) : null}
              {actionError ? <p className="text-destructive text-sm whitespace-pre-line">{actionError}</p> : null}

              {canConfirmSale ? (
                <Button
                  className="w-full"
                  disabled={isSubmitting || cart.length === 0 || stockBlocked}
                  onClick={() => void confirmOrder()}
                >
                  {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
                  {billingMethod === 'FAST' ? 'Confirmar venta' : 'Confirmar pedido'}
                </Button>
              ) : (
                <p className="text-muted-foreground text-center text-sm">
                  No tenés permiso para confirmar ventas.
                </p>
              )}
            </div>
          </VentasOrderCart>
        </div>

        <Card className="flex h-full min-h-0 flex-col overflow-hidden border-violet-100/80 bg-gradient-to-b from-violet-50/40 to-white xl:col-span-2">
          <CardHeader className="shrink-0">
            <CardTitle className="text-base">Catálogo de productos</CardTitle>
            <CardDescription>
              {catalogMeta
                ? `${catalogMeta.total} producto${catalogMeta.total === 1 ? '' : 's'}`
                : 'Filtrá y agregá productos a la venta'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden pt-0">
            <div className="flex shrink-0 flex-wrap gap-3">
              <Input
                placeholder="Buscar producto…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="max-w-xs bg-white"
              />
              <select
                className="border-input flex h-9 rounded-md border bg-white px-3 text-sm"
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value)
                  setPage(1)
                }}
              >
                <option value="">Todas las categorías</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
              <Input
                placeholder="Marca"
                value={brandFilter}
                list="ventas-brand-options"
                onChange={(e) => {
                  setBrandFilter(e.target.value)
                  setPage(1)
                }}
                className="w-32 bg-white"
              />
              <datalist id="ventas-brand-options">
                {brandOptions.map((brand) => (
                  <option key={brand} value={brand} />
                ))}
              </datalist>
              <Input
                placeholder="Modelo"
                value={modelFilter}
                list="ventas-model-options"
                onChange={(e) => {
                  setModelFilter(e.target.value)
                  setPage(1)
                }}
                className="w-32 bg-white"
              />
              <datalist id="ventas-model-options">
                {modelOptions.map((model) => (
                  <option key={model} value={model} />
                ))}
              </datalist>
              <Input
                placeholder="Talla"
                value={sizeFilter}
                list="ventas-size-options"
                onChange={(e) => {
                  setSizeFilter(e.target.value)
                  setPage(1)
                }}
                className="w-24 bg-white"
              />
              <datalist id="ventas-size-options">
                {sizeOptions.map((size) => (
                  <option key={size} value={size} />
                ))}
              </datalist>
            </div>

            <div className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto pr-1">
              {loadingCatalog ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="text-muted-foreground size-6 animate-spin" />
                </div>
              ) : catalogError ? (
                <p className="text-destructive py-8 text-center text-sm whitespace-pre-line">
                  {getApiErrorMessage(catalogQueryError)}
                </p>
              ) : products.length === 0 ? (
                <p className="text-muted-foreground py-8 text-center text-sm">
                  No hay productos en el catálogo.
                </p>
              ) : (
                <div className="grid grid-cols-4 gap-3 pb-1">
                  {products.map((product) => (
                    <CatalogProductCard
                      key={product.id}
                      product={product}
                      showActions
                      onEdit={openEditProduct}
                      onAddToCart={addToCart}
                    />
                  ))}
                </div>
              )}
            </div>

            {catalogMeta && catalogMeta.lastPage > 1 ? (
              <div className="flex shrink-0 items-center justify-between gap-4 border-t pt-3">
                <p className="text-muted-foreground text-sm">
                  Página {catalogMeta.currentPage} de {catalogMeta.lastPage}
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={catalogMeta.currentPage <= 1 || loadingCatalog}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                  >
                    Anterior
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={catalogMeta.currentPage >= catalogMeta.lastPage || loadingCatalog}
                    onClick={() => setPage((current) => current + 1)}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <CustomerFormDialog
        open={customerDialogOpen}
        onOpenChange={setCustomerDialogOpen}
        onCreated={linkRegisteredCustomer}
      />
      <VentasCustomerPickDialog
        open={customerPickOpen}
        onOpenChange={setCustomerPickOpen}
        onSelected={linkRegisteredCustomer}
      />
      <VentasLoadDraftDialog
        open={loadDraftOpen}
        onOpenChange={setLoadDraftOpen}
        onLoaded={handleLoadedDraft}
      />
      {editProduct ? (
        <CatalogFormDialog
          open={editProductOpen}
          onOpenChange={(open) => {
            setEditProductOpen(open)
            if (!open) {
              setEditProduct(null)
            }
          }}
          product={editProduct}
        />
      ) : null}

      <Dialog
        open={sizePickerProduct != null}
        onOpenChange={(open) => {
          if (!open) setSizePickerProduct(null)
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Elegir talla</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">{sizePickerProduct?.name}</p>
          <div className="grid grid-cols-3 gap-2">
            {(sizePickerProduct?.sizes ?? [])
              .filter((size) => Number(size.stock_quantity) > 0)
              .map((size) => (
                <Button
                  key={size.id}
                  type="button"
                  variant="outline"
                  className="h-auto flex-col gap-0.5 py-2"
                  onClick={() => {
                    if (sizePickerProduct) {
                      pushCartLine(sizePickerProduct, size)
                    }
                    setSizePickerProduct(null)
                  }}
                >
                  <span className="font-semibold">{size.size}</span>
                  <span className="text-muted-foreground text-[10px]">
                    Stock {Number(size.stock_quantity)}
                  </span>
                </Button>
              ))}
          </div>
          {(sizePickerProduct?.sizes ?? []).every((size) => Number(size.stock_quantity) <= 0) ? (
            <p className="text-destructive text-sm">No hay tallas con stock.</p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSizePickerProduct(null)}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={orderNotesOpen} onOpenChange={setOrderNotesOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nota de factura</DialogTitle>
          </DialogHeader>
          <Textarea
            rows={4}
            value={orderNotes}
            onChange={(e) => setOrderNotes(e.target.value)}
            placeholder="Observaciones para la factura…"
          />
          <DialogFooter>
            <Button type="button" onClick={() => setOrderNotesOpen(false)}>
              Listo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
