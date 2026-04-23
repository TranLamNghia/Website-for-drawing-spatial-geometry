'use client'

import { useEffect, useState } from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="h-9 w-[140px] rounded-md border border-border bg-card/95" />
    )
  }

  return (
    <Select value={theme} onValueChange={setTheme}>
      <SelectTrigger className="h-9 w-[140px] bg-card/95 backdrop-blur-sm border-border text-foreground">
        <SelectValue placeholder="Theme" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="light">
          <Sun className="h-4 w-4" />
          Light
        </SelectItem>
        <SelectItem value="dark">
          <Moon className="h-4 w-4" />
          Dark
        </SelectItem>
        <SelectItem value="system">
          <Monitor className="h-4 w-4" />
          System
        </SelectItem>
      </SelectContent>
    </Select>
  )
}
