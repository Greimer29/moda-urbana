import { Package } from 'lucide-react'
import { useAuthenticatedAsset } from '@/hooks/use-authenticated-asset'
import { cn } from '@/lib/utils'

type AuthenticatedImageProps = {
  assetPath: string
  alt: string
  className?: string
  fallbackClassName?: string
  showFallbackIcon?: boolean
}

export function AuthenticatedImage({
  assetPath,
  alt,
  className,
  fallbackClassName,
  showFallbackIcon = false,
}: AuthenticatedImageProps) {
  const { objectUrl, isLoading, error } = useAuthenticatedAsset(assetPath)

  if (isLoading) {
    return <div className={cn('bg-muted animate-pulse', className)} aria-hidden />
  }

  if (error || !objectUrl) {
    if (!showFallbackIcon) {
      return null
    }

    return (
      <div className={cn('flex items-center justify-center', fallbackClassName ?? className)}>
        <Package className="text-muted-foreground/60 size-7" />
      </div>
    )
  }

  return <img src={objectUrl} alt={alt} className={className} />
}
