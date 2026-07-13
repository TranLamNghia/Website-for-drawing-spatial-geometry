import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { loadRootEnv } from '@/lib/load-root-env.mjs'

// Ensure repo-root `.env` is available when Next is started from `/frontend`.
loadRootEnv()

async function syncUserToBackend(payload: {
  googleId: string
  email: string
  fullName?: string | null
  avatar?: string | null
}) {
  loadRootEnv()

  const baseUrl =
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ||
    (process.env.NODE_ENV !== 'production' ? 'http://localhost:5000' : undefined)
  if (!baseUrl) {
    console.warn('[auth] NEXT_PUBLIC_API_URL is not set; skip user sync.')
    return
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  const apiKey = process.env.INTERNAL_API_KEY
  if (apiKey) headers['x-api-key'] = apiKey

  try {
    const response = await fetch(`${baseUrl}/api/Auth/sync-user`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })
    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      console.error(`[auth] User sync failed (${response.status}): ${detail}`)
      return
    }
  } catch (error) {
    console.error('[auth] User sync error:', error)
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: '/dang-nhap',
  },
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== 'google' || !profile) return true

      const googleId = typeof profile.sub === 'string' ? profile.sub : ''
      const email = typeof profile.email === 'string' ? profile.email : ''
      if (!googleId || !email) return false

      await syncUserToBackend({
        googleId,
        email,
        fullName: typeof profile.name === 'string' ? profile.name : null,
        avatar: typeof profile.picture === 'string' ? profile.picture : null,
      })

      return true
    },
    async jwt({ token, account, profile }) {
      if (account?.provider === 'google' && profile && typeof profile.sub === 'string') {
        token.googleId = profile.sub
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && typeof token.googleId === 'string') {
        session.user.googleId = token.googleId
      }
      return session
    },
  },
  trustHost: true,
})
