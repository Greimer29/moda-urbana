import { useEffect, useState } from 'react'
import { AlertTriangle, Check, Info, X } from 'lucide-react'
import {
  dismissNotification,
  subscribeNotifications,
  type AppNotification,
  type NotifyType,
} from '@/lib/notify'
import { cn } from '@/lib/utils'

const TYPE_STYLES: Record<
  NotifyType,
  { bar: string; iconWrap: string; Icon: typeof Check }
> = {
  positive: {
    bar: 'bg-emerald-500',
    iconWrap: 'bg-emerald-500/15 text-emerald-700',
    Icon: Check,
  },
  negative: {
    bar: 'bg-red-600',
    iconWrap: 'bg-red-600/15 text-red-700',
    Icon: X,
  },
  warning: {
    bar: 'bg-amber-500',
    iconWrap: 'bg-amber-500/15 text-amber-800',
    Icon: AlertTriangle,
  },
  info: {
    bar: 'bg-sky-500',
    iconWrap: 'bg-sky-500/15 text-sky-700',
    Icon: Info,
  },
}

function NotificationCard({ item }: { item: AppNotification }) {
  const style = TYPE_STYLES[item.type]
  const Icon = style.Icon

  return (
    <div
      role="status"
      className="animate-notify-in pointer-events-auto flex w-[min(24rem,calc(100vw-1.5rem))] overflow-hidden rounded-md bg-white shadow-[0_8px_24px_rgba(0,0,0,0.18)] ring-1 ring-black/5"
    >
      <div className={cn('w-1.5 shrink-0', style.bar)} />
      <div className={cn('m-2.5 flex size-8 shrink-0 items-center justify-center rounded-md', style.iconWrap)}>
        <Icon className="size-4" />
      </div>
      <p className="min-w-0 flex-1 py-3 pr-1 text-sm leading-5 whitespace-pre-line text-neutral-800">
        {item.message}
      </p>
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground m-1.5 flex size-8 shrink-0 items-center justify-center rounded-md"
        aria-label="Cerrar notificación"
        onClick={() => dismissNotification(item.id)}
      >
        <X className="size-4" />
      </button>
    </div>
  )
}

export function AppNotifications() {
  const [items, setItems] = useState<AppNotification[]>([])

  useEffect(() => subscribeNotifications(setItems), [])

  if (items.length === 0) {
    return null
  }

  return (
    <div
      className="pointer-events-none fixed top-[max(0.75rem,env(safe-area-inset-top))] right-[max(0.75rem,env(safe-area-inset-right))] z-[80] flex flex-col items-end gap-2"
      aria-live="polite"
    >
      {items.map((item) => (
        <NotificationCard key={item.id} item={item} />
      ))}
    </div>
  )
}
