import { useEffect, useState } from 'react'
import { ArrowLeft, Folder, Layers, Loader2, Plus, Trash2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useActiveCategoriesQuery } from '@/features/categories/hooks/use-categories'
import { AssignProductToFolderDialog } from '@/features/folders/components/assign-product-to-folder-dialog'
import { ProductFoldersBrowser } from '@/features/folders/components/product-folders-browser'
import { useRemoveProductFromFolderMutation } from '@/features/folders/hooks/use-product-folders'
import type { ProductFolder } from '@/features/folders/types'
import { CatalogFormDialog } from '@/features/ventas/components/catalog-form-dialog'
import { CatalogProductCard } from '@/features/ventas/components/catalog-product-card'
import { PermissionGate } from '@/features/permissions/components/permission-gate'
import { useAuth } from '@/features/auth/hooks/use-auth'
import {
  useCatalogProductsQuery,
  useDeleteCatalogProductMutation,
} from '@/features/ventas/hooks/use-catalog'
import type { CatalogProduct } from '@/features/ventas/types'
import {
  CATALOG_SORT_OPTIONS,
  catalogSortValue,
  parseCatalogSortValue,
} from '@/features/ventas/utils/catalog-sort'
import { getApiErrorMessage } from '@/lib/api-error'
import { notify } from '@/lib/notify'
import { cn } from '@/lib/utils'

const PER_PAGE = 30
const DEFAULT_SORT = { sortBy: 'name' as const, sortDir: 'asc' as const }

type ProductosView = 'catalog' | 'folders' | 'folder'

