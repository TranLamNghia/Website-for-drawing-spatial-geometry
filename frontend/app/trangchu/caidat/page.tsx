'use client'

import { useTheme } from 'next-themes'
import { Laptop, Moon, Sun } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Cài đặt</h1>
        <p className="text-sm text-muted-foreground mt-1">Tùy chỉnh giao diện.</p>

        <div className="mt-6 space-y-6 sm:mt-8">
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
