'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Scissors, Expand, Layers, ChevronRight, ChevronDown, Box, Cuboid, GripVertical, Check, Save, Sparkles, Eye, EyeOff } from 'lucide-react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { useGeometry } from './geometry-context'
import type { SectionData } from './geometry-context'
import { addProject, createProject } from './dashboard-view'
import { buildImportedManualProjectJson } from './import/ai-to-manual'

// ─────────────────────────────────────────────────────────────
// ChunkTree – Recursive component that renders the cut tree
// ─────────────────────────────────────────────────────────────
interface ChunkTreeProps {
  // ordered list of *active* sections
  activeSectionsList: SectionData[]
  depth: number
  bitPrefix: string
  bitmaskVisibility: Record<string, boolean>
  setBitmaskVisibility: (v: Record<string, boolean>) => void
  totalActivePlanes: number
  baseId?: string
  getSideLabel?: (depth: number, bit: '0' | '1') => string
  previewBitmaskKeys?: string[]
  selectedBitmaskKey?: string | null
  onPreviewBitmaskKeys?: (keys: string[]) => void
  onSelectBitmaskKey?: (key: string) => void
}

export function ChunkTree({
  activeSectionsList,
  depth,
  bitPrefix,
  bitmaskVisibility,
  setBitmaskVisibility,
  totalActivePlanes,
  baseId,
  getSideLabel,
  previewBitmaskKeys = [],
  selectedBitmaskKey,
  onPreviewBitmaskKeys,
  onSelectBitmaskKey,
}: ChunkTreeProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const isLeafLevel = depth === activeSectionsList.length - 1
  const N = totalActivePlanes

  const buildBitStr = (prefix: string) => {
    const bitStr = prefix.padEnd(N, '0')
    return baseId ? `${baseId}_${bitStr}` : bitStr
  }

  const sides = [
    { bit: '0' as const },
    { bit: '1' as const },
  ]

  const selectedBitStr = selectedBitmaskKey
    ? (baseId && selectedBitmaskKey.startsWith(`${baseId}_`)
      ? selectedBitmaskKey.slice(baseId.length + 1)
      : selectedBitmaskKey)
    : null

  useEffect(() => {
    if (!selectedBitStr?.startsWith(bitPrefix)) return
    const selectedPrefix = selectedBitStr.slice(0, depth + 1)
    if (selectedPrefix.length !== depth + 1) return
    setExpanded((current) => (
      current[selectedPrefix] === true
        ? current
        : { ...current, [selectedPrefix]: true }
    ))
  }, [bitPrefix, depth, selectedBitStr])

  useEffect(() => {
    if (depth !== 0 || !selectedBitmaskKey) return
    const frame = requestAnimationFrame(() => {
      const target = Array.from(document.querySelectorAll<HTMLElement>('[data-chunk-key]'))
        .find((element) => element.dataset.chunkKey === selectedBitmaskKey)
      target?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    })
    return () => cancelAnimationFrame(frame)
  }, [depth, selectedBitmaskKey])

  return (
    <div className="space-y-1">
      {sides.map(({ bit }) => {
        const childPrefix = bitPrefix + bit
        const nodeKey = childPrefix
        const isOpen = expanded[nodeKey] !== false // default open

        const remainingLevels = activeSectionsList.length - depth - 1
        const leafCount = 1 << remainingLevels

        // Calculate bits for all leaves under this branch
        const leafBits = Array.from({ length: leafCount }, (_, i) => {
          const suffix = remainingLevels > 0 ? i.toString(2).padStart(remainingLevels, '0') : ''
          return buildBitStr(childPrefix + suffix)
        })
        const allHidden = leafBits.every(b => bitmaskVisibility[b] === false)
        const sideLabel = getSideLabel?.(depth, bit) ?? (bit === '0' ? 'Không gian A' : 'Không gian B')
        const spatialLabel = `${sideLabel} (${chunkName_range(parseInt(childPrefix, 2), remainingLevels)})`
        const isPreviewed = leafBits.some((key) => previewBitmaskKeys.includes(key))
        const isSelectedBranch = !!selectedBitmaskKey && leafBits.includes(selectedBitmaskKey)

        return (
          <div key={nodeKey} className="space-y-1 pl-3">
            {/* Branch Header */}
            <div className="flex items-center gap-1.5">
              <div className="flex flex-col items-center self-stretch">
                <div className="w-px h-3 bg-border/60" />
                <div className="w-3 h-px bg-border/60" />
              </div>
              <button
                onClick={() => setExpanded(prev => ({ ...prev, [nodeKey]: !isOpen }))}
                onMouseEnter={() => onPreviewBitmaskKeys?.(leafBits)}
                onMouseLeave={() => onPreviewBitmaskKeys?.([])}
                onFocus={() => onPreviewBitmaskKeys?.(leafBits)}
                onBlur={() => onPreviewBitmaskKeys?.([])}
                className={`flex-1 px-2.5 py-1.5 rounded-md transition-all flex items-center gap-2 border text-left ${allHidden
                    ? 'bg-orange-500/5 border-orange-500/20 text-orange-400 opacity-60'
                    : isSelectedBranch
                      ? 'bg-primary/15 border-primary/50 text-primary shadow-sm'
                      : isPreviewed
                        ? 'bg-accent/15 border-accent/50 text-accent'
                        : 'bg-accent/5 border-accent/20 text-accent hover:bg-accent/10'
                  }`}
              >
                {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                <Box size={12} />
                <span className="text-[11px] font-semibold flex-1">{spatialLabel}</span>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={e => {
                    e.stopPropagation()
                    const next = { ...bitmaskVisibility }
                    leafBits.forEach(b => { next[b] = allHidden })
                    setBitmaskVisibility(next)

                    // Auto-collapse when hiding
                    if (!allHidden) {
                      setExpanded(prev => ({ ...prev, [nodeKey]: false }))
                    }
                  }}
                  onKeyDown={e => e.key === 'Enter' && e.currentTarget.click()}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-background/60 hover:bg-muted border border-border/40 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {allHidden ? 'Hiện' : 'Ẩn'}
                </span>
              </button>
            </div>

            {/* Content under branch */}
            {isOpen && (
              <div className="pl-2">
                {isLeafLevel ? (
                  // Show the final leaf info
                  <div className="flex items-center gap-1.5 pl-3">
                    <div className="flex flex-col items-center self-stretch pt-1">
                      <div className="w-px flex-1 bg-border/60" />
                      <div className="w-3 h-px bg-border/60" />
                    </div>
                    <div
                      data-chunk-key={buildBitStr(childPrefix)}
                      role="button"
                      tabIndex={0}
                      onClick={() => onSelectBitmaskKey?.(buildBitStr(childPrefix))}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          onSelectBitmaskKey?.(buildBitStr(childPrefix))
                        }
                      }}
                      onMouseEnter={() => onPreviewBitmaskKeys?.([buildBitStr(childPrefix)])}
                      onMouseLeave={() => onPreviewBitmaskKeys?.([])}
                      onFocus={() => onPreviewBitmaskKeys?.([buildBitStr(childPrefix)])}
                      onBlur={() => onPreviewBitmaskKeys?.([])}
                      className={`flex-1 px-3 py-2 rounded-md border text-left flex items-center justify-between ${bitmaskVisibility[buildBitStr(childPrefix)] !== false
                          ? selectedBitmaskKey === buildBitStr(childPrefix)
                            ? 'bg-primary/15 border-primary/50 text-primary shadow-sm'
                            : previewBitmaskKeys.includes(buildBitStr(childPrefix))
                              ? 'bg-accent/15 border-accent/50 text-accent'
                              : 'bg-card/40 border-border/40 text-foreground hover:border-accent/40'
                          : 'bg-red-500/5 text-red-500/50 border-red-500/10'
                        } cursor-pointer transition-colors`}
                    >
                      <div className="flex items-center gap-2">
                        <Cuboid size={13} className="opacity-50" />
                        <span className="text-xs font-medium">Mảnh {parseInt(childPrefix, 2) + 1}</span>
                      </div>
                      <Badge variant="outline" className="text-[10px] opacity-60">{buildBitStr(childPrefix)}</Badge>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Cutting info for the next level */}
                    {activeSectionsList[depth + 1] && (
                      <div className="flex items-center gap-1.5 pl-3 pb-1">
                        <div className="w-px h-4 bg-border/40" />
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] text-muted-foreground border border-dashed border-border/40 bg-background/40">
                          <Scissors size={10} />
                          Cắt bởi ({activeSectionsList[depth + 1].cuttingPlane?.slice(0, 3).join('') || `P${depth + 2}`})
                        </div>
                      </div>
                    )}
                    <ChunkTree
                      activeSectionsList={activeSectionsList}
                      depth={depth + 1}
                      bitPrefix={childPrefix}
                      bitmaskVisibility={bitmaskVisibility}
                      setBitmaskVisibility={setBitmaskVisibility}
                      totalActivePlanes={totalActivePlanes}
                      baseId={baseId}
                      getSideLabel={getSideLabel}
                      previewBitmaskKeys={previewBitmaskKeys}
                      selectedBitmaskKey={selectedBitmaskKey}
                      onPreviewBitmaskKeys={onPreviewBitmaskKeys}
                      onSelectBitmaskKey={onSelectBitmaskKey}
                    />
                  </>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function chunkName_range(prefixInt: number, remainingLevels: number): string {
  const start = (prefixInt << remainingLevels) + 1
  const end = ((prefixInt + 1) << remainingLevels)
  if (start === end) return `Mảnh ${start}`
  return `Mảnh ${start}–${end}`
}

// ─────────────────────────────────────────────────────────────
// RightSidebar
// ─────────────────────────────────────────────────────────────
export function RightSidebar() {
  const router = useRouter()
  const {
    geometryData,
    solveArtifact,
    orderedSectionIds,
    setOrderedSectionIds,
    bitmaskVisibility,
    setBitmaskVisibility,
    explodeAmount,
    setExplodeAmount,
    cameraControls,
    showAxes,
    showGrid,
    showLabels,
  } = useGeometry()

  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)

  const handleSave = () => {
    if (!geometryData) return
    setIsSaving(true)

    const name = `Bản vẽ AI ${new Date().toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}`
    const imported = buildImportedManualProjectJson(solveArtifact, {
      problemText: solveArtifact?.problemText || '',
      showAxes,
      showGrid,
      showLabels,
      cameraControls,
      bitmaskVisibility,
      orderedSectionIds,
      explodeAmount,
    }, geometryData)
    const json = imported.geometryJson
    const project = createProject(name, solveArtifact?.problemText || '', json)
    const ok = addProject(project)

    setIsSaving(false)
    if (ok) {
      setIsSaved(true)
      if (imported.warnings.length) {
        console.warn('[geometry import warnings]', imported.warnings)
      }
      router.push(`/chedotuve?id=${project.id}`)
      setTimeout(() => { setIsSaved(false) }, 2000)
    } else {
      alert('Đã đạt giới hạn 10 bản vẽ. Vui lòng xóa bản vẽ cũ trước.')
    }
  }

  const hasSectionData = !!(geometryData?.sections?.length || geometryData?.clippingPlane)

  const activeSectionsList: SectionData[] = orderedSectionIds
    .map(id => geometryData?.sections?.find(s => s.id === id))
    .filter(Boolean) as SectionData[]

  const N = activeSectionsList.length || (geometryData?.clippingPlane ? 1 : 0)

  const showAll = () => {
    const next: Record<string, boolean> = {}
    Array.from({ length: 1 << N }, (_, i) => i.toString(2).padStart(N || 1, '0')).forEach(b => {
      next[b] = true
    })
    setBitmaskVisibility(next)
  }

  const migrateVisibility = (newIds: string[]) => {
    const next: Record<string, boolean> = {}
    const numNew = newIds.length
    if (numNew === 0) return {}

    const numOld = orderedSectionIds.length
    const numBits = 1 << numNew

    for (let i = 0; i < numBits; i++) {
      const bitStr = i.toString(2).padStart(numNew, '0')

      if (numOld === 0) {
        next[bitStr] = true
        continue
      }

      // Find all old bitmasks compatible with the new bitStr
      let compatibleOldBits: string[] = []
      // Optimization: We only care about plane IDs that exist in both lists
      for (let j = 0; j < (1 << numOld); j++) {
        const oldBitStr = j.toString(2).padStart(numOld, '0')
        let match = true
        for (let k = 0; k < numNew; k++) {
          const planeId = newIds[k]
          const oldIdx = orderedSectionIds.indexOf(planeId)
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
        next[bitStr] = true
      } else {
        // Inherit visibility: Visible if ANY compatible old bit was visible (default is true if not in object)
        const isVisible = compatibleOldBits.some(b => bitmaskVisibility[b] !== false)
        next[bitStr] = isVisible
      }
    }
    return next
  }

  const toggleSection = (id: string) => {
    const newIds = orderedSectionIds.includes(id)
      ? orderedSectionIds.filter(x => x !== id)
      : [...orderedSectionIds, id]

    const nextVis = migrateVisibility(newIds)
    setOrderedSectionIds(newIds)
    setBitmaskVisibility(nextVis)
  }

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return
    const items = Array.from(orderedSectionIds)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    const nextVis = migrateVisibility(items)
    setOrderedSectionIds(items)
    setBitmaskVisibility(nextVis)
  }

  return (
    <div className="h-full flex flex-col p-6 gap-6 overflow-hidden bg-card/95 backdrop-blur-md">
      <div className="flex-shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <Layers className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground tracking-tight">Cấu trúc Hình học</h2>
        </div>
        <p className="text-[11px] text-muted-foreground uppercase font-bold tracking-widest">Phân tích & Lát cắt</p>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 pr-1 -mr-1 custom-scrollbar">

      <Card className="bg-background border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Scissors className="w-4 h-4 text-primary" />
            Chế độ cắt khối
          </CardTitle>
          <CardDescription className="text-xs">Quản lý lát cắt và phân mảnh 3D</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasSectionData ? (
            <p className="text-xs text-muted-foreground text-center py-4">Bài toán không có mặt phẳng cắt nào.</p>
          ) : (
            <>
              {geometryData?.sections && geometryData.sections.length >= 1 && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground">Kích hoạt mặt phẳng cắt</p>
                  <div className="flex flex-wrap gap-2">
                    {geometryData.sections.map((sec) => {
                      const isActive = orderedSectionIds.includes(sec.id)
                      const label = sec.cuttingPlane?.slice(0, 3).join('') || `P`
                      return (
                        <button
                          key={`toggle-${sec.id}`}
                          onClick={() => toggleSection(sec.id)}
                          className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-2 text-xs font-mono font-bold border ${isActive
                              ? 'bg-primary/10 text-primary border-primary/30 hover:bg-primary/20'
                              : 'bg-muted/50 text-muted-foreground border-transparent opacity-50 hover:opacity-70'
                            }`}
                        >
                          <Layers size={13} />
                          ({label})
                          {isActive && <Check size={12} />}
                        </button>
                      )
                    })}
                  </div>

                  {/* Drag and Drop Order */}
                  {orderedSectionIds.length > 0 && (
                    <div className="mt-4 space-y-2 bg-muted/30 p-2 rounded-lg border border-border/50">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-2 px-1">
                        Thứ tự cắt (Kéo thả để đổi)
                      </p>
                      <DragDropContext onDragEnd={onDragEnd}>
                        <Droppable droppableId="sections">
                          {(provided) => (
                            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-1.5">
                              {orderedSectionIds.map((id, index) => {
                                const sec = geometryData.sections?.find(s => s.id === id)
                                if (!sec) return null
                                const label = sec.cuttingPlane?.slice(0, 3).join('') || `P`
                                return (
                                  <Draggable key={id} draggableId={id} index={index}>
                                    {(provided, snapshot) => (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        className={`flex items-center gap-2 px-2 py-1.5 rounded-md border text-xs font-mono ${snapshot.isDragging ? 'bg-accent/20 border-accent text-accent shadow-md' : 'bg-card border-border/60 hover:bg-accent/5 hover:border-accent/30'
                                          }`}
                                      >
                                        <div {...provided.dragHandleProps} className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing p-0.5">
                                          <GripVertical size={14} />
                                        </div>
                                        <span className="font-bold w-4 text-muted-foreground">{index + 1}.</span>
                                        <span className="flex-1 font-bold">({label})</span>
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
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2 border-t border-border pt-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground">Cây phân mảnh</p>
                  <button
                    onClick={showAll}
                    className="text-[10px] px-2 py-0.5 rounded border border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    Hiện tất cả
                  </button>
                </div>

                <div className="rounded-lg border border-border bg-card/60 p-2 space-y-1">
                  <div className="flex items-center gap-2 px-1 pb-1 border-b border-border/40 mb-2">
                    <Box size={14} className="text-primary" />
                    <span className="text-xs font-semibold text-foreground">Khối ban đầu</span>
                    {activeSectionsList.length > 0 && (
                      <div className="flex items-center gap-1 ml-1 text-[10px] text-muted-foreground border border-dashed border-border/40 rounded px-1.5 py-0.5 bg-background/40">
                        <Scissors size={10} />
                        Cắt bởi ({activeSectionsList[0].cuttingPlane?.slice(0, 3).join('') || 'P1'})
                      </div>
                    )}
                  </div>

                  {activeSectionsList.length > 0 ? (
                    <ChunkTree
                      activeSectionsList={activeSectionsList}
                      depth={0}
                      bitPrefix=""
                      bitmaskVisibility={bitmaskVisibility}
                      setBitmaskVisibility={setBitmaskVisibility}
                      totalActivePlanes={N}
                    />
                  ) : (
                    <p className="text-[11px] text-muted-foreground text-center py-2">
                      Bật ít nhất 1 mặt phẳng để xem phân mảnh.
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground">Khoảng cách tách khối</p>
                  <span className="text-xs font-mono text-primary">{explodeAmount}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <Expand size={16} className="text-muted-foreground" />
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={explodeAmount}
                    onChange={e => setExplodeAmount(Number(e.target.value))}
                    className="flex-1 h-1.5 accent-primary cursor-pointer"
                  />
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      </div>

      {/* Save Action Section */}
      <div className="flex-shrink-0 pt-4 border-t border-border/60">
        <Button
          onClick={handleSave}
          disabled={isSaving || !geometryData}
          className={`w-full h-12 rounded-xl font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2 ${
            isSaved 
              ? 'bg-green-500 hover:bg-green-600 text-white shadow-green-500/20' 
              : 'bg-primary text-primary-foreground shadow-primary/20'
          }`}
        >
          {isSaving ? (
             <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
          ) : isSaved ? (
            <Check size={18} />
          ) : (
            <Save size={18} />
          )}
          {isSaving ? 'ĐANG LƯU...' : isSaved ? 'ĐÃ LƯU BẢN VẼ!' : 'LƯU BẢN VẼ'}
        </Button>
      </div>
    </div>
  )
}