export function ProductosPage() {
  const navigate = useNavigate()
  const { can } = useAuth()
  const canEditCatalog = can('catalog.edit')
  const [view, setView] = useState<ProductosView>('catalog')
  const [activeFolder, setActiveFolder] = useState<ProductFolder | null>(null)
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [brandInput, setBrandInput] = useState('')
  const [modelInput, setModelInput] = useState('')
  const [referenceInput, setReferenceInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [debouncedBrand, setDebouncedBrand] = useState('')
  const [debouncedModel, setDebouncedModel] = useState('')
  const [debouncedReference, setDebouncedReference] = useState('')
  const [category, setCategory] = useState('')
  const [sortValue, setSortValue] = useState(
    catalogSortValue(DEFAULT_SORT.sortBy, DEFAULT_SORT.sortDir)
  )
  const [dialogOpen, setDialogOpen] = useState(false)
  const [assignProduct, setAssignProduct] = useState<CatalogProduct | null>(null)

  const deleteMutation = useDeleteCatalogProductMutation()
  const removeFromFolderMutation = useRemoveProductFromFolderMutation()
  const { data: categories = [] } = useActiveCategoriesQuery()
  const { sortBy, sortDir } = parseCatalogSortValue(sortValue, DEFAULT_SORT)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim())
      setDebouncedBrand(brandInput.trim())
      setDebouncedModel(modelInput.trim())
      setDebouncedReference(referenceInput.trim())
      setPage(1)
    }, 300)
    return () => window.clearTimeout(timer)
  }, [searchInput, brandInput, modelInput, referenceInput])

  const catalogQueryEnabled = view === 'catalog' || view === 'folder'

  const { data, isLoading, isError, error } = useCatalogProductsQuery({
    page,
    perPage: PER_PAGE,
    search: view === 'catalog' ? debouncedSearch || undefined : undefined,
    brand: view === 'catalog' ? debouncedBrand || undefined : undefined,
    productModel: view === 'catalog' ? debouncedModel || undefined : undefined,
    reference: view === 'catalog' ? debouncedReference || undefined : undefined,
    category: view === 'catalog' ? category || undefined : undefined,
    folderId: view === 'folder' ? activeFolder?.id : undefined,
    active: true,
    sortBy,
    sortDir,
  })

  // Keep query keyed; disable when browsing folder list only by not using data
  void catalogQueryEnabled

  const products = data?.catalog_products ?? []
  const meta = data?.meta

  function openCreateDialog() {
    setDialogOpen(true)
  }

  function openEditProduct(product: CatalogProduct) {
    void navigate(`/productos/${product.id}?edit=1`)
  }

  async function handleDeleteProduct(product: CatalogProduct) {
    try {
      const result = await deleteMutation.mutateAsync(product.id)
      if (result.modo === 'soft') {
        notify.warning(`"${product.name}" fue desactivado porque tiene ventas asociadas.`)
      } else {
        notify.success(`"${product.name}" fue eliminado.`)
      }
    } catch (deleteError) {
      notify.error(getApiErrorMessage(deleteError))
    }
  }

  async function handleRemoveFromFolder(product: CatalogProduct) {
    if (!activeFolder) return
    try {
      await removeFromFolderMutation.mutateAsync({
        folderId: activeFolder.id,
        catalogProductId: product.id,
      })
      notify.success(`Quitado de "${activeFolder.name}".`)
    } catch (err) {
      notify.error(getApiErrorMessage(err))
    }
  }

  function goCatalog() {
    setView('catalog')
    setActiveFolder(null)
    setPage(1)
  }

  function goFolders() {
    setView('folders')
    setActiveFolder(null)
    setPage(1)
  }

  function openFolder(folder: ProductFolder) {
    setActiveFolder(folder)
    setView('folder')
    setPage(1)
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Productos</h1>
        <p className="text-muted-foreground text-sm">
          Catálogo de productos terminados para venta y producción.
        </p>
      </div>

      <Card>
        <CardHeader className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <CardTitle className="text-base">
              {view === 'folders'
                ? 'Carpetas'
                : view === 'folder'
                  ? activeFolder?.name ?? 'Carpeta'
                  : 'Catálogo'}
            </CardTitle>
            <CardDescription>
              {view === 'folders'
                ? 'Agrupá productos para encontrarlos más rápido'
                : meta
                  ? `${meta.total} producto${meta.total === 1 ? '' : 's'}`
                  : 'Cargando…'}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center justify-start gap-2 sm:justify-end">
            <div className="bg-muted inline-flex rounded-lg p-1">
              <button
                type="button"
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  view === 'catalog' ? 'bg-background shadow-sm' : 'text-muted-foreground'
                )}
                onClick={goCatalog}
              >
                Catálogo
              </button>
              <button
                type="button"
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  view === 'folders' || view === 'folder'
                    ? 'bg-background shadow-sm'
                    : 'text-muted-foreground'
                )}
                onClick={goFolders}
              >
                <span className="inline-flex items-center gap-1.5">
                  <Folder className="size-3.5" />
                  Carpetas
                </span>
              </button>
            </div>
            <Button variant="outline" asChild>
              <Link to="/productos/materiales">
                <Layers className="size-4" />
                Ver materiales
              </Link>
            </Button>
            {view === 'catalog' ? (
              <PermissionGate permission="catalog.edit">
                <Button onClick={openCreateDialog}>
                  <Plus />
                  Nuevo producto
                </Button>
              </PermissionGate>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {view === 'folders' ? (
            <ProductFoldersBrowser canEdit={canEditCatalog} onOpenFolder={openFolder} />
          ) : (
            <>
              {view === 'folder' && activeFolder ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={goFolders}>
                    <ArrowLeft className="size-4" />
                    Todas las carpetas
                  </Button>
                  <p className="text-muted-foreground text-sm">
                    Productos en esta carpeta. El catálogo completo sigue en la pestaña Catálogo.
                  </p>
                </div>
              ) : null}

              {view === 'catalog' ? (
                <div className="flex flex-wrap gap-3">
                  <Input
                    placeholder="Buscar producto…"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="max-w-xs"
                  />
                  <Input
                    placeholder="Marca"
                    value={brandInput}
                    onChange={(e) => setBrandInput(e.target.value)}
                    className="max-w-[10rem]"
                  />
                  <Input
                    placeholder="Modelo"
                    value={modelInput}
                    onChange={(e) => setModelInput(e.target.value)}
                    className="max-w-[10rem]"
                  />
                  <Input
                    placeholder="Referencia"
                    value={referenceInput}
                    onChange={(e) => setReferenceInput(e.target.value)}
                    className="max-w-[10rem]"
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
                  <select
                    className="border-input flex h-9 rounded-md border bg-white px-3 text-sm"
                    value={sortValue}
                    onChange={(e) => {
                      setSortValue(e.target.value)
                      setPage(1)
                    }}
                    aria-label="Ordenar productos"
                  >
                    {CATALOG_SORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              {isLoading ? (
                <div className="text-muted-foreground flex items-center justify-center gap-2 py-12 text-sm">
                  <Loader2 className="size-4 animate-spin" />
                  Cargando productos…
                </div>
              ) : isError ? (
                <p className="text-destructive py-8 text-center text-sm whitespace-pre-line">
                  {getApiErrorMessage(error)}
                </p>
              ) : products.length === 0 ? (
                <p className="text-muted-foreground py-8 text-center text-sm">
                  {view === 'folder'
                    ? 'Esta carpeta no tiene productos. Desde Catálogo usá el ícono de carpeta en la tarjeta.'
                    : 'No hay productos registrados.'}
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {products.map((product) => (
                    <div key={product.id} className="relative">
                      <CatalogProductCard
                        product={product}
                        showActions={canEditCatalog}
                        onEdit={openEditProduct}
                        onDelete={view === 'catalog' ? handleDeleteProduct : undefined}
                        onAddToFolder={
                          view === 'catalog' ? (p) => setAssignProduct(p) : undefined
                        }
                        onOpen={() => void navigate(`/productos/${product.id}`)}
                      />
                      {view === 'folder' && canEditCatalog ? (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="absolute right-2 bottom-2 z-10"
                          onClick={() => void handleRemoveFromFolder(product)}
                        >
                          <Trash2 className="size-3" />
                          Quitar
                        </Button>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}

              {meta && meta.lastPage > 1 ? (
                <div className="flex items-center justify-between gap-4 pt-2">
                  <p className="text-muted-foreground text-sm">
                    Página {meta.currentPage} de {meta.lastPage}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={meta.currentPage <= 1}
                      onClick={() => setPage((c) => Math.max(1, c - 1))}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={meta.currentPage >= meta.lastPage}
                      onClick={() => setPage((c) => c + 1)}
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      <CatalogFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      <AssignProductToFolderDialog
        open={assignProduct != null}
        product={assignProduct}
        onOpenChange={(open) => {
          if (!open) setAssignProduct(null)
        }}
      />
    </div>
  )
}
