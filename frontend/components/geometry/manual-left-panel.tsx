'use client'

import { useState } from 'react'
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
  LocateFixed,
  Crosshair,
  ArrowDownToLine,
  Triangle,
  Hexagon,
  Compass,
  Target,
  Activity,
  Scissors,
  Equal,
  CornerDownRight,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useGeometry } from './geometry-context'
import type { ManualTool } from './manual-editor'

const TOOLS: Array<{
  id: string
  label: string
  icon: React.ComponentType<{ className?: string; size?: number }>
  group?: string
}> = [
  { id: 'select', label: 'Chọn', icon: MousePointer2 },
  { id: 'point', label: 'Điểm', icon: Move3D },
  { id: 'segment', label: 'Đoạn', icon: PencilRuler },
  { id: 'polygon', label: 'Đa giác', icon: Pentagon },
  { id: 'midpoint', label: 'Trung điểm', icon: LocateFixed, group: 'constraint' },
  { id: 'intersection', label: 'Giao điểm', icon: Crosshair, group: 'constraint' },
  { id: 'projection', label: 'Hình chiếu', icon: ArrowDownToLine, group: 'constraint' },
  { id: 'regularPolygon', label: 'Lục giác đều', icon: Hexagon, group: '2d_special' },
  { id: 'specialTriangle_thuong', label: 'Tam giác thường', icon: Triangle },
  { id: 'specialTriangle_vuong', label: 'Tam giác vuông', icon: Triangle },
  { id: 'specialTriangle_can', label: 'Tam giác cân', icon: Triangle },
  { id: 'specialTriangle_vuong_can', label: 'T.giác vuông cân', icon: Triangle },
  { id: 'specialTriangle_deu', label: 'Tam giác đều', icon: Triangle },
  { id: 'specialQuadrilateral_binh_hanh', label: 'Hình bình hành', icon: Square },
  { id: 'specialQuadrilateral_chu_nhat', label: 'Hình chữ nhật', icon: Square },
  { id: 'specialQuadrilateral_thoi', label: 'Hình thoi', icon: Square },
  { id: 'specialQuadrilateral_vuong', label: 'Hình vuông', icon: Square },
  { id: 'circle', label: 'Đường tròn', icon: Compass, group: '2d_special' },
  { id: 'centroid', label: 'Trọng tâm', icon: Target, group: '2d_special' },
  { id: 'perpendicularBisector', label: 'Đ.trung trực', icon: Activity, group: '2d_special' },
  { id: 'angleBisector', label: 'Tia phân giác', icon: Scissors, group: '2d_special' },
  { id: 'parallelLine', label: 'Đ.song song', icon: Equal, group: '2d_special' },
  { id: 'perpendicularLine', label: 'Đ.vuông góc', icon: CornerDownRight, group: '2d_special' },
  { id: 'box', label: 'Hình hộp', icon: Square },
  { id: 'pyramid', label: 'Hình chóp', icon: Pyramid },
  { id: 'prism', label: 'Lăng trụ', icon: Box },
  { id: 'sphere', label: 'Hình cầu', icon: Circle },
  { id: 'cone', label: 'Hình nón', icon: Cone },
  { id: 'cylinder', label: 'Hình trụ', icon: Cylinder },
]

const CATEGORIES = [
  {
    id: 'points_lines',
    label: 'Điểm & Đường thẳng',
    tools: ['select', 'point', 'segment', 'midpoint', 'intersection', 'projection', 'centroid', 'perpendicularBisector', 'angleBisector', 'parallelLine', 'perpendicularLine']
  },
  {
    id: 'triangles',
    label: 'Hình Tam giác',
    tools: ['specialTriangle_thuong', 'specialTriangle_vuong', 'specialTriangle_can', 'specialTriangle_vuong_can', 'specialTriangle_deu']
  },
  {
    id: 'quadrilaterals',
    label: 'Hình Tứ giác & Đa giác',
    tools: ['polygon', 'specialQuadrilateral_binh_hanh', 'specialQuadrilateral_chu_nhat', 'specialQuadrilateral_thoi', 'specialQuadrilateral_vuong', 'regularPolygon']
  },
  {
    id: 'circles',
    label: 'Đường tròn',
    tools: ['circle']
  },
  {
    id: 'solids',
    label: 'Hình khối 3D',
    tools: ['box', 'pyramid', 'prism', 'sphere', 'cone', 'cylinder']
  }
]

