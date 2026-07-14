import { loadRootEnv } from '@/lib/load-root-env.mjs'
import type { BackendAuthResult } from '@/lib/backend-auth'
import { getBackendApiBaseUrl } from '@/lib/backend-auth'

/** Server-only Google identity exchange for backend JWT. */
export async function backendGoogleExchange(payload: {
  googleId: string
  email: string
  fullName?: string | null
  avatar?: string | null
}): Promise<BackendAuthResult | null> {
  loadRootEnv()
  const baseUrl = getBackendApiBaseUrl()
  if (!baseUrl) {
    console.warn('[auth] NEXT_PUBLIC_API_URL is not set; skip google exchange.')
    return null
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const apiKey = process.env.INTERNAL_API_KEY
  if (apiKey) headers['x-api-key'] = apiKey

  try {
    const response = await fetch(`${baseUrl}/api/Auth/google-exchange`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })
    if (!response.ok) {
      console.error(`[auth] Google exchange failed (${response.status}): ${await response.text().catch(() => '')}`)
      return null
    }
    const data = (await response.json()) as BackendAuthResult
    if (!data.accessToken) return null
    return data
  } catch (error) {
    console.error('[auth] Google exchange error:', error)
    return null
  }
}
