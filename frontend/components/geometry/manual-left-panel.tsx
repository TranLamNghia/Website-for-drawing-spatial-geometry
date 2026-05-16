'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Box,
  MousePointer2,
  Move3D,
  PencilRuler,
  Pentagon,
  Pyramid,
  Redo2,
  Sparkles,
  Square,
  Undo2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { useGeometry } from './geometry-context'

const TOOLS: Array<{
  id: 'select' | 'point' | 'segment' | 'polygon' | 'box' | 'pyramid' | 'prism'
  label: string
  icon: React.ComponentType<{ className?: string; size?: number }>
}> = [
  { id: 'select', label: '\u0043h\u1ecdn', icon: MousePointer2 },
  { id: 'point', label: '\u0110i\u1ec3m', icon: Move3D },
  { id: 'segment', label: '\u0110o\u1ea1n', icon: PencilRuler },
  { id: 'polygon', label: '\u0110a gi\u00e1c', icon: Pentagon },
  { id: 'box', label: 'H\u00ecnh h\u1ed9p', icon: Square },
  { id: 'pyramid', label: 'H\u00ecnh ch\u00f3p', icon: Pyramid },
  { id: 'prism', label: 'L\u0103ng tr\u1ee5', icon: Box },
]

function formatInstruction(
  activeTool: ReturnType<typeof useGeometry>['activeTool'],
  draftOperation: ReturnType<typeof useGeometry>['draftOperation'],
  selection: ReturnType<typeof useGeometry>['manualSelection'],
) {
  if (activeTool === 'select') {
    return 'Ch\u1ecdn \u0111\u1ed1i t\u01b0\u1ee3ng \u0111\u1ec3 xem th\u00f4ng tin, \u0111\u1ed5i t\u00ean, k\u00e9o th\u1ea3 ho\u1eb7c ch\u1ec9nh tham s\u1ed1.'
  }

  if (activeTool === 'point') {
    return 'Click tr\u00ean m\u1eb7t ph\u1eb3ng \u0111\u00e1y ho\u1eb7c v\u00e0o \u0111o\u1ea1n \u0111\u1ec3 t\u1ea1o \u0111i\u1ec3m. N\u1ebfu hover \u0111i\u1ec3m hi\u1ec7n c\u00f3, \u0111i\u1ec3m s\u1ebd b\u00e1m v\u00e0o \u0111\u00f3.'
  }

  if (activeTool === 'segment') {
    const count = draftOperation?.tool === 'segment' ? draftOperation.pointIds?.length ?? 0 : 0
    return count === 0
      ? 'Ch\u1ecdn \u0111i\u1ec3m \u0111\u1ea7u ti\u00ean c\u1ee7a \u0111o\u1ea1n.'
      : 'Ch\u1ecdn \u0111i\u1ec3m th\u1ee9 hai \u0111\u1ec3 ho\u00e0n t\u1ea5t \u0111o\u1ea1n.'
  }

  if (activeTool === 'polygon') {
    const count = draftOperation?.tool === 'polygon' ? draftOperation.pointIds?.length ?? 0 : 0
    if (count === 0) return 'Click c\u00e1c \u0111\u1ec9nh \u0111\u1ec3 b\u1eaft \u0111\u1ea7u \u0111a gi\u00e1c.'
    return 'Ti\u1ebfp t\u1ee5c click th\u00eam \u0111\u1ec9nh. Click l\u1ea1i \u0111\u1ec9nh \u0111\u1ea7u ho\u1eb7c nh\u1ea5n Enter \u0111\u1ec3 \u0111\u00f3ng \u0111a gi\u00e1c.'
  }

  if (activeTool === 'box') {
    const count = draftOperation?.tool === 'box' ? draftOperation.pointIds?.length ?? 0 : 0
    if (count < 2) return 'Click 2 g\u00f3c ch\u00e9o c\u1ee7a \u0111\u00e1y h\u00ecnh h\u1ed9p tr\u00ean m\u1eb7t ph\u1eb3ng z = 0.'
    return 'Nh\u1eadp chi\u1ec1u cao v\u00e0 x\u00e1c nh\u1eadn \u0111\u1ec3 t\u1ea1o h\u00ecnh h\u1ed9p ch\u1eef nh\u1eadt.'
  }

  if (activeTool === 'pyramid') {
    return selection?.kind === 'polygon'
      ? '\u0110\u00e3 ch\u1ecdn \u0111\u00e1y. Nh\u1eadp chi\u1ec1u cao v\u00e0 x\u00e1c nh\u1eadn \u0111\u1ec3 d\u1ef1ng h\u00ecnh ch\u00f3p.'
      : 'Ch\u1ecdn m\u1ed9t \u0111a gi\u00e1c l\u00e0m \u0111\u00e1y, sau \u0111\u00f3 nh\u1eadp chi\u1ec1u cao.'
  }

  if (activeTool === 'prism') {
    return selection?.kind === 'polygon'
      ? '\u0110\u00e3 ch\u1ecdn \u0111\u00e1y. Nh\u1eadp chi\u1ec1u cao v\u00e0 x\u00e1c nh\u1eadn \u0111\u1ec3 d\u1ef1ng l\u0103ng tr\u1ee5.'
      : 'Ch\u1ecdn m\u1ed9t \u0111a gi\u00e1c l\u00e0m \u0111\u00e1y, sau \u0111\u00f3 nh\u1eadp chi\u1ec1u cao.'
  }

  return ''
}

