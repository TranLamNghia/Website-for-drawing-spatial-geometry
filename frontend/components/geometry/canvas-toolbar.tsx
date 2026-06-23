'use client'

import type * as React from 'react'
import { Compass, Crosshair, Eye, Layers, RefreshCcw } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useViewportTier } from '@/hooks/use-viewport-tier'

type CanvasToolbarProps = {
  showAxes: boolean
  onToggleAxes: () => void
  showGrid: boolean
  onToggleGrid: () => void
  showLabels: boolean
  onToggleLabels: () => void
  showGizmo: boolean
  onToggleGizmo: () => void
  onResetCamera: () => void
  gridLabel?: string
  resetLabel?: string
}

type ToolbarButtonProps = {
  active?: boolean
  destructive?: boolean
  label: string
  compact: boolean
  icon: React.ReactNode
  onClick: () => void
}

function ToolbarButton({
  active = false,
  destructive = false,
  label,
  compact,
  icon,
  onClick,
}: ToolbarButtonProps) {
  const button = (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-xl transition-all ${
        compact ? 'size-11' : 'p-2.5'
      } ${
        destructive
          ? 'text-muted-foreground hover:bg-destructive/10 hover:text-destructive'
          : active
            ? 'bg-primary/10 font-semibold text-primary'
            : 'text-muted-foreground hover:bg-muted'
      }`}
      title={label}
      aria-label={label}
      aria-pressed={destructive ? undefined : active}
    >
      {icon}
      {!compact && <span className="text-xs">{label}</span>}
    </button>
  )

  if (!compact) return button

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  )
}

export function CanvasToolbar({
  showAxes,
  onToggleAxes,
  showGrid,
  onToggleGrid,
  showLabels,
  onToggleLabels,
  showGizmo,
  onToggleGizmo,
  onResetCamera,
  gridLabel = 'Lưới đáy',
  resetLabel = 'Đặt lại',
}: CanvasToolbarProps) {
  const tier = useViewportTier()
  const compact = tier === 'mobile' || tier === 'tablet'

  return (
    <div
      className={`pointer-events-auto absolute left-1/2 z-50 w-[calc(100%-1.5rem)] -translate-x-1/2 sm:w-auto ${
        compact ? 'top-20' : 'top-5'
      }`}
    >
      <div className="mx-auto flex w-max max-w-full items-center gap-1 overflow-x-auto rounded-2xl border border-border bg-card/95 p-1.5 shadow-xl backdrop-blur-md">
        <ToolbarButton
          active={showAxes}
          compact={compact}
          icon={<Crosshair size={18} />}
          label="Trục tọa độ"
          onClick={onToggleAxes}
        />
        <div className="mx-1 h-4 w-px shrink-0 bg-border" />
        <ToolbarButton
          active={showGrid}
          compact={compact}
          icon={<Layers size={18} />}
          label={gridLabel}
          onClick={onToggleGrid}
        />
        <div className="mx-1 h-4 w-px shrink-0 bg-border" />
        <ToolbarButton
          active={showLabels}
          compact={compact}
          icon={<Eye size={18} />}
          label="Nhãn"
          onClick={onToggleLabels}
        />
        <ToolbarButton
          active={showGizmo}
          compact={compact}
          icon={<Compass size={18} />}
          label="Điều hướng"
          onClick={onToggleGizmo}
        />
        <div className="mx-2 h-6 w-px shrink-0 bg-border" />
        <ToolbarButton
          compact={compact}
          destructive
          icon={<RefreshCcw size={18} />}
          label={resetLabel}
          onClick={onResetCamera}
        />
      </div>
    </div>
  )
}
