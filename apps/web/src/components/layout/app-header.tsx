import { Loader2, LogOut, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { MobileNavDrawer } from '@/components/layout/mobile-nav-drawer'
import { SidebarNavContent } from '@/components/layout/app-sidebar'
import { DisplayCurrencyToggle } from '@/features/currencies/components/display-currency-toggle'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { useAppRefresh } from '@/lib/use-app-refresh'

export function AppHeader() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const { refresh, isRefreshing } = useAppRefresh()

  const handleLogout = async () => {
    setIsLoggingOut(true)

    try {
      await logout()
      navigate('/login', { replace: true })
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <header className="safe-area-top flex h-14 shrink-0 items-center justify-between border-b px-3 md:px-6">
      <div className="flex min-w-0 items-center gap-2 md:gap-3">
        <MobileNavDrawer>
          {(close) => <SidebarNavContent onNavigate={close} />}
        </MobileNavDrawer>
        <DisplayCurrencyToggle className="shrink-0" />
      </div>
      <div className="flex shrink-0 items-center gap-2 md:gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="size-10 shrink-0 md:size-8"
          title="Reconectar"
          aria-label="Reconectar"
          disabled={isRefreshing}
          onClick={() => void refresh()}
        >
          {isRefreshing ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
        </Button>
        {user ? (
          <p className="hidden text-sm sm:block">
            <span className="text-muted-foreground">Hola, </span>
            <span className="font-medium">{user.name}</span>
          </p>
        ) : null}
        <Button
          variant="outline"
          size="sm"
          className="h-10 min-h-10 md:h-8"
          onClick={handleLogout}
          disabled={isLoggingOut}
        >
          <LogOut className="size-4" />
          Salir
        </Button>
      </div>
    </header>
  )
}
