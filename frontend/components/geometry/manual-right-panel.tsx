'use client'

import { useMemo, useState } from 'react'
import { Eye, EyeOff, Info, Lock, LockOpen, Save, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useProjectStore } from '@/hooks/use-project-store'
import { useGeometry } from './geometry-context'
import { serializeManualProject } from './manual-editor'

type EntityFilter = 'all' | 'point' | 'segment' | 'polygon' | 'solid'

export function ManualRightPanel() {
  const {
    manualDocument,
    manualDerived,
    manualSelection,
    setManualSelection,
    renameManualEntity,
    toggleManualLocked,
    toggleManualVisibility,
    removeManualEntity,
    showAxes,
    showGrid,
    showLabels,
  } = useGeometry()
  const { addProject } = useProjectStore()

  const [filter, setFilter] = useState<EntityFilter>('all')
  const [projectName, setProjectName] = useState('Bản vẽ tự vẽ')
  const [isSaving, setIsSaving] = useState(false)

  const entities = useMemo(() => {
    const grouped = [
      ...manualDocument.points.map((item) => ({ kind: 'point' as const, entity: item })),
      ...manualDocument.segments.map((item) => ({ kind: 'segment' as const, entity: item })),
      ...manualDocument.polygons.map((item) => ({ kind: 'polygon' as const, entity: item })),
      ...manualDocument.solids.map((item) => ({ kind: 'solid' as const, entity: item })),
    ]
    if (filter === 'all') return grouped
    return grouped.filter((entry) => entry.kind === filter)
  }, [filter, manualDocument])

  const selectionInfo = useMemo(() => {
    if (!manualSelection) return null
    if (manualSelection.kind === 'point') return manualDerived.pointInfo[manualSelection.id] ?? null
    if (manualSelection.kind === 'segment') return manualDerived.segmentInfo[manualSelection.id] ?? null
    if (manualSelection.kind === 'polygon') return manualDerived.polygonInfo[manualSelection.id] ?? null
    return manualDerived.solidInfo[manualSelection.id] ?? null
  }, [manualDerived, manualSelection])

  const handleSave = () => {
    setIsSaving(true)
    const ok = addProject({
      id: crypto.randomUUID(),
      name: projectName.trim() || 'Bản vẽ tự vẽ',
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
      alert('Đã đạt giới hạn 10 bản vẽ lưu trên trình duyệt này.')
      return
    }
    alert('Đã lưu bản vẽ tự vẽ.')
  }

  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden bg-card/95 backdrop-blur-md border-l border-border p-4">
      <div>
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-bold tracking-tight">Thông tin hình học</h2>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1">Theo dõi đối tượng đã tạo và các số đo cơ bản.</p>
      </div>

      <Tabs defaultValue="objects" className="flex-1 min-h-0">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="objects">Đối tượng</TabsTrigger>
          <TabsTrigger value="info">Thông tin</TabsTrigger>
        </TabsList>

        <TabsContent value="objects" className="min-h-0 flex-1 overflow-hidden">
          <Card className="h-full gap-3 py-4">
            <CardHeader className="px-4 pb-0">
              <CardTitle className="text-sm">Danh sách đối tượng</CardTitle>
              <CardDescription className="text-xs">Chọn, ẩn, khóa hoặc xóa các entity trong bản vẽ.</CardDescription>
            </CardHeader>
            <CardContent className="px-4 space-y-3 h-full overflow-hidden flex flex-col">
              <div className="flex flex-wrap gap-2">
                {(['all', 'point', 'segment', 'polygon', 'solid'] as EntityFilter[]).map((value) => (
                  <button
                    key={value}
                    onClick={() => setFilter(value)}
                    className={`px-2.5 py-1 rounded-md text-[11px] border transition-colors ${
                      filter === value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-background hover:bg-accent/40'
                    }`}
                  >
                    {value === 'all' ? 'Tất cả' : value === 'point' ? 'Điểm' : value === 'segment' ? 'Đoạn' : value === 'polygon' ? 'Đa giác' : 'Khối'}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {entities.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-8 text-center">Chưa có đối tượng nào trong nhóm đang lọc.</p>
                ) : (
                  entities.map(({ kind, entity }) => {
                    const isSelected =
                      manualSelection?.kind === kind && manualSelection.id === entity.id
                    return (
                      <div
                        key={entity.id}
                        className={`rounded-xl border p-3 transition-colors ${
                          isSelected
                            ? 'border-primary bg-primary/10'
                            : 'border-border bg-background hover:bg-accent/30'
                        }`}
                      >
                        <button
                          onClick={() => setManualSelection({ kind, id: entity.id })}
                          className="w-full flex items-start justify-between gap-3 text-left"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold">{entity.label}</p>
                              <Badge variant="outline">{kind === 'point' ? 'Điểm' : kind === 'segment' ? 'Đoạn' : kind === 'polygon' ? 'Đa giác' : 'Khối'}</Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-1">Tạo bởi: {entity.createdByTool}</p>
                          </div>
                        </button>

                        <div className="flex items-center gap-2 mt-3">
                          <Button
                            variant="outline"
                            size="icon-sm"
                            onClick={() => toggleManualVisibility(kind, entity.id)}
                            title={entity.visible ? 'Ẩn' : 'Hiện'}
                          >
                            {entity.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                          </Button>
                          <Button
                            variant="outline"
                            size="icon-sm"
                            onClick={() => toggleManualLocked(kind, entity.id)}
                            title={entity.locked ? 'Mở khóa' : 'Khóa'}
                          >
                            {entity.locked ? <Lock size={14} /> : <LockOpen size={14} />}
                          </Button>
                          <Button
                            variant="outline"
                            size="icon-sm"
                            onClick={() => removeManualEntity(kind, entity.id)}
                            title="Xóa"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="info" className="min-h-0 flex-1 overflow-hidden">
          <Card className="h-full gap-3 py-4">
            <CardHeader className="px-4 pb-0">
              <CardTitle className="text-sm">Thông tin đối tượng</CardTitle>
              <CardDescription className="text-xs">Hiển thị số đo và công thức ngắn của selection hiện tại.</CardDescription>
            </CardHeader>
            <CardContent className="px-4 space-y-3 overflow-y-auto">
              {manualSelection && selectionInfo ? (
                <>
                  <div className="rounded-xl border border-border bg-background p-3">
                    <p className="text-sm font-semibold">
                      {manualSelection.kind === 'point'
                        ? manualDocument.points.find((item) => item.id === manualSelection.id)?.label
                        : manualSelection.kind === 'segment'
                          ? manualDocument.segments.find((item) => item.id === manualSelection.id)?.label
                          : manualSelection.kind === 'polygon'
                            ? manualDocument.polygons.find((item) => item.id === manualSelection.id)?.label
                            : manualDocument.solids.find((item) => item.id === manualSelection.id)?.label}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1">Loại: {manualSelection.kind}</p>
                  </div>

                  {manualSelection.kind === 'point' && 'coords' in selectionInfo && (
                    <div className="space-y-2 text-sm">
                      <p>Tọa độ: <span className="font-mono">({selectionInfo.coords.map((value) => value.toFixed(3)).join(', ')})</span></p>
                      <p className="text-muted-foreground">{selectionInfo.relation}</p>
                    </div>
                  )}

                  {manualSelection.kind === 'segment' && 'length' in selectionInfo && (
                    <div className="space-y-2 text-sm">
                      <p>Hai đầu mút: <span className="font-mono">{selectionInfo.startLabel}</span> và <span className="font-mono">{selectionInfo.endLabel}</span></p>
                      <p>Độ dài: <span className="font-mono">{selectionInfo.length}</span></p>
                      <p className="text-muted-foreground">{selectionInfo.formula}</p>
                    </div>
                  )}

                  {manualSelection.kind === 'polygon' && 'area' in selectionInfo && (
                    <div className="space-y-2 text-sm">
                      <p>Đỉnh: <span className="font-mono">{selectionInfo.labels.join(', ')}</span></p>
                      <p>Chu vi: <span className="font-mono">{selectionInfo.perimeter}</span></p>
                      <p>Diện tích: <span className="font-mono">{selectionInfo.area}</span></p>
                      <p>Pháp tuyến: <span className="font-mono">({selectionInfo.normal.join(', ')})</span></p>
                      <p className="text-muted-foreground">{selectionInfo.formula}</p>
                    </div>
                  )}

                  {manualSelection.kind === 'solid' && 'volume' in selectionInfo && (
                    <div className="space-y-2 text-sm">
                      <p>Kiểu khối: <span className="font-mono">{selectionInfo.solidType}</span></p>
                      <p>Đáy: <span className="font-mono">{selectionInfo.baseLabel}</span></p>
                      <p>Chiều cao: <span className="font-mono">{selectionInfo.height}</span></p>
                      <p>Diện tích đáy: <span className="font-mono">{selectionInfo.baseArea}</span></p>
                      <p>Thể tích: <span className="font-mono">{selectionInfo.volume}</span></p>
                      <p className="text-muted-foreground">{selectionInfo.formula}</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-3 text-sm">
                  <p>Chưa có selection. Chọn một đối tượng để xem chi tiết.</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-border bg-background p-3">
                      <p className="text-xs text-muted-foreground">Điểm</p>
                      <p className="text-xl font-bold">{manualDocument.points.length}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-background p-3">
                      <p className="text-xs text-muted-foreground">Đoạn</p>
                      <p className="text-xl font-bold">{manualDocument.segments.length}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-background p-3">
                      <p className="text-xs text-muted-foreground">Đa giác</p>
                      <p className="text-xl font-bold">{manualDocument.polygons.length}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-background p-3">
                      <p className="text-xs text-muted-foreground">Khối</p>
                      <p className="text-xl font-bold">{manualDocument.solids.length}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="gap-3 py-4">
        <CardHeader className="px-4 pb-0">
          <CardTitle className="text-sm">Lưu bản vẽ</CardTitle>
          <CardDescription className="text-xs">Lưu manual document vào local storage để mở lại sau.</CardDescription>
        </CardHeader>
        <CardContent className="px-4 space-y-3">
          <Input value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="Tên bản vẽ" />
          <Button className="w-full" onClick={handleSave} disabled={isSaving || manualDocument.points.length === 0}>
            <Save size={16} />
            {isSaving ? 'Đang lưu...' : 'Lưu bản vẽ'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

