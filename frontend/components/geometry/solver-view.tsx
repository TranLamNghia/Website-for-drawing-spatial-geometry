'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { SolveLeftPanel } from '@/components/geometry/solve/solve-left-panel'
import { Canvas3D } from '@/components/geometry/canvas-3d-r3f'
import { RightSidebar } from '@/components/geometry/right-sidebar'
import { GeometryTabletBanner } from '@/components/geometry/geometry-tablet-banner'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { useViewportTier } from '@/hooks/use-viewport-tier'
import { ChevronLeft, ChevronRight, GripVertical, PanelLeft, PanelRight } from 'lucide-react'

// ─────────────────────────────────────────────────────────────
// Solver View (Photoshop-style 3-column layout)
// ─────────────────────────────────────────────────────────────
interface SolverViewProps {
  onBack: () => void
}

export function SolverView({ onBack }: SolverViewProps) {
  const [leftOpen, setLeftOpen] = useState(true)
  const [rightOpen, setRightOpen] = useState(true)
  const [rightWidth, setRightWidth] = useState(420)
  const [isResizing, setIsResizing] = useState(false)
  const [activeSheet, setActiveSheet] = useState<'left' | 'right' | null>(null)
  const tier = useViewportTier()
  const hasInitializedDefaults = useRef(false)

  useEffect(() => {
    if (!tier || hasInitializedDefaults.current) return

    // P2-1: laptop (< xl) mặc định đóng panel phải để ưu tiên không gian canvas.
    if (tier === 'laptop') {
      setLeftOpen(true)
      setRightOpen(false)
    }

    hasInitializedDefaults.current = true
  }, [tier])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const newWidth = window.innerWidth - e.clientX
    if (newWidth > 350 && newWidth < window.innerWidth * 0.5) {
      setRightWidth(newWidth)
    }
  }, [])

  const stopResizing = useCallback(() => {
    setIsResizing(false)
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', stopResizing)
  }, [handleMouseMove])

  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', stopResizing)
  }

  if (tier === null) {
    return (
      <div className="flex h-svh min-h-dvh items-center justify-center bg-background text-muted-foreground">
        {'\u0110ang t\u1ea3i tr\u1ee3 l\u00fd AI...'}
      </div>
    )
  }

  // Tablet (< lg): panel dạng Sheet phủ trên canvas, mở tối đa 1 panel.
  if (tier === 'tablet') {
    return (
      <div className="relative h-svh min-h-dvh overflow-hidden bg-background text-foreground">
        <div className="absolute inset-0 z-0">
          <Canvas3D />
        </div>

        <GeometryTabletBanner />

        {/* FAB mở panel nhập đề (trái) */}
        <button
          onClick={() => setActiveSheet('left')}
          aria-label="Mở bảng nhập đề"
          className="pointer-events-auto absolute bottom-5 left-5 z-50 flex size-12 items-center justify-center rounded-2xl border border-border bg-card/95 text-foreground shadow-xl backdrop-blur-sm transition-colors hover:bg-primary hover:text-primary-foreground"
        >
          <PanelLeft size={22} />
        </button>

        {/* FAB mở panel kết quả (phải) */}
        <button
          onClick={() => setActiveSheet('right')}
          aria-label="Mở bảng kết quả"
          className="pointer-events-auto absolute bottom-5 right-5 z-50 flex size-12 items-center justify-center rounded-2xl border border-border bg-card/95 text-foreground shadow-xl backdrop-blur-sm transition-colors hover:bg-primary hover:text-primary-foreground"
        >
          <PanelRight size={22} />
        </button>

        <Sheet
          open={activeSheet === 'left'}
          onOpenChange={(open) => setActiveSheet(open ? 'left' : null)}
        >
          <SheetContent
            side="left"
            className="w-[92vw] max-w-[420px] gap-0 overflow-y-auto p-0 sm:max-w-[420px]"
          >
            <SheetTitle className="sr-only">{'B\u1ea3ng nh\u1eadp \u0111\u1ec1'}</SheetTitle>
            <SolveLeftPanel />
          </SheetContent>
        </Sheet>

        <Sheet
          open={activeSheet === 'right'}
          onOpenChange={(open) => setActiveSheet(open ? 'right' : null)}
        >
          <SheetContent
            side="right"
            className="w-[92vw] max-w-[440px] gap-0 overflow-y-auto p-0 sm:max-w-[440px]"
          >
            <SheetTitle className="sr-only">{'B\u1ea3ng k\u1ebft qu\u1ea3'}</SheetTitle>
            <RightSidebar />
          </SheetContent>
        </Sheet>
      </div>
    )
  }

  // Laptop trở lên (>= lg): giữ layout overlay 3 cột như cũ.
  return (
    <div className={`h-svh min-h-dvh bg-background text-foreground overflow-hidden relative ${isResizing ? 'cursor-col-resize select-none' : ''}`}>
      {/* Full-screen canvas layer (renders once; sidebars overlay on top) */}
      <div className="absolute inset-0 z-0">
        <Canvas3D />
      </div>

      {/* Left Sidebar overlay */}
      <div
        className={`absolute left-0 top-0 bottom-0 z-30 transition-transform duration-500 ease-in-out border-r border-border bg-card/50 backdrop-blur-md shadow-xl ${
          leftOpen ? 'translate-x-0' : '-translate-x-[400px]'
        }`}
        style={{ width: 400 }}
      >
        <div className="w-full h-full overflow-hidden">
          <SolveLeftPanel />
        </div>

        <button
          onClick={() => setLeftOpen(!leftOpen)}
          className="absolute -right-10 top-1/2 z-40 flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-r-2xl border border-l-0 border-border bg-card/95 p-3 text-muted-foreground shadow-xl backdrop-blur-sm transition-all hover:bg-primary hover:text-primary-foreground pointer-events-auto"
        >
          {leftOpen ? <ChevronLeft size={24} /> : <ChevronRight size={24} />}
        </button>
      </div>

      {/* Right Sidebar overlay */}
      <div
        className="absolute right-0 top-0 bottom-0 z-30 bg-card/50 backdrop-blur-md shadow-2xl border-l border-border transition-transform duration-500 ease-in-out"
        style={{
          width: rightWidth,
          transform: rightOpen ? 'translateX(0px)' : `translateX(${rightWidth}px)`,
        }}
      >
        {rightOpen && (
          <div
            onMouseDown={startResizing}
            className="absolute top-0 bottom-0 left-0 z-50 hidden w-3 cursor-col-resize touch-none transition-colors hover:bg-primary/40 group pointer-events-auto lg:block"
          >
            <div className="absolute top-1/2 left-1/2 flex h-14 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-border transition-colors group-hover:border-primary group-hover:bg-primary">
              <GripVertical size={13} className="text-muted-foreground group-hover:text-primary-foreground" />
            </div>
          </div>
        )}

        <div className="w-full h-full overflow-hidden">
          <RightSidebar />
        </div>

        <button
          onClick={() => setRightOpen(!rightOpen)}
          className="absolute -left-10 top-1/2 z-40 flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-l-2xl border border-r-0 border-border bg-card/95 p-3 text-muted-foreground shadow-xl backdrop-blur-sm transition-all hover:bg-primary hover:text-primary-foreground pointer-events-auto"
        >
          {rightOpen ? <ChevronRight size={24} /> : <ChevronLeft size={24} />}
        </button>
      </div>
    </div>
  )
}
