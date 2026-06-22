import axios from 'axios'
import type {
  ApiErrorBody,
  StockInsuficienteDetail,
  StockInsuficienteDevolucionDetail,
  VineValidationDetail,
} from '@/types/auth'

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
    const status = error.response?.status
    if (status && status >= 500) {
      return {
        code: 'SERVER_ERROR',
        message: 'El servidor respondió con un error al procesar la solicitud. Intentá de nuevo en unos segundos.',
      }
    }

    return {
      code: 'NETWORK_ERROR',
      message: 'No se pudo conectar con el servidor. Verificá tu conexión e intentá de nuevo.',
    }
  }

  if (axios.isAxiosError(error) && error.response?.status && error.response.status >= 500) {
    const payload = error.response.data as { error?: { message?: string } } | undefined
    return {
      code: 'SERVER_ERROR',
      message:
        payload?.error?.message ??
        'El servidor respondió con un error inesperado. Intentá de nuevo en unos segundos.',
    }
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: 'Ocurrió un error inesperado. Intentá de nuevo.',
  }
}

function isVineValidationDetail(value: unknown): value is VineValidationDetail {
  return (
    typeof value === 'object' &&
    value !== null &&
    'message' in value &&
    typeof (value as VineValidationDetail).message === 'string'
  )
}

function isStockInsuficienteDetail(value: unknown): value is StockInsuficienteDetail {
  return (
    typeof value === 'object' &&
    value !== null &&
    'material_id' in value &&
    'name' in value &&
    'faltante' in value
  )
}

function isStockInsuficienteDevolucionDetail(
  value: unknown
): value is StockInsuficienteDevolucionDetail {
  return (
    typeof value === 'object' &&
    value !== null &&
    'material_id' in value &&
    'material_name' in value &&
    'required' in value &&
    'available' in value
  )
}

function formatRecordDetails(details: Record<string, unknown>): string[] {
  const messages: string[] = []

  for (const [field, value] of Object.entries(details)) {
    if (typeof value === 'string') {
      messages.push(`${field}: ${value}`)
      continue
    }

    if (Array.isArray(value)) {
      const text = value.filter((item): item is string => typeof item === 'string').join(', ')
      if (text) {
        messages.push(`${field}: ${text}`)
      }
    }
  }

  return messages
}

/** Convierte `error.details` de la API en mensajes legibles para el usuario. */
export function formatApiErrorDetails(details: unknown): string[] {
  if (!details) {
    return []
  }

  if (Array.isArray(details)) {
    if (details.length === 0) {
      return []
    }

    if (details.every(isVineValidationDetail)) {
      return details.map((item) => item.message).filter(Boolean)
    }

    if (details.every(isStockInsuficienteDetail)) {
      return details.map(
        (item) =>
          `${item.name}: faltan ${item.faltante} unidades (stock ${item.stock_actual}, consumo ${item.consumo_proyectado})`
      )
    }

    if (details.every(isStockInsuficienteDevolucionDetail)) {
      return details.map(
        (item) =>
          `${item.material_name}: se requieren ${item.required} y hay ${item.available} disponibles`
      )
    }

    return []
  }

  if (typeof details === 'object') {
    return formatRecordDetails(details as Record<string, unknown>)
  }

  return []
}

/** Mensaje listo para mostrar en UI: prioriza `details` sobre el mensaje genérico. */
export function getApiErrorMessage(error: unknown): string {
  const apiError = getApiError(error)
  const lines = formatApiErrorDetails(apiError.details)

  if (lines.length > 0) {
    return lines.join('\n')
  }

  return apiError.message
}

/** @deprecated Usar `formatApiErrorDetails` o `getApiErrorMessage`. */
export function formatValidationDetails(details: unknown): string | null {
  const lines = formatApiErrorDetails(details)
  return lines.length > 0 ? lines.join(' · ') : null
}
