export type NotifyType = 'positive' | 'negative' | 'warning' | 'info'

export type AppNotification = {
  id: number
  type: NotifyType
  message: string
  timeout: number
}

type Listener = (items: AppNotification[]) => void

let nextId = 1
let items: AppNotification[] = []
const listeners = new Set<Listener>()

function emit() {
  for (const listener of listeners) {
    listener(items)
  }
}

export function subscribeNotifications(listener: Listener) {
  listeners.add(listener)
  listener(items)
  return () => {
    listeners.delete(listener)
  }
}

export function dismissNotification(id: number) {
  items = items.filter((item) => item.id !== id)
  emit()
}

function push(type: NotifyType, message: string, timeout: number) {
  const trimmed = message.trim()
  if (!trimmed) {
    return
  }

  const id = nextId++
  items = [...items, { id, type, message: trimmed, timeout }]
  emit()

  if (timeout > 0) {
    window.setTimeout(() => dismissNotification(id), timeout)
  }
}

export const notify = Object.assign((message: string) => push('info', message, 4500), {
  success: (message: string) => push('positive', message, 4500),
  error: (message: string) => push('negative', message, 6500),
  warning: (message: string) => push('warning', message, 5500),
  info: (message: string) => push('info', message, 4500),
})
