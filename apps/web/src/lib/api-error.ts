import axios from 'axios'
import type { ApiErrorBody } from '@/types/auth'

export function getApiError(error: unknown): ApiErrorBody {
  if (axios.isAxiosError(error) && error.response?.data?.error) {
    return error.response.data.error as ApiErrorBody
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: 'Ocurrió un error inesperado. Intentá de nuevo.',
  }
}
