import axios from 'axios'

let apiBaseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3334'

export const api = axios.create({
  withCredentials: true,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
})

function getCsrfTokenFromCookie(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

api.interceptors.request.use((config) => {
  config.baseURL = `${apiBaseUrl.replace(/\/$/, '')}/api/v1`

  const method = config.method?.toUpperCase()
  if (method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const token = getCsrfTokenFromCookie()
    if (token) {
      config.headers.set('X-XSRF-TOKEN', token)
    }
  }

  return config
})

export function configureApiBaseUrl(url: string) {
  apiBaseUrl = url.replace(/\/$/, '')
}

export async function loadRuntimeApiConfig(): Promise<void> {
  try {
    const response = await fetch('/runtime-config.json', { credentials: 'same-origin' })
    if (!response.ok) {
      return
    }

    const config = (await response.json()) as { apiUrl?: string }
    if (config.apiUrl) {
      configureApiBaseUrl(config.apiUrl)
    }
  } catch {
    // Web local o build sin runtime-config: se usa VITE_API_URL.
  }
}

export function getApiBaseUrl() {
  return apiBaseUrl
}
