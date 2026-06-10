'use client'

import { useEffect, useMemo, useState } from 'react'
import { Box, Circle, Pentagon, ChevronRight, PencilRuler, Pyramid, Save, Trash2, Triangle, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useProjectStore } from '@/hooks/use-project-store'
import { useGeometry } from './geometry-context'
import {
  ManualPoint,
  ManualPolygon,
  ManualSegment,
  ManualSolid,
  ManualCircle,
  serializeManualProject,
} from './manual-editor'

function formatCoord(value: number) {
  if (Number.isNaN(value) || !Number.isFinite(value)) return '0'
  return Number(value.toFixed(2)).toString()
}

function getSolidDisplayName(
  solid: ManualSolid,
  pointPositions: Record<string, [number, number, number]>,
) {
  if (solid.solidType === 'pyramid') return 'Ch\u00f3p'
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
    <div className="flex min-w-[72px] items-center gap-1.5 rounded-lg border border-border/70 bg-muted/35 px-2 py-1.5 text-[10px] font-medium text-muted-foreground">
      <span className="flex h-4 w-4 items-center justify-center text-foreground">{icon}</span>
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

  return (
    <div
      className={`group flex flex-col rounded-xl border transition-all ${
        selected
          ? 'border-primary/35 bg-primary/10 shadow-sm'
          : 'border-border/70 bg-background/88 hover:border-primary/20 hover:bg-accent/20'
      }`}
    >
      <div className="grid grid-cols-[80px_34px_minmax(0,1fr)_36px] items-center gap-2.5 px-2.5 py-2">
        <button onClick={onSelect} className="text-left">
          <TypePill icon={<Circle size={13} fill="currentColor" />} label={'\u0110i\u1ec3m'} />
        </button>

        <Input
          value={labelDraft}
          onChange={(event) => setLabelDraft(event.target.value)}
          onBlur={commitLabel}
          onKeyDown={(event) => event.key === 'Enter' && commitLabel()}
          onClick={onSelect}
          className="h-7 border-none bg-transparent p-0 text-left text-[15px] font-semibold tracking-tight focus-visible:ring-1 focus-visible:ring-primary/30 focus-visible:bg-background/80 truncate w-full"
          title="Click để đổi tên điểm"
        />

        <div className="grid min-w-0 grid-cols-3 gap-1.5">
          <Input
            value={isFocused ? draft.x : formatCoord(cx)}
            onFocus={handleFocus}
            onChange={(event) => setDraft((current) => ({ ...current, x: event.target.value }))}
            onBlur={commit}
            onKeyDown={(event) => event.key === 'Enter' && commit()}
            placeholder="x"
            className="h-7 rounded-md border-border/70 bg-background px-1.5 text-center text-[11px]"
          />
          <Input
            value={isFocused ? draft.y : formatCoord(cy)}
            onFocus={handleFocus}
            onChange={(event) => setDraft((current) => ({ ...current, y: event.target.value }))}
            onBlur={commit}
            onKeyDown={(event) => event.key === 'Enter' && commit()}
            placeholder="y"
            className="h-7 rounded-md border-border/70 bg-background px-1.5 text-center text-[11px]"
          />
          <Input
            value={isFocused ? draft.z : formatCoord(cz)}
            onFocus={handleFocus}
            onChange={(event) => setDraft((current) => ({ ...current, z: event.target.value }))}
            onBlur={commit}
            onKeyDown={(event) => event.key === 'Enter' && commit()}
            placeholder="z"
            className="h-7 rounded-md border-border/70 bg-background px-1.5 text-center text-[11px]"
          />
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="p-1 rounded-md text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
          title="Xóa điểm"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {selected && onUpdateT !== undefined && (
        <div className="mt-2 pl-6 pr-2 py-2 border-t border-border/50 bg-muted/20">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold">Tỷ lệ trên đoạn thẳng</span>
            <span className="text-[10px] font-mono font-medium text-primary">{(tVal ?? 0.5).toFixed(2)}</span>
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
            <span className="text-[10px] text-muted-foreground uppercase font-semibold">Góc (độ)</span>
            <span className="text-[10px] font-mono font-medium text-primary">{(angleVal * 180 / Math.PI).toFixed(1)}°</span>
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
              className="w-12 h-6 text-[10px] font-mono text-right rounded border bg-background px-1"
            />
          </div>
          {onAddDependentPoint && (
            <div className="mt-2 text-right">
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-[10px] px-2 border-border/70 bg-background"
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
}) {
  const [heightDraft, setHeightDraft] = useState(heightVal ? heightVal.toString() : '')

  useEffect(() => {
    if (heightVal !== undefined) setHeightDraft(heightVal.toString())
  }, [heightVal])

  const commitHeight = () => {
    const numeric = Number(heightDraft)
    if (Number.isFinite(numeric) && numeric > 0 && onUpdateHeight && heightVal !== undefined) {
      onUpdateHeight(numeric)
    }
  }

  const isEditable = onUpdateHeight !== undefined && heightVal !== undefined

  return (
    <div
      className={`grid grid-cols-[80px_88px_minmax(0,1fr)_36px] items-center gap-2.5 rounded-xl border px-2.5 py-2 transition-all ${
        selected
          ? 'border-primary/35 bg-primary/10 shadow-sm'
          : 'border-border/70 bg-background/88 hover:border-primary/20 hover:bg-accent/20'
      }`}
    >
      <button onClick={onSelect} className="text-left">
        <TypePill icon={icon} label={typeLabel} />
      </button>

      <button onClick={onSelect} className="truncate text-left text-[13px] font-semibold tracking-tight">
        {name}
      </button>

      <button onClick={onSelect} className="flex min-w-0 flex-wrap gap-1.5 text-left">
        {values.map((value, idx) => (
          <span
            key={`${name}-${value}-${idx}`}
            className="inline-flex h-7 items-center rounded-md border border-border/70 bg-background px-2 text-[11px] font-medium text-foreground"
          >
            {value}
          </span>
        ))}
      </button>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-lg border border-border/70"
        onClick={onDelete}
      >
        <Trash2 size={14} />
      </Button>

      {isEditable && (
        <div className="col-span-full mt-1.5 flex flex-wrap items-center gap-2 rounded bg-background/50 p-2 shadow-inner">
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
            <span className="text-[10px] text-muted-foreground uppercase font-semibold">Các đường tròn</span>
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-[10px] px-2 border-border/70 bg-background"
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
                      className="p-1 rounded-md text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                      title="Xóa đường tròn"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className="text-[10px] text-muted-foreground w-6">Dọc</span>
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
                      className="w-12 h-6 text-[10px] font-mono text-right rounded border bg-background px-1"
                    />
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className="text-[10px] text-muted-foreground w-6">Ngang</span>
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
                      className="w-12 h-6 text-[10px] font-mono text-right rounded border bg-background px-1"
                    />
                  </div>
                </div>
              )
            })}
            {!solid.sphereRings?.length && (
              <span className="text-[10px] text-muted-foreground italic">Chưa có đường tròn nào</span>
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
}: {
  segment: ManualSegment
  typeLabel: string
  values: string[]
  selected: boolean
  onSelect: () => void
  onDelete: () => void
  onUpdateLength?: (newLength: number) => void
  lengthVal?: number
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

  return (
    <div
      className={`grid ${
        isEditable
          ? 'grid-cols-[80px_60px_minmax(0,1fr)_80px_36px]'
          : 'grid-cols-[80px_88px_minmax(0,1fr)_36px]'
      } items-center gap-2 rounded-xl border px-2.5 py-2 transition-all ${
        selected
          ? 'border-primary/35 bg-primary/10 shadow-sm'
          : 'border-border/70 bg-background/88 hover:border-primary/20 hover:bg-accent/20'
      }`}
    >
      <button onClick={onSelect} className="text-left">
        <TypePill icon={<PencilRuler size={13} />} label={typeLabel} />
      </button>

      <button onClick={onSelect} className="truncate text-left text-[13px] font-semibold tracking-tight">
        {segment.label}
      </button>

      <button onClick={onSelect} className="flex min-w-0 flex-wrap gap-1.5 text-left">
        {values.map((value, idx) => (
          <span
            key={`${segment.label}-${value}-${idx}`}
            className="inline-flex h-7 items-center rounded-md border border-border/70 bg-background px-2 text-[11px] font-medium text-foreground"
          >
            {value}
          </span>
        ))}
      </button>

      {isEditable && (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <span className="text-[10px] text-muted-foreground">L:</span>
          <Input
            value={lengthDraft}
            onChange={(e) => setLengthDraft(e.target.value)}
            onBlur={commitLength}
            onKeyDown={(e) => e.key === 'Enter' && commitLength()}
            className="h-7 w-12 rounded-md border-border/70 bg-background px-1 text-center text-[11px]"
          />
        </div>
      )}

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-lg border border-border/70"
        onClick={onDelete}
      >
        <Trash2 size={14} />
      </Button>
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
}: {
  circle: any
  desc: string
  selected: boolean
  onSelect: () => void
  onDelete: () => void
  onUpdateRadius?: (newRadius: number) => void
  radiusVal?: number
}) {
  const [radiusDraft, setRadiusDraft] = useState(radiusVal ? radiusVal.toString() : '')

  useEffect(() => {
    if (radiusVal !== undefined) {
      setRadiusDraft(radiusVal.toString())
    }
  }, [radiusVal])

  const commitRadius = () => {
    const numeric = Number(radiusDraft)
    if (Number.isFinite(numeric) && numeric > 0 && onUpdateRadius && radiusVal !== undefined) {
      onUpdateRadius(numeric)
    }
  }

  const isEditable = onUpdateRadius !== undefined && radiusVal !== undefined

  return (
    <div
      className={`grid ${
        isEditable
          ? 'grid-cols-[80px_76px_minmax(0,1fr)_80px_36px]'
          : 'grid-cols-[80px_88px_minmax(0,1fr)_36px]'
      } items-center gap-2 rounded-xl border px-2.5 py-2 transition-all ${
        selected
          ? 'border-primary/35 bg-primary/10 shadow-sm'
          : 'border-border/70 bg-background/88 hover:border-primary/20 hover:bg-accent/20'
      }`}
    >
      <button onClick={onSelect} className="text-left">
        <TypePill icon={<Circle size={13} />} label="Đường tròn" />
      </button>

      <button onClick={onSelect} className="truncate text-left text-[13px] font-semibold tracking-tight">
        {circle.label}
      </button>

      <button onClick={onSelect} className="truncate text-left text-[11px] text-muted-foreground font-medium">
        {desc}
      </button>

      {isEditable && (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <span className="text-[10px] text-muted-foreground">R:</span>
          <Input
            value={radiusDraft}
            onChange={(e) => setRadiusDraft(e.target.value)}
            onBlur={commitRadius}
            onKeyDown={(e) => e.key === 'Enter' && commitRadius()}
            className="h-7 w-12 rounded-md border-border/70 bg-background px-1 text-center text-[11px]"
          />
        </div>
      )}

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-lg border border-border/70"
        onClick={onDelete}
      >
        <Trash2 size={14} />
      </Button>
    </div>
  )
}


function PolygonRow({
  polygon,
  typeLabel,
  icon,
  values,
  selected,
  onSelect,
  onDelete,
  isSpecialShape,
}: {
  polygon: ManualPolygon
  typeLabel: string
  icon: React.ReactNode
  values: string[]
  selected: boolean
  onSelect: () => void
  onDelete: () => void
  isSpecialShape: boolean
}) {
  return (
    <div
      className={`flex flex-col gap-2 rounded-xl border px-2.5 py-2 transition-all ${
        selected
          ? 'border-primary/35 bg-primary/10 shadow-sm'
          : 'border-border/70 bg-background/88 hover:border-primary/20 hover:bg-accent/20'
      }`}
    >
      <div className="grid grid-cols-[80px_88px_minmax(0,1fr)_36px] items-center gap-2.5">
        <button onClick={onSelect} className="text-left">
          <TypePill icon={icon} label={typeLabel} />
        </button>

        <button onClick={onSelect} className="truncate text-left text-[13px] font-semibold tracking-tight">
          {polygon.label}
        </button>

        <button onClick={onSelect} className="flex min-w-0 flex-wrap gap-1.5 text-left">
          {values.map((value, idx) => (
            <span
              key={`${polygon.label}-${value}-${idx}`}
              className="inline-flex h-7 items-center rounded-md border border-border/70 bg-background px-2 text-[11px] font-medium text-foreground"
            >
              {value}
            </span>
          ))}
        </button>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg border border-border/70"
          onClick={onDelete}
        >
          <Trash2 size={14} />
        </Button>
      </div>
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
    updateCircleRadius,
    updatePointT,
    updatePointAngle,
    createSphereAngleDependentPoint,
    addSphereRing,
    removeSphereRing,
    updateSphereRingOrientation,
    showAxes,
    showGrid,
    showLabels,
  } = useGeometry()
  const { addProject } = useProjectStore()

  const [projectName, setProjectName] = useState('Bản vẽ tự vẽ')
  const [isSaving, setIsSaving] = useState(false)

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    points: true,
    segments: true,
    polygons: true,
    solids: true,
  })

  const pointLabelMap = useMemo(() => {
    return Object.fromEntries(
      manualDocument.points.map((point) => [point.id, point.label]),
    ) as Record<string, string>
  }, [manualDocument.points])

  const polygonPointMap = useMemo(() => {
    return Object.fromEntries(
      manualDocument.polygons.map((polygon) => [
        polygon.id,
        polygon.pointIds.map((pointId) => pointLabelMap[pointId] ?? pointId),
      ]),
    ) as Record<string, string[]>
  }, [manualDocument.polygons, pointLabelMap])

  const solidValueMap = useMemo(() => {
    const generatedPoints = manualDerived.displayPoints.filter(
      (point) => point.sourceKind === 'solid' && point.generated,
    )

    const generatedBySolid = generatedPoints.reduce<Record<string, string[]>>((acc, point) => {
      acc[point.sourceId] = [...(acc[point.sourceId] ?? []), point.label]
      return acc
    }, {})

    const result: Record<string, string[]> = {}
    manualDocument.solids.forEach((solid) => {
      if (solid.solidType === 'box') {
        result[solid.id] = generatedBySolid[solid.id] ?? []
        return
      }
      const baseLabels = solid.basePolygonId ? polygonPointMap[solid.basePolygonId] ?? [] : []
      result[solid.id] = [...baseLabels, ...(generatedBySolid[solid.id] ?? [])]
    })
    return result
  }, [manualDerived.displayPoints, manualDocument.solids, polygonPointMap])

  const totalEntities =
    manualDocument.points.filter(p => p.visible !== false).length +
    manualDocument.segments.length +
    manualDocument.polygons.length +
    manualDocument.solids.length +
    (manualDocument.circles?.length ?? 0)

  const handleSave = () => {
    setIsSaving(true)
    const ok = addProject({
      id: crypto.randomUUID(),
      name: projectName.trim() || 'B\u1ea3n v\u1ebd t\u1ef1 v\u1ebd',
      problemText: '',
      geometryJson: serializeManualProject(manualDocument, {
        showAxes,
        showGrid,
        showLabels,
      }),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    setIsSaving(false)

    if (!ok) {
      alert('\u0110\u00e3 \u0111\u1ea1t gi\u1edbi h\u1ea1n 10 b\u1ea3n v\u1ebd l\u01b0u tr\u00ean tr\u00ecnh duy\u1ec7t n\u00e0y.')
      return
    }

    alert('\u0110\u00e3 l\u01b0u b\u1ea3n v\u1ebd t\u1ef1 v\u1ebd.')
  }

  return (
    <div className="flex h-full flex-col overflow-hidden px-4 py-5">
      <div className="px-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">{'Th\u00f4ng tin h\u00ecnh'}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {'Hi\u1ec3n th\u1ecb lo\u1ea1i \u0111\u1ed1i t\u01b0\u1ee3ng, t\u00ean v\u00e0 d\u1eef li\u1ec7u h\u00ecnh h\u1ecdc.'}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex-1 overflow-y-auto pr-1">
        <div className="space-y-3">
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
                {manualDocument.points.filter(p => p.visible !== false).map((point) => {
            const coords = manualDerived.pointPositions[point.id]
            if (!coords) return null

            return (
              <PointRow
                key={point.id}
                point={point}
                coords={coords}
                selected={manualSelection?.kind === 'point' && manualSelection.id === point.id}
                onSelect={() => setManualSelection({ kind: 'point', id: point.id })}
                onDelete={() => removeManualEntity('point', point.id)}
                onApply={(nextCoords) => updatePointPosition(point.id, nextCoords)}
                onRename={(newLabel) => renameManualEntity('point', point.id, newLabel)}
                onUpdateT={(point.pointKind === 'segment' || point.pointKind === 'midpoint') ? (newT) => updatePointT(point.id, newT) : undefined}
                tVal={point.t}
                onUpdateAngle={(point.pointKind === 'sphereRingPoint' || point.pointKind === 'sphereAngleDependent') ? (newA) => updatePointAngle(point.id, newA) : undefined}
                angleVal={point.angle}
                onAddDependentPoint={point.pointKind === 'sphereRingPoint' ? () => createSphereAngleDependentPoint(point.id) : undefined}
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
            let typeLabel = '\u0110o\u1ea1n'
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
              />
            )
          })}
              </div>
            )}
          </div>

          <div className="border border-border/80 rounded-xl overflow-hidden bg-background/50">
            <button
              onClick={() => setOpenGroups({ ...openGroups, polygons: !openGroups.polygons })}
              className="w-full flex justify-between items-center px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all uppercase tracking-wider"
            >
              <span>Mặt phẳng</span>
              <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${openGroups.polygons ? 'rotate-90' : ''}`} />
            </button>
            {openGroups.polygons && (
              <div className="p-2 pt-1 flex flex-col gap-2 border-t border-border/40">
                {manualDocument.polygons.map((polygon: ManualPolygon) => {
            const numPoints = polygon.pointIds.length
            const typeLabel = numPoints === 3 ? 'Tam giác' : numPoints === 4 ? 'Tứ giác' : 'Đa giác'
            const IconComponent = numPoints === 3 ? Triangle : numPoints === 4 ? Square : Pentagon
            return (
              <PolygonRow
                key={polygon.id}
                polygon={polygon}
                typeLabel={typeLabel}
                icon={<IconComponent size={14} />}
                values={polygonPointMap[polygon.id] ?? []}
                selected={manualSelection?.kind === 'polygon' && manualSelection.id === polygon.id}
                onSelect={() => setManualSelection({ kind: 'polygon', id: polygon.id })}
                onDelete={() => removeManualEntity('polygon', polygon.id)}
                isSpecialShape={true}
              />
            )
          })}
              </div>
            )}
          </div>

          <div className="border border-border/80 rounded-xl overflow-hidden bg-background/50">
            <button
              onClick={() => setOpenGroups({ ...openGroups, solids: !openGroups.solids })}
              className="w-full flex justify-between items-center px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all uppercase tracking-wider"
            >
              <span>Khối</span>
              <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${openGroups.solids ? 'rotate-90' : ''}`} />
            </button>
            {openGroups.solids && (
              <div className="p-2 pt-1 flex flex-col gap-2 border-t border-border/40">
                {manualDocument.solids.map((solid: ManualSolid) => (
            <ObjectRow
              key={solid.id}
              typeLabel={getSolidDisplayName(solid, manualDerived.pointPositions)}
              icon={solid.solidType === 'pyramid' ? <Pyramid size={14} /> : <Box size={14} />}
              name={solid.label}
              values={solidValueMap[solid.id] ?? []}
              selected={manualSelection?.kind === 'solid' && manualSelection.id === solid.id}
              onSelect={() => setManualSelection({ kind: 'solid', id: solid.id })}
              onDelete={() => removeManualEntity('solid', solid.id)}
              onUpdateHeight={solid.height !== undefined ? (newH) => updateSolidHeight(solid.id, newH) : undefined}
              heightVal={solid.height}
              solid={solid}
              onAddRing={() => addSphereRing(solid.id)}
              onUpdateRing={(ringId, phi, theta) => updateSphereRingOrientation(solid.id, ringId, phi, theta)}
              onRemoveRing={(ringId) => removeSphereRing(solid.id, ringId)}
            />
          ))}

          {manualDocument.circles?.map((circle: ManualCircle) => {
            const centerLabel = circle.centerPointId ? pointLabelMap[circle.centerPointId] ?? '?' : '?'
            const radiusPointLabel = circle.radiusPointId ? pointLabelMap[circle.radiusPointId] ?? '?' : '?'
            let desc = ''
            let isEditable = false
            if (circle.circleKind === 'threePoints') {
              const labels = circle.sourcePointIds?.map((pid: string) => pointLabelMap[pid] ?? '?') ?? []
              desc = `Qua ${labels.join(', ')}`
            } else if (circle.circleKind === 'centerRadius') {
              desc = `Tâm ${centerLabel}`
              isEditable = true
            } else {
              desc = `Tâm ${centerLabel}, qua ${radiusPointLabel}`
            }
            return (
              <CircleRow
                key={circle.id}
                circle={circle}
                desc={desc}
                selected={manualSelection?.kind === 'circle' && manualSelection.id === circle.id}
                onSelect={() => setManualSelection({ kind: 'circle', id: circle.id })}
                onDelete={() => removeManualEntity('circle', circle.id)}
                onUpdateRadius={isEditable ? (newRad) => updateCircleRadius(circle.id, newRad) : undefined}
                radiusVal={isEditable ? Number(circle.radius) : undefined}
              />
            )
          })}
              </div>
            )}
          </div>

          {totalEntities === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-background/75 px-6 py-12 text-center">
              <p className="text-base font-medium text-foreground">{'Ch\u01b0a c\u00f3 \u0111\u1ed1i t\u01b0\u1ee3ng n\u00e0o'}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {'Ch\u1ecdn c\u00f4ng c\u1ee5 b\u00ean tr\u00e1i ho\u1eb7c click tr\u1ef1c ti\u1ebfp tr\u00ean canvas \u0111\u1ec3 b\u1eaft \u0111\u1ea7u.'}
              </p>
            </div>
          ) : null}
        </div>
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
