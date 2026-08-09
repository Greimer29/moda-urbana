import { Menu, X } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { brand } from '@/lib/brand-config'
import { cn } from '@/lib/utils'

type MobileNavDrawerProps = {
  children: ReactNode | ((close: () => void) => ReactNode)
}

export function MobileNavDrawer({ children }: MobileNavDrawerProps) {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const close = () => setOpen(false)
  const content = typeof children === 'function' ? children(close) : children

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-10 shrink-0 md:hidden"
        aria-label="Abrir menú"
        onClick={() => setOpen(true)}
      >
        <Menu className="size-5" />
      </Button>

      <div
        className={cn(
          'fixed inset-0 z-50 md:hidden',
          open ? 'pointer-events-auto' : 'pointer-events-none'
        )}
        aria-hidden={!open}
      >
        <button
          type="button"
          className={cn(
            'absolute inset-0 bg-black/40 transition-opacity',
            open ? 'opacity-100' : 'opacity-0'
          )}
          aria-label="Cerrar menú"
          onClick={close}
        />
        <aside
          className={cn(
            'bg-sidebar text-sidebar-foreground absolute inset-y-0 left-0 flex w-[min(18rem,85vw)] flex-col border-r shadow-xl transition-transform duration-200',
            open ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b px-3">
            <div className="flex min-w-0 items-center gap-2">
              <img
                src={brand.logoUrl}
                alt=""
                aria-hidden
                className="size-8 shrink-0 rounded-full object-cover"
              />
              <span className="truncate text-base font-semibold tracking-tight">
                {brand.legalName}
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-10 shrink-0"
              aria-label="Cerrar menú"
              onClick={close}
            >
              <X className="size-5" />
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">{content}</div>
        </aside>
      </div>
    </>
  )
}