export function ManualLeftPanel() {
  const router = useRouter()
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    points_lines: true,
    triangles: true,
    quadrilaterals: true,
    circles: true,
    solids: true,
  })

  const toggleGroup = (groupId: string) => {
    setOpenGroups((prev: Record<string, boolean>) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }))
  }

  const isToolActive = (toolId: string) => {
    if (toolId.startsWith('specialTriangle_')) {
      const code = toolId === 'specialTriangle_vuong' ? 1 : toolId === 'specialTriangle_can' ? 2 : toolId === 'specialTriangle_vuong_can' ? 3 : toolId === 'specialTriangle_deu' ? 4 : 5
      return activeTool === 'specialTriangle' && draftOperation?.tool === 'specialTriangle' && draftOperation.height === code
    }
    if (toolId.startsWith('specialQuadrilateral_')) {
      const code = toolId === 'specialQuadrilateral_binh_hanh' ? 1 : toolId === 'specialQuadrilateral_chu_nhat' ? 2 : toolId === 'specialQuadrilateral_thoi' ? 3 : 4
      return activeTool === 'specialQuadrilateral' && draftOperation?.tool === 'specialQuadrilateral' && draftOperation.height === code
    }
    return activeTool === toolId
  }

  const handleToolClick = (toolId: string) => {
    if (toolId.startsWith('specialTriangle_')) {
      const code = toolId === 'specialTriangle_vuong' ? 1 : toolId === 'specialTriangle_can' ? 2 : toolId === 'specialTriangle_vuong_can' ? 3 : toolId === 'specialTriangle_deu' ? 4 : 5
      setActiveTool('specialTriangle')
      setDraftOperation({ tool: 'specialTriangle', pointIds: [], height: code, centerPointId: null })
      return
    }
    if (toolId.startsWith('specialQuadrilateral_')) {
      const code = toolId === 'specialQuadrilateral_binh_hanh' ? 1 : toolId === 'specialQuadrilateral_chu_nhat' ? 2 : toolId === 'specialQuadrilateral_thoi' ? 3 : 4
      setActiveTool('specialQuadrilateral')
      setDraftOperation({ tool: 'specialQuadrilateral', pointIds: [], height: code })
      return
    }
    handleToolSelect(toolId as any)
  }

  const {
    activeTool,
    setActiveTool,
    manualSelection,
    setManualSelection,
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
    createCircle,
    createRegularPolygon,
    createSpecialTriangle,
    createSpecialQuadrilateral,
    createCentroid,
    manualDocument,
  } = useGeometry()

  const handleToolSelect = (tool: typeof activeTool) => {
    setActiveTool(tool)
    if (tool === 'select') {
      cancelManualDraft()
      setManualSelection(null)
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

    if (tool === 'midpoint') {
      setDraftOperation({ tool: 'midpoint', pointIds: [] })
      return
    }

    if (tool === 'intersection') {
      setDraftOperation({ tool: 'intersection', segmentIds: [] })
      return
    }

    if (tool === 'projection') {
      setDraftOperation({ tool: 'projection', pointIds: [] })
      return
    }

    if (tool === 'regularPolygon') {
      setDraftOperation({ tool: 'regularPolygon', pointIds: [], radius: 6 }) // defaults to 6 sides (regular hexagon)
      return
    }

    if (tool === 'specialTriangle') {
      setDraftOperation({ tool: 'specialTriangle', pointIds: [], height: 1 }) // height is used to store type (1=vuong, 2=can, 3=vuong_can, 4=deu)
      return
    }

    if (tool === 'specialQuadrilateral') {
      setDraftOperation({ tool: 'specialQuadrilateral', pointIds: [], height: 1 }) // height is used to store type (1=binh_huanh, 2=chu_nhat, 3=thoi, 4=vuong)
      return
    }

    if (tool === 'circle') {
      setDraftOperation({ tool: 'circle', pointIds: [], height: 3, radius: 3 }) // default circleKind is height: 3 (centerPoint / Tâm + Điểm) for 2-click process!
      return
    }

    if (tool === 'centroid') {
      setDraftOperation({ tool: 'centroid', pointIds: [] })
      return
    }

    if (tool === 'perpendicularBisector') {
      setDraftOperation({ tool: 'perpendicularBisector', pointIds: [], segmentIds: [], radius: 20 })
      return
    }

    if (tool === 'angleBisector') {
      setDraftOperation({ tool: 'angleBisector', pointIds: [], radius: 20 })
      return
    }

    if (tool === 'parallelLine') {
      setDraftOperation({ tool: 'parallelLine', pointIds: [], segmentIds: [], radius: 20 })
      return
    }

    if (tool === 'perpendicularLine') {
      setDraftOperation({ tool: 'perpendicularLine', pointIds: [], segmentIds: [], radius: 20 })
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
    const apexPointId = draftOperation?.tool === type ? (draftOperation.apexPointId ?? undefined) : undefined
    const topPointId = draftOperation?.tool === type ? (draftOperation.topPointId ?? undefined) : undefined

    if (!basePolygonId) return
    if (type === 'pyramid') {
      if (height <= 0 && !apexPointId) return
      createPyramid(basePolygonId, height, apexPointId)
    }
    if (type === 'prism') {
      if (height <= 0 && !topPointId) return
      createPrism(basePolygonId, height, topPointId)
    }
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
    const baseCircleId = draftOperation.baseCircleId
      ?? (manualSelection?.kind === 'circle' ? manualSelection.id : null)
    const centerPointId = draftOperation.centerPointId
      ?? (manualSelection?.kind === 'point' ? manualSelection.id : null)
    const radius = draftOperation.radius ?? 3
    const height = draftOperation.height ?? 5
    
    if (baseCircleId) {
      createCone('', radius, height, baseCircleId)
    } else {
      if (!centerPointId || radius <= 0 || height <= 0) return
      createCone(centerPointId, radius, height)
    }
    setDraftOperation({ tool: 'cone', centerPointId: null, baseCircleId: null, radius, height })
  }

  const handleCylinderCreate = () => {
    if (draftOperation?.tool !== 'cylinder') return
    const baseCircleId = draftOperation.baseCircleId
      ?? (manualSelection?.kind === 'circle' ? manualSelection.id : null)
    const centerPointId = draftOperation.centerPointId
      ?? (manualSelection?.kind === 'point' ? manualSelection.id : null)
    const radius = draftOperation.radius ?? 3
    const height = draftOperation.height ?? 5
    
    if (baseCircleId) {
      createCylinder('', radius, height, baseCircleId)
    } else {
      if (!centerPointId || radius <= 0 || height <= 0) return
      createCylinder(centerPointId, radius, height)
    }
    setDraftOperation({ tool: 'cylinder', centerPointId: null, baseCircleId: null, radius, height })
  }

  const handleRegularPolygonCreate = () => {
    if (draftOperation?.tool !== 'regularPolygon') return
    const pts = draftOperation.pointIds ?? []
    if (pts.length !== 2) return
    const sides = draftOperation.radius ?? 5
    createRegularPolygon(pts[0], pts[1], sides)
    setDraftOperation({ tool: 'regularPolygon', pointIds: [], radius: sides })
  }

  const handleSpecialTriangleCreate = () => {
    if (draftOperation?.tool !== 'specialTriangle') return
    const pts = draftOperation.pointIds ?? []
    if (pts.length !== 2) return
    const typeCode = draftOperation.height ?? 1
    const type = typeCode === 1 ? 'vuong' : typeCode === 2 ? 'can' : typeCode === 3 ? 'vuong_can' : 'deu'
    const anchor = draftOperation.centerPointId ?? pts[0]
    createSpecialTriangle(type, pts[0], pts[1], anchor)
    setDraftOperation({ tool: 'specialTriangle', pointIds: [], height: typeCode, centerPointId: anchor })
  }

  const handleSpecialQuadrilateralCreate = () => {
    if (draftOperation?.tool !== 'specialQuadrilateral') return
    const pts = draftOperation.pointIds ?? []
    const typeCode = draftOperation.height ?? 1
    const type = typeCode === 1 ? 'binh_huanh' : typeCode === 2 ? 'chu_nhat' : typeCode === 3 ? 'thoi' : 'vuong'
    if (type === 'thoi' || type === 'vuong') {
      if (pts.length !== 2) return
    } else {
      if (pts.length !== 3) return
    }
    createSpecialQuadrilateral(type, pts)
    setDraftOperation({ tool: 'specialQuadrilateral', pointIds: [], height: typeCode })
  }

  const handleCircleCreate = () => {
    if (draftOperation?.tool !== 'circle') return
    const pts = draftOperation.pointIds ?? []
    const kindCode = draftOperation.height ?? 1
    const kind = kindCode === 1 ? 'threePoints' : kindCode === 2 ? 'centerRadius' : 'centerPoint'
    if (kind === 'threePoints') {
      if (pts.length !== 3) return
      createCircle('threePoints', { sourcePointIds: pts })
    } else if (kind === 'centerRadius') {
      if (pts.length !== 1) return
      const r = draftOperation.radius ?? 3
      createCircle('centerRadius', { centerPointId: pts[0], radius: r })
    } else {
      if (pts.length !== 2) return
      createCircle('centerPoint', { centerPointId: pts[0], radiusPointId: pts[1] })
    }
    setDraftOperation({ tool: 'circle', pointIds: [], height: kindCode, radius: draftOperation.radius ?? 3 })
  }

  const handleCentroidCreate = () => {
    if (draftOperation?.tool !== 'centroid') return
    const pts = draftOperation.pointIds ?? []
    if (pts.length < 3) return
    createCentroid(undefined, pts)
    setDraftOperation({ tool: 'centroid', pointIds: [] })
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
            <h2 className="text-sm font-bold tracking-tight">Danh mục công cụ</h2>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Các công cụ được sắp xếp theo nhóm chức năng.
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

      <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
        {CATEGORIES.map((category) => {
          const isOpen = openGroups[category.id]
          return (
            <div key={category.id} className="border border-border/80 rounded-xl overflow-hidden bg-background/50">
              <button
                onClick={() => toggleGroup(category.id)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 bg-secondary/40 hover:bg-secondary/70 transition-colors text-left"
              >
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{category.label}</span>
                <span className="text-xs text-muted-foreground/60 transition-transform duration-300 font-bold">
                  {isOpen ? '▲' : '▼'}
                </span>
              </button>
              {isOpen && (
                <div className="p-2 grid grid-cols-2 gap-1.5 bg-card/45">
                  {category.tools.map((toolId) => {
                    const tool = TOOLS.find((t) => t.id === toolId)
                    if (!tool) return null
                    const Icon = tool.icon
                    const isActive = isToolActive(tool.id)
                    return (
                      <button
                        key={tool.id}
                        onClick={() => handleToolClick(tool.id)}
                        className={`rounded-xl border p-2 text-left transition-all duration-200 flex flex-col items-start ${
                          isActive
                            ? 'border-primary bg-primary/10 text-primary shadow-sm font-bold scale-[0.98]'
                            : 'border-border/60 bg-background/40 hover:border-primary/20 hover:bg-accent/40'
                        }`}
                      >
                        <Icon size={14} className={`mb-1.5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                        <div className="text-[11px] font-semibold tracking-tight truncate w-full">{tool.label}</div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {activeTool !== 'select' && (
        <Card className="border-primary/20 bg-primary/5 py-3.5 shadow-sm rounded-2xl">
          <CardHeader className="px-4 pb-0 pt-1">
            <CardTitle className="text-xs text-primary font-bold flex items-center gap-1.5">
              <Sparkles size={14} />
              Hướng dẫn thao tác
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pt-2">
            <p className="text-[11px] leading-relaxed text-muted-foreground font-medium whitespace-pre-line">
              {activeTool === 'parallelLine' && '1. Click chọn một Điểm làm gốc.\n2. Click chọn một Đoạn thẳng làm chuẩn.\nĐường thẳng song song sẽ tự động xuất hiện!'}
              {activeTool === 'perpendicularLine' && '1. Click chọn một Điểm làm gốc.\n2. Click chọn một Đoạn thẳng làm chuẩn.\nĐường thẳng vuông góc sẽ tự động xuất hiện!'}
              {activeTool === 'pyramid' && '1. Click chọn một Đa giác làm mặt đáy.\n2. Thiết lập chiều cao, hoặc chọn một Điểm làm đỉnh (Apex).'}
              {activeTool === 'prism' && '1. Click chọn một Đa giác làm mặt đáy.\n2. Thiết lập chiều cao, hoặc chọn một Điểm làm đỉnh mặt trên.'}
              {activeTool === 'intersection' && 'Click chọn lần lượt 2 Đoạn thẳng cắt nhau.\nGiao điểm sẽ xuất hiện chính xác tại vị trí cắt!'}
              {activeTool === 'circle' && 'Chọn cách vẽ phù hợp ở dưới. Mặc định là Tâm + Điểm:\n1. Click chọn Tâm.\n2. Click chọn Điểm thứ hai xác định bán kính.'}
              {activeTool === 'box' && 'Click chọn lần lượt 2 Điểm chéo đáy trên lưới.\nHình hộp 3D sẽ tự động dựng hình với chiều cao mặc định!'}
              {activeTool === 'segment' && 'Click chọn Điểm thứ nhất, sau đó click chọn Điểm thứ hai (hoặc kéo chuột) để tạo Đoạn thẳng.'}
              {activeTool === 'polygon' && 'Click chọn lần lượt các Điểm làm đỉnh.\nClick lại điểm bắt đầu để hoàn tất Đa giác.'}
              {activeTool === 'point' && 'Click vào bất cứ đâu trên lưới Oxy (z=0) để tạo Điểm mới.\nGiữ Shift và kéo để nâng hạ độ cao (trục Z).'}
              {activeTool === 'midpoint' && 'Click vào một Đoạn thẳng có sẵn,\nhoặc click chọn lần lượt 2 Điểm để tạo Trung điểm.'}
              {activeTool === 'projection' && '1. Click chọn Điểm cần chiếu.\n2. Click chọn một Đoạn thẳng hoặc Đa giác mẫu.'}
              {activeTool === 'regularPolygon' && 'Click chọn lần lượt 2 Điểm làm cạnh.\nMột Lục giác đều (6 cạnh) sẽ tự động được dựng hình.'}
              {activeTool === 'specialTriangle' && 'Chọn loại tam giác ở dưới, sau đó click chọn lần lượt 2 Điểm làm đỉnh cơ sở để tự động sinh tam giác.'}
              {activeTool === 'specialQuadrilateral' && 'Chọn loại hình ở dưới, sau đó click chọn đủ số đỉnh cơ sở (2 hoặc 3 Điểm) để tự động sinh tứ giác.'}
              {activeTool === 'sphere' && '1. Click chọn (hoặc tạo mới) một Điểm làm tâm.\n2. Nhập bán kính trong bảng Thiết lập bên dưới.'}
              {activeTool === 'cone' && '1. Click chọn 1 Đường tròn làm đáy (hoặc Tâm + Bán kính).\n2. Nhập chiều cao hoặc điều chỉnh trong bảng Thiết lập.'}
              {activeTool === 'cylinder' && '1. Click chọn 1 Đường tròn làm đáy (hoặc Tâm + Bán kính).\n2. Nhập chiều cao hoặc điều chỉnh trong bảng Thiết lập.'}
            </p>
          </CardContent>
        </Card>
      )}

      {draftOperation !== null && (
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
              <div className="space-y-3">
                <p className="text-xs font-semibold">Thông số khối</p>
                
                <div className="space-y-1">
                  <label className="text-[11px] text-muted-foreground font-medium">Đa giác đáy</label>
                  <Badge variant={draftOperation?.basePolygonId ? 'default' : 'outline'} className="w-full justify-start text-xs rounded-xl py-1 px-2.5">
                    {draftOperation?.basePolygonId
                      ? manualDocument.polygons.find((p) => p.id === draftOperation.basePolygonId)?.label ?? 'Đa giác đã chọn'
                      : 'Chưa chọn (click đa giác trên canvas)'}
                  </Badge>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-muted-foreground font-medium">Kiểu thiết lập</label>
                  <div className="flex gap-1 p-1 bg-secondary rounded-xl">
                    <Button
                      type="button"
                      variant={
                        (activeTool === 'pyramid' && !draftOperation?.apexPointId) ||
                        (activeTool === 'prism' && !draftOperation?.topPointId)
                          ? 'default'
                          : 'ghost'
                      }
                      size="sm"
                      className="flex-1 rounded-lg text-[11px] h-7 font-semibold"
                      onClick={() => {
                        if (draftOperation) {
                          setDraftOperation({
                            ...draftOperation,
                            apexPointId: null,
                            topPointId: null,
                          })
                        }
                      }}
                    >
                      {activeTool === 'pyramid' ? 'Đều (Đứng)' : 'Đứng'}
                    </Button>
                    <Button
                      type="button"
                      variant={
                        (activeTool === 'pyramid' && draftOperation?.apexPointId) ||
                        (activeTool === 'prism' && draftOperation?.topPointId)
                          ? 'default'
                          : 'ghost'
                      }
                      size="sm"
                      className="flex-1 rounded-lg text-[11px] h-7 font-semibold"
                      onClick={() => {
                        if (draftOperation) {
                          setDraftOperation({
                            ...draftOperation,
                            apexPointId: activeTool === 'pyramid' ? 'auto_generate' : null,
                            topPointId: activeTool === 'prism' ? 'auto_generate' : null,
                          })
                        }
                      }}
                    >
                      Xiên
                    </Button>
                  </div>
                </div>

                {/* Standing Solid Form */}
                {((activeTool === 'pyramid' && !draftOperation?.apexPointId) ||
                  (activeTool === 'prism' && !draftOperation?.topPointId)) && (
                  <div className="space-y-2">
                    {activeTool === 'prism' && (
                      <div className="flex items-center gap-2 py-0.5">
                        <input
                          id="prism-auto-height"
                          type="checkbox"
                          checked={draftOperation?.height === undefined}
                          onChange={(e) => {
                            if (draftOperation) {
                              setDraftOperation({
                                ...draftOperation,
                                height: e.target.checked ? undefined : 4,
                              })
                            }
                          }}
                          className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary bg-background"
                        />
                        <label htmlFor="prism-auto-height" className="text-[11px] font-semibold cursor-pointer select-none">
                          Hình lập phương (Auto cao)
                        </label>
                      </div>
                    )}
                    
                    {draftOperation?.height !== undefined && (
                      <div className="space-y-1">
                        <label className="text-[11px] text-muted-foreground font-medium">Chiều cao h</label>
                        <Input
                          type="number"
                          min={0.1}
                          step={0.5}
                          value={draftOperation?.height ?? 4}
                          onChange={(event) => updateDraftHeight(event.target.value)}
                          placeholder="Chiều cao"
                          className="rounded-xl h-8 text-xs"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Skewed Solid Form */}
                {((activeTool === 'pyramid' && draftOperation?.apexPointId) ||
                  (activeTool === 'prism' && draftOperation?.topPointId)) && (
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <label className="text-[11px] text-muted-foreground font-medium">
                        {activeTool === 'pyramid' ? 'Chọn Đỉnh Chóp (Apex)' : 'Chọn Đỉnh Mặt Trên (Top)'}
                      </label>
                      <select
                        value={
                          (activeTool === 'pyramid' ? draftOperation?.apexPointId : draftOperation?.topPointId) ?? ''
                        }
                        onChange={(e) => {
                          if (draftOperation) {
                            setDraftOperation({
                              ...draftOperation,
                              apexPointId: activeTool === 'pyramid' ? e.target.value : null,
                              topPointId: activeTool === 'prism' ? e.target.value : null,
                            })
                          }
                        }}
                        className="flex h-8 w-full rounded-xl border border-input bg-background px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <option value="" disabled>-- Chọn điểm --</option>
                        <option value="auto_generate">-- Tự sinh đỉnh tự do ở cao độ h --</option>
                        {manualDocument.points.map((pt) => (
                          <option key={pt.id} value={pt.id}>
                            {pt.label} ({pt.position.map(p => p.toFixed(1)).join(', ')})
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-muted-foreground">
                        * Hoặc click chọn một điểm có sẵn trên canvas để gán làm đỉnh.
                      </p>
                    </div>
                  </div>
                )}

                <Button
                  size="sm"
                  className="w-full rounded-xl h-8 text-xs font-semibold mt-2"
                  onClick={() => handleSolidCreate(activeTool)}
                  disabled={
                    !draftOperation?.basePolygonId ||
                    (activeTool === 'pyramid' && !draftOperation?.apexPointId && (!draftOperation?.height || draftOperation.height <= 0)) ||
                    (activeTool === 'prism' && !draftOperation?.topPointId && draftOperation?.height !== undefined && draftOperation.height <= 0)
                  }
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
              <div className="space-y-3">
                <p className="text-xs font-semibold">Thông số hình nón</p>
                
                <div className="space-y-1">
                  <label className="text-[11px] text-muted-foreground font-medium">Kiểu đáy</label>
                  <div className="flex gap-1 p-1 bg-secondary rounded-xl">
                    <Button
                      type="button"
                      variant={!draftOperation.baseCircleId ? 'default' : 'ghost'}
                      size="sm"
                      className="flex-1 rounded-lg text-[11px] h-7 font-semibold"
                      onClick={() => {
                        setDraftOperation({
                          ...draftOperation,
                          baseCircleId: null,
                          centerPointId: manualDocument.points[0]?.id ?? null,
                        })
                      }}
                    >
                      Tâm + Bán kính
                    </Button>
                    <Button
                      type="button"
                      variant={draftOperation.baseCircleId ? 'default' : 'ghost'}
                      size="sm"
                      className="flex-1 rounded-lg text-[11px] h-7 font-semibold"
                      onClick={() => {
                        setDraftOperation({
                          ...draftOperation,
                          baseCircleId: manualDocument.circles[0]?.id ?? null,
                          centerPointId: null,
                        })
                      }}
                    >
                      Đường tròn đáy
                    </Button>
                  </div>
                </div>

                {/* Center + Radius Mode */}
                {!draftOperation.baseCircleId && (
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <label className="text-[11px] text-muted-foreground font-medium">Tâm đáy</label>
                      <select
                        value={draftOperation.centerPointId ?? ''}
                        onChange={(e) => {
                          setDraftOperation({
                            ...draftOperation,
                            centerPointId: e.target.value,
                          })
                        }}
                        className="flex h-8 w-full rounded-xl border border-input bg-background px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <option value="" disabled>-- Chọn tâm --</option>
                        {manualDocument.points.map((pt) => (
                          <option key={pt.id} value={pt.id}>
                            {pt.label} ({pt.position.map(p => p.toFixed(1)).join(', ')})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-muted-foreground font-medium">Bán kính đáy R</label>
                      <Input
                        type="number"
                        min={0.1}
                        step={0.5}
                        value={draftOperation.radius ?? 3}
                        onChange={(event) => updateDraftRadius(event.target.value)}
                        placeholder="Bán kính"
                        className="rounded-xl h-8 text-xs"
                      />
                    </div>
                  </div>
                )}

                {/* Base Circle Mode */}
                {!!draftOperation.baseCircleId && (
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <label className="text-[11px] text-muted-foreground font-medium">Chọn đường tròn đáy</label>
                      <select
                        value={draftOperation.baseCircleId ?? ''}
                        onChange={(e) => {
                          setDraftOperation({
                            ...draftOperation,
                            baseCircleId: e.target.value,
                          })
                        }}
                        className="flex h-8 w-full rounded-xl border border-input bg-background px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <option value="" disabled>-- Chọn đường tròn --</option>
                        {manualDocument.circles.map((circle) => (
                          <option key={circle.id} value={circle.id}>
                            {circle.label || `Đường tròn ${circle.id.slice(-4)}`}
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-muted-foreground">
                        * Hoặc click chọn một đường tròn trực tiếp trên canvas.
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[11px] text-muted-foreground font-medium">Chiều cao h</label>
                  <Input
                    type="number"
                    min={0.1}
                    step={0.5}
                    value={draftOperation.height ?? 5}
                    onChange={(event) => updateDraftHeight(event.target.value)}
                    placeholder="Chiều cao"
                    className="rounded-xl h-8 text-xs"
                  />
                </div>

                <Button
                  size="sm"
                  className="w-full rounded-xl h-8 text-xs font-semibold mt-2"
                  onClick={handleConeCreate}
                  disabled={
                    (!draftOperation.baseCircleId && (!draftOperation.centerPointId || !draftOperation.radius || draftOperation.radius <= 0)) ||
                    (draftOperation.baseCircleId && !draftOperation.baseCircleId) ||
                    !draftOperation.height ||
                    draftOperation.height <= 0
                  }
                >
                  Tạo hình nón
                </Button>
              </div>
            )}

            {draftOperation?.tool === 'cylinder' && (
              <div className="space-y-3">
                <p className="text-xs font-semibold">Thông số hình trụ</p>
                
                <div className="space-y-1">
                  <label className="text-[11px] text-muted-foreground font-medium">Kiểu đáy</label>
                  <div className="flex gap-1 p-1 bg-secondary rounded-xl">
                    <Button
                      type="button"
                      variant={!draftOperation.baseCircleId ? 'default' : 'ghost'}
                      size="sm"
                      className="flex-1 rounded-lg text-[11px] h-7 font-semibold"
                      onClick={() => {
                        setDraftOperation({
                          ...draftOperation,
                          baseCircleId: null,
                          centerPointId: manualDocument.points[0]?.id ?? null,
                        })
                      }}
                    >
                      Tâm + Bán kính
                    </Button>
                    <Button
                      type="button"
                      variant={draftOperation.baseCircleId ? 'default' : 'ghost'}
                      size="sm"
                      className="flex-1 rounded-lg text-[11px] h-7 font-semibold"
                      onClick={() => {
                        setDraftOperation({
                          ...draftOperation,
                          baseCircleId: manualDocument.circles[0]?.id ?? null,
                          centerPointId: null,
                        })
                      }}
                    >
                      Đường tròn đáy
                    </Button>
                  </div>
                </div>

                {/* Center + Radius Mode */}
                {!draftOperation.baseCircleId && (
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <label className="text-[11px] text-muted-foreground font-medium">Tâm đáy</label>
                      <select
                        value={draftOperation.centerPointId ?? ''}
                        onChange={(e) => {
                          setDraftOperation({
                            ...draftOperation,
                            centerPointId: e.target.value,
                          })
                        }}
                        className="flex h-8 w-full rounded-xl border border-input bg-background px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <option value="" disabled>-- Chọn tâm --</option>
                        {manualDocument.points.map((pt) => (
                          <option key={pt.id} value={pt.id}>
                            {pt.label} ({pt.position.map(p => p.toFixed(1)).join(', ')})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-muted-foreground font-medium">Bán kính đáy R</label>
                      <Input
                        type="number"
                        min={0.1}
                        step={0.5}
                        value={draftOperation.radius ?? 3}
                        onChange={(event) => updateDraftRadius(event.target.value)}
                        placeholder="Bán kính"
                        className="rounded-xl h-8 text-xs"
                      />
                    </div>
                  </div>
                )}

                {/* Base Circle Mode */}
                {!!draftOperation.baseCircleId && (
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <label className="text-[11px] text-muted-foreground font-medium">Chọn đường tròn đáy</label>
                      <select
                        value={draftOperation.baseCircleId ?? ''}
                        onChange={(e) => {
                          setDraftOperation({
                            ...draftOperation,
                            baseCircleId: e.target.value,
                          })
                        }}
                        className="flex h-8 w-full rounded-xl border border-input bg-background px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <option value="" disabled>-- Chọn đường tròn --</option>
                        {manualDocument.circles.map((circle) => (
                          <option key={circle.id} value={circle.id}>
                            {circle.label || `Đường tròn ${circle.id.slice(-4)}`}
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-muted-foreground">
                        * Hoặc click chọn một đường tròn trực tiếp trên canvas.
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[11px] text-muted-foreground font-medium">Chiều cao h</label>
                  <Input
                    type="number"
                    min={0.1}
                    step={0.5}
                    value={draftOperation.height ?? 5}
                    onChange={(event) => updateDraftHeight(event.target.value)}
                    placeholder="Chiều cao"
                    className="rounded-xl h-8 text-xs"
                  />
                </div>

                <Button
                  size="sm"
                  className="w-full rounded-xl h-8 text-xs font-semibold mt-2"
                  onClick={handleCylinderCreate}
                  disabled={
                    (!draftOperation.baseCircleId && (!draftOperation.centerPointId || !draftOperation.radius || draftOperation.radius <= 0)) ||
                    (draftOperation.baseCircleId && !draftOperation.baseCircleId) ||
                    !draftOperation.height ||
                    draftOperation.height <= 0
                  }
                >
                  Tạo hình trụ
                </Button>
              </div>
            )}

            {draftOperation?.tool === 'midpoint' && (
              <div className="space-y-2">
                <p className="text-xs font-semibold">Công cụ Trung điểm</p>
                <p className="text-[11px] text-muted-foreground">
                  Chọn 2 điểm (hoặc click vào 1 đoạn thẳng) để tạo trung điểm phụ thuộc.
                </p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {(draftOperation.pointIds?.length ?? 0) === 0
                      ? 'Chọn điểm thứ nhất...'
                      : `Đã chọn: ${manualDocument.points.find((p) => p.id === draftOperation.pointIds?.[0])?.label ?? '?'}`}
                  </Badge>
                </div>
              </div>
            )}

            {draftOperation?.tool === 'intersection' && (
              <div className="space-y-2">
                <p className="text-xs font-semibold">Công cụ Giao điểm</p>
                <p className="text-[11px] text-muted-foreground">
                  Chọn 2 đoạn thẳng cắt nhau để tạo giao điểm phụ thuộc.
                </p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {(draftOperation.segmentIds?.length ?? 0) === 0
                      ? 'Chọn đoạn thẳng thứ nhất...'
                      : `Đã chọn: ${manualDocument.segments.find((s) => s.id === draftOperation.segmentIds?.[0])?.label ?? '?'}`}
                  </Badge>
                </div>
              </div>
            )}

            {draftOperation?.tool === 'projection' && (
              <div className="space-y-2">
                <p className="text-xs font-semibold">Công cụ Hình chiếu</p>
                <p className="text-[11px] text-muted-foreground">
                  {(draftOperation.pointIds?.length ?? 0) === 0
                    ? 'Chọn 1 điểm cần hạ đường vuông góc.'
                    : 'Chọn 1 đoạn thẳng hoặc mặt phẳng để chiếu lên.'}
                </p>
                <div className="flex items-center gap-2">
                  <Badge variant={(draftOperation.pointIds?.length ?? 0) > 0 ? 'default' : 'outline'}>
                    {(draftOperation.pointIds?.length ?? 0) === 0
                      ? 'Chọn điểm...'
                      : `Điểm: ${manualDocument.points.find((p) => p.id === draftOperation.pointIds?.[0])?.label ?? '?'}`}
                  </Badge>
                </div>
              </div>
            )}

            {draftOperation?.tool === 'regularPolygon' && (
              <div className="space-y-2">
                <p className="text-xs font-semibold">Đa giác đều</p>
                <p className="text-[11px] text-muted-foreground">
                  Chọn 2 điểm làm 2 đỉnh liên tiếp, rồi nhập số cạnh.
                </p>
                <div className="flex gap-2 items-center">
                  <Badge variant={(draftOperation.pointIds?.length ?? 0) >= 1 ? 'default' : 'outline'}>
                    {(draftOperation.pointIds?.length ?? 0) >= 1
                      ? manualDocument.points.find((p) => p.id === draftOperation.pointIds?.[0])?.label ?? 'Đỉnh 1'
                      : 'Chọn đỉnh 1...'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">→</span>
                  <Badge variant={(draftOperation.pointIds?.length ?? 0) >= 2 ? 'default' : 'outline'}>
                    {(draftOperation.pointIds?.length ?? 0) >= 2
                      ? manualDocument.points.find((p) => p.id === draftOperation.pointIds?.[1])?.label ?? 'Đỉnh 2'
                      : 'Chọn đỉnh 2...'}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-muted-foreground">Số cạnh n (3 - 12)</label>
                  <Input
                    type="number"
                    min={3}
                    max={12}
                    value={draftOperation.radius ?? 5}
                    onChange={(event) =>
                      setDraftOperation({
                        ...draftOperation,
                        radius: Math.min(12, Math.max(3, parseInt(event.target.value) || 3)),
                      })
                    }
                  />
                </div>
                <Button
                  size="sm"
                  className="w-full font-bold"
                  onClick={handleRegularPolygonCreate}
                  disabled={(draftOperation.pointIds?.length ?? 0) !== 2}
                >
                  Tạo đa giác đều
                </Button>
              </div>
            )}

            {draftOperation?.tool === 'specialTriangle' && (
              <div className="space-y-2">
                <p className="text-xs font-semibold">Tam giác đặc biệt</p>
                <p className="text-[11px] text-muted-foreground font-medium">
                  Chọn 2 điểm làm 2 đỉnh ban đầu. Đỉnh thứ 3 sẽ được tự động tính toán.
                </p>
                <div className="flex gap-2 items-center">
                  <Badge variant={(draftOperation.pointIds?.length ?? 0) >= 1 ? 'default' : 'outline'}>
                    {(draftOperation.pointIds?.length ?? 0) >= 1
                      ? manualDocument.points.find((p) => p.id === draftOperation.pointIds?.[0])?.label ?? 'Đỉnh A'
                      : 'Chọn đỉnh A...'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">→</span>
                  <Badge variant={(draftOperation.pointIds?.length ?? 0) >= 2 ? 'default' : 'outline'}>
                    {(draftOperation.pointIds?.length ?? 0) >= 2
                      ? manualDocument.points.find((p) => p.id === draftOperation.pointIds?.[1])?.label ?? 'Đỉnh B'
                      : 'Chọn đỉnh B...'}
                  </Badge>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] text-muted-foreground font-semibold">Loại tam giác</label>
                  <div className="grid grid-cols-4 gap-1">
                    {[
                      { code: 1, label: 'Vuông' },
                      { code: 2, label: 'Cân' },
                      { code: 3, label: 'Vuông cân' },
                      { code: 4, label: 'Đều' },
                    ].map((item) => (
                      <Button
                        key={item.code}
                        type="button"
                        variant={(draftOperation.height ?? 1) === item.code ? 'default' : 'outline'}
                        className="h-7 text-[10px] px-1 py-0 rounded-lg"
                        onClick={() =>
                          setDraftOperation({
                            ...draftOperation,
                            height: item.code,
                          })
                        }
                      >
                        {item.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {(draftOperation.height ?? 1) === 1 && (draftOperation.pointIds?.length ?? 0) === 2 && (
                  <div className="space-y-1">
                    <label className="text-[11px] text-muted-foreground font-semibold">Đỉnh góc vuông</label>
                    <div className="flex gap-2">
                      {draftOperation.pointIds!.map((pid) => {
                        const label = manualDocument.points.find((p) => p.id === pid)?.label ?? '?'
                        const isAnchor = (draftOperation.centerPointId ?? draftOperation.pointIds![0]) === pid
                        return (
                          <Button
                            key={pid}
                            type="button"
                            variant={isAnchor ? 'default' : 'outline'}
                            className="h-7 text-xs rounded-lg px-3"
                            onClick={() =>
                              setDraftOperation({
                                ...draftOperation,
                                centerPointId: pid,
                              })
                            }
                          >
                            Đỉnh {label}
                          </Button>
                        )
                      })}
                    </div>
                  </div>
                )}

                <Button
                  size="sm"
                  className="w-full font-bold"
                  onClick={handleSpecialTriangleCreate}
                  disabled={(draftOperation.pointIds?.length ?? 0) !== 2}
                >
                  Tạo tam giác
                </Button>
              </div>
            )}

            {draftOperation?.tool === 'specialQuadrilateral' && (
              <div className="space-y-2">
                <p className="text-xs font-semibold">Tứ giác đặc biệt</p>
                <p className="text-[11px] text-muted-foreground font-medium">
                  {[(draftOperation.height ?? 1) === 3, (draftOperation.height ?? 1) === 4].some(Boolean)
                    ? 'Chọn 2 điểm làm đường chéo/cạnh chính. Các đỉnh khác sẽ tự động dựng cân đối.'
                    : 'Chọn 3 điểm (A, B, C). Đỉnh D sẽ tự động sinh để tạo hình.'}
                </p>
                <div className="flex flex-wrap gap-1.5 py-1">
                  {Array.from({ length: [(draftOperation.height ?? 1) === 3, (draftOperation.height ?? 1) === 4].some(Boolean) ? 2 : 3 }).map((_, idx) => {
                    const pid = draftOperation.pointIds?.[idx]
                    const point = pid ? manualDocument.points.find((p) => p.id === pid) : null
                    return (
                      <Badge key={idx} variant={point ? 'default' : 'outline'} className="text-[10px]">
                        {point ? point.label : `Đỉnh ${String.fromCharCode(65 + idx)}...`}
                      </Badge>
                    )
                  })}
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] text-muted-foreground font-semibold">Loại hình</label>
                  <div className="grid grid-cols-4 gap-1">
                    {[
                      { code: 1, label: 'Bình hành' },
                      { code: 2, label: 'Chữ nhật' },
                      { code: 3, label: 'Hình thoi' },
                      { code: 4, label: 'Hình vuông' },
                    ].map((item) => (
                      <Button
                        key={item.code}
                        type="button"
                        variant={(draftOperation.height ?? 1) === item.code ? 'default' : 'outline'}
                        className="h-7 text-[10px] px-1 py-0 rounded-lg"
                        onClick={() =>
                          setDraftOperation({
                            ...draftOperation,
                            height: item.code,
                            pointIds: [],
                          })
                        }
                      >
                        {item.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <Button
                  size="sm"
                  className="w-full font-bold"
                  onClick={handleSpecialQuadrilateralCreate}
                  disabled={
                    [(draftOperation.height ?? 1) === 3, (draftOperation.height ?? 1) === 4].some(Boolean)
                      ? (draftOperation.pointIds?.length ?? 0) !== 2
                      : (draftOperation.pointIds?.length ?? 0) !== 3
                  }
                >
                  Tạo tứ giác
                </Button>
              </div>
            )}

            {draftOperation?.tool === 'circle' && (
              <div className="space-y-2">
                <p className="text-xs font-semibold">Dựng đường tròn</p>
                <div className="space-y-1.5">
                  <label className="text-[11px] text-muted-foreground font-semibold">Cách xác định</label>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { code: 1, label: '3 Điểm' },
                      { code: 2, label: 'Tâm + R' },
                      { code: 3, label: 'Tâm + Điểm' },
                    ].map((item) => (
                      <Button
                        key={item.code}
                        type="button"
                        variant={(draftOperation.height ?? 1) === item.code ? 'default' : 'outline'}
                        className="h-7 text-[9px] px-0 py-0 rounded-lg"
                        onClick={() =>
                          setDraftOperation({
                            ...draftOperation,
                            height: item.code,
                            pointIds: [],
                          })
                        }
                      >
                        {item.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <p className="text-[11px] text-muted-foreground font-medium">
                  {(draftOperation.height ?? 1) === 1
                    ? 'Chọn 3 điểm phân biệt trên không gian.'
                    : (draftOperation.height ?? 1) === 2
                      ? 'Chọn 1 điểm làm tâm, nhập bán kính R.'
                      : 'Chọn 2 điểm: tâm và điểm nằm trên đường tròn.'}
                </p>

                <div className="flex flex-wrap gap-1.5 py-1">
                  {Array.from({
                    length:
                      (draftOperation.height ?? 1) === 1
                        ? 3
                        : (draftOperation.height ?? 1) === 2
                          ? 1
                          : 2,
                  }).map((_, idx) => {
                    const pid = draftOperation.pointIds?.[idx]
                    const point = pid ? manualDocument.points.find((p) => p.id === pid) : null
                    return (
                      <Badge key={idx} variant={point ? 'default' : 'outline'} className="text-[10px]">
                        {point ? point.label : idx === 0 ? 'Tâm...' : `Đỉnh ${idx + 1}...`}
                      </Badge>
                    )
                  })}
                </div>

                {(draftOperation.height ?? 1) === 2 && (
                  <div className="space-y-1">
                    <label className="text-[11px] text-muted-foreground font-medium">Bán kính R</label>
                    <Input
                      type="number"
                      min={0.1}
                      step={0.5}
                      value={draftOperation.radius ?? 3}
                      onChange={(event) =>
                        setDraftOperation({
                          ...draftOperation,
                          radius: parseFloat(event.target.value) || 1,
                        })
                      }
                    />
                  </div>
                )}

                <Button
                  size="sm"
                  className="w-full font-bold"
                  onClick={handleCircleCreate}
                  disabled={
                    (draftOperation.height ?? 1) === 1
                      ? (draftOperation.pointIds?.length ?? 0) !== 3
                      : (draftOperation.height ?? 1) === 2
                        ? (draftOperation.pointIds?.length ?? 0) !== 1 || !(draftOperation.radius ?? 0)
                        : (draftOperation.pointIds?.length ?? 0) !== 2
                  }
                >
                  Dựng đường tròn
                </Button>
              </div>
            )}

            {draftOperation?.tool === 'centroid' && (
              <div className="space-y-2">
                <p className="text-xs font-semibold">Công cụ Trọng tâm</p>
                <p className="text-[11px] text-muted-foreground font-medium">
                  Click vào 1 Đa giác trên màn hình, HOẶC chọn các Điểm để tạo trọng tâm.
                </p>
                <div className="flex flex-wrap gap-1.5 py-1">
                  {(draftOperation.pointIds ?? []).map((pid, idx) => {
                    const point = manualDocument.points.find((p) => p.id === pid)
                    return (
                      <Badge key={pid} variant="default" className="text-[10px]">
                        {point ? point.label : `Điểm ${idx + 1}`}
                      </Badge>
                    )
                  })}
                  {(draftOperation.pointIds ?? []).length === 0 && (
                    <p className="text-[10px] text-muted-foreground italic">Chưa chọn điểm nào...</p>
                  )}
                </div>
                <Button
                  size="sm"
                  className="w-full font-bold mt-2"
                  onClick={handleCentroidCreate}
                  disabled={(draftOperation.pointIds?.length ?? 0) < 3}
                >
                  Hoàn tất trọng tâm
                </Button>
              </div>
            )}

            {draftOperation?.tool === 'perpendicularBisector' && (
              <div className="space-y-2">
                <p className="text-xs font-semibold">Đường trung trực</p>
                <p className="text-[11px] text-muted-foreground font-medium">
                  Click chọn 1 Đoạn thẳng, HOẶC chọn lần lượt 2 Điểm tự do để dựng đường trung trực.
                </p>
                <div className="flex gap-2 items-center">
                  <Badge variant={(draftOperation.pointIds?.length ?? 0) >= 1 ? 'default' : 'outline'}>
                    {(draftOperation.pointIds?.length ?? 0) >= 1
                      ? manualDocument.points.find((p) => p.id === draftOperation.pointIds?.[0])?.label ?? 'Điểm 1'
                      : 'Chọn điểm 1...'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">→</span>
                  <Badge variant={(draftOperation.pointIds?.length ?? 0) >= 2 ? 'default' : 'outline'}>
                    {(draftOperation.pointIds?.length ?? 0) >= 2
                      ? manualDocument.points.find((p) => p.id === draftOperation.pointIds?.[1])?.label ?? 'Điểm 2'
                      : 'Chọn điểm 2...'}
                  </Badge>
                </div>
                <div className="space-y-1 pt-2">
                  <label className="text-[11px] text-muted-foreground font-semibold">Độ dài nửa đường thẳng (t)</label>
                  <Input
                    type="number"
                    min={1}
                    value={draftOperation.radius ?? 20}
                    onChange={(event) =>
                      setDraftOperation({
                        ...draftOperation,
                        radius: Math.max(1, parseFloat(event.target.value) || 20),
                      })
                    }
                    className="rounded-xl h-8 text-xs"
                  />
                </div>
              </div>
            )}

            {draftOperation?.tool === 'angleBisector' && (
              <div className="space-y-2">
                <p className="text-xs font-semibold">Tia phân giác</p>
                <p className="text-[11px] text-muted-foreground font-medium">
                  Chọn lần lượt 3 điểm (A, B, C) với điểm thứ 2 (B) làm đỉnh góc cần phân giác.
                </p>
                <div className="flex gap-2 items-center">
                  <Badge variant={(draftOperation.pointIds?.length ?? 0) >= 1 ? 'default' : 'outline'}>
                    {(draftOperation.pointIds?.length ?? 0) >= 1
                      ? manualDocument.points.find((p) => p.id === draftOperation.pointIds?.[0])?.label ?? 'Đỉnh A'
                      : 'Chọn điểm A...'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">→</span>
                  <Badge variant={(draftOperation.pointIds?.length ?? 0) >= 2 ? 'default' : 'outline'}>
                    {(draftOperation.pointIds?.length ?? 0) >= 2
                      ? manualDocument.points.find((p) => p.id === draftOperation.pointIds?.[1])?.label ?? 'Đỉnh B (Đỉnh)'
                      : 'Chọn đỉnh B...'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">→</span>
                  <Badge variant={(draftOperation.pointIds?.length ?? 0) >= 3 ? 'default' : 'outline'}>
                    {(draftOperation.pointIds?.length ?? 0) >= 3
                      ? manualDocument.points.find((p) => p.id === draftOperation.pointIds?.[2])?.label ?? 'Đỉnh C'
                      : 'Chọn điểm C...'}
                  </Badge>
                </div>
                <div className="space-y-1 pt-2">
                  <label className="text-[11px] text-muted-foreground font-semibold">Độ dài tia (t)</label>
                  <Input
                    type="number"
                    min={1}
                    value={draftOperation.radius ?? 20}
                    onChange={(event) =>
                      setDraftOperation({
                        ...draftOperation,
                        radius: Math.max(1, parseFloat(event.target.value) || 20),
                      })
                    }
                    className="rounded-xl h-8 text-xs"
                  />
                </div>
              </div>
            )}

            {draftOperation?.tool === 'parallelLine' && (
              <div className="space-y-2">
                <p className="text-xs font-semibold">Đường song song</p>
                <p className="text-[11px] text-muted-foreground font-medium">
                  Click chọn 1 Điểm làm gốc đường thẳng, sau đó chọn 1 Đoạn thẳng làm chuẩn hướng song song.
                </p>
                <div className="flex gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] text-muted-foreground font-medium">Điểm gốc</label>
                    <div>
                      <Badge variant={(draftOperation.pointIds?.length ?? 0) >= 1 ? 'default' : 'outline'}>
                        {(draftOperation.pointIds?.length ?? 0) >= 1
                          ? manualDocument.points.find((p) => p.id === draftOperation.pointIds?.[0])?.label ?? 'Đã chọn'
                          : 'Chưa chọn'}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-muted-foreground font-medium">Đoạn thẳng mẫu</label>
                    <div>
                      <Badge variant={(draftOperation.segmentIds?.length ?? 0) >= 1 ? 'default' : 'outline'}>
                        {(draftOperation.segmentIds?.length ?? 0) >= 1
                          ? manualDocument.segments.find((s) => s.id === draftOperation.segmentIds?.[0])?.label ?? 'Đã chọn'
                          : 'Chưa chọn'}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="space-y-1 pt-2">
                  <label className="text-[11px] text-muted-foreground font-semibold">Độ dài nửa đường thẳng (t)</label>
                  <Input
                    type="number"
                    min={1}
                    value={draftOperation.radius ?? 20}
                    onChange={(event) =>
                      setDraftOperation({
                        ...draftOperation,
                        radius: Math.max(1, parseFloat(event.target.value) || 20),
                      })
                    }
                    className="rounded-xl h-8 text-xs"
                  />
                </div>
              </div>
            )}

            {draftOperation?.tool === 'perpendicularLine' && (
              <div className="space-y-2">
                <p className="text-xs font-semibold">Đường vuông góc</p>
                <p className="text-[11px] text-muted-foreground font-medium">
                  Click chọn 1 Điểm làm gốc đường thẳng, sau đó chọn 1 Đoạn thẳng làm chuẩn hướng vuông góc.
                </p>
                <div className="flex gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] text-muted-foreground font-medium">Điểm gốc</label>
                    <div>
                      <Badge variant={(draftOperation.pointIds?.length ?? 0) >= 1 ? 'default' : 'outline'}>
                        {(draftOperation.pointIds?.length ?? 0) >= 1
                          ? manualDocument.points.find((p) => p.id === draftOperation.pointIds?.[0])?.label ?? 'Đã chọn'
                          : 'Chưa chọn'}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-muted-foreground font-medium">Đoạn thẳng mẫu</label>
                    <div>
                      <Badge variant={(draftOperation.segmentIds?.length ?? 0) >= 1 ? 'default' : 'outline'}>
                        {(draftOperation.segmentIds?.length ?? 0) >= 1
                          ? manualDocument.segments.find((s) => s.id === draftOperation.segmentIds?.[0])?.label ?? 'Đã chọn'
                          : 'Chưa chọn'}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="space-y-1 pt-2">
                  <label className="text-[11px] text-muted-foreground font-semibold">Độ dài nửa đường thẳng (t)</label>
                  <Input
                    type="number"
                    min={1}
                    value={draftOperation.radius ?? 20}
                    onChange={(event) =>
                      setDraftOperation({
                        ...draftOperation,
                        radius: Math.max(1, parseFloat(event.target.value) || 20),
                      })
                    }
                    className="rounded-xl h-8 text-xs"
                  />
                </div>
              </div>
            )}
            {draftOperation && draftOperation.pointIds && (
              <div className="space-y-2 pt-3 border-t border-border/60">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Chọn điểm từ danh sách
                </label>
                {manualDocument.points.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground italic">Chưa có điểm nào trong bản vẽ</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1.5 border border-border/60 rounded-xl bg-background/40">
                    {manualDocument.points.map((pt) => {
                      const isSelected = draftOperation.pointIds!.includes(pt.id)
                      return (
                        <Button
                          key={pt.id}
                          type="button"
                          variant={isSelected ? 'default' : 'outline'}
                          className={`h-6 text-[10px] px-2 rounded-lg font-bold transition-all ${
                            isSelected ? 'bg-primary text-primary-foreground' : 'hover:bg-accent/40'
                          }`}
                          onClick={() => {
                            const currentIds = draftOperation.pointIds || []
                            let nextIds: string[]
                            if (currentIds.includes(pt.id)) {
                              nextIds = currentIds.filter(id => id !== pt.id)
                            } else {
                              nextIds = [...currentIds, pt.id]
                            }
                            setDraftOperation({
                              ...draftOperation,
                              pointIds: nextIds
                            })
                          }}
                        >
                          {pt.label}
                        </Button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
