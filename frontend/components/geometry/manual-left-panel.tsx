'use client'

import {
  Box,
  Circle,
  Cone,
  Cylinder,
  MousePointer2,
  Move3D,
  PencilRuler,
  Pentagon,
  Pyramid,
  Redo2,
  Sparkles,
  Square,
  Undo2,
  Home,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useGeometry } from './geometry-context'

const TOOLS: Array<{
  id: 'select' | 'point' | 'segment' | 'polygon' | 'box' | 'pyramid' | 'prism' | 'sphere' | 'cone' | 'cylinder'
  label: string
  icon: React.ComponentType<{ className?: string; size?: number }>
}> = [
  { id: 'select', label: 'Chọn', icon: MousePointer2 },
  { id: 'point', label: 'Điểm', icon: Move3D },
  { id: 'segment', label: 'Đoạn', icon: PencilRuler },
  { id: 'polygon', label: 'Đa giác', icon: Pentagon },
  { id: 'box', label: 'Hình hộp', icon: Square },
  { id: 'pyramid', label: 'Hình chóp', icon: Pyramid },
  { id: 'prism', label: 'Lăng trụ', icon: Box },
  { id: 'sphere', label: 'Hình cầu', icon: Circle },
  { id: 'cone', label: 'Hình nón', icon: Cone },
  { id: 'cylinder', label: 'Hình trụ', icon: Cylinder },
]

