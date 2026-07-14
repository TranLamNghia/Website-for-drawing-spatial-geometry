import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
import { loadRootEnv } from '@/lib/load-root-env.mjs'
import { backendLogin } from '@/lib/backend-auth'
import { backendGoogleExchange } from '@/lib/backend-google-exchange'

loadRootEnv()

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        accessToken: { label: 'Access Token', type: 'text' },
        userId: { label: 'User Id', type: 'text' },
        fullName: { label: 'Full Name', type: 'text' },
        avatar: { label: 'Avatar', type: 'text' },
      },
      async authorize(credentials) {
        // Path A: already verified (OTP) — establish session from backend token.
        if (typeof credentials?.accessToken === 'string' && credentials.accessToken.length > 0) {
          const email = typeof credentials.email === 'string' ? credentials.email : ''
          if (!email) return null
          return {
            id: typeof credentials.userId === 'string' ? credentials.userId : email,
            email,
            name: typeof credentials.fullName === 'string' ? credentials.fullName : email,
            image: typeof credentials.avatar === 'string' ? credentials.avatar : null,
            accessToken: credentials.accessToken,
            userId: typeof credentials.userId === 'string' ? credentials.userId : undefined,
          }
        }

        const email = typeof credentials?.email === 'string' ? credentials.email.trim() : ''
        const password = typeof credentials?.password === 'string' ? credentials.password : ''
        if (!email || !password) return null

        try {
          const result = await backendLogin(email, password)
          return {
            id: result.user.id || email,
            email: result.user.email || email,
            name: result.user.fullName || result.user.email || email,
            image: result.user.avatar || null,
            accessToken: result.accessToken,
            userId: result.user.id,
            googleId: result.user.googleId || undefined,
          }
        } catch {
          return null
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: '/dangnhap',
    error: '/dangnhap',
  },
  callbacks: {
    async signIn({ account, profile, user }) {
      if (account?.provider === 'credentials') return true
      if (account?.provider !== 'google' || !profile) return true

      const googleId = typeof profile.sub === 'string' ? profile.sub : ''
      const email = typeof profile.email === 'string' ? profile.email : ''
      if (!googleId || !email) return false

      const result = await backendGoogleExchange({
        googleId,
        email,
        fullName: typeof profile.name === 'string' ? profile.name : null,
        avatar: typeof profile.picture === 'string' ? profile.picture : null,
      })

      if (result) {
        ;(user as { accessToken?: string; userId?: string }).accessToken = result.accessToken
        ;(user as { accessToken?: string; userId?: string }).userId = result.user.id
        if (result.user.fullName) user.name = result.user.fullName
        if (result.user.avatar) user.image = result.user.avatar
        if (result.user.email) user.email = result.user.email
      }

      return true
    },
    async jwt({ token, account, profile, user, trigger, session }) {
      if (trigger === 'update' && session && typeof session === 'object') {
        const patch = session as { name?: string; image?: string | null }
        if (typeof patch.name === 'string') token.name = patch.name
        if ('image' in patch) token.picture = patch.image ?? undefined
      }

      if (user) {
        const u = user as {
          accessToken?: string
          userId?: string
          googleId?: string
        }
        if (u.accessToken) token.accessToken = u.accessToken
        if (u.userId) token.userId = u.userId
        if (u.googleId) token.googleId = u.googleId
        if (user.name) token.name = user.name
        if (user.image) token.picture = user.image
      }

      if (account?.provider === 'google' && profile && typeof profile.sub === 'string') {
        token.googleId = profile.sub
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        if (typeof token.googleId === 'string') session.user.googleId = token.googleId
        if (typeof token.userId === 'string') session.user.id = token.userId
        if (typeof token.name === 'string') session.user.name = token.name
        if (typeof token.picture === 'string') session.user.image = token.picture
      }
      if (typeof token.accessToken === 'string') session.accessToken = token.accessToken
      return session
    },
  },
  trustHost: true,
})
