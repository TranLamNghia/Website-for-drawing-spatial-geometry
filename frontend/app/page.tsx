'use client'
 
import { useState } from 'react'
import { LeftSidebar } from '@/components/geometry/left-sidebar'
import { Canvas3D } from '@/components/geometry/canvas-3d-r3f'
import { RightSidebar } from '@/components/geometry/right-sidebar'
import { GeometryProvider } from '@/components/geometry/geometry-context'
import { ThemeSwitcher } from '@/components/geometry/theme-switcher'
import { ChevronLeft, ChevronRight, GripVertical } from 'lucide-react'
 
export default function Home() {
  const [leftOpen, setLeftOpen] = useState(true)
  const [rightOpen, setRightOpen] = useState(true)
  const [rightWidth, setRightWidth] = useState(384) // Default 384px (w-96)
  const [isResizing, setIsResizing] = useState(false)

  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', stopResizing)
  }

  const stopResizing = () => {
    setIsResizing(false)
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', stopResizing)
  }

  const handleMouseMove = (e: MouseEvent) => {
    const newWidth = window.innerWidth - e.clientX
    if (newWidth > 300 && newWidth < window.innerWidth * 0.5) {
      setRightWidth(newWidth)
    }
  }

  return (
    <div className={`h-screen bg-background text-foreground overflow-hidden relative ${isResizing ? 'cursor-col-resize select-none' : ''}`}>
      <GeometryProvider>
        {/* Main Canvas (Background) */}
        <div className="absolute inset-0 z-0">
          <Canvas3D />
        </div>

        <div className="absolute top-6 z-50 transition-all duration-500" style={{ right: rightOpen ? `${rightWidth + 20}px` : '40px' }}>
          <ThemeSwitcher />
        </div>

        {/* Left Sidebar Overlay */}
        <div 
          className={`absolute left-0 top-0 bottom-0 z-30 transition-all duration-500 ease-in-out bg-card/90 backdrop-blur-md shadow-2xl flex-shrink-0 ${
            leftOpen ? 'w-96 translate-x-0 overflow-visible' : 'w-96 -translate-x-[384px] overflow-visible'
          } border-r border-border`}
        >
          <div className="w-full h-full overflow-y-auto">
            <LeftSidebar />
          </div>
          
          <button 
            onClick={() => setLeftOpen(!leftOpen)}
            className="absolute -right-10 top-1/2 -translate-y-1/2 z-40 bg-card/95 backdrop-blur-sm border border-l-0 border-border shadow-xl rounded-r-2xl p-3 hover:bg-primary hover:text-primary-foreground transition-all text-muted-foreground flex items-center justify-center group"
          >
            {leftOpen ? <ChevronLeft size={24} /> : <ChevronRight size={24} />}
          </button>
        </div>

        {/* Right Sidebar Overlay */}
        <div 
          className={`absolute right-0 top-0 bottom-0 z-30 bg-card/90 backdrop-blur-md shadow-2xl flex-shrink-0 border-l border-border transition-[transform,opacity] duration-500 ease-in-out ${
            rightOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none'
          }`}
          style={{ width: `${rightWidth}px` }}
        >
          {/* Resize Handle */}
          {rightOpen && (
            <div 
              onMouseDown={startResizing}
              className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/40 transition-colors z-50 group"
            >
              <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-4 h-12 rounded-full bg-border border border-border group-hover:bg-primary group-hover:border-primary transition-colors flex items-center justify-center">
                <GripVertical size={12} className="text-muted-foreground group-hover:text-primary-foreground" />
              </div>
            </div>
          )}

          <div className="w-full h-full overflow-y-auto">
            <RightSidebar />
          </div>

          <button 
            onClick={() => setRightOpen(!rightOpen)}
            className="absolute -left-10 top-1/2 -translate-y-1/2 z-40 bg-card/95 backdrop-blur-sm border border-r-0 border-border shadow-xl rounded-l-2xl p-3 hover:bg-primary hover:text-primary-foreground transition-all text-muted-foreground flex items-center justify-center group pointer-events-auto"
          >
            {rightOpen ? <ChevronRight size={24} /> : <ChevronLeft size={24} />}
          </button>
        </div>
      </GeometryProvider>
    </div>
  )
}
