'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, Sparkles } from 'lucide-react'

export type SolveProcessingVariant = 'waiting' | 'solving'

const VARIANT_COPY: Record<SolveProcessingVariant, { title: string; subtitle: string }> = {
  waiting: {
    title: 'Đang phân tích đề bài, vui lòng chờ...',
    subtitle: 'Hệ thống đang đọc và trích xuất dữ liệu hình học từ đề bài của bạn.',
  },
  solving: {
    title: 'Bài toán này đang được giải quyết...',
    subtitle: 'Đề bài cần tính toán chuyên sâu, quá trình này có thể mất thêm chút thời gian.',
  },
}

interface SolveProcessingOverlayProps {
  open: boolean
  variant: SolveProcessingVariant
}

// Overlay chặn toàn bộ tương tác với SolverView trong khi BE đang xử lý.
// Dùng portal ra document.body để z-index vượt mọi panel/canvas.
export function SolveProcessingOverlay({ open, variant }: SolveProcessingOverlayProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  if (!mounted || !open) return null

  const { title, subtitle } = VARIANT_COPY[variant]

  return createPortal(
    <div
      role="alertdialog"
      aria-modal="true"
      aria-busy="true"
      aria-label={title}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-background/70 backdrop-blur-sm"
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="mx-4 flex w-full max-w-sm flex-col items-center gap-5 rounded-2xl border border-border bg-card p-8 text-center shadow-2xl">
        <div className="relative flex h-16 w-16 items-center justify-center">
          <Loader2 className="h-16 w-16 animate-spin text-primary" strokeWidth={1.5} />
          <Sparkles className="absolute h-6 w-6 text-primary" />
        </div>
        <div className="space-y-2">
          <h2 className="text-base font-bold leading-snug text-foreground">{title}</h2>
          <p className="text-[13px] leading-relaxed text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" />
        </div>
      </div>
    </div>,
    document.body,
  )
}
