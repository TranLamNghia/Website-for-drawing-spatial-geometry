'use client'

import Link from 'next/link'
import {
  FormEvent,
  KeyboardEvent,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
} from 'react'
import { signIn } from 'next-auth/react'
import { Boxes, ArrowLeft, Loader2, Eye, EyeOff, Sparkles, MessageSquare } from 'lucide-react'
import { resolveAuthCallbackUrl } from '@/lib/auth-callback'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { backendRegister, backendVerifyOtp } from '@/lib/backend-auth'

type Step = 'register' | 'otp'
const OTP_LENGTH = 6

function AuthHeroPanel({ subtitle }: { subtitle: string }) {
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
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
        </div>
      </div>
    </div>
  )
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  autoComplete: string
}) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={visible ? 'text' : 'password'}
          required
          minLength={8}
          autoComplete={autoComplete}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="h-11 rounded-xl pr-11"
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => setVisible(v => !v)}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground hover:text-foreground"
          aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  )
}

function OtpBoxes({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (next: string) => void
  disabled?: boolean
}) {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([])
  const digits = Array.from({ length: OTP_LENGTH }, (_, i) => value[i] ?? '')

  const focusAt = (index: number) => {
    const el = inputsRef.current[index]
    el?.focus()
    el?.select()
  }

  const setDigit = (index: number, digit: string) => {
    const next = digits.map((d, i) => (i === index ? digit : d))
    onChange(next.join('').slice(0, OTP_LENGTH))
  }

  const handleChange = (index: number, raw: string) => {
    const cleaned = raw.replace(/\D/g, '')
    if (!cleaned) {
      setDigit(index, '')
      return
    }

    if (cleaned.length > 1) {
      const chars = cleaned.slice(0, OTP_LENGTH - index).split('')
      const next = [...digits]
      chars.forEach((ch, offset) => {
        next[index + offset] = ch
      })
      onChange(next.join('').slice(0, OTP_LENGTH))
      focusAt(Math.min(index + chars.length, OTP_LENGTH - 1))
      return
    }

    setDigit(index, cleaned)
    if (index < OTP_LENGTH - 1) focusAt(index + 1)
  }

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace') {
      if (digits[index]) {
        setDigit(index, '')
      } else if (index > 0) {
        setDigit(index - 1, '')
        focusAt(index - 1)
      }
      event.preventDefault()
    }
    if (event.key === 'ArrowLeft' && index > 0) {
      focusAt(index - 1)
      event.preventDefault()
    }
    if (event.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      focusAt(index + 1)
      event.preventDefault()
    }
  }

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault()
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
    if (!pasted) return
    onChange(pasted.padEnd(OTP_LENGTH, ' ').trimEnd().replace(/ /g, '').slice(0, OTP_LENGTH))
    focusAt(Math.min(pasted.length, OTP_LENGTH) - 1)
  }

  return (
    <div className="flex justify-between gap-2 sm:gap-3">
      {digits.map((digit, index) => (
        <Input
          key={index}
          ref={el => {
            inputsRef.current[index] = el
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          disabled={disabled}
          value={digit}
          onChange={e => handleChange(index, e.target.value)}
          onKeyDown={e => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={e => e.target.select()}
          aria-label={`Chữ số OTP ${index + 1}`}
          className="h-12 w-11 rounded-xl text-center text-lg font-semibold sm:h-14 sm:w-12"
        />
      ))}
    </div>
  )
}

function RegisterContent() {
  const [callbackUrl, setCallbackUrl] = useState('/trangchu')

  useEffect(() => {
    setCallbackUrl(resolveAuthCallbackUrl())
  }, [])

  const [step, setStep] = useState<Step>('register')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleRegister = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setInfo(null)

    if (password !== confirmPassword) {
      setError('Mật khẩu nhập lại không khớp.')
      return
    }
    if (password.length < 8) {
      setError('Mật khẩu tối thiểu 8 ký tự.')
      return
    }

    setLoading(true)
    try {
      const result = await backendRegister({
        email,
        password,
        fullName: fullName.trim() || undefined,
      })
      setInfo(result.message || 'Đã gửi OTP tới email của bạn.')
      setOtp('')
      setStep('otp')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đăng ký thất bại.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const result = await backendVerifyOtp(email, otp)
      const signInResult = await signIn('credentials', {
        email: result.user.email || email,
        accessToken: result.accessToken,
        userId: result.user.id || '',
        fullName: result.user.fullName || '',
        avatar: result.user.avatar || '',
        redirect: false,
        callbackUrl,
      })
      if (signInResult?.error) {
        setError('Xác minh thành công nhưng không tạo được phiên đăng nhập. Hãy đăng nhập lại.')
        setLoading(false)
        return
      }
      window.location.href = callbackUrl
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xác minh OTP thất bại.')
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setError(null)
    setInfo(null)
    setLoading(true)
    try {
      const result = await backendRegister({
        email,
        password,
        fullName: fullName.trim() || undefined,
      })
      setInfo(result.message || 'Đã gửi lại OTP.')
      setOtp('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không gửi lại được OTP.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh flex-col bg-background lg:flex-row">
      <section className="flex flex-1 flex-col justify-between px-6 py-8 sm:px-10 sm:py-10 lg:max-w-[70%] lg:px-12 xl:px-16">
        <div>
          <Link
            href="/dangky"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft size={16} />
            Về đăng nhập
          </Link>
        </div>

        <div className="mx-auto w-full max-w-md py-8 lg:py-12">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/20">
              <Boxes size={22} className="text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Vẽ hình không &quot;khó&quot;</p>
              <p className="text-xs text-muted-foreground">
                {step === 'register' ? 'Tạo tài khoản mới' : 'Xác minh email'}
              </p>
            </div>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {step === 'register' ? 'Đăng ký' : 'Nhập mã OTP'}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {step === 'register'
              ? 'Tạo tài khoản đơn giản bằng email và mật khẩu.'
              : `Nhập mã 6 số đã gửi tới ${email}.`}
          </p>

          {step === 'register' ? (
            <>
              <form onSubmit={handleRegister} className="mt-8 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Họ tên (tuỳ chọn)</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    className="h-11 rounded-xl"
                    placeholder="Nguyễn Văn A"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="h-11 rounded-xl"
                    placeholder="ban@email.com"
                  />
                </div>
                <PasswordField
                  id="password"
                  label="Mật khẩu"
                  value={password}
                  onChange={setPassword}
                  placeholder="Tối thiểu 8 ký tự"
                  autoComplete="new-password"
                />
                <PasswordField
                  id="confirmPassword"
                  label="Nhập lại mật khẩu"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  placeholder="Nhập lại mật khẩu"
                  autoComplete="new-password"
                />
                {error ? <p className="text-sm text-destructive">{error}</p> : null}
                {info ? <p className="text-sm text-muted-foreground">{info}</p> : null}
                <Button type="submit" disabled={loading} className="h-12 w-full rounded-xl text-base font-semibold">
                  {loading ? <Loader2 className="mr-2 size-5 animate-spin" /> : null}
                  Gửi mã OTP
                </Button>
              </form>
            </>
          ) : (
            <form onSubmit={handleVerifyOtp} className="mt-8 space-y-5">
              <div className="space-y-3">
                <Label>Mã OTP</Label>
                <OtpBoxes value={otp} onChange={setOtp} disabled={loading} />
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              {info ? <p className="text-sm text-muted-foreground">{info}</p> : null}
              <Button
                type="submit"
                disabled={loading || otp.length !== OTP_LENGTH}
                className="h-12 w-full rounded-xl text-base font-semibold"
              >
                {loading ? <Loader2 className="mr-2 size-5 animate-spin" /> : null}
                Xác minh và đăng nhập
              </Button>
              <Button type="button" variant="ghost" disabled={loading} className="w-full" onClick={handleResend}>
                Gửi lại OTP
              </Button>
            </form>
          )}

          {step === 'register' ? (
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Đã có tài khoản?{' '}
              <Link
                href="/dangnhap"
                className="font-semibold text-primary hover:underline"
              >
                Đăng nhập
              </Link>
            </p>
          ) : null}
        </div>

        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Vẽ hình không khó</p>
      </section>

      <section className="hidden min-h-[280px] flex-1 border-t border-border lg:block lg:min-h-svh lg:max-w-[50%] lg:border-l lg:border-t-0">
        <AuthHeroPanel subtitle="Tạo tài khoản để dùng vẽ thông minh AI và hòm thư góp ý." />
      </section>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-svh items-center justify-center bg-background text-sm text-muted-foreground">
          Đang tải trang đăng ký...
        </div>
      }
    >
      <RegisterContent />
    </Suspense>
  )
}