export function ManualLeftPanel() {
  const router = useRouter()
  const {
    activeTool,
    setActiveTool,
    manualSelection,
    draftOperation,
    setDraftOperation,
    canUndo,
    canRedo,
    undoManual,
    redoManual,
    cancelManualDraft,
    createPolygon,
    createBox,
    createPyramid,
    createPrism,
    createSphere,
    createCone,
    createCylinder,
    manualDocument,
  } = useGeometry()

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

    if (tool === 'sphere') {
      setDraftOperation({
        tool: 'sphere',
        centerPointId: manualSelection?.kind === 'point' ? manualSelection.id : null,
        radius: 3,
      })
      return
    }

    if (tool === 'cone') {
      setDraftOperation({
        tool: 'cone',
        centerPointId: manualSelection?.kind === 'point' ? manualSelection.id : null,
        radius: 3,
        height: 5,
      })
      return
    }

    if (tool === 'cylinder') {
      setDraftOperation({
        tool: 'cylinder',
        centerPointId: manualSelection?.kind === 'point' ? manualSelection.id : null,
        radius: 3,
        height: 5,
      })
      return
    }

    setDraftOperation(null)
  }

  const updateDraftHeight = (heightValue: string) => {
    const numericHeight = Number(heightValue)
    if (!draftOperation) return
    setDraftOperation({
      ...draftOperation,
      height: Number.isFinite(numericHeight) ? numericHeight : 0,
    })
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
    createBox([draftOperation.pointIds![0], draftOperation.pointIds![1]], draftOperation.height)
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

  const handleSphereCreate = () => {
    if (draftOperation?.tool !== 'sphere') return
    const centerPointId = draftOperation.centerPointId
      ?? (manualSelection?.kind === 'point' ? manualSelection.id : null)
    const radius = draftOperation.radius ?? 3
    if (!centerPointId || radius <= 0) return
    createSphere(centerPointId, radius)
    setDraftOperation({ tool: 'sphere', centerPointId: null, radius })
  }

  const handleConeCreate = () => {
    if (draftOperation?.tool !== 'cone') return
    const centerPointId = draftOperation.centerPointId
      ?? (manualSelection?.kind === 'point' ? manualSelection.id : null)
    const radius = draftOperation.radius ?? 3
    const height = draftOperation.height ?? 5
    if (!centerPointId || radius <= 0 || height <= 0) return
    createCone(centerPointId, radius, height)
    setDraftOperation({ tool: 'cone', centerPointId: null, radius, height })
  }

  const handleCylinderCreate = () => {
    if (draftOperation?.tool !== 'cylinder') return
    const centerPointId = draftOperation.centerPointId
      ?? (manualSelection?.kind === 'point' ? manualSelection.id : null)
    const radius = draftOperation.radius ?? 3
    const height = draftOperation.height ?? 5
    if (!centerPointId || radius <= 0 || height <= 0) return
    createCylinder(centerPointId, radius, height)
    setDraftOperation({ tool: 'cylinder', centerPointId: null, radius, height })
  }

  const updateDraftRadius = (radiusValue: string) => {
    const numericRadius = Number(radiusValue)
    if (!draftOperation) return
    setDraftOperation({
      ...draftOperation,
      radius: Number.isFinite(numericRadius) ? numericRadius : 0,
    })
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden border-r border-border bg-card/95 p-4 backdrop-blur-md">
      {/* Navigation Buttons */}
      <div className="flex pb-2 border-b border-border/60">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push('/')}
          className="w-full flex items-center justify-center gap-1.5 rounded-xl text-xs py-1.5 h-8 font-semibold bg-background hover:bg-accent/40"
        >
          <Home size={14} />
          Trang chủ
        </Button>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold tracking-tight">Không gian tự vẽ</h2>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Chọn công cụ và dựng hình trực tiếp trên canvas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon-sm" disabled={!canUndo} onClick={undoManual} title="Hoàn tác">
            <Undo2 size={14} />
          </Button>
          <Button variant="outline" size="icon-sm" disabled={!canRedo} onClick={redoManual} title="Làm lại">
            <Redo2 size={14} />
          </Button>
        </div>
      </div>

      <Card className="gap-4 py-4">
        <CardHeader className="px-4 pb-0">
          <CardTitle className="text-sm">Công cụ dựng hình</CardTitle>
          <CardDescription className="text-xs">Canvas ở giữa là vùng thao tác chính.</CardDescription>
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

      {(draftOperation?.tool === 'polygon' ||
        draftOperation?.tool === 'box' ||
        activeTool === 'pyramid' ||
        activeTool === 'prism' ||
        activeTool === 'sphere' ||
        activeTool === 'cone' ||
        activeTool === 'cylinder') && (
        <Card className="gap-3 py-4">
          <CardHeader className="px-4 pb-0">
            <CardTitle className="text-sm">Thiết lập công cụ</CardTitle>
            <CardDescription className="text-xs">
              Bám đối tượng luôn bật ở mức 10px.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 px-4">
            {draftOperation?.tool === 'polygon' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold">Đa giác nháp</p>
                  <Badge variant="outline">{draftOperation.pointIds?.length ?? 0} đỉnh</Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(draftOperation.pointIds ?? []).map((pointId) => {
                    const point = manualDocument.points.find((item) => item.id === pointId)
                    return (
                      <Badge key={pointId} variant="secondary">
                        {point?.label ?? 'Điểm'}
                      </Badge>
                    )
                  })}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={cancelManualDraft}>
                    Hủy
                  </Button>
                  <Button
                    size="sm"
                    onClick={handlePolygonFinalize}
                    disabled={(draftOperation.pointIds?.length ?? 0) < 3}
                  >
                    Hoàn tất đa giác
                  </Button>
                </div>
              </div>
            )}

            {draftOperation?.tool === 'box' && (
              <div className="space-y-2">
                <p className="text-xs font-semibold">Thông số hình hộp</p>
                <Input
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={draftOperation.height ?? 4}
                  onChange={(event) => updateDraftHeight(event.target.value)}
                  placeholder="Chiều cao"
                />
                <Button
                  size="sm"
                  className="w-full"
                  onClick={handleBoxCreate}
                  disabled={(draftOperation.pointIds?.length ?? 0) !== 2 || !draftOperation.height || draftOperation.height <= 0}
                >
                  Tạo hình hộp
                </Button>
              </div>
            )}

            {(activeTool === 'pyramid' || activeTool === 'prism') && (
              <div className="space-y-2">
                <p className="text-xs font-semibold">Thông số khối</p>
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
                  placeholder="Chiều cao"
                />
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => handleSolidCreate(activeTool)}
                  disabled={manualSelection?.kind !== 'polygon' && !(draftOperation?.tool === activeTool && draftOperation.basePolygonId)}
                >
                  {activeTool === 'pyramid' ? 'Tạo hình chóp' : 'Tạo lăng trụ'}
                </Button>
              </div>
            )}

            {draftOperation?.tool === 'sphere' && (
              <div className="space-y-2">
                <p className="text-xs font-semibold">Thông số hình cầu</p>
                <p className="text-[11px] text-muted-foreground">
                  Chọn 1 điểm làm tâm, rồi nhập bán kính.
                </p>
                <div className="space-y-1">
                  <label className="text-[11px] text-muted-foreground">Tâm</label>
                  <Badge variant={draftOperation.centerPointId ? 'default' : 'outline'}>
                    {draftOperation.centerPointId
                      ? manualDocument.points.find((p) => p.id === draftOperation.centerPointId)?.label ?? 'Đã chọn'
                      : 'Chưa chọn (click điểm trên canvas)'}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-muted-foreground">Bán kính R</label>
                  <Input
                    type="number"
                    min={0.1}
                    step={0.5}
                    value={draftOperation.radius ?? 3}
                    onChange={(event) => updateDraftRadius(event.target.value)}
                    placeholder="Bán kính"
                  />
                </div>
                <Button
                  size="sm"
                  className="w-full"
                  onClick={handleSphereCreate}
                  disabled={!draftOperation.centerPointId || !draftOperation.radius || draftOperation.radius <= 0}
                >
                  Tạo hình cầu
                </Button>
              </div>
            )}

            {draftOperation?.tool === 'cone' && (
              <div className="space-y-2">
                <p className="text-xs font-semibold">Thông số hình nón</p>
                <p className="text-[11px] text-muted-foreground">
                  Chọn tâm đáy, nhập bán kính và chiều cao.
                </p>
                <div className="space-y-1">
                  <label className="text-[11px] text-muted-foreground">Tâm đáy</label>
                  <Badge variant={draftOperation.centerPointId ? 'default' : 'outline'}>
                    {draftOperation.centerPointId
                      ? manualDocument.points.find((p) => p.id === draftOperation.centerPointId)?.label ?? 'Đã chọn'
                      : 'Chưa chọn (click điểm trên canvas)'}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-muted-foreground">Bán kính đáy R</label>
                  <Input
                    type="number"
                    min={0.1}
                    step={0.5}
                    value={draftOperation.radius ?? 3}
                    onChange={(event) => updateDraftRadius(event.target.value)}
                    placeholder="Bán kính"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-muted-foreground">Chiều cao h</label>
                  <Input
                    type="number"
                    min={0.1}
                    step={0.5}
                    value={draftOperation.height ?? 5}
                    onChange={(event) => updateDraftHeight(event.target.value)}
                    placeholder="Chiều cao"
                  />
                </div>
                <Button
                  size="sm"
                  className="w-full"
                  onClick={handleConeCreate}
                  disabled={!draftOperation.centerPointId || !draftOperation.radius || draftOperation.radius <= 0 || !draftOperation.height || draftOperation.height <= 0}
                >
                  Tạo hình nón
                </Button>
              </div>
            )}

            {draftOperation?.tool === 'cylinder' && (
              <div className="space-y-2">
                <p className="text-xs font-semibold">Thông số hình trụ</p>
                <p className="text-[11px] text-muted-foreground">
                  Chọn tâm đáy, nhập bán kính và chiều cao.
                </p>
                <div className="space-y-1">
                  <label className="text-[11px] text-muted-foreground">Tâm đáy</label>
                  <Badge variant={draftOperation.centerPointId ? 'default' : 'outline'}>
                    {draftOperation.centerPointId
                      ? manualDocument.points.find((p) => p.id === draftOperation.centerPointId)?.label ?? 'Đã chọn'
                      : 'Chưa chọn (click điểm trên canvas)'}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-muted-foreground">Bán kính đáy R</label>
                  <Input
                    type="number"
                    min={0.1}
                    step={0.5}
                    value={draftOperation.radius ?? 3}
                    onChange={(event) => updateDraftRadius(event.target.value)}
                    placeholder="Bán kính"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-muted-foreground">Chiều cao h</label>
                  <Input
                    type="number"
                    min={0.1}
                    step={0.5}
                    value={draftOperation.height ?? 5}
                    onChange={(event) => updateDraftHeight(event.target.value)}
                    placeholder="Chiều cao"
                  />
                </div>
                <Button
                  size="sm"
                  className="w-full"
                  onClick={handleCylinderCreate}
                  disabled={!draftOperation.centerPointId || !draftOperation.radius || draftOperation.radius <= 0 || !draftOperation.height || draftOperation.height <= 0}
                >
                  Tạo hình trụ
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
