const configuredApiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined) || 'http://127.0.0.1:8000'
export const API_BASE_URL = /^https?:\/\//i.test(configuredApiBase) ? configuredApiBase : `https://${configuredApiBase}`

export function apiUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL.replace(/\/$/, '')}${normalizedPath}`
}

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers)
  const token = window.localStorage.getItem('truck-check-token')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(input, { ...init, headers })
  if (response.status === 401 && token) {
    window.localStorage.removeItem('truck-check-token')
    window.dispatchEvent(new Event('truck-check-auth-expired'))
  }
  return response
}
