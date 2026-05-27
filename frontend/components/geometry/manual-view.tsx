'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ManualCanvas3D } from './manual-canvas-3d'
import { ManualLeftPanel } from './manual-left-panel'
import { ManualRightPanel } from './manual-right-panel'

interface ManualViewProps {
  onBack: () => void
  onSwitchToSolver: () => void
}

export function ManualView({ onBack, onSwitchToSolver }: ManualViewProps) {
  const [leftOpen, setLeftOpen] = useState(true)
  const [rightOpen, setRightOpen] = useState(true)

  return (
    <div className="relative h-screen overflow-hidden bg-background text-foreground">
      <div className="absolute inset-0 z-0">
        <ManualCanvas3D />
      </div>



      <div className="pointer-events-auto absolute top-4 right-4 z-50">
        <Button
          onClick={onSwitchToSolver}
          className="flex items-center gap-2 rounded-xl shadow-lg shadow-primary/20"
        >
          <Sparkles size={16} />
          {"D\u00f9ng AI gi\u1ea3i to\u00e1n"}
        </Button>
      </div>

      <div
        className={`absolute top-0 bottom-0 left-0 z-30 border-r border-border bg-card/92 shadow-xl backdrop-blur-md transition-transform duration-500 ease-in-out ${
          leftOpen ? 'translate-x-0' : '-translate-x-[320px]'
        }`}
        style={{ width: 320 }}
      >
        <div className="h-full w-full overflow-hidden">
          <ManualLeftPanel />
        </div>

        <button
          onClick={() => setLeftOpen(!leftOpen)}
          className="pointer-events-auto absolute top-1/2 -right-10 z-40 flex -translate-y-1/2 items-center justify-center rounded-r-2xl border border-l-0 border-border bg-card/95 p-3 text-muted-foreground shadow-xl transition-all hover:bg-primary hover:text-primary-foreground backdrop-blur-sm"
        >
          {leftOpen ? <ChevronLeft size={24} /> : <ChevronRight size={24} />}
        </button>
      </div>

      <div
        className="absolute top-0 right-0 bottom-0 z-30 border-l border-border bg-card/92 shadow-2xl backdrop-blur-md transition-transform duration-500 ease-in-out"
        style={{
          width: 440,
          transform: rightOpen ? 'translateX(0px)' : 'translateX(440px)',
        }}
      >
        <div className="h-full w-full overflow-hidden">
          <ManualRightPanel />
        </div>

        <button
          onClick={() => setRightOpen(!rightOpen)}
          className="pointer-events-auto absolute top-1/2 -left-10 z-40 flex -translate-y-1/2 items-center justify-center rounded-l-2xl border border-r-0 border-border bg-card/95 p-3 text-muted-foreground shadow-xl transition-all hover:bg-primary hover:text-primary-foreground backdrop-blur-sm"
        >
          {rightOpen ? <ChevronRight size={24} /> : <ChevronLeft size={24} />}
        </button>
      </div>
    </div>
  )
}
