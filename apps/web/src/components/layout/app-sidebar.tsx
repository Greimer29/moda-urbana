import { useEffect, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  Banknote,
  ChevronDown,
  FlaskConical,
  LayoutDashboard,
  Package,
  ShoppingCart,
  Truck,
  Users,
  Wrench,
} from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'

type NavLinkItem = {
  to: string
  label: string
  icon: LucideIcon
  match?: (pathname: string) => boolean
}

type NavEntry =
  | { type: 'link'; item: NavLinkItem }
  | { type: 'group'; id: string; label: string; icon: LucideIcon; items: NavLinkItem[] }

const navEntries: NavEntry[] = [
  {
    type: 'link',
    item: { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  },
  {
    type: 'link',
    item: { to: '/customers', label: 'Clientes', icon: Users },
  },
  {
    type: 'link',
    item: {
      to: '/ventas',
      label: 'Ventas',
      icon: Banknote,
      match: (pathname) => pathname.startsWith('/ventas'),
    },
  },
  {
    type: 'link',
    item: { to: '/suppliers', label: 'Proveedores', icon: Truck },
  },
  {
    type: 'group',
    id: 'productos',
    label: 'Productos',
    icon: Package,
    items: [
      {
        to: '/productos',
        label: 'Productos',
        icon: Package,
        match: (pathname) =>
          pathname === '/productos' ||
          (pathname.startsWith('/productos') && !pathname.startsWith('/productos/materiales')),
      },
      {
        to: '/productos/materiales',
        label: 'Materiales',
        icon: FlaskConical,
        match: (pathname) => pathname.startsWith('/productos/materiales'),
      },
      {
        to: '/machines',
        label: 'Maquinaria',
        icon: Wrench,
        match: (pathname) => pathname.startsWith('/machines'),
      },
    ],
  },
  {
    type: 'link',
    item: { to: '/purchases', label: 'Compras', icon: ShoppingCart },
  },
  {
    type: 'link',
    item: {
      to: '/reportes',
      label: 'Reportes',
      icon: BarChart3,
      match: (pathname) => pathname.startsWith('/reportes'),
    },
  },
]

function linkClassName(isActive: boolean) {
  return cn(
    'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
  )
}

function SidebarLinkWithMatch({ item, nested = false }: { item: NavLinkItem; nested?: boolean }) {
  const { pathname } = useLocation()
  const isActive = item.match ? item.match(pathname) : pathname === item.to

  return (
    <NavLink to={item.to} className={cn(linkClassName(isActive), nested && 'pl-9')}>
      <item.icon className="size-4 shrink-0" />
      {item.label}
    </NavLink>
  )
}

function SidebarNavGroup({
  entry,
}: {
  entry: Extract<NavEntry, { type: 'group' }>
}) {
  const { pathname } = useLocation()
  const isSectionActive = entry.items.some((item) =>
    item.match ? item.match(pathname) : pathname === item.to
  )
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (isSectionActive) {
      setExpanded(true)
    }
  }, [isSectionActive])

  return (
    <div className="space-y-0.5">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        className={cn(
          'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition-colors',
          isSectionActive
            ? 'text-sidebar-accent-foreground'
            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
        )}
      >
        <entry.icon className="size-4 shrink-0" />
        <span className="flex-1 text-left">{entry.label}</span>
        <ChevronDown
          className={cn(
            'size-4 shrink-0 opacity-60 transition-transform duration-200',
            expanded ? 'rotate-0' : '-rotate-90'
          )}
        />
      </button>
      {expanded ? (
        <div className="space-y-0.5">
          {entry.items.map((item) => (
            <SidebarLinkWithMatch key={item.to} item={item} nested />
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function AppSidebar() {
  return (
    <aside className="bg-sidebar text-sidebar-foreground hidden h-svh w-56 shrink-0 flex-col overflow-hidden border-r md:flex">
      <div className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
        <img
          src="/moda-urbana-logo.png"
          alt=""
          aria-hidden
          className="size-8 shrink-0 rounded-full object-cover"
        />
        <span className="text-lg font-semibold tracking-tight">Moda Urbana</span>
      </div>
      <nav className="scrollbar-subtle flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-3">
        {navEntries.map((entry) => {
          if (entry.type === 'link') {
            return <SidebarLinkWithMatch key={entry.item.to} item={entry.item} />
          }

          return <SidebarNavGroup key={entry.id} entry={entry} />
        })}
      </nav>
    </aside>
  )
}
