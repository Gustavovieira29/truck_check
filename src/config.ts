export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) || 'http://127.0.0.1:8000'

export function apiUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL.replace(/\/$/, '')}${normalizedPath}`
}
