import { signIn } from '@/auth'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const callbackUrl = url.searchParams.get('callbackUrl') || '/trangchu'
  // Safe relative path only — prevent open redirects.
  const safeCallback =
    callbackUrl.startsWith('/') && !callbackUrl.startsWith('//') ? callbackUrl : '/trangchu'

  await signIn('google', { redirectTo: safeCallback })
}
