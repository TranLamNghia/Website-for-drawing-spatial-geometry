import { signOut as nextAuthSignOut } from 'next-auth/react'

const AUTH_COOKIE_PREFIXES = ['authjs.', '__Secure-authjs.', '__Host-authjs.']

function isAuthCookie(name: string) {
  return AUTH_COOKIE_PREFIXES.some(prefix => name.startsWith(prefix))
}

/** Clear Auth.js cookies readable from document (non-httpOnly). */
export function clearAuthCookies() {
  if (typeof document === 'undefined') return

  for (const cookie of document.cookie.split(';')) {
    const name = cookie.split('=')[0]?.trim()
    if (!name || !isAuthCookie(name)) continue

    document.cookie = `${name}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`
    document.cookie = `${name}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; secure`
  }
}

/** Sign out and remove all Auth.js cookies (session, csrf, callback-url). */
export async function signOutCompletely(callbackUrl = '/trangchu') {
  await nextAuthSignOut({ redirect: false })

  try {
    await fetch('/api/auth/clear-cookies', { method: 'POST', credentials: 'include' })
  } catch {
    // Best-effort cleanup; still clear client-readable cookies below.
  }

  clearAuthCookies()
  window.location.href = callbackUrl
}
