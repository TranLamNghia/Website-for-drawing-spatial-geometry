'use client'
 
import { useState } from 'react'
import { LeftSidebar } from '@/components/geometry/left-sidebar'
import { Canvas3D } from '@/components/geometry/canvas-3d-r3f'
import { RightSidebar } from '@/components/geometry/right-sidebar'
import { GeometryProvider } from '@/components/geometry/geometry-context'
import { ChevronLeft, ChevronRight } from 'lucide-react'
 
export default function Home() {
  const [leftOpen, setLeftOpen] = useState(true)
  const [rightOpen, setRightOpen] = useState(true)

  return (
    <div className="h-screen bg-[#f8f9fa]">
      <GeometryProvider>
        <div className="flex h-screen overflow-hidden">
          {/* Left Sidebar */}
          <div 
            className={`transition-all duration-300 ease-in-out bg-white overflow-x-hidden flex-shrink-0 ${leftOpen ? 'w-96 border-r border-[#ddd]' : 'w-0 border-r-0'}`}
          >
            <div className="w-96 h-full overflow-y-auto">
              <LeftSidebar />
            </div>
          </div>
 
          {/* Center 3D Visualization */}
          <div className="flex-1 flex flex-col bg-white relative min-w-0">
            {/* Toggle Left Sidebar */}
            <button 
              onClick={() => setLeftOpen(!leftOpen)}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-white/90 backdrop-blur-sm border border-l-0 border-[#ddd] shadow-md rounded-r-xl p-2 hover:bg-gray-50 transition-colors text-gray-600 focus:outline-none"
              title={leftOpen ? "Thu gọn thanh bên trái" : "Mở thanh bên trái"}
            >
              {leftOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
            </button>

            <Canvas3D />

            {/* Toggle Right Sidebar */}
            <button 
              onClick={() => setRightOpen(!rightOpen)}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-white/90 backdrop-blur-sm border border-r-0 border-[#ddd] shadow-md rounded-l-xl p-2 hover:bg-gray-50 transition-colors text-gray-600 focus:outline-none"
              title={rightOpen ? "Thu gọn thanh bên phải" : "Mở thanh bên phải"}
            >
              {rightOpen ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </button>
          </div>
 
          {/* Right Sidebar */}
          <div 
            className={`transition-all duration-300 ease-in-out bg-white overflow-x-hidden flex-shrink-0 ${rightOpen ? 'w-96 border-l border-[#ddd]' : 'w-0 border-l-0'}`}
          >
            <div className="w-96 h-full overflow-y-auto">
              <RightSidebar />
            </div>
          </div>
        </div>
      </GeometryProvider>
    </div>
  )
}
