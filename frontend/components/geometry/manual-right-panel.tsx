'use client'

import { useEffect, useMemo, useState } from 'react'
import { Box, Circle, Pentagon, ChevronRight, ChevronUp, ChevronDown, PencilRuler, Pyramid, Save, Trash2, Triangle, Square, Eye, EyeOff, GripVertical, Layers, Scissors, Lock, Unlock } from 'lucide-react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useProjectStore } from '@/hooks/use-project-store'
import { useGeometry, SectionData } from './geometry-context'
import {
  ManualPoint,
  ManualPolygon,
  ManualSegment,
  ManualSolid,
  ManualCircle,
  serializeManualProject,
} from './manual-editor'
import { ChunkTree } from './right-sidebar'

function formatCoord(value: number) {
  if (Number.isNaN(value) || !Number.isFinite(value)) return '0'
  return Number(value.toFixed(2)).toString()
}

function getSolidDisplayName(
  solid: ManualSolid,
  pointPositions: Record<string, [number, number, number]>,
) {
  if (solid.solidType === 'pyramid') {
    if (solid.createdByTool === 'rightPyramid') return 'Ch\u00f3p vu\u00f4ng'
    return 'Ch\u00f3p'
  }
  if (solid.solidType === 'regularPyramid') return 'Ch\u00f3p \u0111\u1ec1u'
  if (solid.solidType === 'prism') return 'L\u0103ng tr\u1ee5'

  if (!solid.cornerPointIds) return 'H\u00ecnh h\u1ed9p'
  const start = pointPositions[solid.cornerPointIds[0]]
  const opposite = pointPositions[solid.cornerPointIds[1]]
  if (!start || !opposite) return 'H\u00ecnh h\u1ed9p'

  const width = Math.abs(opposite[0] - start[0])
  const depth = Math.abs(opposite[1] - start[1])
  const height = Math.abs(solid.height ?? 0)
  const isCube =
    Math.abs(width - depth) < 1e-6 &&
    Math.abs(width - height) < 1e-6

  return isCube ? 'L\u1eadp ph\u01b0\u01a1ng' : 'H\u00ecnh h\u1ed9p'
}

function TypePill({
  icon,
  label,
}: {
  icon: React.ReactNode
  label: string
}) {
  return (
    <div className="flex w-auto min-w-[72px] shrink-0 items-center gap-1.5 rounded-lg border border-border/70 bg-muted/35 px-2 py-1.5 text-[11px] font-medium text-muted-foreground lg:w-[84px]">
      <span className="flex h-4 w-4 items-center justify-center text-foreground shrink-0">{icon}</span>
      <span className="truncate">{label}</span>
    </div>
  )
}

