import axios from 'axios'
import type { ApiErrorBody } from '@/types/auth'

export function getApiError(error: unknown): ApiErrorBody {
  if (axios.isAxiosError(error) && error.response?.data?.error) {
    return error.response.data.error as ApiErrorBody
  }

  if (axios.isAxiosError(error) && error.response) {
    const status = error.response.status
    const payload = error.response.data as { message?: string } | undefined

    if (status === 403) {
      return {
        code: 'FORBIDDEN',
        message: 'No tenés permiso para realizar esta acción.',
      }
    }

    if (status === 404) {
      return {
        code: 'NOT_FOUND',
        message: payload?.message?.includes('Cannot GET')
          ? 'No se pudo comunicar con el servidor. Recargá la página e intentá de nuevo.'
          : 'El recurso solicitado no existe.',
      }
    }

    if (status === 302 || status === 303) {
      return {
        code: 'CSRF_TOKEN_MISMATCH',
        message: 'La sesión expiró o el token de seguridad no es válido. Recargá la página e intentá de nuevo.',
      }
    }

    if (status === 401) {
      return {
        code: 'UNAUTHORIZED',
        message: 'Debe iniciar sesión para acceder a este recurso.',
      }
    }
  }

  if (axios.isAxiosError(error) && (error.code === 'ERR_NETWORK' || error.message === 'Network Error')) {
    return {
      code: 'NETWORK_ERROR',
      message: 'No se pudo conectar con el servidor. Verificá tu conexión e intentá de nuevo.',
    }
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: 'Ocurrió un error inesperado. Intentá de nuevo.',
  }
}
