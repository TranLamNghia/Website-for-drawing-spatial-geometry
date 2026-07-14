import { auth } from '@/auth'
import { NextResponse } from 'next/server'

const AUTH_CALLBACK_COOKIE = 'auth_callback_url'

export default auth(req => {
  const isLoggedIn = !!req.auth
  const { pathname } = req.nextUrl
  const method = req.method.toUpperCase()

  const isProtectedPage =
    pathname.startsWith('/chedovethongminh') || pathname.startsWith('/trangchu/homthu')
  const isFeedbackApi = pathname === '/api/feedback' && method === 'POST'

  if (!isLoggedIn && (isProtectedPage || isFeedbackApi)) {
    if (isFeedbackApi) {
      return NextResponse.json({ message: 'Bạn cần đăng nhập để gửi góp ý.' }, { status: 401 })
    }

    const response = NextResponse.redirect(new URL('/dangnhap', req.nextUrl.origin))
    response.cookies.set(AUTH_CALLBACK_COOKIE, `${pathname}${req.nextUrl.search}`, {
      path: '/',
      maxAge: 600,
      sameSite: 'lax',
    })
    return response
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/chedovethongminh/:path*', '/trangchu/homthu/:path*', '/api/feedback'],
}
