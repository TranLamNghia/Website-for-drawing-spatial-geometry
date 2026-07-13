import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const AUTH_COOKIE_PREFIXES = ['authjs.', '__Secure-authjs.', '__Host-authjs.']

function isAuthCookie(name: string) {
  return AUTH_COOKIE_PREFIXES.some(prefix => name.startsWith(prefix))
}

export async function POST() {
  const cookieStore = await cookies()

  for (const cookie of cookieStore.getAll()) {
    if (isAuthCookie(cookie.name)) {
      cookieStore.delete(cookie.name)
    }
  }

  return NextResponse.json({ ok: true })
}
