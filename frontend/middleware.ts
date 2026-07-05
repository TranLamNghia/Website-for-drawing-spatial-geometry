import { auth } from '@/auth'
import { NextResponse } from 'next/server'

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

    const loginUrl = new URL('/dang-nhap', req.nextUrl.origin)
    loginUrl.searchParams.set('callbackUrl', `${pathname}${req.nextUrl.search}`)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/chedovethongminh/:path*', '/trangchu/homthu/:path*', '/api/feedback'],
}
