'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, PanelLeft, PanelRight } from 'lucide-react'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { ManualCanvas3D } from './manual-canvas-3d'
import { ManualLeftPanel } from './manual-left-panel'
import { ManualLeftSubPanel } from './manual-left-sub-panel'
import { ManualRightPanel } from './manual-right-panel'
import { GeometryTabletBanner } from './geometry-tablet-banner'
import { useGeometry } from './geometry-context'
import { useViewportTier } from '@/hooks/use-viewport-tier'

export function ManualView() {
  const [leftOpen, setLeftOpen] = useState(true)
  const [rightOpen, setRightOpen] = useState(true)
  const [subOpen, setSubOpen] = useState(true)
  const [activeSheet, setActiveSheet] = useState<'left' | 'right' | null>(null)
  const { activeTool } = useGeometry()
  const tier = useViewportTier()
  const hasInitializedDefaults = useRef(false)

  const isSubPanelVisible = subOpen && activeTool !== 'select'

  const leftPanelWidth = tier === 'ultra' ? 'clamp(320px, 20vw, 480px)' : '320px'
  const rightPanelWidth = tier === 'ultra' ? 'clamp(400px, 26vw, 560px)' : '440px'

  useEffect(() => {
    if (!tier || hasInitializedDefaults.current) return

    // P2-1: laptop (< xl) mặc định đóng sub-panel và panel phải.
    if (tier === 'laptop') {
      setLeftOpen(true)
      setSubOpen(false)
      setRightOpen(false)
    }

    hasInitializedDefaults.current = true
  }, [tier])

  if (tier === null) {
    return (
      <div className="flex h-svh min-h-dvh items-center justify-center bg-background text-muted-foreground">
        {'\u0110ang t\u1ea3i kh\u00f4ng gian l\u00e0m vi\u1ec7c...'}
      </div>
    )
  }

  // Tablet (< lg): panel dạng Sheet phủ trên canvas, mở tối đa 1 panel.
  if (tier === 'tablet') {
    return (
      <div className="relative h-svh min-h-dvh overflow-hidden bg-background text-foreground">
        <div className="absolute inset-0 z-0">
          <ManualCanvas3D />
        </div>

        <GeometryTabletBanner />

        {/* FAB mở panel công cụ (trái) */}
        <button
          onClick={() => setActiveSheet('left')}
          aria-label="Mở bảng công cụ"
          className="pointer-events-auto absolute bottom-5 left-5 z-50 flex size-12 items-center justify-center rounded-2xl border border-border bg-card/95 text-foreground shadow-xl backdrop-blur-sm transition-colors hover:bg-primary hover:text-primary-foreground"
        >
          <PanelLeft size={22} />
        </button>

        {/* FAB mở panel thuộc tính (phải) */}
        <button
          onClick={() => setActiveSheet('right')}
          aria-label="Mở bảng thuộc tính"
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
            className="w-[90vw] max-w-[380px] gap-0 overflow-y-auto p-0 sm:max-w-[380px]"
          >
            <SheetTitle className="sr-only">{'B\u1ea3ng c\u00f4ng c\u1ee5'}</SheetTitle>
            <ManualLeftPanel subOpen={subOpen} setSubOpen={setSubOpen} />
            {isSubPanelVisible && (
              <div className="border-t border-border">
                <ManualLeftSubPanel />
              </div>
            )}
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
            <SheetTitle className="sr-only">{'B\u1ea3ng thu\u1ed9c t\u00ednh'}</SheetTitle>
            <ManualRightPanel />
          </SheetContent>
        </Sheet>
      </div>
    )
  }

  // Laptop trở lên (>= lg): giữ layout overlay cố định như cũ.
  return (
    <div className="relative h-svh min-h-dvh overflow-hidden bg-background text-foreground">
      <div className="absolute inset-0 z-0">
        <ManualCanvas3D />
      </div>

      {/* Cụm Sidebar Trái (bao gồm Panel chính & Panel phụ) */}
      <div
        className={`absolute top-0 bottom-0 left-0 z-[100] flex flex-row shadow-xl transition-transform duration-500 ease-in-out ${
          leftOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar chính: Danh mục công cụ */}
        <div
          className="h-full border-r border-border bg-card/92 backdrop-blur-md overflow-hidden"
          style={{ width: leftPanelWidth }}
        >
          <ManualLeftPanel subOpen={subOpen} setSubOpen={setSubOpen} />
        </div>

        {/* Sidebar phụ: Hướng dẫn & Thiết lập */}
        <div
          className={`h-full shrink-0 overflow-hidden border-r border-border bg-card/90 backdrop-blur-md transition-all duration-500 ease-in-out ${
            isSubPanelVisible ? 'w-[min(340px,40vw)] xl:w-[340px] opacity-100' : 'w-0 opacity-0'
          }`}
        >
          <ManualLeftSubPanel />
        </div>

        {/* Nút ẩn/hiện Sidebar Trái */}
        <button
          onClick={() => {
            if (leftOpen) {
              if (isSubPanelVisible) {
                setSubOpen(false)
              } else {
                setLeftOpen(false)
              }
            } else {
              setLeftOpen(true)
              setSubOpen(true)
            }
          }}
          className="pointer-events-auto absolute top-1/2 right-0 translate-x-full z-[101] flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-r-2xl border border-l-0 border-border bg-card/95 p-3 text-muted-foreground shadow-xl backdrop-blur-sm transition-all hover:bg-primary hover:text-primary-foreground"
        >
          {leftOpen ? <ChevronLeft size={24} /> : <ChevronRight size={24} />}
        </button>
      </div>

      {/* Sidebar Phải */}
      <div
        className="absolute top-0 right-0 bottom-0 z-[100] border-l border-border bg-card/92 shadow-2xl backdrop-blur-md transition-transform duration-500 ease-in-out"
        style={{
          width: rightPanelWidth,
          transform: rightOpen ? 'translateX(0)' : `translateX(${rightPanelWidth})`,
        }}
      >
        <div className="h-full w-full overflow-hidden">
          <ManualRightPanel />
        </div>

        <button
          onClick={() => setRightOpen(!rightOpen)}
          className="pointer-events-auto absolute top-1/2 -left-10 z-[101] flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-l-2xl border border-r-0 border-border bg-card/95 p-3 text-muted-foreground shadow-xl backdrop-blur-sm transition-all hover:bg-primary hover:text-primary-foreground"
        >
          {rightOpen ? <ChevronRight size={24} /> : <ChevronLeft size={24} />}
        </button>
      </div>
    </div>
  )
}
