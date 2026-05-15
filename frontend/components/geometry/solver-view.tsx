'use client'

import { useState, useCallback } from 'react'
import { SolveLeftPanel } from '@/components/geometry/solve/solve-left-panel'
import { Canvas3D } from '@/components/geometry/canvas-3d-r3f'
import { RightSidebar } from '@/components/geometry/right-sidebar'
import { useGeometry } from '@/components/geometry/geometry-context'
import { ChevronLeft, ChevronRight, GripVertical, ArrowLeft } from 'lucide-react'

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

  return (
    <div className={`h-screen bg-background text-foreground overflow-hidden relative ${isResizing ? 'cursor-col-resize select-none' : ''}`}>
      {/* Full-screen canvas layer (renders once; sidebars overlay on top) */}
      <div className="absolute inset-0 z-0">
        <Canvas3D />
      </div>

      {/* Back Button & Theme (overlay) */}
      <div className="absolute top-4 left-4 z-50 flex items-center gap-2 pointer-events-auto">
        <button
          onClick={onBack}
          className="flex items-center gap-2 h-10 px-4 bg-card/90 backdrop-blur-md border border-border rounded-xl text-[13px] font-bold text-foreground hover:bg-card transition-all shadow-lg"
        >
          <ArrowLeft size={16} />
          Trang chủ
        </button>
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