export function ManualLeftPanel() {
  const {
    manualDocument,
    manualDerived,
    activeTool,
    setActiveTool,
    manualSelection,
    draftOperation,
    setDraftOperation,
    hoveredSnapTarget,
    snapEnabled,
    setSnapEnabled,
    snapThreshold,
    setSnapThreshold,
    canUndo,
    canRedo,
    undoManual,
    redoManual,
    cancelManualDraft,
    createPolygon,
    createBox,
    createPyramid,
    createPrism,
    renameManualEntity,
    updatePointPosition,
  } = useGeometry()

  const [renameValue, setRenameValue] = useState('')
  const [pointInputs, setPointInputs] = useState({ x: '0', y: '0', z: '0' })

  useEffect(() => {
    if (!manualSelection) {
      setRenameValue('')
      return
    }

    const source =
      manualSelection.kind === 'point'
        ? manualDocument.points.find((item) => item.id === manualSelection.id)
        : manualSelection.kind === 'segment'
          ? manualDocument.segments.find((item) => item.id === manualSelection.id)
          : manualSelection.kind === 'polygon'
            ? manualDocument.polygons.find((item) => item.id === manualSelection.id)
            : manualDocument.solids.find((item) => item.id === manualSelection.id)

    if (source) setRenameValue(source.label)

    if (manualSelection.kind === 'point') {
      const info = manualDerived.pointInfo[manualSelection.id]
      if (info) {
        setPointInputs({
          x: String(info.coords[0]),
          y: String(info.coords[1]),
          z: String(info.coords[2]),
        })
      }
    }
  }, [manualDerived.pointInfo, manualDocument, manualSelection])

  const toolInstruction = useMemo(
    () => formatInstruction(activeTool, draftOperation, manualSelection),
    [activeTool, draftOperation, manualSelection],
  )

  const updateDraftHeight = (heightValue: string) => {
    const numericHeight = Number(heightValue)
    if (!draftOperation) return
    setDraftOperation({
      ...draftOperation,
      height: Number.isFinite(numericHeight) ? numericHeight : 0,
    })
  }

  const handleToolSelect = (tool: typeof activeTool) => {
    setActiveTool(tool)
    if (tool === 'select') {
      cancelManualDraft()
      return
    }

    if (tool === 'box') {
      setDraftOperation({ tool: 'box', pointIds: [], height: 4 })
      return
    }

    if (tool === 'segment') {
      setDraftOperation({ tool: 'segment', pointIds: [] })
      return
    }

    if (tool === 'polygon') {
      setDraftOperation({ tool: 'polygon', pointIds: [] })
      return
    }

    if (tool === 'pyramid' || tool === 'prism') {
      setDraftOperation({
        tool,
        basePolygonId: manualSelection?.kind === 'polygon' ? manualSelection.id : null,
        height: 4,
      })
      return
    }

    setDraftOperation(null)
  }

  const handlePolygonFinalize = () => {
    if (draftOperation?.tool !== 'polygon') return
    if ((draftOperation.pointIds?.length ?? 0) < 3) return
    createPolygon(draftOperation.pointIds ?? [])
    setDraftOperation({ tool: 'polygon', pointIds: [] })
  }

  const handleBoxCreate = () => {
    if (draftOperation?.tool !== 'box') return
    if ((draftOperation.pointIds?.length ?? 0) !== 2) return
    if (!draftOperation.height || draftOperation.height <= 0) return
    createBox(
      [draftOperation.pointIds![0], draftOperation.pointIds![1]],
      draftOperation.height,
    )
    setDraftOperation({ tool: 'box', pointIds: [], height: draftOperation.height })
  }

  const handleSolidCreate = (type: 'pyramid' | 'prism') => {
    const basePolygonId =
      draftOperation?.tool === type
        ? draftOperation.basePolygonId
        : manualSelection?.kind === 'polygon'
          ? manualSelection.id
          : null
    const height = draftOperation?.tool === type ? draftOperation.height ?? 4 : 4
    if (!basePolygonId || !height || height <= 0) return
    if (type === 'pyramid') createPyramid(basePolygonId, height)
    if (type === 'prism') createPrism(basePolygonId, height)
  }

  const handleRename = () => {
    if (!manualSelection) return
    renameManualEntity(manualSelection.kind, manualSelection.id, renameValue)
  }

  const handlePointApply = () => {
    if (manualSelection?.kind !== 'point') return
    const x = Number(pointInputs.x)
    const y = Number(pointInputs.y)
    const z = Number(pointInputs.z)
    if ([x, y, z].some((value) => Number.isNaN(value))) return
    updatePointPosition(manualSelection.id, [x, y, z])
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden border-r border-border bg-card/95 p-4 backdrop-blur-md">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold tracking-tight">{'Kh\u00f4ng gian t\u1ef1 v\u1ebd'}</h2>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">{'Ch\u1ecdn c\u00f4ng c\u1ee5 v\u00e0 d\u1ef1ng h\u00ecnh tr\u1ef1c ti\u1ebfp tr\u00ean canvas.'}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon-sm" disabled={!canUndo} onClick={undoManual} title={'Ho\u00e0n t\u00e1c'}>
            <Undo2 size={14} />
          </Button>
          <Button variant="outline" size="icon-sm" disabled={!canRedo} onClick={redoManual} title={'L\u00e0m l\u1ea1i'}>
            <Redo2 size={14} />
          </Button>
        </div>
      </div>

      <Card className="gap-4 py-4">
        <CardHeader className="px-4 pb-0">
          <CardTitle className="text-sm">{'C\u00f4ng c\u1ee5 d\u1ef1ng h\u00ecnh'}</CardTitle>
          <CardDescription className="text-xs">{'Canvas \u1edf gi\u1eefa l\u00e0 v\u00f9ng thao t\u00e1c ch\u00ednh.'}</CardDescription>
        </CardHeader>
        <CardContent className="px-4">
          <div className="grid grid-cols-2 gap-2">
            {TOOLS.map((tool) => {
              const Icon = tool.icon
              const isActive = activeTool === tool.id
              return (
                <button
                  key={tool.id}
                  onClick={() => handleToolSelect(tool.id)}
                  className={`rounded-xl border px-3 py-3 text-left transition-all ${
                    isActive
                      ? 'border-primary bg-primary/10 text-primary shadow-sm'
                      : 'border-border bg-background hover:border-primary/30 hover:bg-accent/40'
                  }`}
                >
                  <Icon size={16} className="mb-2" />
                  <div className="text-[12px] font-semibold">{tool.label}</div>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="gap-3 py-4">
        <CardHeader className="px-4 pb-0">
          <CardTitle className="text-sm">{'Tr\u1ea1ng th\u00e1i thao t\u00e1c'}</CardTitle>
          <CardDescription className="text-xs">{toolInstruction}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 px-4">
          <div className="flex items-center justify-between rounded-lg border border-border/70 bg-background px-3 py-2">
            <div>
              <p className="text-xs font-semibold">{'B\u00e1m \u0111\u1ed1i t\u01b0\u1ee3ng'}</p>
              <p className="text-[11px] text-muted-foreground">{'\u0110i\u1ec3m, trung \u0111i\u1ec3m, \u0111o\u1ea1n, m\u1eb7t ph\u1eb3ng \u0111\u00e1y.'}</p>
            </div>
            <Switch checked={snapEnabled} onCheckedChange={setSnapEnabled} />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <p className="text-xs font-semibold">{'Ng\u01b0\u1ee1ng b\u00e1m'}</p>
              <Badge variant="outline">{snapThreshold}px</Badge>
            </div>
            <input
              type="range"
              min={8}
              max={36}
              value={snapThreshold}
              onChange={(event) => setSnapThreshold(Number(event.target.value))}
              className="w-full accent-primary"
            />
          </div>

          <div className="rounded-lg border border-dashed border-border/70 bg-background px-3 py-2">
            <p className="text-xs font-semibold">{'\u0110i\u1ec3m b\u00e1m hi\u1ec7n t\u1ea1i'}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {hoveredSnapTarget
                ? `${hoveredSnapTarget.label} t\u1ea1i (${hoveredSnapTarget.position
                    .map((value) => value.toFixed(2))
                    .join(', ')})`
                : 'Ch\u01b0a c\u00f3 m\u1ee5c ti\u00eau b\u00e1m n\u00e0o \u0111\u01b0\u1ee3c b\u1eaft.'}
            </p>
          </div>

          {draftOperation?.tool === 'polygon' && (
            <div className="space-y-2">
              <p className="text-xs font-semibold">{'\u0110a gi\u00e1c nh\u00e1p'}</p>
              <div className="flex flex-wrap gap-2">
                {(draftOperation.pointIds ?? []).map((pointId) => {
                  const point = manualDocument.points.find((item) => item.id === pointId)
                  return (
                    <Badge key={pointId} variant="secondary">
                      {point?.label ?? '\u0110i\u1ec3m'}
                    </Badge>
                  )
                })}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={cancelManualDraft}>{'H\u1ee7y'}</Button>
                <Button size="sm" onClick={handlePolygonFinalize} disabled={(draftOperation.pointIds?.length ?? 0) < 3}>
                  {'Ho\u00e0n t\u1ea5t \u0111a gi\u00e1c'}
                </Button>
              </div>
            </div>
          )}

          {draftOperation?.tool === 'box' && (
            <div className="space-y-2">
              <p className="text-xs font-semibold">{'Th\u00f4ng s\u1ed1 h\u00ecnh h\u1ed9p'}</p>
              <Input
                type="number"
                min={0.1}
                step={0.1}
                value={draftOperation.height ?? 4}
                onChange={(event) => updateDraftHeight(event.target.value)}
                placeholder={'Chi\u1ec1u cao'}
              />
              <Button
                size="sm"
                className="w-full"
                onClick={handleBoxCreate}
                disabled={(draftOperation.pointIds?.length ?? 0) !== 2 || !draftOperation.height || draftOperation.height <= 0}
              >
                {'T\u1ea1o h\u00ecnh h\u1ed9p'}
              </Button>
            </div>
          )}

          {(activeTool === 'pyramid' || activeTool === 'prism') && (
            <div className="space-y-2">
              <p className="text-xs font-semibold">{'Th\u00f4ng s\u1ed1 kh\u1ed1i'}</p>
              <Input
                type="number"
                min={0.1}
                step={0.1}
                value={draftOperation?.tool === activeTool ? draftOperation.height ?? 4 : 4}
                onChange={(event) =>
                  setDraftOperation({
                    tool: activeTool,
                    basePolygonId:
                      manualSelection?.kind === 'polygon'
                        ? manualSelection.id
                        : draftOperation?.tool === activeTool
                          ? draftOperation.basePolygonId ?? null
                          : null,
                    height: Number(event.target.value),
                  })
                }
                placeholder={'Chi\u1ec1u cao'}
              />
              <Button
                size="sm"
                className="w-full"
                onClick={() => handleSolidCreate(activeTool)}
                disabled={manualSelection?.kind !== 'polygon' && !(draftOperation?.tool === activeTool && draftOperation.basePolygonId)}
              >
                {activeTool === 'pyramid' ? 'T\u1ea1o h\u00ecnh ch\u00f3p' : 'T\u1ea1o l\u0103ng tr\u1ee5'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {manualSelection && (
        <Card className="gap-3 overflow-y-auto py-4">
          <CardHeader className="px-4 pb-0">
            <CardTitle className="text-sm">{'Ch\u1ec9nh s\u1eeda nhanh'}</CardTitle>
            <CardDescription className="text-xs">{'\u00c1p d\u1ee5ng cho \u0111\u1ed1i t\u01b0\u1ee3ng \u0111ang ch\u1ecdn.'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 px-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold">{'T\u00ean hi\u1ec3n th\u1ecb'}</label>
              <div className="flex gap-2">
                <Input value={renameValue} onChange={(event) => setRenameValue(event.target.value)} />
                <Button size="sm" onClick={handleRename}>{'L\u01b0u'}</Button>
              </div>
            </div>

            {manualSelection.kind === 'point' && (
              <div className="space-y-2">
                <label className="text-xs font-semibold">{'T\u1ecda \u0111\u1ed9 ch\u00ednh x\u00e1c'}</label>
                <div className="grid grid-cols-3 gap-2">
                  <Input value={pointInputs.x} onChange={(event) => setPointInputs((current) => ({ ...current, x: event.target.value }))} />
                  <Input value={pointInputs.y} onChange={(event) => setPointInputs((current) => ({ ...current, y: event.target.value }))} />
                  <Input value={pointInputs.z} onChange={(event) => setPointInputs((current) => ({ ...current, z: event.target.value }))} />
                </div>
                <Button size="sm" className="w-full" onClick={handlePointApply}>{'C\u1eadp nh\u1eadt t\u1ecda \u0111\u1ed9'}</Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
