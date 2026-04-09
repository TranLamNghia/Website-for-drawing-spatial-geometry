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
    <div className="h-screen bg-[#f8f9fa] overflow-hidden relative">
      <GeometryProvider>
        {/* Main Canvas (Background) */}
        <div className="absolute inset-0 z-0">
          <Canvas3D />
        </div>

        {/* Left Sidebar Overlay */}
        <div 
          className={`absolute left-0 top-0 bottom-0 z-30 transition-all duration-500 ease-in-out bg-white/90 backdrop-blur-md shadow-2xl flex-shrink-0 ${
            leftOpen ? 'w-96 translate-x-0 overflow-visible' : 'w-96 -translate-x-[384px] overflow-visible'
          } border-r border-[#ddd]`}
        >
          <div className="w-full h-full overflow-y-auto">
            <LeftSidebar />
          </div>
          
          {/* Toggle Button */}
          <button 
            onClick={() => setLeftOpen(!leftOpen)}
            className="absolute -right-10 top-1/2 -translate-y-1/2 z-40 bg-white/95 backdrop-blur-sm border border-l-0 border-[#ddd] shadow-xl rounded-r-2xl p-3 hover:bg-[#6671d1] hover:text-white transition-all text-gray-500 flex items-center justify-center group"
            title={leftOpen ? "Thu gọn thanh bên trái" : "Mở thanh bên trái"}
          >
            {leftOpen ? <ChevronLeft size={24} className="group-hover:scale-110 transition-transform" /> : <ChevronRight size={24} className="group-hover:scale-110 transition-transform" />}
          </button>
        </div>

        {/* Right Sidebar Overlay */}
        <div 
          className={`absolute right-0 top-0 bottom-0 z-30 transition-all duration-500 ease-in-out bg-white/90 backdrop-blur-md shadow-2xl flex-shrink-0 ${
            rightOpen ? 'w-96 translate-x-0 overflow-visible' : 'w-96 translate-x-[384px] overflow-visible'
          } border-l border-[#ddd]`}
        >
          <div className="w-full h-full overflow-y-auto">
            <RightSidebar />
          </div>

          {/* Toggle Button */}
          <button 
            onClick={() => setRightOpen(!rightOpen)}
            className="absolute -left-10 top-1/2 -translate-y-1/2 z-40 bg-white/95 backdrop-blur-sm border border-r-0 border-[#ddd] shadow-xl rounded-l-2xl p-3 hover:bg-[#6671d1] hover:text-white transition-all text-gray-500 flex items-center justify-center group"
            title={rightOpen ? "Thu gọn thanh bên phải" : "Mở thanh bên phải"}
          >
            {rightOpen ? <ChevronRight size={24} className="group-hover:scale-110 transition-transform" /> : <ChevronLeft size={24} className="group-hover:scale-110 transition-transform" />}
          </button>
        </div>
      </GeometryProvider>
    </div>
  )
}
