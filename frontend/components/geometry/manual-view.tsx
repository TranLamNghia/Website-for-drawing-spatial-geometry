'use client'

import { ArrowLeft, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ManualCanvas3D } from './manual-canvas-3d'
import { ManualLeftPanel } from './manual-left-panel'
import { ManualRightPanel } from './manual-right-panel'

interface ManualViewProps {
  onBack: () => void
  onSwitchToSolver: () => void
}

export function ManualView({ onBack, onSwitchToSolver }: ManualViewProps) {
  return (
    <div className="h-screen bg-background text-foreground overflow-hidden flex flex-col">
      <header className="relative z-40 border-b border-border/60 bg-background/90 backdrop-blur-md">
        <div className="h-16 px-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={onBack}
              className="rounded-xl flex items-center gap-2"
            >
              <ArrowLeft size={16} />
              Trang chủ
            </Button>
            <div>
              <h1 className="text-sm font-bold tracking-tight">Workspace tự vẽ 3D</h1>
              <p className="text-[11px] text-muted-foreground">Công cụ dựng hình, canvas và panel thông tin hoạt động cùng một editor state.</p>
            </div>
          </div>

          <Button
            onClick={onSwitchToSolver}
            className="rounded-xl shadow-lg shadow-primary/20 flex items-center gap-2"
          >
            <Sparkles size={16} />
            Dùng AI giải toán
          </Button>
        </div>
      </header>

      <div className="flex-1 min-h-0 grid grid-cols-[320px_minmax(0,1fr)_340px]">
        <ManualLeftPanel />
        <div className="min-w-0 min-h-0 relative">
          <ManualCanvas3D />
        </div>
        <ManualRightPanel />
      </div>
    </div>
  )
}

