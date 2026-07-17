'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
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
  hint,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  required?: boolean
  hint?: string
}) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative max-w-xl">
        <Input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          required={required}
          onChange={e => onChange(e.target.value)}
          className="h-10 pr-11"
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
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
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
    return <p className="text-sm text-muted-foreground">Đang tải...</p>
  }

  return (
    <div>
      <div className="mb-6 border-b border-border pb-4">
        <h2 className="text-xl font-semibold tracking-tight">Mật khẩu và xác thực</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Cập nhật mật khẩu dùng để đăng nhập bằng email.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-xl space-y-5">
        <PasswordField
          id="currentPassword"
          label="Mật khẩu hiện tại"
          value={currentPassword}
          onChange={setCurrentPassword}
          placeholder={hasPassword === false ? 'Để trống nếu chưa có mật khẩu' : 'Nhập mật khẩu hiện tại'}
          required={hasPassword === true}
          hint={
            hasPassword === false
              ? 'Tài khoản đăng nhập Google chưa có mật khẩu. Để trống ô này và đặt mật khẩu mới.'
              : undefined
          }
        />

        <PasswordField
          id="newPassword"
          label="Mật khẩu mới"
          value={newPassword}
          onChange={setNewPassword}
          placeholder="Tối thiểu 8 ký tự"
          required
          hint="Nên dùng ít nhất 8 ký tự, kết hợp chữ và số."
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

        <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="h-10"
            onClick={() => router.push('/trangchu/caidat')}
          >
            Hủy
          </Button>
          <Button type="submit" disabled={loading} className="h-10 sm:min-w-[140px]">
            {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Cập nhật mật khẩu
          </Button>
        </div>
      </form>
    </div>
  )
}
