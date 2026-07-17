'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Camera, Loader2, LogOut, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { signOutCompletely } from '@/lib/auth-client'
import { goToLogin } from '@/lib/auth-callback'
import { backendGetProfile, backendUpdateProfile, type BackendProfile } from '@/lib/backend-auth'

export default function SettingsProfilePage() {
  const { data: session, status, update } = useSession()
  const isLoggedIn = status === 'authenticated' && !!session?.user

  const [profile, setProfile] = useState<BackendProfile | null>(null)
  const [fullName, setFullName] = useState('')
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoggedIn || !session?.accessToken) return

    let cancelled = false
    setLoadingProfile(true)
    setError(null)

    backendGetProfile(session.accessToken)
      .then(data => {
        if (cancelled) return
        setProfile(data)
        setFullName(data.fullName || session.user?.name || '')
      })
      .catch(err => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Không tải được hồ sơ.')
        setFullName(session.user?.name || '')
        setProfile({
          email: session.user?.email ?? undefined,
          fullName: session.user?.name,
          avatar: session.user?.image,
        })
      })
      .finally(() => {
        if (!cancelled) setLoadingProfile(false)
      })

    return () => {
      cancelled = true
    }
  }, [isLoggedIn, session?.accessToken, session?.user?.email, session?.user?.image, session?.user?.name])

  const handleSaveProfile = async (event: FormEvent) => {
    event.preventDefault()
    if (!session?.accessToken) return

    setError(null)
    setInfo(null)
    setSaving(true)
    try {
      const updated = await backendUpdateProfile(session.accessToken, fullName.trim())
      setProfile(updated)
      setFullName(updated.fullName || '')
      await update({ name: updated.fullName || '', image: updated.avatar ?? null })
      setInfo('Đã lưu thông tin tài khoản.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được thông tin.')
    } finally {
      setSaving(false)
    }
  }

  const avatarUrl = profile?.avatar || session?.user?.image || null
  const email = profile?.email || session?.user?.email || ''

  return (
    <div>
      <div className="mb-6 border-b border-border pb-4">
        <h2 className="text-xl font-semibold tracking-tight">Hồ sơ công khai</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Thông tin hiển thị trong ứng dụng và các tính năng cần tài khoản.
        </p>
      </div>

      {status === 'loading' || loadingProfile ? (
        <p className="text-sm text-muted-foreground">Đang tải thông tin tài khoản...</p>
      ) : !isLoggedIn ? (
        <div className="rounded-lg border border-border bg-muted/20 p-4 sm:p-5">
          <p className="text-sm text-muted-foreground">
            Bạn chưa đăng nhập. Đăng nhập để chỉnh hồ sơ và dùng Vẽ thông minh / Hòm thư góp ý.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-4 h-10"
            onClick={() => goToLogin('/trangchu/caidat')}
          >
            Đăng nhập
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSaveProfile} className="space-y-8">
          <div className="flex flex-col-reverse gap-8 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="fullName">Họ và tên</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="h-10 max-w-xl"
                  placeholder="Tên hiển thị của bạn"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Tên này có thể xuất hiện khi bạn gửi góp ý hoặc dùng tính năng cần tài khoản.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email công khai</Label>
                <Input
                  id="email"
                  value={email}
                  readOnly
                  disabled
                  className="h-10 max-w-xl bg-muted/40"
                />
                <p className="text-xs text-muted-foreground">
                  Email dùng để đăng nhập. Quản lý mật khẩu tại mục{' '}
                  <Link
                    href="/trangchu/caidat/doi-mat-khau"
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    Mật khẩu và xác thực
                  </Link>
                  .
                </p>
              </div>
            </div>

            <div className="mx-auto w-fit shrink-0 sm:mx-0">
              <Label className="mb-2 block text-center sm:text-left">Ảnh đại diện</Label>
              <div className="relative flex size-36 items-center justify-center overflow-hidden rounded-full border border-border bg-muted/40 sm:size-40">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt={fullName || email || 'Avatar'}
                    className="size-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <User className="size-12 text-muted-foreground" />
                )}
                <button
                  type="button"
                  disabled
                  title="Sẽ tích hợp Cloudinary sau"
                  className="absolute bottom-2 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-md border border-border bg-background/95 px-2.5 py-1 text-[11px] font-medium text-muted-foreground shadow-sm"
                >
                  <Camera size={12} />
                  Sửa
                </button>
              </div>
            </div>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {info ? <p className="text-sm text-muted-foreground">{info}</p> : null}

          <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="outline"
              className="h-10 gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => signOutCompletely('/trangchu')}
            >
              <LogOut size={14} />
              Đăng xuất
            </Button>
            <Button type="submit" disabled={saving} className="h-10 sm:min-w-[140px]">
              {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Cập nhật hồ sơ
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
