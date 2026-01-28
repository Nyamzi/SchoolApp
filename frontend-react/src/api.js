const DEFAULT_API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:3001'

export function getApiBase() {
  return localStorage.getItem('apiBase') || DEFAULT_API_BASE
}

export function setApiBase(value) {
  localStorage.setItem('apiBase', value)
}

export async function apiRequest(path, options = {}) {
  const url = `${getApiBase()}${path}`
  const res = await fetch(url, options)
  const contentType = res.headers.get('content-type') || ''
  const isJson = contentType.includes('application/json')
  const payload = isJson ? await res.json() : await res.text()

  if (!res.ok) {
    const message = isJson ? payload.detail || JSON.stringify(payload) : payload
    throw new Error(message || `Request failed with ${res.status}`)
  }

  return payload
}

export function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {}
}
