export function getBackendApiBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ||
    (process.env.NODE_ENV !== 'production' ? 'http://localhost:5000' : undefined)
  )
}

type AuthUserPayload = {
  id?: string
  email?: string
  fullName?: string | null
  avatar?: string | null
  googleId?: string | null
  emailVerified?: boolean
}

export type BackendAuthResult = {
  accessToken: string
  user: AuthUserPayload
}

export type BackendProfile = {
  id?: string
  email?: string
  fullName?: string | null
  avatar?: string | null
  googleId?: string | null
  emailVerified?: boolean
  hasPassword?: boolean
}

async function parseErrorMessage(response: Response) {
  try {
    const data = (await response.json()) as { message?: string }
    if (data?.message) return data.message
  } catch {
    // ignore
  }
  return `Request failed (${response.status})`
}

function authHeaders(accessToken: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  }
}

export async function backendGetProfile(accessToken: string): Promise<BackendProfile> {
  const baseUrl = getBackendApiBaseUrl()
  if (!baseUrl) throw new Error('NEXT_PUBLIC_API_URL is not set')

  const response = await fetch(`${baseUrl}/api/Auth/me`, {
    headers: authHeaders(accessToken),
  })
  if (!response.ok) throw new Error(await parseErrorMessage(response))
  return (await response.json()) as BackendProfile
}

export async function backendUpdateProfile(
  accessToken: string,
  fullName: string,
): Promise<BackendProfile> {
  const baseUrl = getBackendApiBaseUrl()
  if (!baseUrl) throw new Error('NEXT_PUBLIC_API_URL is not set')

  const response = await fetch(`${baseUrl}/api/Auth/profile`, {
    method: 'PUT',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ fullName }),
  })
  if (!response.ok) throw new Error(await parseErrorMessage(response))
  return (await response.json()) as BackendProfile
}

export async function backendChangePassword(
  accessToken: string,
  payload: { currentPassword?: string; newPassword: string },
): Promise<{ message: string; hasPassword: boolean }> {
  const baseUrl = getBackendApiBaseUrl()
  if (!baseUrl) throw new Error('NEXT_PUBLIC_API_URL is not set')

  const response = await fetch(`${baseUrl}/api/Auth/change-password`, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  })
  if (!response.ok) throw new Error(await parseErrorMessage(response))
  return (await response.json()) as { message: string; hasPassword: boolean }
}

export async function backendLogin(email: string, password: string): Promise<BackendAuthResult> {
  const baseUrl = getBackendApiBaseUrl()
  if (!baseUrl) throw new Error('NEXT_PUBLIC_API_URL is not set')

  const response = await fetch(`${baseUrl}/api/Auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  if (!response.ok) throw new Error(await parseErrorMessage(response))
  const data = (await response.json()) as BackendAuthResult
  if (!data.accessToken) throw new Error('Missing access token from backend')
  return data
}

export async function backendRegister(payload: {
  email: string
  password: string
  fullName?: string
}): Promise<{ email: string; message: string }> {
  const baseUrl = getBackendApiBaseUrl()
  if (!baseUrl) throw new Error('NEXT_PUBLIC_API_URL is not set')

  const response = await fetch(`${baseUrl}/api/Auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) throw new Error(await parseErrorMessage(response))
  return (await response.json()) as { email: string; message: string }
}

export async function backendVerifyOtp(email: string, otp: string): Promise<BackendAuthResult> {
  const baseUrl = getBackendApiBaseUrl()
  if (!baseUrl) throw new Error('NEXT_PUBLIC_API_URL is not set')

  const response = await fetch(`${baseUrl}/api/Auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp }),
  })

  if (!response.ok) throw new Error(await parseErrorMessage(response))
  const data = (await response.json()) as BackendAuthResult
  if (!data.accessToken) throw new Error('Missing access token from backend')
  return data
}
