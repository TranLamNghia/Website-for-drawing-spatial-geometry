'use client'

import { useEffect, useMemo, useState } from 'react'
import { Box, Circle, Pentagon, PencilRuler, Pyramid, Save, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useProjectStore } from '@/hooks/use-project-store'
import { useGeometry } from './geometry-context'
import {
  ManualPoint,
  ManualPolygon,
  ManualSegment,
  ManualSolid,
  serializeManualProject,
} from './manual-editor'

function formatCoord(value: number) {
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
  const height = Math.abs(solid.height)
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
}: {
  point: ManualPoint
  coords: [number, number, number]
  selected: boolean
  onSelect: () => void
  onDelete: () => void
  onApply: (coords: [number, number, number]) => void
}) {
  const [draft, setDraft] = useState({
    x: formatCoord(coords[0]),
    y: formatCoord(coords[1]),
    z: formatCoord(coords[2]),
  })

  useEffect(() => {
    setDraft({
      x: formatCoord(coords[0]),
      y: formatCoord(coords[1]),
      z: formatCoord(coords[2]),
    })
  }, [coords])

  const commit = () => {
    const x = Number(draft.x)
    const y = Number(draft.y)
    const z = Number(draft.z)
    if ([x, y, z].some((value) => Number.isNaN(value))) return
    onApply([x, y, z])
  }

  return (
    <div
      className={`grid grid-cols-[80px_34px_minmax(0,1fr)_36px] items-center gap-2.5 rounded-xl border px-2.5 py-2 transition-all ${
        selected
          ? 'border-primary/35 bg-primary/10 shadow-sm'
          : 'border-border/70 bg-background/88 hover:border-primary/20 hover:bg-accent/20'
      }`}
    >
      <button onClick={onSelect} className="text-left">
        <TypePill icon={<Circle size={13} fill="currentColor" />} label={'\u0110i\u1ec3m'} />
      </button>

      <button onClick={onSelect} className="truncate text-left text-[15px] font-semibold tracking-tight">
        {point.label}
      </button>

      <div className="grid min-w-0 grid-cols-3 gap-1.5">
        <Input
          value={draft.x}
          onChange={(event) => setDraft((current) => ({ ...current, x: event.target.value }))}
          onBlur={commit}
          onKeyDown={(event) => event.key === 'Enter' && commit()}
          placeholder="x"
          className="h-7 rounded-md border-border/70 bg-background px-1.5 text-center text-[11px]"
        />
        <Input
          value={draft.y}
          onChange={(event) => setDraft((current) => ({ ...current, y: event.target.value }))}
          onBlur={commit}
          onKeyDown={(event) => event.key === 'Enter' && commit()}
          placeholder="y"
          className="h-7 rounded-md border-border/70 bg-background px-1.5 text-center text-[11px]"
        />
        <Input
          value={draft.z}
          onChange={(event) => setDraft((current) => ({ ...current, z: event.target.value }))}
          onBlur={commit}
          onKeyDown={(event) => event.key === 'Enter' && commit()}
          placeholder="z"
          className="h-7 rounded-md border-border/70 bg-background px-1.5 text-center text-[11px]"
        />
      </div>

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

function ObjectRow({
  typeLabel,
  icon,
  name,
  values,
  selected,
  onSelect,
  onDelete,
}: {
  typeLabel: string
  icon: React.ReactNode
  name: string
  values: string[]
  selected: boolean
  onSelect: () => void
  onDelete: () => void
}) {
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
        {values.map((value) => (
          <span
            key={`${name}-${value}`}
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
    showAxes,
    showGrid,
    showLabels,
  } = useGeometry()
  const { addProject } = useProjectStore()

  const [projectName, setProjectName] = useState('B\u1ea3n v\u1ebd t\u1ef1 v\u1ebd')
  const [isSaving, setIsSaving] = useState(false)

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
    manualDocument.points.length +
    manualDocument.segments.length +
    manualDocument.polygons.length +
    manualDocument.solids.length

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
          <div className="rounded-full border border-border/70 bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground">
            {totalEntities} {'m\u1ee5c'}
          </div>
        </div>
      </div>

      <div className="mt-4 flex-1 overflow-y-auto pr-1">
        <div className="space-y-2.5">
          {manualDocument.points.map((point) => {
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
              />
            )
          })}

          {manualDocument.segments.map((segment: ManualSegment) => (
            <ObjectRow
              key={segment.id}
              typeLabel={'\u0110o\u1ea1n'}
              icon={<PencilRuler size={14} />}
              name={segment.label}
              values={[
                pointLabelMap[segment.startPointId] ?? segment.startPointId,
                pointLabelMap[segment.endPointId] ?? segment.endPointId,
              ]}
              selected={manualSelection?.kind === 'segment' && manualSelection.id === segment.id}
              onSelect={() => setManualSelection({ kind: 'segment', id: segment.id })}
              onDelete={() => removeManualEntity('segment', segment.id)}
            />
          ))}

          {manualDocument.polygons.map((polygon: ManualPolygon) => (
            <ObjectRow
              key={polygon.id}
              typeLabel={'\u0110a gi\u00e1c'}
              icon={<Pentagon size={14} />}
              name={polygon.label}
              values={polygonPointMap[polygon.id] ?? []}
              selected={manualSelection?.kind === 'polygon' && manualSelection.id === polygon.id}
              onSelect={() => setManualSelection({ kind: 'polygon', id: polygon.id })}
              onDelete={() => removeManualEntity('polygon', polygon.id)}
            />
          ))}

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
            />
          ))}

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
