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
  HelpCircle,
  Settings2,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
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
  { id: 'box', label: 'Hình hộp CN', icon: Square },
  { id: 'cube', label: 'Hình lập phương', icon: Box },
  { id: 'pyramid', label: 'Hình chóp', icon: Pyramid },
  { id: 'regularPyramid', label: 'Hình chóp đều', icon: Pyramid },
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
    tools: ['box', 'cube', 'pyramid', 'regularPyramid', 'prism', 'sphere', 'cone', 'cylinder']
  }
]

export function ManualLeftPanel({
  subOpen,
  setSubOpen,
}: {
  subOpen: boolean
  setSubOpen: (open: boolean) => void
}) {
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
    undoManual, 
    redoManual, 
    canUndo, 
    canRedo,
    autoRevertToSelect,
    setAutoRevertToSelect,
    manualSelection,
    setManualSelection,
    draftOperation,
    setDraftOperation,
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

    if (tool === 'box' || tool === 'cube') {
      setDraftOperation({ tool, pointIds: [], height: 4 })
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

    if (tool === 'pyramid' || tool === 'prism' || tool === 'regularPyramid') {
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
          <div className="relative z-10 mt-3 flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-muted/30 p-2">
            <Label htmlFor="auto-revert" className="cursor-pointer text-[11px] font-medium leading-none">
              Tự động quay về Chọn
            </Label>
            <Switch
              id="auto-revert"
              checked={autoRevertToSelect}
              onCheckedChange={(checked) => setAutoRevertToSelect(checked)}
              className="scale-75 data-[state=checked]:bg-primary"
            />
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {activeTool !== 'select' && (
            <Button
              variant={subOpen ? 'default' : 'outline'}
              size="icon-sm"
              onClick={() => setSubOpen(!subOpen)}
              title={subOpen ? "Ẩn hướng dẫn & thiết lập" : "Hiện hướng dẫn & thiết lập"}
              className="relative"
            >
              <HelpCircle size={14} />
            </Button>
          )}
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
    </div>
  )
}
