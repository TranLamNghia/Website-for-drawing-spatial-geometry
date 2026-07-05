'use client'

import { useTheme } from 'next-themes'
import { signOut, useSession } from 'next-auth/react'
import { Laptop, LogOut, Moon, Sun } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const { data: session, status } = useSession()
  const isLoggedIn = status === 'authenticated' && !!session?.user

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
                <CardTitle className="text-sm">Đăng nhập Google</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-muted-foreground min-w-0">
                  {status === 'loading' ? (
                    'Đang tải thông tin tài khoản...'
                  ) : isLoggedIn ? (
                    <>
                      Đang đăng nhập với{' '}
                      <span className="font-medium text-foreground break-all">{session.user?.email}</span>
                    </>
                  ) : (
                    'Bạn chưa đăng nhập. Đăng nhập để dùng Vẽ thông minh và Hòm thư góp ý.'
                  )}
                </div>
                {isLoggedIn ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl gap-2 shrink-0"
                    onClick={() => signOut({ callbackUrl: '/trangchu' })}
                  >
                    <LogOut size={14} />
                    Đăng xuất
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl shrink-0"
                    onClick={() => {
                      window.location.href = '/dang-nhap?callbackUrl=/trangchu/caidat'
                    }}
                  >
                    Đăng nhập
                  </Button>
                )}
              </CardContent>
            </Card>
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
