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
  { id: 'select', label: 'Chọn', icon: MousePointer2 },
  { id: 'point', label: 'Điểm', icon: Move3D },
  { id: 'segment', label: 'Đoạn', icon: PencilRuler },
  { id: 'polygon', label: 'Đa giác', icon: Pentagon },
  { id: 'box', label: 'Hình hộp', icon: Square },
  { id: 'pyramid', label: 'Hình chóp', icon: Pyramid },
  { id: 'prism', label: 'Lăng trụ', icon: Box },
]

function formatInstruction(
  activeTool: ReturnType<typeof useGeometry>['activeTool'],
  draftOperation: ReturnType<typeof useGeometry>['draftOperation'],
  selection: ReturnType<typeof useGeometry>['manualSelection'],
) {
  if (activeTool === 'select') return 'Chọn đối tượng để xem thông tin, đổi tên, kéo thả hoặc chỉnh tham số.'
  if (activeTool === 'point') return 'Click trên mặt phẳng đáy hoặc vào đoạn để tạo điểm. Nếu hover điểm hiện có, điểm sẽ bám vào đó.'
  if (activeTool === 'segment') {
    const count = draftOperation?.tool === 'segment' ? draftOperation.pointIds?.length ?? 0 : 0
    return count === 0
      ? 'Chọn điểm đầu tiên của đoạn.'
      : 'Chọn điểm thứ hai để hoàn tất đoạn.'
  }
  if (activeTool === 'polygon') {
    const count = draftOperation?.tool === 'polygon' ? draftOperation.pointIds?.length ?? 0 : 0
    if (count === 0) return 'Click các đỉnh để bắt đầu đa giác.'
    return 'Tiếp tục click thêm đỉnh. Click lại đỉnh đầu hoặc nhấn Enter để đóng đa giác.'
  }
  if (activeTool === 'box') {
    const count = draftOperation?.tool === 'box' ? draftOperation.pointIds?.length ?? 0 : 0
    if (count < 2) return 'Click 2 góc chéo của đáy hình hộp trên mặt phẳng z = 0.'
    return 'Nhập chiều cao và xác nhận để tạo hình hộp chữ nhật.'
  }
  if (activeTool === 'pyramid') {
    return selection?.kind === 'polygon'
      ? 'Đã chọn đáy. Nhập chiều cao và xác nhận để dựng hình chóp.'
      : 'Chọn một đa giác làm đáy, sau đó nhập chiều cao.'
  }
  if (activeTool === 'prism') {
    return selection?.kind === 'polygon'
      ? 'Đã chọn đáy. Nhập chiều cao và xác nhận để dựng lăng trụ.'
      : 'Chọn một đa giác làm đáy, sau đó nhập chiều cao.'
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
    <div className="h-full flex flex-col gap-4 overflow-hidden bg-card/95 backdrop-blur-md border-r border-border p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold tracking-tight">Không gian tự vẽ</h2>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Chọn công cụ và dựng hình trực tiếp trên canvas.</p>
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

      <Card className="gap-3 py-4">
        <CardHeader className="px-4 pb-0">
          <CardTitle className="text-sm">Trạng thái thao tác</CardTitle>
          <CardDescription className="text-xs">{toolInstruction}</CardDescription>
        </CardHeader>
        <CardContent className="px-4 space-y-3">
          <div className="flex items-center justify-between rounded-lg border border-border/70 bg-background px-3 py-2">
            <div>
              <p className="text-xs font-semibold">Bám đối tượng</p>
              <p className="text-[11px] text-muted-foreground">Điểm, trung điểm, đoạn, mặt phẳng đáy.</p>
            </div>
            <Switch checked={snapEnabled} onCheckedChange={setSnapEnabled} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold">Ngưỡng bám</p>
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
            <p className="text-xs font-semibold">Điểm bám hiện tại</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {hoveredSnapTarget
                ? `${hoveredSnapTarget.label} tại (${hoveredSnapTarget.position
                    .map((value) => value.toFixed(2))
                    .join(', ')})`
                : 'Chưa có mục tiêu bám nào được bắt.'}
            </p>
          </div>

          {draftOperation?.tool === 'polygon' && (
            <div className="space-y-2">
              <p className="text-xs font-semibold">Đa giác nháp</p>
              <div className="flex flex-wrap gap-2">
                {(draftOperation.pointIds ?? []).map((pointId) => {
                  const point = manualDocument.points.find((item) => item.id === pointId)
                  return <Badge key={pointId} variant="secondary">{point?.label ?? 'Điểm'}</Badge>
                })}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={cancelManualDraft}>Hủy</Button>
                <Button size="sm" onClick={handlePolygonFinalize} disabled={(draftOperation.pointIds?.length ?? 0) < 3}>
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
                value={
                  draftOperation?.tool === activeTool
                    ? draftOperation.height ?? 4
                    : 4
                }
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
        </CardContent>
      </Card>

      {manualSelection && (
        <Card className="gap-3 py-4 overflow-y-auto">
          <CardHeader className="px-4 pb-0">
            <CardTitle className="text-sm">Chỉnh sửa nhanh</CardTitle>
            <CardDescription className="text-xs">Áp dụng cho đối tượng đang chọn.</CardDescription>
          </CardHeader>
          <CardContent className="px-4 space-y-3">
            <div className="space-y-2">
              <label className="text-xs font-semibold">Tên hiển thị</label>
              <div className="flex gap-2">
                <Input value={renameValue} onChange={(event) => setRenameValue(event.target.value)} />
                <Button size="sm" onClick={handleRename}>Lưu</Button>
              </div>
            </div>

            {manualSelection.kind === 'point' && (
              <div className="space-y-2">
                <label className="text-xs font-semibold">Tọa độ chính xác</label>
                <div className="grid grid-cols-3 gap-2">
                  <Input value={pointInputs.x} onChange={(event) => setPointInputs((current) => ({ ...current, x: event.target.value }))} />
                  <Input value={pointInputs.y} onChange={(event) => setPointInputs((current) => ({ ...current, y: event.target.value }))} />
                  <Input value={pointInputs.z} onChange={(event) => setPointInputs((current) => ({ ...current, z: event.target.value }))} />
                </div>
                <Button size="sm" className="w-full" onClick={handlePointApply}>Cập nhật tọa độ</Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

