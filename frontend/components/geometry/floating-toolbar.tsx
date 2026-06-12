'use client'

import React from 'react'
import {
  Grid3x3,
  Axis3d,
  Type,
  RefreshCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip'

interface FloatingToolbarProps {
  showAxes: boolean
  setShowAxes: (v: boolean) => void
  showGrid: boolean
  setShowGrid: (v: boolean) => void
  showLabels: boolean
  setShowLabels: (v: boolean) => void
  onResetCamera: () => void
}

export function FloatingToolbar({
  showAxes, setShowAxes,
  showGrid, setShowGrid,
  showLabels, setShowLabels,
  onResetCamera
}: FloatingToolbarProps) {
  return (
    <TooltipProvider>
      <div className="flex bg-card/95 backdrop-blur-md border border-border rounded-2xl shadow-2xl p-1.5 items-center gap-1">
        
        {/* Toggle Axes */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={showAxes ? "default" : "ghost"}
              size="icon"
              onClick={() => setShowAxes(!showAxes)}
              className="w-9 h-9 rounded-xl"
            >
              <Axis3d size={18} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Ẩn/Hiện trục tọa độ</TooltipContent>
        </Tooltip>

        {/* Toggle Grid */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={showGrid ? "default" : "ghost"}
              size="icon"
              onClick={() => setShowGrid(!showGrid)}
              className="w-9 h-9 rounded-xl"
            >
              <Grid3x3 size={18} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Ẩn/Hiện lưới đáy</TooltipContent>
        </Tooltip>

        {/* Toggle Labels */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={showLabels ? "default" : "ghost"}
              size="icon"
              onClick={() => setShowLabels(!showLabels)}
              className="w-9 h-9 rounded-xl"
            >
              <Type size={18} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Ẩn/Hiện nhãn điểm</TooltipContent>
        </Tooltip>

        <div className="w-[1px] h-6 bg-border mx-1" />

        {/* Reset Camera */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onResetCamera}
              className="w-9 h-9 rounded-xl hover:text-primary"
            >
              <RefreshCcw size={18} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Đặt lại góc nhìn</TooltipContent>
        </Tooltip>

      </div>
    </TooltipProvider>
  )
}
