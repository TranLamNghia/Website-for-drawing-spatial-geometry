'use client'

import { RotateCcw } from 'lucide-react'

interface EntityStyleControlsProps {
  color: string
  opacity: number
  hasCustom?: boolean
  onChange: (style: { color?: string | null; opacity?: number | null }) => void
  disabled?: boolean
}

export function EntityStyleControls({ color, opacity, hasCustom, onChange, disabled }: EntityStyleControlsProps) {
  return (
    <div
      className="mt-1 flex flex-col gap-2 rounded bg-background/50 p-2 shadow-inner"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-2">
        <label className="text-[11px] font-medium text-muted-foreground">Màu:</label>
        <input
          type="color"
          value={color}
          disabled={disabled}
          onChange={(e) => onChange({ color: e.target.value })}
          className="h-7 w-9 cursor-pointer rounded border border-border/70 bg-transparent p-0.5 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <span className="text-[11px] font-mono uppercase text-muted-foreground">{color}</span>
        <button
          type="button"
          disabled={disabled || !hasCustom}
          title="Khôi phục màu mặc định"
          onClick={() => onChange({ color: null, opacity: null })}
          className="ml-auto flex h-7 items-center gap-1 rounded border border-border/70 bg-background px-2 text-[11px] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
        >
          <RotateCcw size={11} /> Mặc định
        </button>
      </div>
      <div className="flex items-center gap-2">
        <label className="whitespace-nowrap text-[11px] font-medium text-muted-foreground">Độ trong suốt:</label>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={Math.round((1 - opacity) * 100)}
          disabled={disabled}
          onChange={(e) => onChange({ opacity: Number((1 - Number(e.target.value) / 100).toFixed(2)) })}
          className="h-1 flex-1 cursor-pointer appearance-none rounded-lg bg-border accent-primary disabled:opacity-50"
        />
        <span className="w-9 text-right text-[11px] font-mono text-muted-foreground">
          {Math.round((1 - opacity) * 100)}%
        </span>
      </div>
    </div>
  )
}
