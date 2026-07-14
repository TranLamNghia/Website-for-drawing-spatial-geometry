'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { backendChangePassword, backendGetProfile } from '@/lib/backend-auth'
import { storeAuthCallbackUrl } from '@/lib/auth-callback'

function PasswordField({
  id,
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  required?: boolean
}) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          required={required}
          onChange={e => onChange(e.target.value)}
          className="h-11 rounded-xl pr-11"
          placeholder={placeholder}
          autoComplete="new-password"
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

export default function ChangePasswordPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [hasPassword, setHasPassword] = useState<boolean | null>(null)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      storeAuthCallbackUrl('/trangchu/caidat/doi-mat-khau')
      router.replace('/dangnhap')
      return
    }
    if (status !== 'authenticated' || !session?.accessToken) return

    backendGetProfile(session.accessToken)
      .then(profile => setHasPassword(!!profile.hasPassword))
      .catch(() => setHasPassword(null))
  }, [status, session?.accessToken, router])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!session?.accessToken) return

    setError(null)
    setInfo(null)

    if (newPassword.length < 8) {
      setError('Mật khẩu mới tối thiểu 8 ký tự.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu mới nhập lại không khớp.')
      return
    }

    setLoading(true)
    try {
      const result = await backendChangePassword(session.accessToken, {
        currentPassword: currentPassword || undefined,
        newPassword,
      })
      setHasPassword(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setInfo(result.message || 'Đã cập nhật mật khẩu.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không đổi được mật khẩu.')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Đang tải...
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-xl mx-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <Link
          href="/trangchu/caidat"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft size={16} />
          Về cài đặt
        </Link>

        <h1 className="mt-6 text-xl font-bold tracking-tight sm:text-2xl">Đổi mật khẩu</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cập nhật mật khẩu dùng để đăng nhập bằng email.
        </p>

        <Card className="mt-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Mật khẩu đăng nhập</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <PasswordField
                id="currentPassword"
                label="Mật khẩu hiện tại"
                value={currentPassword}
                onChange={setCurrentPassword}
                placeholder={hasPassword === false ? 'Để trống nếu chưa có mật khẩu' : 'Nhập mật khẩu hiện tại'}
                required={hasPassword === true}
              />
              {hasPassword === false ? (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Tài khoản đăng nhập Google chưa có mật khẩu. Hãy để trống ô mật khẩu hiện tại và đặt mật khẩu mới.
                </p>
              ) : null}

              <PasswordField
                id="newPassword"
                label="Mật khẩu mới"
                value={newPassword}
                onChange={setNewPassword}
                placeholder="Tối thiểu 8 ký tự"
                required
              />
              <PasswordField
                id="confirmPassword"
                label="Nhập lại mật khẩu mới"
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="Nhập lại mật khẩu mới"
                required
              />

              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              {info ? <p className="text-sm text-muted-foreground">{info}</p> : null}

              <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                <Button type="submit" disabled={loading} className="rounded-xl sm:min-w-[160px]">
                  {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                  Lưu mật khẩu
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => router.push('/trangchu/caidat')}
                >
                  Hủy
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
