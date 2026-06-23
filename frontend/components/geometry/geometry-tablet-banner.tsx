'use client'

import { useState } from 'react'
import { Monitor, X } from 'lucide-react'

export function GeometryTabletBanner() {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <div className="pointer-events-auto absolute left-1/2 top-3 z-[60] flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-start gap-2 rounded-2xl border border-amber-500/30 bg-card/95 px-3 py-2 text-left shadow-lg backdrop-blur-md">
      <Monitor size={16} className="mt-0.5 shrink-0 text-amber-500" />
      <p className="flex-1 text-[12px] leading-snug text-muted-foreground">
        {'B\u1ea1n \u0111ang d\u00f9ng m\u00e0n h\u00ecnh nh\u1ecf. C\u00f3 th\u1ec3 v\u1ebd h\u00ecnh c\u01a1 b\u1ea3n, nh\u01b0ng \u0111\u1ec3 thao t\u00e1c ch\u00ednh x\u00e1c h\u01a1n h\u00e3y d\u00f9ng m\u00e1y t\u00ednh.'}
      </p>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Đóng thông báo"
        className="-mr-1 -mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <X size={15} />
      </button>
    </div>
  )
}
