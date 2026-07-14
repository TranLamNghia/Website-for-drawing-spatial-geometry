'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useTheme } from 'next-themes'
import { Camera, KeyRound, Laptop, Loader2, LogOut, Moon, Sun, User } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { signOutCompletely } from '@/lib/auth-client'
import { goToLogin } from '@/lib/auth-callback'
import { backendGetProfile, backendUpdateProfile, type BackendProfile } from '@/lib/backend-auth'

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const router = useRouter()
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
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Cài đặt</h1>
        <p className="text-sm text-muted-foreground mt-1">Tùy chỉnh giao diện và tài khoản.</p>

        <div className="mt-6 space-y-6 sm:mt-8">
          <div>
            <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">Tài khoản</p>
            <Card className="mt-3">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Hồ sơ công khai</CardTitle>
              </CardHeader>
              <CardContent>
                {status === 'loading' || loadingProfile ? (
                  <p className="text-sm text-muted-foreground">Đang tải thông tin tài khoản...</p>
                ) : !isLoggedIn ? (
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-muted-foreground">
                      Bạn chưa đăng nhập. Đăng nhập để dùng Vẽ thông minh và Hòm thư góp ý.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-xl shrink-0"
                      onClick={() => goToLogin('/trangchu/caidat')}
                    >
                      Đăng nhập
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSaveProfile} className="space-y-6">
                    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_200px]">
                      <div className="space-y-5 min-w-0">
                        <div className="space-y-2">
                          <Label htmlFor="fullName">Họ và tên</Label>
                          <Input
                            id="fullName"
                            value={fullName}
                            onChange={e => setFullName(e.target.value)}
                            className="h-11 rounded-xl"
                            placeholder="Tên hiển thị của bạn"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            value={email}
                            readOnly
                            disabled
                            className="h-11 rounded-xl bg-muted/40"
                          />
                          <p className="text-xs text-muted-foreground">
                            Email dùng để đăng nhập và không thể thay đổi tại đây.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Ảnh đại diện</Label>
                        <div className="relative mx-auto flex size-36 items-center justify-center overflow-hidden rounded-full border border-border bg-muted/40 lg:mx-0">
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
                            className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-md border border-border bg-background/95 px-2 py-1 text-[11px] font-medium text-muted-foreground shadow-sm"
                          >
                            <Camera size={12} />
                            Sửa
                          </button>
                        </div>
                      </div>
                    </div>

                    {error ? <p className="text-sm text-destructive">{error}</p> : null}
                    {info ? <p className="text-sm text-muted-foreground">{info}</p> : null}

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <Button type="submit" disabled={saving} className="rounded-xl sm:min-w-[140px]">
                        {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                        Lưu thông tin
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-xl gap-2"
                        onClick={() => signOutCompletely('/trangchu')}
                      >
                        <LogOut size={14} />
                        Đăng xuất
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>

            {isLoggedIn ? (
              <Card className="mt-4">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Mật khẩu</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm text-muted-foreground min-w-0">
                    {profile?.hasPassword
                      ? 'Đổi mật khẩu đăng nhập bằng email.'
                      : 'Tài khoản Google chưa có mật khẩu. Bạn có thể tạo mật khẩu để đăng nhập bằng email.'}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl gap-2 shrink-0"
                    onClick={() => router.push('/trangchu/caidat/doi-mat-khau')}
                  >
                    <KeyRound size={14} />
                    Đổi mật khẩu
                  </Button>
                </CardContent>
              </Card>
            ) : null}
          </div>

          <div>
            <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">Giao diện</p>
            <Card className="mt-3">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Chế độ sáng/tối</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-muted-foreground">Chọn chế độ hiển thị cho toàn bộ ứng dụng.</div>
                <Select value={theme ?? 'system'} onValueChange={setTheme}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Hệ thống" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">
                      <span className="inline-flex items-center gap-2">
                        <Laptop size={14} />
                        Hệ thống
                      </span>
                    </SelectItem>
                    <SelectItem value="light">
                      <span className="inline-flex items-center gap-2">
                        <Sun size={14} />
                        Sáng
                      </span>
                    </SelectItem>
                    <SelectItem value="dark">
                      <span className="inline-flex items-center gap-2">
                        <Moon size={14} />
                        Tối
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
