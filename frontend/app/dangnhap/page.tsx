'use client'

import Link from 'next/link'
import { FormEvent, Suspense, useEffect, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { Boxes, ArrowLeft, Loader2 } from 'lucide-react'
import { cleanAuthSearchParams, resolveAuthCallbackUrl } from '@/lib/auth-callback'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}

function LoginHeroPanel() {
  return (
    <div className="relative hidden h-full overflow-hidden bg-card lg:flex lg:flex-col">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-indigo-500/10 to-background" />
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            'linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
      <div className="relative flex flex-1 flex-col items-center justify-center p-10 xl:p-14">
        <div className="relative w-full max-w-md aspect-square">
          <div className="absolute inset-8 rounded-3xl border border-primary/20 bg-background/40 backdrop-blur-sm shadow-2xl shadow-primary/10" />
          <svg
            viewBox="0 0 320 320"
            className="absolute inset-0 h-full w-full p-10 text-primary"
            aria-hidden="true"
          >
            <g fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.9">
              <path d="M160 70 L250 130 L250 230 L160 290 L70 230 L70 130 Z" />
              <path d="M160 70 L160 160 L250 130" opacity="0.55" />
              <path d="M160 160 L160 290" opacity="0.55" />
              <path d="M160 160 L70 130" opacity="0.55" />
            </g>
            <circle cx="160" cy="160" r="5" fill="hsl(var(--primary))" />
          </svg>
        </div>
        <div className="relative mt-10 max-w-md text-center">
          <p className="text-lg font-semibold text-foreground">Công cụ vẽ hình không gian 3D</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Đăng nhập để dùng vẽ thông minh AI và hòm thư góp ý.
          </p>
        </div>
      </div>
    </div>
  )
}

function LoginContent() {
  const searchParams = useSearchParams()
  const authError = searchParams.get('error')
  const [callbackUrl, setCallbackUrl] = useState('/trangchu')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSigningIn, setIsSigningIn] = useState(false)

  useEffect(() => {
    setCallbackUrl(resolveAuthCallbackUrl())
  }, [])

  useEffect(() => {
    // bfcache restore breaks React click handlers; CSS :hover still works.
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) window.location.reload()
    }

    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [])

  useEffect(() => {
    if (!authError) return

    const messages: Record<string, string> = {
      AccessDenied: 'Bạn đã hủy đăng nhập Google.',
      OAuthSignin: 'Không thể bắt đầu đăng nhập Google. Thử lại sau.',
      OAuthCallback: 'Đăng nhập Google thất bại. Thử lại sau.',
      OAuthAccountNotLinked: 'Email này đã được dùng với phương thức đăng nhập khác.',
    }
    setError(messages[authError] ?? 'Đăng nhập Google thất bại. Thử lại sau.')
    cleanAuthSearchParams(['error'])
  }, [authError])

  const handleEmailLogin = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setIsSigningIn(true)
    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl,
      })
      if (result?.error) {
        setError('Email hoặc mật khẩu không đúng, hoặc email chưa xác minh OTP.')
        setIsSigningIn(false)
        return
      }
      window.location.href = callbackUrl
    } catch {
      setError('Không thể đăng nhập. Thử lại sau.')
      setIsSigningIn(false)
    }
  }

  const handleGoogleSignIn = () => {
    setError(null)
    void signIn('google', { callbackUrl }).catch(() => {
      setError('Không thể bắt đầu đăng nhập Google. Thử lại sau.')
    })
  }

  return (
    <div className="flex min-h-svh flex-col bg-background lg:flex-row">
      <section className="flex flex-1 flex-col justify-between px-6 py-8 sm:px-10 sm:py-10 lg:max-w-[70%] lg:px-12 xl:px-16">
        <div>
          <Link
            href="/trangchu"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft size={16} />
            Về trang chủ
          </Link>
        </div>

        <div className="mx-auto w-full max-w-md py-8 lg:py-12">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/20">
              <Boxes size={22} className="text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Vẽ hình không &quot;khó&quot;</p>
              <p className="text-xs text-muted-foreground">Đăng nhập tài khoản</p>
            </div>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Chào mừng trở lại</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Đăng nhập bằng email hoặc Google để mở khóa nhiều chức năng hơn.
          </p>

          <form onSubmit={handleEmailLogin} className="mt-8 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="h-11 rounded-xl"
                placeholder="ban@email.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="h-11 rounded-xl"
                placeholder="••••••••"
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button
              type="submit"
              disabled={isSigningIn}
              className="h-12 w-full rounded-xl text-base font-semibold"
            >
              {isSigningIn ? <Loader2 className="mr-2 size-5 animate-spin" /> : null}
              Đăng nhập
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">hoặc</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <Button
            type="button"
            variant="outline"
            className="h-12 w-full rounded-xl border-border/80 bg-background text-base font-semibold text-foreground shadow-sm hover:bg-muted hover:text-foreground"
            onClick={handleGoogleSignIn}
          >
            <GoogleIcon className="mr-3 size-5" />
            Đăng nhập bằng Google
          </Button>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Chưa có tài khoản?{' '}
            <Link
              href="/dangky"
              className="font-semibold text-primary hover:underline"
            >
              Đăng ký
            </Link>
          </p>
        </div>

        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Vẽ hình không khó</p>
      </section>

      <section className="hidden min-h-[280px] flex-1 border-t border-border lg:block lg:min-h-svh lg:max-w-[50%] lg:border-l lg:border-t-0">
        <LoginHeroPanel />
      </section>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-svh items-center justify-center bg-background text-sm text-muted-foreground">
          Đang tải trang đăng nhập...
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  )
}
