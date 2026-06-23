'use client'

import { useState, useCallback } from 'react'
import { SolveLeftPanel } from '@/components/geometry/solve/solve-left-panel'
import { Canvas3D } from '@/components/geometry/canvas-3d-r3f'
import { RightSidebar } from '@/components/geometry/right-sidebar'
import { GeometryTabletBanner } from '@/components/geometry/geometry-tablet-banner'
import { useGeometry } from '@/components/geometry/geometry-context'
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

  const {
    // Keep these in context for Canvas3D toolbar; workspace no longer renders FloatingToolbar.
    showAxes, setShowAxes,
    showGrid, setShowGrid,
    showLabels, setShowLabels,
    resetCamera
  } = useGeometry()

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



      {/* FloatingToolbar removed: Canvas3D already provides the unified toolbar for both modes. */}

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
          className="absolute -right-10 top-1/2 -translate-y-1/2 z-40 bg-card/95 backdrop-blur-sm border border-l-0 border-border shadow-xl rounded-r-2xl p-3 hover:bg-primary hover:text-primary-foreground transition-all text-muted-foreground flex items-center justify-center pointer-events-auto"
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
            className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/40 transition-colors z-50 group pointer-events-auto"
          >
            <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-4 h-12 rounded-full bg-border border border-border group-hover:bg-primary group-hover:border-primary transition-colors flex items-center justify-center">
              <GripVertical size={12} className="text-muted-foreground group-hover:text-primary-foreground" />
            </div>
          </div>
        )}

        <div className="w-full h-full overflow-hidden">
          <RightSidebar />
        </div>

        <button
          onClick={() => setRightOpen(!rightOpen)}
          className="absolute -left-10 top-1/2 -translate-y-1/2 z-40 bg-card/95 backdrop-blur-sm border border-r-0 border-border shadow-xl rounded-l-2xl p-3 hover:bg-primary hover:text-primary-foreground transition-all text-muted-foreground flex items-center justify-center pointer-events-auto"
        >
          {rightOpen ? <ChevronRight size={24} /> : <ChevronLeft size={24} />}
        </button>
      </div>
    </div>
  )
}