function PointRow({
  point,
  coords,
  selected,
  onSelect,
  onDelete,
  onApply,
  onRename,
  onUpdateT,
  tVal,
  onUpdateAngle,
  angleVal,
  onAddDependentPoint,
  onToggleVisibility,
  onToggleLocked,
}: {
  point: ManualPoint
  coords: [number, number, number]
  selected: boolean
  onSelect: () => void
  onDelete: () => void
  onApply: (coords: [number, number, number]) => void
  onRename: (newLabel: string) => void
  onUpdateT?: (val: number) => void
  tVal?: number
  onUpdateAngle?: (val: number) => void
  angleVal?: number
  onAddDependentPoint?: () => void
  onToggleVisibility: () => void
  onToggleLocked: () => void
}) {
  const [cx, cy, cz] = coords
  const [isFocused, setIsFocused] = useState(false)
  const [draft, setDraft] = useState({
    x: formatCoord(cx),
    y: formatCoord(cy),
    z: formatCoord(cz),
  })
  const [labelDraft, setLabelDraft] = useState(point.label)

  useEffect(() => {
    setLabelDraft(point.label)
  }, [point.label])

  const handleFocus = () => {
    setIsFocused(true)
    setDraft({
      x: formatCoord(cx),
      y: formatCoord(cy),
      z: formatCoord(cz),
    })
  }

  const commit = () => {
    setIsFocused(false)
    const x = Number(draft.x)
    const y = Number(draft.y)
    const z = Number(draft.z)
    if ([x, y, z].some((value) => Number.isNaN(value))) return
    onApply([x, y, z])
  }

  const commitLabel = () => {
    const trimmed = labelDraft.trim()
    if (trimmed && trimmed !== point.label) {
      onRename(trimmed)
    }
  }

  const isFree = point.pointKind === 'free'
  const isConstrained = ['segment', 'circlePoint', 'circleAngleDependent', 'sphereRingPoint', 'sphereAngleDependent'].includes(point.pointKind)
  const isDerived = !isFree && !isConstrained

  return (
    <div
      className={`group flex flex-col rounded-xl border transition-all ${
        selected
          ? 'border-red-500/35 bg-red-500/10 shadow-sm'
          : isDerived
            ? 'border-dashed border-muted-foreground/30 bg-background/40 hover:border-primary/20 hover:bg-accent/10 opacity-85 hover:opacity-100'
            : 'border-border/70 bg-background/88 hover:border-primary/20 hover:bg-accent/20'
      }`}
    >
      <div className="grid gap-2 px-2.5 py-2 lg:grid-cols-[80px_34px_minmax(0,1fr)_92px] lg:items-center lg:gap-2">
        <div className="flex items-center gap-2 lg:contents">
          <button onClick={onSelect} className="shrink-0 text-left">
            <TypePill
              icon={<Circle size={13} fill="currentColor" />}
              label={isFree ? 'Tự do' : isConstrained ? 'Trên hình' : 'Phụ thuộc'}
            />
          </button>

          <Input
            value={labelDraft}
            onChange={(event) => setLabelDraft(event.target.value)}
            onBlur={commitLabel}
            onKeyDown={(event) => event.key === 'Enter' && commitLabel()}
            onClick={onSelect}
            className="h-7 min-w-0 flex-1 border-none bg-transparent p-0 text-left text-[15px] font-semibold tracking-tight focus-visible:bg-background/80 focus-visible:ring-1 focus-visible:ring-primary/30 lg:w-full lg:flex-none lg:truncate"
            title="Click để đổi tên điểm"
          />

          <div className="flex shrink-0 items-center justify-end gap-1 lg:col-start-4 lg:gap-1.5">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onToggleVisibility()
              }}
              className="flex min-h-8 min-w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
              title={point.visible ? 'Ẩn điểm' : 'Hiện điểm'}
            >
              {point.visible ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>
            {!isDerived && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleLocked()
                }}
                className={`flex min-h-8 min-w-8 items-center justify-center rounded-md transition-colors ${point.locked ? 'text-amber-500 hover:bg-amber-500/10' : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'}`}
                title={point.locked ? 'Mở khóa điểm' : 'Khóa điểm'}
              >
                {point.locked ? <Lock size={14} /> : <Unlock size={14} />}
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              className="flex min-h-8 min-w-8 items-center justify-center rounded-md text-destructive/70 opacity-100 transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/50 lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100"
              title="Xóa điểm"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        <div className="grid min-w-0 grid-cols-3 gap-1.5 lg:col-start-3 lg:row-start-1">
          <Input
            value={isFocused ? draft.x : formatCoord(cx)}
            onFocus={handleFocus}
            onChange={(event) => setDraft((current) => ({ ...current, x: event.target.value }))}
            onBlur={commit}
            onKeyDown={(event) => event.key === 'Enter' && commit()}
            placeholder="x"
            disabled={!isFree || point.locked}
            className="h-8 rounded-md border-border/70 bg-background px-1.5 text-center text-xs disabled:opacity-60"
          />
          <Input
            value={isFocused ? draft.y : formatCoord(cy)}
            onFocus={handleFocus}
            onChange={(event) => setDraft((current) => ({ ...current, y: event.target.value }))}
            onBlur={commit}
            onKeyDown={(event) => event.key === 'Enter' && commit()}
            placeholder="y"
            disabled={!isFree || point.locked}
            className="h-8 rounded-md border-border/70 bg-background px-1.5 text-center text-xs disabled:opacity-60"
          />
          <Input
            value={isFocused ? draft.z : formatCoord(cz)}
            onFocus={handleFocus}
            onChange={(event) => setDraft((current) => ({ ...current, z: event.target.value }))}
            onBlur={commit}
            onKeyDown={(event) => event.key === 'Enter' && commit()}
            placeholder="z"
            disabled={!isFree || point.locked}
            className="h-8 rounded-md border-border/70 bg-background px-1.5 text-center text-xs disabled:opacity-60"
          />
        </div>
      </div>

      {selected && onUpdateT !== undefined && (
        <div className="mt-2 pl-6 pr-2 py-2 border-t border-border/50 bg-muted/20">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[11px] text-muted-foreground uppercase font-semibold">Tỷ lệ trên đoạn thẳng</span>
            <span className="text-[11px] font-mono font-medium text-primary">{(tVal ?? 0.5).toFixed(2)}</span>
          </div>
          <div className="flex gap-2 items-center">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={tVal ?? 0.5}
              onChange={(e) => onUpdateT(parseFloat(e.target.value))}
              className="flex-1 h-1 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>
        </div>
      )}

      {selected && onUpdateAngle !== undefined && angleVal !== undefined && (
        <div className="mt-2 pl-6 pr-2 py-2 border-t border-border/50 bg-muted/20">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[11px] text-muted-foreground uppercase font-semibold">Góc (độ)</span>
            <span className="text-[11px] font-mono font-medium text-primary">{(angleVal * 180 / Math.PI).toFixed(1)}°</span>
          </div>
          <div className="flex gap-2 items-center">
            <input
              type="range"
              min="-180"
              max="180"
              step="1"
              value={(angleVal * 180 / Math.PI).toFixed(0)}
              onChange={(e) => onUpdateAngle(parseFloat(e.target.value) * Math.PI / 180)}
              className="flex-1 h-1 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <input
              type="number"
              value={(angleVal * 180 / Math.PI).toFixed(0)}
              onChange={(e) => {
                const val = parseFloat(e.target.value)
                if (!isNaN(val)) onUpdateAngle(val * Math.PI / 180)
              }}
              className="h-8 w-14 rounded border bg-background px-1 text-right text-xs font-mono"
            />
          </div>
          {onAddDependentPoint && (
            <div className="mt-2 text-right">
              <Button
                variant="outline"
                size="sm"
                className="h-8 border-border/70 bg-background px-2 text-xs"
                onClick={(e) => {
                  e.stopPropagation()
                  onAddDependentPoint()
                }}
              >
                + Tạo điểm phụ thuộc góc α
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ObjectRow({
  typeLabel,
  icon,
  name,
  values,
  selected,
  onSelect,
  onDelete,
  onUpdateHeight,
  heightVal,
  solid,
  onAddRing,
  onUpdateRing,
  onRemoveRing,
  onToggleVisibility,
  onRename,
  basePoints = [],
}: {
  typeLabel: string
  icon: React.ReactNode
  name: string
  values: string[]
  selected: boolean
  onSelect: () => void
  onDelete: () => void
  onUpdateHeight?: (newHeight: number) => void
  heightVal?: number
  solid?: any
  onAddRing?: () => void
  onUpdateRing?: (ringId: string, phi: number, theta: number) => void
  onRemoveRing?: (ringId: string) => void
  onToggleVisibility: () => void
  onRename: (newName: string) => void
  basePoints?: string[]
}) {
  const [heightDraft, setHeightDraft] = useState(heightVal ? heightVal.toString() : '')
  const [labelDraft, setLabelDraft] = useState(name)

  useEffect(() => {
    if (heightVal !== undefined) setHeightDraft(heightVal.toString())
  }, [heightVal])

  useEffect(() => {
    setLabelDraft(name)
  }, [name])

  const commitHeight = () => {
    const numeric = Number(heightDraft)
    if (Number.isFinite(numeric) && numeric > 0 && onUpdateHeight && heightVal !== undefined) {
      onUpdateHeight(numeric)
    }
  }

  const commitLabel = () => {
    const trimmed = labelDraft.trim().substring(0, 30)
    if (trimmed && trimmed !== name) {
      onRename(trimmed)
    }
  }

  const isEditable = onUpdateHeight !== undefined && heightVal !== undefined

  return (
    <div
      onClick={onSelect}
      className={`flex flex-col gap-2 rounded-xl border p-3 transition-all cursor-pointer ${
        selected
          ? 'border-primary/35 bg-primary/10 shadow-sm'
          : 'border-border/70 bg-background/88 hover:border-primary/20 hover:bg-accent/20'
      }`}
    >
      {/* Row 1: Icon/Type, Name, Actions */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <TypePill icon={icon} label={typeLabel} />
          <Input
            value={labelDraft}
            onChange={(event) => setLabelDraft(event.target.value)}
            onBlur={commitLabel}
            onKeyDown={(event) => event.key === 'Enter' && commitLabel()}
            onClick={(e) => {
              e.stopPropagation()
              onSelect()
            }}
            maxLength={30}
            className="h-7 border-none bg-transparent p-0 text-left text-[14px] font-semibold tracking-tight focus-visible:ring-1 focus-visible:ring-primary/30 focus-visible:bg-background/80 truncate w-full"
            title="Click để đổi tên hình"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg border border-border/70 text-muted-foreground hover:text-foreground"
            onClick={onToggleVisibility}
            title={solid?.visible ? 'Ẩn hình 3D' : 'Hiện hình 3D'}
          >
            {solid?.visible ? <Eye size={14} /> : <EyeOff size={14} />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg border border-border/70 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
            onClick={onDelete}
            title="Xóa hình 3D"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      </div>

      {/* Row 2: Base Points */}
      {basePoints.length > 0 && (
        <div 
          className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none" 
          style={{ maxWidth: '100%' }}
          onClick={e => e.stopPropagation()}
        >
          {basePoints.map((label, idx) => (
            <div
              key={`${name}-pt-${label}-${idx}`}
              className="flex h-6 w-6 min-w-[24px] items-center justify-center rounded-md border border-zinc-700/60 bg-zinc-950 text-[11px] font-extrabold text-zinc-100 select-none shadow-sm"
            >
              {label}
            </div>
          ))}
        </div>
      )}

      {/* Row 3: Values */}
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((value, idx) => (
            <span
              key={`${name}-${value}-${idx}`}
              className="inline-flex h-7 items-center rounded-md border border-border/70 bg-background px-2 text-[11px] font-medium text-foreground"
            >
              {value}
            </span>
          ))}
        </div>
      )}

      {isEditable && (
        <div className="mt-1 flex flex-wrap items-center gap-2 rounded bg-background/50 p-2 shadow-inner" onClick={e => e.stopPropagation()}>
          <label className="text-[11px] font-medium text-muted-foreground">Chiều cao:</label>
          <input
            type="number"
            step="0.5"
            className="h-6 w-16 rounded border bg-background px-1.5 text-[11px] font-semibold tracking-tight outline-none focus:border-primary/50"
            value={heightDraft}
            onChange={(e) => setHeightDraft(e.target.value)}
            onBlur={commitHeight}
            onKeyDown={(e) => e.key === 'Enter' && commitHeight()}
          />
        </div>
      )}

      {selected && solid?.solidType === 'sphere' && (
        <div className="col-span-full mt-2 border-t border-border/50 bg-muted/20 p-2">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[11px] text-muted-foreground uppercase font-semibold">Các đường tròn</span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 border-border/70 bg-background px-2 text-xs"
              onClick={(e) => {
                e.stopPropagation()
                onAddRing?.()
              }}
            >
              + Thêm
            </Button>
          </div>
          <div className="flex flex-col gap-2">
            {solid.sphereRings?.map((ring: any) => {
              const degreesTheta = (ring.theta * 180 / Math.PI).toFixed(0)
              const degreesPhi = (ring.phi * 180 / Math.PI).toFixed(0)
              return (
                <div key={ring.id} className="flex flex-col gap-1.5 bg-background p-2 rounded border border-border/70 group">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[11px] font-medium truncate flex-1" title={ring.label}>{ring.label}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onRemoveRing?.(ring.id)
                      }}
                      className="flex min-h-8 min-w-8 items-center justify-center rounded-md text-destructive/70 opacity-100 transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/50 lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100"
                      aria-label="Xóa đường tròn"
                      title="Xóa đường tròn"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className="w-6 text-[11px] text-muted-foreground">Dọc</span>
                    <input
                      type="range"
                      min="-180"
                      max="180"
                      step="1"
                      value={degreesTheta}
                      onChange={(e) => {
                        const rad = parseFloat(e.target.value) * Math.PI / 180
                        onUpdateRing?.(ring.id, ring.phi, rad)
                      }}
                      className="flex-1 h-1 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <input
                      type="number"
                      value={degreesTheta}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value)
                        if (!isNaN(val)) onUpdateRing?.(ring.id, ring.phi, val * Math.PI / 180)
                      }}
                      className="h-8 w-14 rounded border bg-background px-1 text-right text-xs font-mono"
                    />
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className="w-6 text-[11px] text-muted-foreground">Ngang</span>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      step="1"
                      value={degreesPhi}
                      onChange={(e) => {
                        const rad = parseFloat(e.target.value) * Math.PI / 180
                        onUpdateRing?.(ring.id, rad, ring.theta)
                      }}
                      className="flex-1 h-1 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <input
                      type="number"
                      value={degreesPhi}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value)
                        if (!isNaN(val)) onUpdateRing?.(ring.id, val * Math.PI / 180, ring.theta)
                      }}
                      className="h-8 w-14 rounded border bg-background px-1 text-right text-xs font-mono"
                    />
                  </div>
                </div>
              )
            })}
            {!solid.sphereRings?.length && (
              <span className="text-[11px] text-muted-foreground italic">Chưa có đường tròn nào</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function SegmentRow({
  segment,
  typeLabel,
  values,
  selected,
  onSelect,
  onDelete,
  onUpdateLength,
  lengthVal,
  onToggleVisibility,
}: {
  segment: ManualSegment
  typeLabel: string
  values: string[]
  selected: boolean
  onSelect: () => void
  onDelete: () => void
  onUpdateLength?: (newLength: number) => void
  lengthVal?: number
  onToggleVisibility: () => void
}) {
  const [lengthDraft, setLengthDraft] = useState(lengthVal ? lengthVal.toString() : '')

  useEffect(() => {
    if (lengthVal !== undefined) {
      setLengthDraft(lengthVal.toString())
    }
  }, [lengthVal])

  const commitLength = () => {
    const numeric = Number(lengthDraft)
    if (Number.isFinite(numeric) && numeric > 0 && onUpdateLength && lengthVal !== undefined) {
      onUpdateLength(numeric)
    }
  }

  const isEditable = onUpdateLength !== undefined && lengthVal !== undefined
  const displayLabel = segment.label.replace(/-/g, '')

  return (
    <div
      className={`flex flex-col gap-2 rounded-xl border px-2.5 py-2 transition-all lg:grid lg:items-center lg:gap-2 ${
        isEditable
          ? 'lg:grid-cols-[80px_60px_minmax(0,1fr)_80px_72px]'
          : 'lg:grid-cols-[80px_88px_minmax(0,1fr)_72px]'
      } ${
        selected
          ? 'border-primary/35 bg-primary/10 shadow-sm'
          : 'border-border/70 bg-background/88 hover:border-primary/20 hover:bg-accent/20'
      }`}
    >
      <div className="flex min-w-0 items-center gap-2 lg:contents">
        <button onClick={onSelect} className="shrink-0 text-left">
          <TypePill icon={<PencilRuler size={13} />} label={typeLabel} />
        </button>

        <button onClick={onSelect} className="min-w-0 flex-1 truncate text-left text-[13px] font-semibold tracking-tight lg:flex-none">
          {displayLabel}
        </button>

        <div className={`flex shrink-0 items-center justify-end gap-1.5 lg:justify-end ${isEditable ? 'lg:col-start-5' : 'lg:col-start-4'}`}>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg border border-border/70 text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation()
              onToggleVisibility()
            }}
            title={segment.visible ? 'Ẩn đoạn thẳng' : 'Hiện đoạn thẳng'}
          >
            {segment.visible ? <Eye size={14} /> : <EyeOff size={14} />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg border border-border/70 text-destructive/70 hover:bg-destructive/10 hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 size={14} />
          </Button>
        </div>
      </div>

      <button onClick={onSelect} className="flex min-w-0 flex-wrap gap-1.5 text-left lg:col-start-3 lg:row-start-1">
        {values.map((value, idx) => (
          <span
            key={`${segment.label}-${value}-${idx}`}
            className="inline-flex h-7 items-center rounded-md border border-border/70 bg-background px-2 text-xs font-medium text-foreground"
          >
            {value}
          </span>
        ))}
      </button>

      {isEditable && (
        <div className="flex items-center gap-1 lg:col-start-4 lg:row-start-1" onClick={(e) => e.stopPropagation()}>
          <span className="text-[11px] text-muted-foreground">L:</span>
          <Input
            value={lengthDraft}
            onChange={(e) => setLengthDraft(e.target.value)}
            onBlur={commitLength}
            onKeyDown={(e) => e.key === 'Enter' && commitLength()}
            className="h-8 w-14 rounded-md border-border/70 bg-background px-1 text-center text-xs"
          />
        </div>
      )}
    </div>
  )
}

function CircleRow({
  circle,
  desc,
  selected,
  onSelect,
  onDelete,
  onUpdateRadius,
  radiusVal,
  onToggleVisibility,
  onRename,
  basePoints = [],
}: {
  circle: any
  desc: string
  selected: boolean
  onSelect: () => void
  onDelete: () => void
  onUpdateRadius?: (newRadius: number) => void
  radiusVal?: number
  onToggleVisibility: () => void
  onRename: (newName: string) => void
  basePoints?: string[]
}) {
  const [radiusDraft, setRadiusDraft] = useState(radiusVal ? radiusVal.toString() : '')
  const [labelDraft, setLabelDraft] = useState(circle.label)

  useEffect(() => {
    if (radiusVal !== undefined) {
      setRadiusDraft(radiusVal.toString())
    }
  }, [radiusVal])

  useEffect(() => {
    setLabelDraft(circle.label)
  }, [circle.label])

  const commitRadius = () => {
    const numeric = Number(radiusDraft)
    if (Number.isFinite(numeric) && numeric > 0 && onUpdateRadius && radiusVal !== undefined) {
      onUpdateRadius(numeric)
    }
  }

  const commitLabel = () => {
    const trimmed = labelDraft.trim().substring(0, 30)
    if (trimmed && trimmed !== circle.label) {
      onRename(trimmed)
    }
  }

  const isEditable = onUpdateRadius !== undefined && radiusVal !== undefined

  return (
    <div
      onClick={onSelect}
      className={`flex flex-col gap-2 rounded-xl border p-3 transition-all cursor-pointer ${
        selected
          ? 'border-primary/35 bg-primary/10 shadow-sm'
          : 'border-border/70 bg-background/88 hover:border-primary/20 hover:bg-accent/20'
      }`}
    >
      {/* Row 1: Icon/Type, Name, Actions */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <TypePill icon={<Circle size={13} />} label="Đường tròn" />
          <Input
            value={labelDraft}
            onChange={(event) => setLabelDraft(event.target.value)}
            onBlur={commitLabel}
            onKeyDown={(event) => event.key === 'Enter' && commitLabel()}
            onClick={(e) => {
              e.stopPropagation()
              onSelect()
            }}
            maxLength={30}
            className="h-7 border-none bg-transparent p-0 text-left text-[13px] font-semibold tracking-tight focus-visible:ring-1 focus-visible:ring-primary/30 focus-visible:bg-background/80 truncate w-full"
            title="Click để đổi tên hình"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg border border-border/70 text-muted-foreground hover:text-foreground"
            onClick={onToggleVisibility}
            title={circle.visible ? 'Ẩn đường tròn' : 'Hiện đường tròn'}
          >
            {circle.visible ? <Eye size={14} /> : <EyeOff size={14} />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg border border-border/70 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
            onClick={onDelete}
            title="Xóa đường tròn"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      </div>

      {/* Row 2: Base Points */}
      {basePoints.length > 0 && (
        <div 
          className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none" 
          style={{ maxWidth: '100%' }}
          onClick={e => e.stopPropagation()}
        >
          {basePoints.map((label, idx) => (
            <div
              key={`${circle.label}-pt-${label}-${idx}`}
              className="flex h-6 w-6 min-w-[24px] items-center justify-center rounded-md border border-zinc-700/60 bg-zinc-950 text-[11px] font-extrabold text-zinc-100 select-none shadow-sm"
            >
              {label}
            </div>
          ))}
        </div>
      )}

      {/* Description */}
      <div className="text-[11px] text-muted-foreground font-medium">
        {desc}
      </div>

      {isEditable && (
        <div className="mt-1 flex flex-wrap items-center gap-2 rounded bg-background/50 p-2 shadow-inner" onClick={e => e.stopPropagation()}>
          <label className="text-[11px] font-medium text-muted-foreground">R:</label>
          <input
            type="number"
            step="0.5"
            className="h-6 w-16 rounded border bg-background px-1.5 text-[11px] font-semibold tracking-tight outline-none focus:border-primary/50"
            value={radiusDraft}
            onChange={(e) => setRadiusDraft(e.target.value)}
            onBlur={commitRadius}
            onKeyDown={(e) => e.key === 'Enter' && commitRadius()}
          />
        </div>
      )}
    </div>
  )
}


function PolygonRow({
  polygon,
  typeLabel,
  icon,
  selected,
  onSelect,
  onDelete,
  isSpecialShape,
  onToggleVisibility,
  onRename,
  basePoints = [],
}: {
  polygon: ManualPolygon
  typeLabel: string
  icon: React.ReactNode
  selected: boolean
  onSelect: () => void
  onDelete: () => void
  isSpecialShape: boolean
  onToggleVisibility: () => void
  onRename: (newName: string) => void
  basePoints?: string[]
}) {
  const [labelDraft, setLabelDraft] = useState(polygon.label)

  useEffect(() => {
    setLabelDraft(polygon.label)
  }, [polygon.label])

  const commitLabel = () => {
    const trimmed = labelDraft.trim().substring(0, 30)
    if (trimmed && trimmed !== polygon.label) {
      onRename(trimmed)
    }
  }

  return (
    <div
      onClick={onSelect}
      className={`flex flex-col gap-2 rounded-xl border p-3 transition-all cursor-pointer ${
        selected
          ? 'border-primary/35 bg-primary/10 shadow-sm'
          : 'border-border/70 bg-background/88 hover:border-primary/20 hover:bg-accent/20'
      }`}
    >
      {/* Row 1: Icon/Type, Name, Actions */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <TypePill icon={icon} label={typeLabel} />
          <Input
            value={labelDraft}
            onChange={(event) => setLabelDraft(event.target.value)}
            onBlur={commitLabel}
            onKeyDown={(event) => event.key === 'Enter' && commitLabel()}
            onClick={(e) => {
              e.stopPropagation()
              onSelect()
            }}
            maxLength={30}
            className="h-7 border-none bg-transparent p-0 text-left text-[13px] font-semibold tracking-tight focus-visible:ring-1 focus-visible:ring-primary/30 focus-visible:bg-background/80 truncate w-full"
            title="Click để đổi tên hình"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg border border-border/70 text-muted-foreground hover:text-foreground"
            onClick={onToggleVisibility}
            title={polygon.visible ? 'Ẩn đa giác' : 'Hiện đa giác'}
          >
            {polygon.visible ? <Eye size={14} /> : <EyeOff size={14} />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg border border-border/70 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
            onClick={onDelete}
            title="Xóa đa giác"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      </div>

      {/* Row 2: Base Points */}
      {basePoints.length > 0 && (
        <div 
          className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none" 
          style={{ maxWidth: '100%' }}
          onClick={e => e.stopPropagation()}
        >
          {basePoints.map((label, idx) => (
            <div
              key={`${polygon.label}-pt-${label}-${idx}`}
              className="flex h-6 w-6 min-w-[24px] items-center justify-center rounded-md border border-zinc-700/60 bg-zinc-950 text-[11px] font-extrabold text-zinc-100 select-none shadow-sm"
            >
              {label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


export function ManualRightPanel() {
  const {
    manualDocument,
    manualDerived,
    manualSelection,
    setManualSelection,
    removeManualEntity,
    updatePointPosition,
    renameManualEntity,
    updateSegmentLength,
    updateSolidHeight,
    updateManualSolidCuts,
    updateCircleRadius,
    updatePointT,
    updatePointAngle,
    createSphereAngleDependentPoint,
    createCircleAngleDependentPoint,
    addSphereRing,
    removeSphereRing,
    updateSphereRingOrientation,
    showAxes,
    showGrid,
    showLabels,
    bitmaskVisibility,
    setBitmaskVisibility,
    toggleManualVisibility,
    toggleManualLocked,
  } = useGeometry()
  const { addProject } = useProjectStore()

  const solidsWithCuts = useMemo(() => {
    return manualDocument.solids.filter(s => s.cuts && s.cuts.some(c => c.visible))
  }, [manualDocument.solids])

  const [projectName, setProjectName] = useState('Bản vẽ tự vẽ')
  const [isSaving, setIsSaving] = useState(false)

  const migrateVisibility = (solidId: string, oldCuts: import('./manual-editor').ManualCut[], newCuts: import('./manual-editor').ManualCut[]) => {
    const next: Record<string, boolean> = { ...bitmaskVisibility }
    const numNew = newCuts.length
    if (numNew === 0) return next

    const numOld = oldCuts.length
    const numBits = 1 << numNew

    for (let i = 0; i < numBits; i++) {
      const bitStr = i.toString(2).padStart(numNew, '0')
      const key = `${solidId}_${bitStr}`

      if (numOld === 0) {
        next[key] = true
        continue
      }

      let compatibleOldBits: string[] = []
      for (let j = 0; j < (1 << numOld); j++) {
        const oldBitStr = j.toString(2).padStart(numOld, '0')
        let match = true
        for (let k = 0; k < numNew; k++) {
          const planeId = newCuts[k].id
          const oldIdx = oldCuts.findIndex(c => c.id === planeId)
          if (oldIdx !== -1) {
            if (oldBitStr[oldIdx] !== bitStr[k]) {
              match = false
              break
            }
          }
        }
        if (match) compatibleOldBits.push(oldBitStr)
      }

      if (compatibleOldBits.length === 0) {
        next[key] = true
      } else {
        const isVisible = compatibleOldBits.some(b => bitmaskVisibility[`${solidId}_${b}`] !== false)
        next[key] = isVisible
      }
    }
    return next
  }

  const onDragEnd = (solidId: string, allCuts: import('./manual-editor').ManualCut[], result: DropResult) => {
    if (!result.destination) return

    // Extract visible cuts and hidden cuts to keep them
    const visibleCuts = allCuts.filter(c => c.visible)
    const hiddenCuts = allCuts.filter(c => !c.visible)

    const items = Array.from(visibleCuts)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    const nextVis = migrateVisibility(solidId, visibleCuts, items)
    setBitmaskVisibility(nextVis)
    
    // Merge back the hidden ones (we just append them)
    updateManualSolidCuts(solidId, [...items, ...hiddenCuts])
  }

  const moveCut = (solidId: string, allCuts: import('./manual-editor').ManualCut[], index: number, direction: -1 | 1) => {
    const visibleCuts = allCuts.filter(c => c.visible)
    const hiddenCuts = allCuts.filter(c => !c.visible)
    const destinationIndex = index + direction

    if (destinationIndex < 0 || destinationIndex >= visibleCuts.length) return

    const items = Array.from(visibleCuts)
    const [movedItem] = items.splice(index, 1)
    items.splice(destinationIndex, 0, movedItem)

    const nextVis = migrateVisibility(solidId, visibleCuts, items)
    setBitmaskVisibility(nextVis)
    updateManualSolidCuts(solidId, [...items, ...hiddenCuts])
  }

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    points: true,
    segments: true,
    shapes2D: true,
    solids3D: true,
    cuts: true,
  })

  const pointLabelMap = useMemo(() => {
    return Object.fromEntries(
      manualDocument.points.map((point) => [point.id, point.label]),
    ) as Record<string, string>
  }, [manualDocument.points])

  const panelPoints = useMemo(() => {
    const seenLabels = new Set<string>()
    return manualDocument.points.filter((point) => {
      if (point.trackable === false) return false
      if (seenLabels.has(point.label)) return false
      seenLabels.add(point.label)
      return true
    })
  }, [manualDocument.points])

  const updatePointCoords = (pointId: string, newCoords: [number, number, number]) => {
    updatePointPosition(pointId, newCoords)
  }

  const totalEntities =
    manualDocument.points.filter((p) => p.trackable !== false).length +
    manualDocument.segments.length +
    (manualDocument.polygons?.filter((p: ManualPolygon) => !p.internal).length ?? 0) +
    (manualDocument.circles?.length ?? 0) +
    manualDocument.solids.length

  const polygonPointMap = useMemo(() => {
    return Object.fromEntries(
      manualDocument.polygons.map((polygon: ManualPolygon) => [
        polygon.id,
        polygon.pointIds.map((pid: string) => pointLabelMap[pid] ?? pid),
      ]),
    )
  }, [manualDocument.polygons, pointLabelMap])

  const solidValueMap = useMemo(() => {
    return Object.fromEntries(
      manualDocument.solids.map((solid: ManualSolid) => {
        const pts = solid.cornerPointIds ?? (solid as any).baseFacePointIds ?? []
        return [solid.id, pts.map((pid: string) => pointLabelMap[pid] ?? pid)]
      }),
    )
  }, [manualDocument.solids, pointLabelMap])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const json = serializeManualProject(manualDocument)
      await addProject({
        id: crypto.randomUUID(),
        name: projectName,
        problemText: '',
        geometryJson: json,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        thumbnail: '',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto space-y-3 p-3">
        <div className="border border-border/80 rounded-xl overflow-hidden bg-background/50">
          <button
            onClick={() => setOpenGroups({ ...openGroups, points: !openGroups.points })}
            className="w-full flex justify-between items-center px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all uppercase tracking-wider"
          >
            <span>Điểm</span>
            <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${openGroups.points ? 'rotate-90' : ''}`} />
          </button>
          {openGroups.points && (
            <div className="p-2 pt-1 flex flex-col gap-2 border-t border-border/40">
              {panelPoints.map((point) => {
                const coords = manualDerived.pointPositions[point.id] ?? [0, 0, 0]
                return (
                  <PointRow
                    key={point.id}
                    point={point}
                    coords={coords}
                    selected={manualSelection?.kind === 'point' && manualSelection.id === point.id}
                    onSelect={() => setManualSelection({ kind: 'point', id: point.id })}
                    onDelete={() => removeManualEntity('point', point.id)}
                    onApply={(newCoords) => updatePointCoords(point.id, newCoords)}
                    onRename={(newLabel) => renameManualEntity('point', point.id, newLabel)}
                    onUpdateT={
                      point.pointKind === 'segment' || point.pointKind === 'circlePoint' || point.pointKind === 'sphereRingPoint'
                        ? (newT) => updatePointT(point.id, newT)
                        : undefined
                    }
                    tVal={
                      point.pointKind === 'segment' ? point.t :
                      point.pointKind === 'circlePoint' ? point.t :
                      point.pointKind === 'sphereRingPoint' ? point.t :
                      undefined
                    }
                    onUpdateAngle={
                      point.pointKind === 'circleAngleDependent' || point.pointKind === 'sphereAngleDependent'
                        ? (newA) => updatePointAngle(point.id, newA)
                        : undefined
                    }
                    angleVal={
                      point.pointKind === 'circlePoint' ? point.t :
                      point.pointKind === 'circleAngleDependent' ? point.angleOffset :
                      point.pointKind === 'sphereRingPoint' ? point.t :
                      point.pointKind === 'sphereAngleDependent' ? point.angle :
                      point.angle
                    }
                    onAddDependentPoint={
                      point.pointKind === 'circlePoint'
                        ? () => {
                            const val = prompt('Nhập góc lệch α (độ) cho điểm phụ thuộc mới:', '60')
                            if (val !== null) {
                              const num = parseFloat(val)
                              if (!isNaN(num)) {
                                createCircleAngleDependentPoint(point.id, (num * Math.PI) / 180)
                              }
                            }
                          }
                        : (point.pointKind === 'sphereRingPoint'
                            ? () => {
                                const val = prompt('Nhập góc lệch α (độ) cho điểm phụ thuộc mới:', '60')
                                if (val !== null) {
                                  const num = parseFloat(val)
                                  if (!isNaN(num)) {
                                    createSphereAngleDependentPoint(point.id, (num * Math.PI) / 180)
                                  }
                                }
                              }
                            : undefined)
                    }
                    onToggleVisibility={() => toggleManualVisibility('point', point.id)}
                    onToggleLocked={() => toggleManualLocked('point', point.id)}
                  />
                )
              })}
            </div>
          )}
        </div>

        <div className="border border-border/80 rounded-xl overflow-hidden bg-background/50">
          <button
            onClick={() => setOpenGroups({ ...openGroups, segments: !openGroups.segments })}
            className="w-full flex justify-between items-center px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all uppercase tracking-wider"
          >
            <span>Đoạn thẳng và đường thẳng</span>
            <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${openGroups.segments ? 'rotate-90' : ''}`} />
          </button>
          {openGroups.segments && (
            <div className="p-2 pt-1 flex flex-col gap-2 border-t border-border/40">
              {manualDocument.segments.map((segment: ManualSegment) => {
              let typeLabel = 'Đoạn'
              let values = [
                pointLabelMap[segment.startPointId] ?? segment.startPointId,
                pointLabelMap[segment.endPointId] ?? segment.endPointId,
              ]

              const p1 = manualDocument.points.find((p) => p.id === segment.startPointId)
              const p2 = manualDocument.points.find((p) => p.id === segment.endPointId)

              let isEditable = false
              let lengthVal = 20

              if (segment.createdByTool === 'parallelLine') {
                typeLabel = 'Đ.Song song'
                const anchorLabel = p1?.anchorPointId ? pointLabelMap[p1.anchorPointId] ?? '?' : '?'
                const refSeg = p1?.sourceSegmentId ? manualDocument.segments.find(s => s.id === p1.sourceSegmentId) : null
                const refSegLabel = refSeg ? refSeg.label : '?'
                lengthVal = p2?.t ? Math.abs(p2.t) : 20
                values = [`Qua ${anchorLabel}`, `// ${refSegLabel}`]
                isEditable = true
              } else if (segment.createdByTool === 'perpendicularLine') {
                typeLabel = 'Đ.Vuông góc'
                const anchorLabel = p1?.anchorPointId ? pointLabelMap[p1.anchorPointId] ?? '?' : '?'
                const refSeg = p1?.sourceSegmentId ? manualDocument.segments.find(s => s.id === p1.sourceSegmentId) : null
                const refSegLabel = refSeg ? refSeg.label : '?'
                lengthVal = p2?.t ? Math.abs(p2.t) : 20
                values = [`Qua ${anchorLabel}`, `⊥ ${refSegLabel}`]
                isEditable = true
              } else if (segment.createdByTool === 'perpendicularBisector') {
                typeLabel = 'Đ.Trung trực'
                let refLabel = ''
                if (p1?.sourcePointIds && p1.sourcePointIds.length >= 2) {
                  const labels = p1.sourcePointIds.map((pid) => pointLabelMap[pid] ?? '?')
                  refLabel = `Của ${labels.join('')}`
                } else {
                  refLabel = 'Trung trực'
                }
                lengthVal = p2?.t ? Math.abs(p2.t) : 20
                values = [refLabel]
                isEditable = true
              } else if (segment.createdByTool === 'angleBisector') {
                typeLabel = 'Tia P.Giác'
                let refLabel = ''
                if (p2?.sourcePointIds && p2.sourcePointIds.length >= 3) {
                  const labels = p2.sourcePointIds.map((pid) => pointLabelMap[pid] ?? '?')
                  refLabel = `Góc ${labels.join('')}`
                } else {
                  refLabel = 'Phân giác'
                }
                lengthVal = p2?.t ? Math.abs(p2.t) : 20
                values = [refLabel]
                isEditable = true
              }

            return (
              <SegmentRow
                key={segment.id}
                segment={segment}
                typeLabel={typeLabel}
                values={values}
                selected={manualSelection?.kind === 'segment' && manualSelection.id === segment.id}
                onSelect={() => setManualSelection({ kind: 'segment', id: segment.id })}
                onDelete={() => removeManualEntity('segment', segment.id)}
                onUpdateLength={isEditable ? (newLen) => updateSegmentLength(segment.id, newLen) : undefined}
                lengthVal={isEditable ? lengthVal : undefined}
                onToggleVisibility={() => toggleManualVisibility('segment', segment.id)}
              />
            )
          })}
        </div>
      )}
          </div>

          {((manualDocument.polygons && manualDocument.polygons.length > 0) || (manualDocument.circles && manualDocument.circles.length > 0)) && (
            <div className="border border-border/80 rounded-xl overflow-hidden bg-background/50">
              <button
                onClick={() => setOpenGroups({ ...openGroups, shapes2D: !openGroups.shapes2D })}
                className="w-full flex justify-between items-center px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all uppercase tracking-wider"
              >
                <span>Hình 2D</span>
                <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${openGroups.shapes2D ? 'rotate-90' : ''}`} />
              </button>
              {openGroups.shapes2D && (
                <div className="p-2 pt-1 flex flex-col gap-2 border-t border-border/40">
                  {manualDocument.polygons.filter((polygon: ManualPolygon) => !polygon.internal).map((polygon: ManualPolygon) => {
                    const numPoints = polygon.pointIds.length
                    const typeLabel = numPoints === 3 ? 'Tam giác' : numPoints === 4 ? 'Tứ giác' : 'Đa giác'
                    const IconComponent = numPoints === 3 ? Triangle : numPoints === 4 ? Square : Pentagon
                    return (
                      <PolygonRow
                        key={polygon.id}
                        polygon={polygon}
                        typeLabel={typeLabel}
                        icon={<IconComponent size={14} />}
                        basePoints={polygonPointMap[polygon.id] ?? []}
                        selected={manualSelection?.kind === 'polygon' && manualSelection.id === polygon.id}
                        onSelect={() => setManualSelection({ kind: 'polygon', id: polygon.id })}
                        onDelete={() => removeManualEntity('polygon', polygon.id)}
                        isSpecialShape={true}
                        onToggleVisibility={() => toggleManualVisibility('polygon', polygon.id)}
                        onRename={(newName: string) => renameManualEntity('polygon', polygon.id, newName)}
                      />
                    )
                  })}
                  {manualDocument.circles && manualDocument.circles.map((circle: ManualCircle) => {
                    const centerLabel = circle.centerPointId ? pointLabelMap[circle.centerPointId] ?? '?' : '?'
                    const radiusPointLabel = circle.radiusPointId ? pointLabelMap[circle.radiusPointId] ?? '?' : '?'
                    let desc = ''
                    let isEditable = false
                    let circlePoints: string[] = []

                    if (circle.circleKind === 'threePoints') {
                      const labels = circle.sourcePointIds?.map((pid: string) => pointLabelMap[pid] ?? '?') ?? []
                      desc = `Qua ${labels.join(', ')}`
                      circlePoints = circle.sourcePointIds?.map((pid: string) => pointLabelMap[pid] ?? '?') ?? []
                    } else if (circle.circleKind === 'centerRadius') {
                      desc = `Tâm ${centerLabel}`
                      isEditable = true
                      circlePoints = [centerLabel]
                    } else {
                      desc = `Tâm ${centerLabel}, qua ${radiusPointLabel}`
                      circlePoints = [centerLabel, radiusPointLabel]
                    }

                    return (
                      <CircleRow
                        key={circle.id}
                        circle={circle}
                        desc={desc}
                        basePoints={circlePoints}
                        selected={manualSelection?.kind === 'circle' && manualSelection.id === circle.id}
                        onSelect={() => setManualSelection({ kind: 'circle', id: circle.id })}
                        onDelete={() => removeManualEntity('circle', circle.id)}
                        onUpdateRadius={isEditable ? (newRad) => updateCircleRadius(circle.id, newRad) : undefined}
                        radiusVal={isEditable ? Number(circle.radius) : undefined}
                        onToggleVisibility={() => toggleManualVisibility('circle', circle.id)}
                        onRename={(newName: string) => renameManualEntity('circle', circle.id, newName)}
                      />
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {solidsWithCuts.length > 0 && (
            <div className="border border-border/80 rounded-xl overflow-hidden bg-background/50">
              <button
                onClick={() => setOpenGroups({ ...openGroups, cuts: !openGroups.cuts })}
                className="w-full flex justify-between items-center px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all uppercase tracking-wider"
              >
                <span>Lát cắt</span>
                <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${openGroups.cuts ? 'rotate-90' : ''}`} />
              </button>
              {openGroups.cuts && (
                <div className="p-2 pt-1 flex flex-col gap-4 border-t border-border/40">
                  {solidsWithCuts.map(solid => {
                    const solidCuts = solid.cuts!.filter(c => c.visible)
                    const N = solidCuts.length
                    return (
                      <div key={solid.id} className="space-y-2 border border-border/60 rounded-lg p-2 bg-card/60">
                        <div className="flex justify-between items-center mb-2 pb-1 border-b border-border/40">
                          <span className="font-bold text-xs">{getSolidDisplayName(solid, manualDerived.pointPositions)} - {solid.label}</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500/70 hover:text-red-500 hover:bg-red-500/10" onClick={() => updateManualSolidCuts(solid.id, [])}>
                            <Trash2 size={12} />
                          </Button>
                        </div>
                        
                        <DragDropContext onDragEnd={(result) => onDragEnd(solid.id, solid.cuts!, result)}>
                          <Droppable droppableId={`cuts-${solid.id}`}>
                            {(provided) => (
                              <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-1.5 mb-2">
                                {solidCuts.map((cut, index) => {
                                  const label = cut.planePointIds.slice(0, 3).join('') || `P`
                                  return (
                                    <Draggable key={cut.id} draggableId={cut.id} index={index}>
                                      {(provided, snapshot) => (
                                        <div
                                          ref={provided.innerRef}
                                          {...provided.draggableProps}
                                          className={`flex items-center gap-2 px-2 py-1.5 rounded-md border text-[11px] font-mono ${snapshot.isDragging ? 'bg-accent/20 border-accent text-accent shadow-md' : 'bg-card border-border/60 hover:bg-accent/5 hover:border-accent/30'}`}
                                        >
                                          <div {...provided.dragHandleProps} className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing p-0.5">
                                            <GripVertical size={12} />
                                          </div>
                                          <span className="font-bold w-4 text-muted-foreground">{index + 1}.</span>
                                          <span className="flex-1">Cắt bởi ({label})</span>
                                          <div className="ml-auto flex items-center gap-1 lg:hidden">
                                            <button
                                              type="button"
                                              onClick={() => moveCut(solid.id, solid.cuts!, index, -1)}
                                              disabled={index === 0}
                                              aria-label={`Đưa lát cắt ${label} lên trên`}
                                              className="flex min-h-8 min-w-8 items-center justify-center rounded-md border border-border/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 disabled:cursor-not-allowed disabled:opacity-35"
                                            >
                                              <ChevronUp size={13} />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => moveCut(solid.id, solid.cuts!, index, 1)}
                                              disabled={index === solidCuts.length - 1}
                                              aria-label={`Đưa lát cắt ${label} xuống dưới`}
                                              className="flex min-h-8 min-w-8 items-center justify-center rounded-md border border-border/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 disabled:cursor-not-allowed disabled:opacity-35"
                                            >
                                              <ChevronDown size={13} />
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                    </Draggable>
                                  )
                                })}
                                {provided.placeholder}
                              </div>
                            )}
                          </Droppable>
                        </DragDropContext>

                        <ChunkTree
                          activeSectionsList={solidCuts.map(c => ({ id: c.id, cuttingPlane: c.planePointIds })) as any}
                          depth={0}
                          bitPrefix=""
                          bitmaskVisibility={bitmaskVisibility}
                          setBitmaskVisibility={setBitmaskVisibility}
                          totalActivePlanes={N}
                          baseId={solid.id}
                        />
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {manualDocument.solids && manualDocument.solids.length > 0 && (
            <div className="border border-border/80 rounded-xl overflow-hidden bg-background/50">
              <button
                onClick={() => setOpenGroups({ ...openGroups, solids3D: !openGroups.solids3D })}
                className="w-full flex justify-between items-center px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all uppercase tracking-wider"
              >
                <span>Hình 3D</span>
                <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${openGroups.solids3D ? 'rotate-90' : ''}`} />
              </button>
              {openGroups.solids3D && (
                <div className="p-2 pt-1 flex flex-col gap-2 border-t border-border/40">
                  {manualDocument.solids.map((solid: ManualSolid) => (
                    <ObjectRow
                      key={solid.id}
                      typeLabel={getSolidDisplayName(solid, manualDerived.pointPositions)}
                      icon={solid.solidType === 'pyramid' ? <Pyramid size={14} /> : <Box size={14} />}
                      name={solid.label}
                      values={[]}
                      basePoints={[]}
                      selected={manualSelection?.kind === 'solid' && manualSelection.id === solid.id}
                      onSelect={() => setManualSelection({ kind: 'solid', id: solid.id })}
                      onDelete={() => removeManualEntity('solid', solid.id)}
                      onUpdateHeight={solid.height !== undefined ? (newH) => updateSolidHeight(solid.id, newH) : undefined}
                      heightVal={solid.height}
                      solid={solid}
                      onAddRing={() => addSphereRing(solid.id)}
                      onUpdateRing={(ringId, phi, theta) => updateSphereRingOrientation(solid.id, ringId, phi, theta)}
                      onRemoveRing={(ringId) => removeSphereRing(solid.id, ringId)}
                      onToggleVisibility={() => toggleManualVisibility('solid', solid.id)}
                      onRename={(newName: string) => renameManualEntity('solid', solid.id, newName)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {totalEntities === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-background/75 px-6 py-12 text-center">
              <p className="text-base font-medium text-foreground">{'Ch\u01b0a c\u00f3 \u0111\u1ed1i t\u01b0\u1ee3ng n\u00e0o'}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {'Ch\u1ecdn c\u00f4ng c\u1ee5 b\u00ean tr\u00e1i ho\u1eb7c click tr\u1ef1c ti\u1ebfp tr\u00ean canvas \u0111\u1ec3 b\u1eaft \u0111\u1ea7u.'}
              </p>
            </div>
          ) : null}
      </div>

      <div className="mt-4 space-y-3 border-t border-border/70 pt-4">
        <Input
          value={projectName}
          onChange={(event) => setProjectName(event.target.value)}
          placeholder={'T\u00ean b\u1ea3n v\u1ebd'}
          className="h-11 rounded-xl"
        />
        <Button
          className="h-12 w-full rounded-xl text-sm font-bold"
          onClick={handleSave}
          disabled={isSaving || totalEntities === 0}
        >
          <Save size={16} />
          {isSaving ? '\u0110ang l\u01b0u...' : 'L\u01b0u b\u1ea3n v\u1ebd'}
        </Button>
      </div>
    </div>
  )
}
