import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

export function useAuthenticatedAsset(assetPath: string | null | undefined) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!assetPath) {
      setObjectUrl(null)
      setError(false)
      setIsLoading(false)
      return
    }

    let cancelled = false
    let blobUrl: string | null = null

    setIsLoading(true)
    setError(false)

    void api
      .get(assetPath, {
        responseType: 'blob',
        validateStatus: (status) => status === 200 || status === 404,
      })
      .then((response) => {
        if (cancelled) {
          return
        }

        if (response.status === 404) {
          setObjectUrl(null)
          setError(true)
          return
        }

        blobUrl = URL.createObjectURL(response.data)
        setObjectUrl(blobUrl)
      })
      .catch(() => {
        if (!cancelled) {
          setObjectUrl(null)
          setError(true)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl)
      }
      setObjectUrl(null)
    }
  }, [assetPath])

  return { objectUrl, isLoading, error }
}
