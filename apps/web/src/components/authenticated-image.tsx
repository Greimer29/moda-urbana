import { useEffect, useState } from 'react'
import { Package } from 'lucide-react'
import { api, isApiCrossOrigin } from '@/lib/api'
import { cn } from '@/lib/utils'

type AuthenticatedImageProps = {
  src: string
  alt: string
  className?: string
  fallbackClassName?: string
  showFallbackIcon?: boolean
}

function toApiRelativePath(src: string): string {
  try {
    if (src.startsWith('/api/v1/')) {
      return src.slice('/api/v1'.length)
    }
    if (src.startsWith('/')) {
      return src
    }

    const url = new URL(src)
    const marker = '/api/v1'
    const idx = url.pathname.indexOf(marker)
    if (idx >= 0) {
      return `${url.pathname.slice(idx + marker.length)}${url.search}`
    }
    return `${url.pathname}${url.search}`
  } catch {
    return src
  }
}

/**
 * Carga imágenes de la API con cookies de sesión.
 * En Capacitor (cross-origin) usa blob URL; en proxy same-origin usa <img> directo.
 */
export function AuthenticatedImage({
  src,
  alt,
  className,
  fallbackClassName,
  showFallbackIcon = false,
}: AuthenticatedImageProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const useBlob = isApiCrossOrigin()

  useEffect(() => {
    let revoked = false
    let createdUrl: string | null = null

    setFailed(false)
    setObjectUrl(null)

    if (!src || !useBlob) {
      return () => undefined
    }

    void (async () => {
      try {
        const response = await api.get(toApiRelativePath(src), {
          responseType: 'blob',
          headers: { Accept: '*/*' },
        })
        if (revoked) return
        createdUrl = URL.createObjectURL(response.data as Blob)
        setObjectUrl(createdUrl)
      } catch {
        if (!revoked) setFailed(true)
      }
    })()

    return () => {
      revoked = true
      if (createdUrl) URL.revokeObjectURL(createdUrl)
    }
  }, [src, useBlob])

  if (!src || failed || (useBlob && !objectUrl)) {
    if (useBlob && src && !failed && !objectUrl) {
      return <div className={cn('bg-muted animate-pulse', className)} aria-hidden />
    }

    if (!showFallbackIcon) {
      return null
    }

    return (
      <div className={cn('flex items-center justify-center', fallbackClassName ?? className)}>
        <Package className="text-muted-foreground/60 size-7" />
      </div>
    )
  }

  return (
    <img
      src={useBlob ? objectUrl! : src}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  )
}

/** Alias histórico — preferí AuthenticatedImage para assets de API. */
export function PublicImage(props: AuthenticatedImageProps) {
  return <AuthenticatedImage {...props} />
}
