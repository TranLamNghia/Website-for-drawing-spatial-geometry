'use client'

import { useTheme } from 'next-themes'
import { Laptop, Moon, Sun } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function AppearanceSettingsPage() {
  const { theme, setTheme } = useTheme()

  return (
    <div>
      <div className="mb-6 border-b border-border pb-4">
        <h2 className="text-xl font-semibold tracking-tight">Giao diện</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Chọn chế độ sáng/tối cho toàn bộ ứng dụng.
        </p>
      </div>

      <div className="max-w-xl space-y-2">
        <label className="text-sm font-medium" htmlFor="theme-mode">
          Chế độ chủ đề
        </label>
        <Select value={theme ?? 'system'} onValueChange={setTheme}>
          <SelectTrigger id="theme-mode" className="h-10 w-full sm:w-[220px]">
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
        <p className="text-xs text-muted-foreground">
          Chế độ Hệ thống sẽ theo cài đặt sáng/tối của thiết bị.
        </p>
      </div>
    </div>
  )
}
