import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    accessToken?: string
    user: {
      id?: string
      googleId?: string
    } & DefaultSession['user']
  }

  interface User {
    accessToken?: string
    userId?: string
    googleId?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string
    userId?: string
    googleId?: string
  }
}
