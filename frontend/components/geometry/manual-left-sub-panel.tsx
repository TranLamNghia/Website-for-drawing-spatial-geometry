'use client'

import { toast } from 'sonner'
import { Sparkles, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useGeometry } from './geometry-context'

export function ManualLeftSubPanel() {
  const {
    activeTool,
    setActiveTool,
    autoRevertToSelect,
    manualSelection,
    draftOperation,
    setDraftOperation,
    cancelManualDraft,
    createPolygon,
    createBox,
    createPyramid,
    createRegularPyramid,
    createPrism,
    createSphere,
    createCone,
    createCylinder,
    createCircle,
    createRegularPolygon,
    createSpecialTriangle,
    createSpecialQuadrilateral,
    createCentroid,
    createProjectionByPoints,
    manualDocument,
  } = useGeometry()

  const updateDraftHeight = (heightValue: string) => {
    const numericHeight = Number(heightValue)
    if (!draftOperation) return
    setDraftOperation({
      ...draftOperation,
      height: Number.isFinite(numericHeight) ? numericHeight : 0,
      heightManuallySet: true,
    })
  }

  const updateDraftRadius = (radiusValue: string) => {
    const numericRadius = Number(radiusValue)
    if (!draftOperation) return
    setDraftOperation({
      ...draftOperation,
      radius: Number.isFinite(numericRadius) ? numericRadius : 0,
    })
  }

  const handlePolygonFinalize = () => {
    if (draftOperation?.tool !== 'polygon') return
    if ((draftOperation.pointIds?.length ?? 0) < 3) return
    createPolygon(draftOperation.pointIds ?? [])
    autoRevertToSelect ? setActiveTool('select') : setDraftOperation({ tool: 'polygon', pointIds: [] })
  }

  const handleBoxCreate = () => {
    if (draftOperation?.tool !== 'box') return
    if ((draftOperation.pointIds?.length ?? 0) !== 3) return
    if (!draftOperation.height || draftOperation.height <= 0) return
    createBox([draftOperation.pointIds![0], draftOperation.pointIds![1], draftOperation.pointIds![2]], draftOperation.height)
    autoRevertToSelect ? setActiveTool('select') : setDraftOperation({ tool: 'box', pointIds: [], height: draftOperation.height })
  }

  const handleSolidCreate = (type: 'pyramid' | 'prism' | 'regularPyramid') => {
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
    
    let id: string | null = null
    if (type === 'pyramid') {
      if (height <= 0 && !apexPointId) return
      id = createPyramid(basePolygonId, height, apexPointId === 'auto_generate' ? undefined : apexPointId)
    }
    if (type === 'regularPyramid') {
      id = createRegularPyramid(basePolygonId)
    }
    if (type === 'prism') {
      if (height <= 0 && !topPointId) return
      id = createPrism(basePolygonId, height, topPointId)
    }

    if (id) {
      if (autoRevertToSelect) {
        setActiveTool('select')
      } else {
        setDraftOperation(null)
      }
    }
  }

  const handleSphereCreate = () => {
    if (draftOperation?.tool !== 'sphere') return
    const centerPointId = draftOperation.centerPointId
      ?? (manualSelection?.kind === 'point' ? manualSelection.id : null)
    const radius = draftOperation.radius ?? 3
    if (!centerPointId || radius <= 0) return
    createSphere(centerPointId, radius)
    autoRevertToSelect ? setActiveTool('select') : setDraftOperation({ tool: 'sphere', centerPointId: null, radius })
  }

  const handleConeCreate = () => {
    if (draftOperation?.tool !== 'cone') return
    const baseCircleId = draftOperation.baseCircleId
      ?? (manualSelection?.kind === 'circle' ? manualSelection.id : null)
    const height = draftOperation.height ?? 5
    
    if (!baseCircleId || height <= 0) {
      toast.error('Vui lòng chọn một đường tròn trên canvas.')
      return
    }

    const circle = manualDocument.circles.find(c => c.id === baseCircleId)
    const radius = circle ? (circle.radius ?? 3) : 3

    createCone('', radius, height, baseCircleId)
    autoRevertToSelect ? setActiveTool('select') : setDraftOperation({ tool: 'cone', baseCircleId: null, height })
  }

  const handleCylinderCreate = () => {
    if (draftOperation?.tool !== 'cylinder') return
    const baseCircleId = draftOperation.baseCircleId
      ?? (manualSelection?.kind === 'circle' ? manualSelection.id : null)
    const height = draftOperation.height ?? 5
    
    if (!baseCircleId || height <= 0) {
      toast.error('Vui lòng chọn một đường tròn trên canvas.')
      return
    }

    const circle = manualDocument.circles.find(c => c.id === baseCircleId)
    const radius = circle ? (circle.radius ?? 3) : 3

    createCylinder('', radius, height, baseCircleId)
    autoRevertToSelect ? setActiveTool('select') : setDraftOperation({ tool: 'cylinder', baseCircleId: null, height })
  }

  const handleRegularPolygonCreate = () => {
    if (draftOperation?.tool !== 'regularPolygon') return
    const pts = draftOperation.pointIds ?? []
    if (pts.length !== 2) return
    const sides = draftOperation.radius ?? 5
    createRegularPolygon(pts[0], pts[1], sides)
    autoRevertToSelect ? setActiveTool('select') : setDraftOperation({ tool: 'regularPolygon', pointIds: [], radius: sides })
  }

  const handleSpecialTriangleCreate = () => {
    if (draftOperation?.tool !== 'specialTriangle') return
    const pts = draftOperation.pointIds ?? []
    if (pts.length !== 2) return
    const typeCode = draftOperation.height ?? 1
    const type = typeCode === 1 ? 'vuong' : typeCode === 2 ? 'can' : typeCode === 3 ? 'vuong_can' : 'deu'
    const anchor = draftOperation.centerPointId ?? pts[0]
    createSpecialTriangle(type, pts[0], pts[1], anchor)
    autoRevertToSelect ? setActiveTool('select') : setDraftOperation({ tool: 'specialTriangle', pointIds: [], height: typeCode, centerPointId: anchor })
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
    autoRevertToSelect ? setActiveTool('select') : setDraftOperation({ tool: 'specialQuadrilateral', pointIds: [], height: typeCode })
  }

  const handleManualProjectionTarget = (inputStr: string) => {
    if (draftOperation?.tool !== 'projection') return
    const pts = draftOperation.pointIds ?? []
    if (pts.length !== 1) return
    
    const matches = inputStr.match(new RegExp("[a-zA-Z]['_a-zA-Z0-9]*", "g"))
    if (!matches) return
    
    const pointIds = matches.map(label => {
      const p = manualDocument.points.find(p => p.label.toLowerCase() === label.toLowerCase())
      return p?.id
    }).filter(Boolean) as string[]

    if (pointIds.length >= 2) {
      createProjectionByPoints(pts[0], pointIds)
      autoRevertToSelect ? setActiveTool('select') : setDraftOperation({ tool: 'projection', pointIds: [] })
    }
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
    autoRevertToSelect ? setActiveTool('select') : setDraftOperation({ tool: 'circle', pointIds: [], height: kindCode, radius: draftOperation.radius ?? 3 })
  }

  const handleCentroidCreate = () => {
    if (draftOperation?.tool !== 'centroid') return
    const pts = draftOperation.pointIds ?? []
    if (pts.length < 3) return
    createCentroid(undefined, pts)
    autoRevertToSelect ? setActiveTool('select') : setDraftOperation({ tool: 'centroid', pointIds: [] })
  }

  if (activeTool === 'select') return null

  return (
    <div className="flex h-full w-[340px] flex-col gap-4 overflow-y-auto p-4">
      <div>
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold tracking-tight">Hướng dẫn & Thiết lập</h2>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Xem hướng dẫn vẽ và tinh chỉnh thông số cho công cụ đang chọn.
        </p>
      </div>

      {/* Card Hướng dẫn thao tác */}
      <Card className="border-primary/20 bg-primary/5 py-3.5 shadow-sm rounded-2xl">
        <CardHeader className="px-4 pb-0 pt-1">
          <CardTitle className="text-xs text-primary font-bold flex items-center gap-1.5">
            <Sparkles size={14} />
            Hướng dẫn thao tác
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pt-2">
          <div className="text-[11px] leading-relaxed text-muted-foreground font-medium whitespace-pre-line">
            {activeTool === 'parallelLine' && '1. Click chọn một Điểm làm gốc.\n2. Click chọn một Đoạn thẳng làm chuẩn.\nĐường thẳng song song sẽ tự động xuất hiện!'}
            {activeTool === 'perpendicularLine' && '1. Click chọn một Điểm làm gốc.\n2. Click chọn một Đoạn thẳng làm chuẩn.\nĐường thẳng vuông góc sẽ tự động xuất hiện!'}
            {activeTool === 'pyramid' && '1. Click chọn một Đa giác làm mặt đáy.\n2. Thiết lập chiều cao, hoặc chọn một Điểm làm đỉnh (Apex).'}
            {activeTool === 'regularPyramid' && 'Click chọn một Đa giác làm mặt đáy. Hệ thống sẽ tự động dựng hình với đỉnh hình chóp nằm trên đường thẳng vuông góc với mặt đáy tại trọng tâm.'}
            {activeTool === 'cube' && 'Click chọn lần lượt 2 điểm (A, B) để tạo hình lập phương. Hệ thống sẽ tự động dựng hình với cạnh là khoảng cách giữa 2 điểm.'}
            {activeTool === 'prism' && (
              <span>
                1. Click chọn một Đa giác làm mặt đáy.<br />
                2. Thiết lập chiều cao, hoặc chọn một Điểm E làm đỉnh của mặt trên.<br />
                <span className="text-primary font-semibold">💡 Lưu ý quan trọng:</span> Điểm chọn làm đỉnh (ví dụ E) luôn tương ứng với đỉnh đầu tiên của mặt đáy (ví dụ đáy ABCD thì E tương ứng với A', tức cạnh bên AA' = AE).
                <br />
                - Nếu E nằm thẳng đứng trên A (x và y bằng nhau, z khác nhau): hệ thống tạo lăng trụ đứng.
                <br />
                - Nếu E nằm thẳng đứng trên B, C, D hoặc nằm ở vị trí khác (lệch so với A): hệ thống sẽ tạo lăng trụ xiên (vì cạnh bên AA' = AE bị nghiêng so với đáy).
              </span>
            )}
            {activeTool === 'intersection' && 'Click chọn lần lượt 2 Đoạn thẳng cắt nhau.\nGiao điểm sẽ xuất hiện chính xác tại vị trí cắt!'}
            {activeTool === 'circle' && 'Chọn cách vẽ phù hợp ở dưới. Mặc định là Tâm + Điểm:\n1. Click chọn Tâm.\n2. Click chọn Điểm thứ hai xác định bán kính.'}
            {activeTool === 'box' && (
              <span>Click chọn lần lượt 3 điểm (A, B, C) để xác định mặt đáy. Hình hộp 3D sẽ tự động dựng hình với chiều cao mặc định!</span>
            )}
            {activeTool === 'segment' && 'Click chọn Điểm thứ nhất, sau đó click chọn Điểm thứ hai (hoặc kéo chuột) để tạo Đoạn thẳng.'}
            {activeTool === 'polygon' && 'Click chọn lần lượt các Điểm làm đỉnh.\nClick lại điểm bắt đầu để hoàn tất Đa giác.'}
            {activeTool === 'point' && 'Click vào bất cứ đâu trên lưới Oxy (z=0) để tạo Điểm mới.\nGiữ Shift và kéo để nâng hạ độ cao (trục Z).'}
            {activeTool === 'midpoint' && 'Click vào một Đoạn thẳng có sẵn,\nhoặc click chọn lần lượt 2 Điểm để tạo Trung điểm.'}
            {activeTool === 'projection' && (
              draftOperation?.pointIds && draftOperation.pointIds.length > 0
                ? `Đang chiếu điểm ${manualDocument.points.find(p => p.id === draftOperation.pointIds![0])?.label ?? ''}.\nChọn đích: click đoạn thẳng, đa giác, mặt khối (hoặc dùng Tab để duyệt mặt sau/mặt ảo), HOẶC click 3 điểm để xác định mặt phẳng (${draftOperation.pointIds.length - 1}/3 điểm).`
                : '1. Click chọn Điểm cần chiếu.\n2. Chọn đích: click đoạn thẳng, đa giác, mặt khối (hoặc dùng Tab để duyệt mặt sau/mặt ảo), HOẶC click 3 điểm để xác định mặt phẳng.'
            )}
            {activeTool === 'regularPolygon' && 'Click chọn lần lượt 2 Điểm làm cạnh.\nMột Lục giác đều (6 cạnh) sẽ tự động được dựng hình.'}
            {activeTool === 'specialTriangle' && (
              draftOperation?.height === 5 ? (
                <span>Click chọn 3 điểm mới (bằng cách click trên lưới/canvas) hoặc chọn các điểm đã có sẵn để tạo tam giác.</span>
              ) : (
                <div className="flex flex-col gap-2">
                  <span>Click chọn lần lượt 2 Điểm (mới hoặc đã có sẵn) làm đỉnh cơ sở để tự động dựng tam giác đặc biệt.</span>
                  <div className="rounded-md bg-blue-500/10 p-2 border border-blue-500/20 text-[10px] text-blue-500 leading-normal">
                    <span className="font-semibold block mb-0.5">💡 Lưu ý quan trọng:</span>
                    Nếu bạn đã có sẵn 3 điểm (ví dụ A, B, C) trên lưới vẽ và muốn kết nối chúng thành tam giác, hãy chọn công cụ <strong className="text-foreground">Tam giác thường</strong>.
                    Nếu chọn công cụ tam giác đặc biệt (ví dụ Tam giác vuông) và chọn 2 điểm A, B, hệ thống sẽ tự động dựng điểm thứ ba D mới hoàn toàn để thỏa mãn tính chất hình học, tạo thành tam giác ABD mới thay vì kết nối với C.
                  </div>
                </div>
              )
            )}
            {activeTool === 'centroid' && 'Click vào 1 Đa giác hoặc Mặt của khối hình trên canvas,\nhoặc chọn lần lượt các Điểm để tạo trọng tâm.'}
            {activeTool === 'perpendicularBisector' && 'Click chọn 1 Đoạn thẳng,\nhoặc chọn lần lượt 2 Điểm tự do để dựng đường trung trực.'}
            {activeTool === 'angleBisector' && '1. Click chọn điểm thuộc tia thứ nhất.\n2. Click chọn đỉnh của góc.\n3. Click chọn điểm thuộc tia thứ hai.'}
            {activeTool === 'specialQuadrilateral' && (draftOperation?.height === 1 
              ? 'Click chọn lần lượt 3 Điểm (A, B, C) làm các đỉnh ban đầu.\nĐỉnh D sẽ tự động dựng để tạo Hình bình hành.'
              : draftOperation?.height === 2
                ? 'Click chọn lần lượt 3 Điểm (A, B, C) làm các đỉnh ban đầu.\nĐỉnh D sẽ tự động dựng vuông góc để tạo Hình chữ nhật.'
                : draftOperation?.height === 3
                  ? 'Click chọn lần lượt 2 Điểm (A, B) xác định một cạnh.\nHai đỉnh còn lại (C, D) sẽ tự động dựng để tạo Hình thoi.'
                  : 'Click chọn lần lượt 2 Điểm (A, B) xác định một cạnh.\nHai đỉnh còn lại (C, D) sẽ tự động dựng vuông góc để tạo Hình vuông.')}
            {activeTool === 'sphere' && '1. Click chọn (hoặc tạo mới) một Điểm làm tâm.\n2. Nhập bán kính trong bảng Thiết lập bên dưới.'}
            {activeTool === 'cone' && '1. Click chọn duy nhất 1 Đường tròn ĐÃ CÓ trên canvas.\n2. Nhập chiều cao (mặc định là 5) và bấm nút "Tạo hình nón".'}
            {activeTool === 'cylinder' && '1. Click chọn duy nhất 1 Đường tròn ĐÃ CÓ trên canvas.\n2. Nhập chiều cao (mặc định là 5) và bấm nút "Tạo hình trụ".'}
          </div>
        </CardContent>
      </Card>

      {/* Card Thiết lập công cụ */}
      {draftOperation !== null && 
       draftOperation.tool !== 'specialTriangle' && 
       draftOperation.tool !== 'specialQuadrilateral' && (
        <Card className="gap-3 py-4 rounded-2xl shadow-sm border-border/80">

          <CardContent className="space-y-3 px-4">
            {draftOperation?.tool === 'polygon' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold">Khối đa giác</p>
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
                <p className="text-xs font-semibold">Chiều cao của hình hộp</p>
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
                  disabled={(draftOperation.pointIds?.length ?? 0) !== 3 || !draftOperation.height || draftOperation.height <= 0}
                >
                  Tạo hình hộp
                </Button>
              </div>
            )}

            {(activeTool === 'pyramid' || activeTool === 'prism' || activeTool === 'regularPyramid') && (
              <div className="space-y-3">
                <p className="text-xs font-semibold">
                  {activeTool === 'pyramid' && 'Thông tin chóp'}
                  {activeTool === 'regularPyramid' && 'Thông tin chóp đều'}
                  {activeTool === 'prism' && 'Thông tin lăng trụ'}
                </p>
                
                <div className="space-y-1">
                  <label className="text-[11px] text-muted-foreground font-medium">Đa giác đáy</label>
                  <Badge variant={draftOperation?.basePolygonId ? 'default' : 'outline'} className="w-full justify-start text-xs rounded-xl py-1 px-2.5">
                    {draftOperation?.basePolygonId
                      ? manualDocument.polygons.find((p) => p.id === draftOperation.basePolygonId)?.label ?? 'Đa giác đã chọn'
                      : 'Chưa chọn (click đa giác trên canvas)'}
                  </Badge>
                </div>

                {/* Select Top Point */}
                {(activeTool === 'pyramid' || activeTool === 'prism') && (
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <label className="text-[11px] text-muted-foreground font-medium">
                        {activeTool === 'pyramid' ? 'Chọn Đỉnh Chóp (Apex)' : 'Chọn Đỉnh Mặt Trên (Top)'}
                      </label>
                      <select
                        value={
                          (activeTool === 'pyramid' ? draftOperation?.apexPointId : draftOperation?.topPointId) || 'auto_generate'
                        }
                        onChange={(e) => {
                          if (draftOperation) {
                            setDraftOperation({
                              ...draftOperation,
                              ...(activeTool === 'pyramid' ? { apexPointId: e.target.value } : { topPointId: e.target.value }),
                            })
                          }
                        }}
                        className="flex h-8 w-full rounded-xl border border-input bg-background px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <option value="auto_generate">-- Tự sinh đỉnh thẳng đứng ở cao độ h --</option>
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

                {/* Height Form */}
                {((activeTool === 'pyramid' && (!draftOperation?.apexPointId || draftOperation?.apexPointId === 'auto_generate')) ||
                  (activeTool === 'prism' && (!draftOperation?.topPointId || draftOperation?.topPointId === 'auto_generate')) || 
                  (activeTool === 'regularPyramid')) && (
                  <div className="space-y-2">
                      <div className="space-y-1 mt-2">
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
                  </div>
                )}

                <Button
                  size="sm"
                  className="w-full rounded-xl h-8 text-xs font-semibold mt-4"
                  onClick={() => handleSolidCreate(activeTool as 'pyramid' | 'prism' | 'regularPyramid')}
                  disabled={
                    !draftOperation?.basePolygonId ||
                    (activeTool === 'pyramid' && (!draftOperation?.apexPointId || draftOperation?.apexPointId === 'auto_generate') && (!draftOperation?.height || draftOperation.height <= 0)) ||
                    (activeTool === 'prism' && (!draftOperation?.topPointId || draftOperation?.topPointId === 'auto_generate') && (!draftOperation?.height || draftOperation.height <= 0))
                  }
                >
                  {activeTool === 'pyramid' ? 'Tạo hình chóp' : activeTool === 'regularPyramid' ? 'Tạo hình chóp đều' : 'Tạo lăng trụ'}
                </Button>
              </div>
            )}

            {draftOperation?.tool === 'sphere' && (
              <div className="space-y-2">
                <p className="text-xs font-semibold">Thông số hình cầu</p>
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
                    !draftOperation.baseCircleId ||
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
                    !draftOperation.baseCircleId ||
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
                {(draftOperation.segmentIds?.length ?? 0) > 0 ? (
                  <div className="space-y-1">
                    <label className="text-[11px] text-muted-foreground font-medium">Đoạn thẳng</label>
                    <div>
                      <Badge variant="default">
                        {manualDocument.segments.find((s) => s.id === draftOperation.segmentIds?.[0])?.label ?? '?'}
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-4">
                    <div className="space-y-1">
                      <label className="text-[11px] text-muted-foreground font-medium">Điểm thứ nhất</label>
                      <div>
                        <Badge variant={(draftOperation.pointIds?.length ?? 0) >= 1 ? 'default' : 'outline'}>
                          {(draftOperation.pointIds?.length ?? 0) >= 1
                            ? manualDocument.points.find((p) => p.id === draftOperation.pointIds?.[0])?.label ?? 'Đã chọn'
                            : 'Chưa chọn'}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-muted-foreground font-medium">Điểm thứ hai</label>
                      <div>
                        <Badge variant={(draftOperation.pointIds?.length ?? 0) >= 2 ? 'default' : 'outline'}>
                          {(draftOperation.pointIds?.length ?? 0) >= 2
                            ? manualDocument.points.find((p) => p.id === draftOperation.pointIds?.[1])?.label ?? 'Đã chọn'
                            : 'Chưa chọn'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {draftOperation?.tool === 'intersection' && (
              <div className="space-y-2">
                <p className="text-xs font-semibold">Công cụ Giao điểm</p>
                <div className="flex gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] text-muted-foreground font-medium">Đoạn thẳng 1</label>
                    <div>
                      <Badge variant={(draftOperation.segmentIds?.length ?? 0) >= 1 ? 'default' : 'outline'}>
                        {(draftOperation.segmentIds?.length ?? 0) >= 1
                          ? manualDocument.segments.find((s) => s.id === draftOperation.segmentIds?.[0])?.label ?? 'Đã chọn'
                          : 'Chưa chọn'}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-muted-foreground font-medium">Đoạn thẳng 2</label>
                    <div>
                      <Badge variant={(draftOperation.segmentIds?.length ?? 0) >= 2 ? 'default' : 'outline'}>
                        {(draftOperation.segmentIds?.length ?? 0) >= 2
                          ? manualDocument.segments.find((s) => s.id === draftOperation.segmentIds?.[1])?.label ?? 'Đã chọn'
                          : 'Chưa chọn'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {draftOperation?.tool === 'projection' && (
              <div className="space-y-2">
                <p className="text-xs font-semibold">Công cụ Hình chiếu</p>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-4">
                    <div className="space-y-1">
                      <label className="text-[11px] text-muted-foreground font-medium">Điểm chiếu</label>
                      <div>
                        <Badge variant={(draftOperation.pointIds?.length ?? 0) > 0 ? 'default' : 'outline'}>
                          {(draftOperation.pointIds?.length ?? 0) > 0
                            ? manualDocument.points.find((p) => p.id === draftOperation.pointIds?.[0])?.label ?? 'Đã chọn'
                            : 'Chưa chọn'}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-muted-foreground font-medium">Nhập đích (VD: BD)</label>
                      <form onSubmit={(e) => {
                        e.preventDefault()
                        const form = e.target as HTMLFormElement
                        const input = form.elements.namedItem('targetInput') as HTMLInputElement
                        handleManualProjectionTarget(input.value)
                        input.value = ''
                      }}>
                        <Input
                          name="targetInput"
                          placeholder="Nhập tên điểm"
                          className="rounded-xl h-8 text-xs"
                          autoComplete="off"
                          disabled={(draftOperation.pointIds?.length ?? 0) === 0}
                        />
                      </form>
                    </div>
                  </div>

                  {draftOperation.pointIds && draftOperation.pointIds.length > 1 && (
                    <div className="space-y-1 pt-1 border-t border-dashed">
                      <label className="text-[11px] text-muted-foreground font-medium block">
                        Mặt phẳng đích ({draftOperation.pointIds.length - 1}/3 điểm)
                      </label>
                      <div className="flex gap-1 flex-wrap">
                        {draftOperation.pointIds.slice(1).map((pid, idx) => (
                          <Badge key={pid} variant="secondary" className="text-xs">
                            {manualDocument.points.find((p) => p.id === pid)?.label ?? `P${idx + 1}`}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {draftOperation?.tool === 'regularPolygon' && (
              <div className="space-y-2">
                <p className="text-xs font-semibold">Đa giác đều</p>
                <div className="flex gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] text-muted-foreground font-medium">Đỉnh thứ nhất</label>
                    <div>
                      <Badge variant={(draftOperation.pointIds?.length ?? 0) >= 1 ? 'default' : 'outline'}>
                        {(draftOperation.pointIds?.length ?? 0) >= 1
                          ? manualDocument.points.find((p) => p.id === draftOperation.pointIds?.[0])?.label ?? 'Đã chọn'
                          : 'Chưa chọn'}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-muted-foreground font-medium">Đỉnh thứ hai</label>
                    <div>
                      <Badge variant={(draftOperation.pointIds?.length ?? 0) >= 2 ? 'default' : 'outline'}>
                        {(draftOperation.pointIds?.length ?? 0) >= 2
                          ? manualDocument.points.find((p) => p.id === draftOperation.pointIds?.[1])?.label ?? 'Đã chọn'
                          : 'Chưa chọn'}
                      </Badge>
                    </div>
                  </div>
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
                {(draftOperation.segmentIds?.length ?? 0) > 0 ? (
                  <div className="space-y-1">
                    <label className="text-[11px] text-muted-foreground font-medium">Đoạn thẳng</label>
                    <div>
                      <Badge variant="default">
                        {manualDocument.segments.find((s) => s.id === draftOperation.segmentIds?.[0])?.label ?? '?'}
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-4">
                    <div className="space-y-1">
                      <label className="text-[11px] text-muted-foreground font-medium">Điểm thứ nhất</label>
                      <div>
                        <Badge variant={(draftOperation.pointIds?.length ?? 0) >= 1 ? 'default' : 'outline'}>
                          {(draftOperation.pointIds?.length ?? 0) >= 1
                            ? manualDocument.points.find((p) => p.id === draftOperation.pointIds?.[0])?.label ?? 'Đã chọn'
                            : 'Chưa chọn'}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-muted-foreground font-medium">Điểm thứ hai</label>
                      <div>
                        <Badge variant={(draftOperation.pointIds?.length ?? 0) >= 2 ? 'default' : 'outline'}>
                          {(draftOperation.pointIds?.length ?? 0) >= 2
                            ? manualDocument.points.find((p) => p.id === draftOperation.pointIds?.[1])?.label ?? 'Đã chọn'
                            : 'Chưa chọn'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}
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
                <div className="flex gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] text-muted-foreground font-medium">Điểm tia 1</label>
                    <div>
                      <Badge variant={(draftOperation.pointIds?.length ?? 0) >= 1 ? 'default' : 'outline'}>
                        {(draftOperation.pointIds?.length ?? 0) >= 1
                          ? manualDocument.points.find((p) => p.id === draftOperation.pointIds?.[0])?.label ?? 'Đã chọn'
                          : 'Chưa chọn'}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-muted-foreground font-medium">Đỉnh góc</label>
                    <div>
                      <Badge variant={(draftOperation.pointIds?.length ?? 0) >= 2 ? 'default' : 'outline'}>
                        {(draftOperation.pointIds?.length ?? 0) >= 2
                          ? manualDocument.points.find((p) => p.id === draftOperation.pointIds?.[1])?.label ?? 'Đã chọn'
                          : 'Chưa chọn'}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-muted-foreground font-medium">Điểm tia 2</label>
                    <div>
                      <Badge variant={(draftOperation.pointIds?.length ?? 0) >= 3 ? 'default' : 'outline'}>
                        {(draftOperation.pointIds?.length ?? 0) >= 3
                          ? manualDocument.points.find((p) => p.id === draftOperation.pointIds?.[2])?.label ?? 'Đã chọn'
                          : 'Chưa chọn'}
                      </Badge>
                    </div>
                  </div>
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

      {/* Card Lưu ý thao tác kéo điểm */}
      {(activeTool === 'box' || activeTool === 'sphere') && (
        <Card className="border-blue-500/20 bg-blue-500/5 py-3.5 shadow-sm rounded-2xl">
          <CardHeader className="px-4 pb-0 pt-1">
            <CardTitle className="text-xs text-blue-500 font-bold flex items-center gap-1.5">
              <Info size={14} className="text-blue-500" />
              Lưu ý thao tác kéo điểm:
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pt-2">
            <div className="text-[11px] leading-relaxed text-muted-foreground font-medium">
              {activeTool === 'box' && (
                <ul className="list-disc pl-4 space-y-1">
                  <li>
                    <strong className="text-foreground">Điểm A, B, C:</strong> Di chuyển tự do trên mặt phẳng ngang (Oxy) để đổi kích thước đáy.
                  </li>
                  <li>
                    <strong className="text-foreground">Đỉnh A', B', C', D':</strong> Chỉ di chuyển lên/xuống theo trục dọc (Oz) để thay đổi chiều cao của khối.
                  </li>
                </ul>
              )}
              {activeTool === 'sphere' && (
                <div className="space-y-1">
                  <p>
                    Khi di chuyển một điểm thuộc đường tròn của hình cầu (ví dụ G, F):
                  </p>
                  <p>
                    Bạn nên đặt camera xoay về hướng tâm đường tròn (nhìn thẳng vào tâm đường tròn) và vị trí camera nằm trên đường thẳng vuông góc từ tâm với mặt phẳng đường tròn để dễ tương tác và kéo thả chính xác nhất.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
