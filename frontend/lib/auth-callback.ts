const STORAGE_KEY = 'authCallbackUrl'
const COOKIE_KEY = 'auth_callback_url'
export const DEFAULT_AUTH_CALLBACK = '/trangchu'

export function normalizeAuthCallbackUrl(url: string | null | undefined): string {
  if (!url) return DEFAULT_AUTH_CALLBACK
  const trimmed = url.trim()
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return DEFAULT_AUTH_CALLBACK
  return trimmed
}

export function setAuthCallbackUrl(url: string) {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(STORAGE_KEY, normalizeAuthCallbackUrl(url))
}

export function getAuthCallbackUrl(): string {
  if (typeof window === 'undefined') return DEFAULT_AUTH_CALLBACK
  return normalizeAuthCallbackUrl(sessionStorage.getItem(STORAGE_KEY))
}

function consumeAuthCallbackCookie(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_KEY}=([^;]*)`))
  if (!match?.[1]) return null

  document.cookie = `${COOKIE_KEY}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`
  return normalizeAuthCallbackUrl(decodeURIComponent(match[1]))
}

export function cleanAuthSearchParams(keys: string[] = ['callbackUrl', 'error']) {
  if (typeof window === 'undefined') return

  const url = new URL(window.location.href)
  let changed = false
  for (const key of keys) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key)
      changed = true
    }
  }
  if (!changed) return

  const next = `${url.pathname}${url.search}${url.hash}`
  window.history.replaceState({}, '', next)
}

/** Resolve post-auth redirect from sessionStorage, query string, or middleware cookie. */
export function resolveAuthCallbackUrl(): string {
  if (typeof window === 'undefined') return DEFAULT_AUTH_CALLBACK

  const fromQuery = new URLSearchParams(window.location.search).get('callbackUrl')
  if (fromQuery) setAuthCallbackUrl(fromQuery)

  const fromCookie = consumeAuthCallbackCookie()
  if (fromCookie) setAuthCallbackUrl(fromCookie)

  cleanAuthSearchParams(['callbackUrl'])
  return getAuthCallbackUrl()
}

export function storeAuthCallbackUrl(callbackUrl: string = DEFAULT_AUTH_CALLBACK) {
  setAuthCallbackUrl(callbackUrl)
}

export function goToLogin(callbackUrl: string = DEFAULT_AUTH_CALLBACK) {
  storeAuthCallbackUrl(callbackUrl)
  window.location.assign('/dangnhap')
}
