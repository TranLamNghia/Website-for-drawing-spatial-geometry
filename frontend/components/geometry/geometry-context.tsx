'use client'

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'
import {
  buildManualDerived,
  createEmptyManualDocument,
  createEntityId,
  ManualDisplayPoint,
  ManualDocument,
  ManualDraft,
  ManualPoint,
  ManualSelection,
  ManualSnapTarget,
  ManualTool,
  ManualDerived,
  ManualPolygon,
  ManualSolid,
  nextPointLabel,
  resolvePointPositions,
  Vec3,
} from './manual-editor'

export interface Point3D {
  x: number
  y: number
  z: number
}

export interface Query {
  id: string
  text: string
  edges?: string[]
}

export interface CircleData {
  center: string
  radius: number
  normal?: [number, number, number]
  name?: string
  color?: string
}

export interface PlaneData {
  points: string[]
  color?: string
  opacity?: number
  density?: number
  isSolidFace?: boolean
}

export interface SphereData {
  center: string
  radius: number
  color?: string
  opacity?: number
}

export interface ConeData {
  center: string
  apex: string
  radius: number
  color?: string
  opacity?: number
}

export interface CylinderData {
  centerBottom: string
  centerTop: string
  radius: number
  color?: string
  opacity?: number
}

export interface ClippingPlaneData {
  a: number
  b: number
  c: number
  d: number
  crossSectionVertices?: string[]
}

export interface SectionData {
  id: string
  cuttingPlane: string[]
  polygon: string[]
  generatedPoints?: Record<string, { x: number, y: number, z: number }>
  isCircle?: boolean
  circleCenter?: { x: number, y: number, z: number }
  circleRadius?: number
  normal?: [number, number, number]
}

export interface GeometryData {
  points: Record<string, [number, number, number]>
  is_consistent: boolean
  error_message?: string
  queries?: Query[]
  edges?: string[]
  circles?: CircleData[]
  planes?: PlaneData[]
  spheres?: SphereData[]
  cones?: ConeData[]
  cylinders?: CylinderData[]
  clippingPlane?: ClippingPlaneData
  pointSides?: Record<string, 'above' | 'below' | 'onplane'>
  sections?: SectionData[]
}

export interface ValidationResult {
  isConsistent: boolean
  issues: string[]
}

export type BitmaskVisibility = Record<string, boolean>
export type WorkspaceMode = 'solver' | 'manual'

interface GeometryContextType {
  workspaceMode: WorkspaceMode
  setWorkspaceMode: (mode: WorkspaceMode) => void
  geometryData: GeometryData | null
  setGeometryData: (data: GeometryData | null) => void
  selectedEntity: string | null
  setSelectedEntity: (entity: string | null) => void
  validation: ValidationResult
  setValidation: (validation: ValidationResult) => void
  cameraControls: {
    rotateX: number
    rotateY: number
    zoom: number
    panX: number
    panY: number
  }
  setCameraControls: (controls: any) => void
  highlightedEdges: string[]
  setHighlightedEdges: (edges: string[]) => void
  isConsistent: boolean
  setIsConsistent: (consistent: boolean) => void
  errorMessage: string
  setErrorMessage: (message: string) => void
  queries: Query[]
  setQueries: (queries: Query[]) => void
  selectedQueryId: string | null
  setSelectedQueryId: (id: string | null) => void
  bitmaskVisibility: BitmaskVisibility
  setBitmaskVisibility: (vis: BitmaskVisibility) => void
  explodeAmount: number
  setExplodeAmount: (amount: number) => void
  orderedSectionIds: string[]
  setOrderedSectionIds: (ids: string[]) => void
  showAxes: boolean
  setShowAxes: (v: boolean) => void
  showGrid: boolean
  setShowGrid: (v: boolean) => void
  showLabels: boolean
  setShowLabels: (v: boolean) => void
  resetTrigger: number
  resetCamera: () => void

  manualDocument: ManualDocument
  manualDerived: ManualDerived
  setManualDocument: (document: ManualDocument) => void
  resetManualDocument: () => void
  activeTool: ManualTool
  setActiveTool: (tool: ManualTool) => void
  manualSelection: ManualSelection
  setManualSelection: (selection: ManualSelection) => void
  draftOperation: ManualDraft | null
  setDraftOperation: (draft: ManualDraft | null) => void
  hoveredSnapTarget: ManualSnapTarget | null
  setHoveredSnapTarget: (target: ManualSnapTarget | null) => void
  snapEnabled: boolean
  setSnapEnabled: (value: boolean) => void
  snapThreshold: number
  setSnapThreshold: (value: number) => void
  canUndo: boolean
  canRedo: boolean
  undoManual: () => void
  redoManual: () => void
  cancelManualDraft: () => void
  createPointFromTarget: (target: ManualSnapTarget | null, fallback: Vec3) => string | null
  updatePointPosition: (pointId: string, position: Vec3, target?: ManualSnapTarget | null) => void
  createSegment: (startPointId: string, endPointId: string) => string | null
  createPolygon: (pointIds: string[]) => string | null
  createBox: (cornerPointIds: [string, string], height: number) => string | null
  createPyramid: (basePolygonId: string, height: number) => string | null
  createPrism: (basePolygonId: string, height: number) => string | null
  renameManualEntity: (
    kind: 'point' | 'segment' | 'polygon' | 'solid',
    id: string,
    label: string,
  ) => void
  toggleManualVisibility: (
    kind: 'point' | 'segment' | 'polygon' | 'solid',
    id: string,
  ) => void
  toggleManualLocked: (
    kind: 'point' | 'segment' | 'polygon' | 'solid',
    id: string,
  ) => void
  removeManualEntity: (
    kind: 'point' | 'segment' | 'polygon' | 'solid',
    id: string,
  ) => void
}

const GeometryContext = createContext<GeometryContextType | undefined>(undefined)

function cloneDocument(document: ManualDocument): ManualDocument {
  return JSON.parse(JSON.stringify(document)) as ManualDocument
}

function mapEntities<T extends { id: string }>(
  entities: T[],
  entityId: string,
  mapper: (entity: T) => T,
) {
  return entities.map((entity) => (entity.id === entityId ? mapper(entity) : entity))
}

function removeEntityDependencies(
  document: ManualDocument,
  kind: 'point' | 'segment' | 'polygon' | 'solid',
  entityId: string,
) {
  let nextDocument = cloneDocument(document)

  if (kind === 'point') {
    const removedPointIds = new Set([entityId])
    const removedSegmentIds = new Set(
      nextDocument.segments
        .filter(
          (segment) =>
            removedPointIds.has(segment.startPointId) ||
            removedPointIds.has(segment.endPointId),
        )
        .map((segment) => segment.id),
    )
    nextDocument.points = nextDocument.points.filter(
      (point) =>
        !removedPointIds.has(point.id) &&
        !(point.segmentId && removedSegmentIds.has(point.segmentId)),
    )
    nextDocument.segments = nextDocument.segments.filter(
      (segment) => !removedSegmentIds.has(segment.id),
    )
    nextDocument.polygons = nextDocument.polygons.filter(
      (polygon) => !polygon.pointIds.some((pointId) => removedPointIds.has(pointId)),
    )
    nextDocument.solids = nextDocument.solids.filter((solid) => {
      if (solid.cornerPointIds) {
        return !solid.cornerPointIds.some((pointId) => removedPointIds.has(pointId))
      }
      return true
    })
  }

  if (kind === 'segment') {
    const removedSegmentIds = new Set([entityId])
    nextDocument.segments = nextDocument.segments.filter((segment) => segment.id !== entityId)
    nextDocument.points = nextDocument.points.filter(
      (point) => !(point.segmentId && removedSegmentIds.has(point.segmentId)),
    )
  }

  if (kind === 'polygon') {
    nextDocument.polygons = nextDocument.polygons.filter((polygon) => polygon.id !== entityId)
    nextDocument.solids = nextDocument.solids.filter(
      (solid) => solid.basePolygonId !== entityId,
    )
  }

  if (kind === 'solid') {
    nextDocument.solids = nextDocument.solids.filter((solid) => solid.id !== entityId)
  }

  return nextDocument
}

function resolvePointPlacement(
  document: ManualDocument,
  target: ManualSnapTarget | null,
  fallback: Vec3,
): ManualPoint {
  if ((target?.kind === 'segment' || target?.kind === 'midpoint') && target.segmentId) {
    return {
      id: createEntityId('point'),
      label: nextPointLabel(document),
      entityType: 'point',
      pointKind: 'segment',
      position: fallback,
      segmentId: target.segmentId,
      t: target.t ?? 0.5,
      createdByTool: 'point',
      dependsOn: [target.segmentId],
      locked: false,
      visible: true,
      selectable: true,
    }
  }

  return {
    id: createEntityId('point'),
    label: nextPointLabel(document),
    entityType: 'point',
    pointKind: 'free',
    position: target?.position ?? fallback,
    createdByTool: 'point',
    dependsOn: [],
    locked: false,
    visible: true,
    selectable: true,
  }
}

export function GeometryProvider({ children }: { children: React.ReactNode }) {
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('solver')
  const [geometryData, setGeometryData] = useState<GeometryData | null>(null)
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null)
  const [validation, setValidation] = useState<ValidationResult>({
    isConsistent: true,
    issues: [],
  })
  const [cameraControls, setCameraControls] = useState({
    rotateX: 0.75,
    rotateY: 0.5,
    zoom: 1,
    panX: 0,
    panY: 0,
  })
  const [highlightedEdges, setHighlightedEdges] = useState<string[]>([])
  const [isConsistent, setIsConsistent] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [queries, setQueries] = useState<Query[]>([])
  const [selectedQueryId, setSelectedQueryId] = useState<string | null>(null)
  const [bitmaskVisibility, setBitmaskVisibility] = useState<BitmaskVisibility>({})
  const [explodeAmount, setExplodeAmount] = useState(0)
  const [orderedSectionIds, setOrderedSectionIds] = useState<string[]>([])
  const [showAxes, setShowAxes] = useState(true)
  const [showGrid, setShowGrid] = useState(true)
  const [showLabels, setShowLabels] = useState(true)
  const [resetTrigger, setResetTrigger] = useState(0)

  const [manualDocument, setManualDocumentState] = useState<ManualDocument>(
    createEmptyManualDocument(),
  )
  const [manualSelection, setManualSelection] = useState<ManualSelection>(null)
  const [activeTool, setActiveTool] = useState<ManualTool>('select')
  const [draftOperation, setDraftOperation] = useState<ManualDraft | null>(null)
  const [hoveredSnapTarget, setHoveredSnapTarget] = useState<ManualSnapTarget | null>(null)
  const [snapEnabled, setSnapEnabled] = useState(true)
  const [snapThreshold, setSnapThreshold] = useState(18)
  const [undoStack, setUndoStack] = useState<ManualDocument[]>([])
  const [redoStack, setRedoStack] = useState<ManualDocument[]>([])

  const manualDerived = useMemo(() => buildManualDerived(manualDocument), [manualDocument])

  const setManualDocument = useCallback((document: ManualDocument) => {
    setManualDocumentState(cloneDocument(document))
    setManualSelection(null)
    setDraftOperation(null)
    setUndoStack([])
    setRedoStack([])
  }, [])

  const commitManualDocument = useCallback(
    (updater: (document: ManualDocument) => ManualDocument | null) => {
      setManualDocumentState((current) => {
        const next = updater(current)
        if (!next) return current
        setUndoStack((stack) => [...stack, cloneDocument(current)].slice(-60))
        setRedoStack([])
        return cloneDocument(next)
      })
    },
    [],
  )

  const resetManualDocument = useCallback(() => {
    setManualDocumentState(createEmptyManualDocument())
    setManualSelection(null)
    setDraftOperation(null)
    setUndoStack([])
    setRedoStack([])
  }, [])

  const resetCamera = useCallback(() => {
    setResetTrigger((previous) => previous + 1)
  }, [])

  const cancelManualDraft = useCallback(() => {
    setDraftOperation(null)
    setHoveredSnapTarget(null)
  }, [])

  const createPointFromTarget = useCallback(
    (target: ManualSnapTarget | null, fallback: Vec3) => {
      if (target?.kind === 'point' && target.pointId) {
        return target.pointId
      }

      const createdPoint = resolvePointPlacement(manualDocument, target, fallback)
      commitManualDocument((current) => ({
        ...current,
        points: [...current.points, createdPoint],
      }))
      setManualSelection({ kind: 'point', id: createdPoint.id })
      return createdPoint.id
    },
    [commitManualDocument, manualDocument],
  )

  const updatePointPosition = useCallback(
    (pointId: string, position: Vec3, target?: ManualSnapTarget | null) => {
      commitManualDocument((current) => {
        const point = current.points.find((candidate) => candidate.id === pointId)
        if (!point || point.locked) return null

        if (point.pointKind === 'segment' && point.segmentId) {
          const segment = current.segments.find(
            (candidate) => candidate.id === point.segmentId,
          )
          if (!segment) return null
          const resolved = resolvePointPositions(current)
          const start = resolved[segment.startPointId]
          const end = resolved[segment.endPointId]
          if (!start || !end) return null
          const dx = end[0] - start[0]
          const dy = end[1] - start[1]
          const lengthSquared = dx * dx + dy * dy
          const nextT =
            target?.kind === 'segment' && target.segmentId === point.segmentId
              ? target.t ?? point.t ?? 0.5
              : lengthSquared === 0
                ? point.t ?? 0.5
                : Math.min(
                    1,
                    Math.max(
                      0,
                      ((position[0] - start[0]) * dx + (position[1] - start[1]) * dy) /
                        lengthSquared,
                    ),
                  )
          return {
            ...current,
            points: mapEntities(current.points, pointId, (candidate) => ({
              ...candidate,
              t: nextT,
            })),
          }
        }

        const nextPosition = target?.position ?? position
        return {
          ...current,
          points: mapEntities(current.points, pointId, (candidate) => ({
            ...candidate,
            position: [nextPosition[0], nextPosition[1], nextPosition[2]],
          })),
        }
      })
    },
    [commitManualDocument],
  )

  const createSegment = useCallback(
    (startPointId: string, endPointId: string) => {
      if (startPointId === endPointId) return null
      const nextId = createEntityId('segment')
      const startLabel =
        manualDocument.points.find((point) => point.id === startPointId)?.label ?? 'A'
      const endLabel =
        manualDocument.points.find((point) => point.id === endPointId)?.label ?? 'B'
      const segment = {
        id: nextId,
        label: `${startLabel}${endLabel}`,
        entityType: 'segment' as const,
        startPointId,
        endPointId,
        createdByTool: 'segment' as const,
        dependsOn: [startPointId, endPointId],
        locked: false,
        visible: true,
        selectable: true,
      }
      commitManualDocument((current) => ({
        ...current,
        segments: [...current.segments, segment],
      }))
      setManualSelection({ kind: 'segment', id: nextId })
      return nextId
    },
    [commitManualDocument, manualDocument.points],
  )

  const createPolygon = useCallback(
    (pointIds: string[]) => {
      const uniqueIds = pointIds.filter(
        (pointId, index) => pointIds.indexOf(pointId) === index,
      )
      if (uniqueIds.length < 3) return null
      const polygonId = createEntityId('polygon')
      const polygon = {
        id: polygonId,
        label: `Đa giác ${manualDocument.polygons.length + 1}`,
        entityType: 'polygon' as const,
        pointIds: uniqueIds,
        createdByTool: 'polygon' as const,
        dependsOn: [...uniqueIds],
        locked: false,
        visible: true,
        selectable: true,
      }
      commitManualDocument((current) => ({
        ...current,
        polygons: [...current.polygons, polygon],
      }))
      setManualSelection({ kind: 'polygon', id: polygonId })
      return polygonId
    },
    [commitManualDocument, manualDocument.polygons.length],
  )

  const createBox = useCallback(
    (cornerPointIds: [string, string], height: number) => {
      if (height <= 0) return null
      const solidId = createEntityId('solid')
      const solid: ManualSolid = {
        id: solidId,
        label: `Hộp ${manualDocument.solids.length + 1}`,
        entityType: 'solid',
        solidType: 'box',
        height,
        cornerPointIds,
        createdByTool: 'box',
        dependsOn: [...cornerPointIds],
        locked: false,
        visible: true,
        selectable: true,
      }
      commitManualDocument((current) => ({
        ...current,
        solids: [...current.solids, solid],
      }))
      setManualSelection({ kind: 'solid', id: solidId })
      return solidId
    },
    [commitManualDocument, manualDocument.solids.length],
  )

  const createPyramid = useCallback(
    (basePolygonId: string, height: number) => {
      if (height <= 0) return null
      const solidId = createEntityId('solid')
      const solid: ManualSolid = {
        id: solidId,
        label: `Chóp ${manualDocument.solids.length + 1}`,
        entityType: 'solid',
        solidType: 'pyramid',
        basePolygonId,
        height,
        createdByTool: 'pyramid',
        dependsOn: [basePolygonId],
        locked: false,
        visible: true,
        selectable: true,
      }
      commitManualDocument((current) => ({
        ...current,
        solids: [...current.solids, solid],
      }))
      setManualSelection({ kind: 'solid', id: solidId })
      return solidId
    },
    [commitManualDocument, manualDocument.solids.length],
  )

  const createPrism = useCallback(
    (basePolygonId: string, height: number) => {
      if (height <= 0) return null
      const solidId = createEntityId('solid')
      const solid: ManualSolid = {
        id: solidId,
        label: `Lăng trụ ${manualDocument.solids.length + 1}`,
        entityType: 'solid',
        solidType: 'prism',
        basePolygonId,
        height,
        createdByTool: 'prism',
        dependsOn: [basePolygonId],
        locked: false,
        visible: true,
        selectable: true,
      }
      commitManualDocument((current) => ({
        ...current,
        solids: [...current.solids, solid],
      }))
      setManualSelection({ kind: 'solid', id: solidId })
      return solidId
    },
    [commitManualDocument, manualDocument.solids.length],
  )

  const renameManualEntity = useCallback(
    (kind: 'point' | 'segment' | 'polygon' | 'solid', id: string, label: string) => {
      const nextLabel = label.trim()
      if (!nextLabel) return
      commitManualDocument((current) => {
        if (kind === 'point') {
          return { ...current, points: mapEntities(current.points, id, (point) => ({ ...point, label: nextLabel })) }
        }
        if (kind === 'segment') {
          return { ...current, segments: mapEntities(current.segments, id, (segment) => ({ ...segment, label: nextLabel })) }
        }
        if (kind === 'polygon') {
          return { ...current, polygons: mapEntities(current.polygons, id, (polygon) => ({ ...polygon, label: nextLabel })) }
        }
        return { ...current, solids: mapEntities(current.solids, id, (solid) => ({ ...solid, label: nextLabel })) }
      })
    },
    [commitManualDocument],
  )

  const toggleManualVisibility = useCallback(
    (kind: 'point' | 'segment' | 'polygon' | 'solid', id: string) => {
      commitManualDocument((current) => {
        if (kind === 'point') {
          return { ...current, points: mapEntities(current.points, id, (point) => ({ ...point, visible: !point.visible })) }
        }
        if (kind === 'segment') {
          return { ...current, segments: mapEntities(current.segments, id, (segment) => ({ ...segment, visible: !segment.visible })) }
        }
        if (kind === 'polygon') {
          return { ...current, polygons: mapEntities(current.polygons, id, (polygon) => ({ ...polygon, visible: !polygon.visible })) }
        }
        return { ...current, solids: mapEntities(current.solids, id, (solid) => ({ ...solid, visible: !solid.visible })) }
      })
    },
    [commitManualDocument],
  )

  const toggleManualLocked = useCallback(
    (kind: 'point' | 'segment' | 'polygon' | 'solid', id: string) => {
      commitManualDocument((current) => {
        if (kind === 'point') {
          return { ...current, points: mapEntities(current.points, id, (point) => ({ ...point, locked: !point.locked })) }
        }
        if (kind === 'segment') {
          return { ...current, segments: mapEntities(current.segments, id, (segment) => ({ ...segment, locked: !segment.locked })) }
        }
        if (kind === 'polygon') {
          return { ...current, polygons: mapEntities(current.polygons, id, (polygon) => ({ ...polygon, locked: !polygon.locked })) }
        }
        return { ...current, solids: mapEntities(current.solids, id, (solid) => ({ ...solid, locked: !solid.locked })) }
      })
    },
    [commitManualDocument],
  )

  const removeManualEntity = useCallback(
    (kind: 'point' | 'segment' | 'polygon' | 'solid', id: string) => {
      commitManualDocument((current) => removeEntityDependencies(current, kind, id))
      setManualSelection((current) =>
        current?.id === id && current.kind === kind ? null : current,
      )
    },
    [commitManualDocument],
  )

  const undoManual = useCallback(() => {
    setUndoStack((currentUndo) => {
      if (!currentUndo.length) return currentUndo
      const previous = currentUndo[currentUndo.length - 1]
      setRedoStack((currentRedo) => [...currentRedo, cloneDocument(manualDocument)].slice(-60))
      setManualDocumentState(cloneDocument(previous))
      return currentUndo.slice(0, -1)
    })
    setDraftOperation(null)
  }, [manualDocument])

  const redoManual = useCallback(() => {
    setRedoStack((currentRedo) => {
      if (!currentRedo.length) return currentRedo
      const next = currentRedo[currentRedo.length - 1]
      setUndoStack((currentUndo) => [...currentUndo, cloneDocument(manualDocument)].slice(-60))
      setManualDocumentState(cloneDocument(next))
      return currentRedo.slice(0, -1)
    })
    setDraftOperation(null)
  }, [manualDocument])

  const contextValue = useMemo(
    () => ({
      workspaceMode,
      setWorkspaceMode,
      geometryData,
      setGeometryData,
      selectedEntity,
      setSelectedEntity,
      validation,
      setValidation,
      cameraControls,
      setCameraControls,
      highlightedEdges,
      setHighlightedEdges,
      isConsistent,
      setIsConsistent,
      errorMessage,
      setErrorMessage,
      queries,
      setQueries,
      selectedQueryId,
      setSelectedQueryId,
      bitmaskVisibility,
      setBitmaskVisibility,
      explodeAmount,
      setExplodeAmount,
      orderedSectionIds,
      setOrderedSectionIds,
      showAxes,
      setShowAxes,
      showGrid,
      setShowGrid,
      showLabels,
      setShowLabels,
      resetTrigger,
      resetCamera,
      manualDocument,
      manualDerived,
      setManualDocument,
      resetManualDocument,
      activeTool,
      setActiveTool,
      manualSelection,
      setManualSelection,
      draftOperation,
      setDraftOperation,
      hoveredSnapTarget,
      setHoveredSnapTarget,
      snapEnabled,
      setSnapEnabled,
      snapThreshold,
      setSnapThreshold,
      canUndo: undoStack.length > 0,
      canRedo: redoStack.length > 0,
      undoManual,
      redoManual,
      cancelManualDraft,
      createPointFromTarget,
      updatePointPosition,
      createSegment,
      createPolygon,
      createBox,
      createPyramid,
      createPrism,
      renameManualEntity,
      toggleManualVisibility,
      toggleManualLocked,
      removeManualEntity,
    }),
    [
      activeTool,
      bitmaskVisibility,
      cameraControls,
      cancelManualDraft,
      createBox,
      createPointFromTarget,
      createPolygon,
      createPrism,
      createPyramid,
      createSegment,
      draftOperation,
      errorMessage,
      explodeAmount,
      geometryData,
      highlightedEdges,
      hoveredSnapTarget,
      isConsistent,
      manualDerived,
      manualDocument,
      manualSelection,
      orderedSectionIds,
      queries,
      redoManual,
      redoStack.length,
      removeManualEntity,
      renameManualEntity,
      resetCamera,
      resetManualDocument,
      resetTrigger,
      selectedEntity,
      selectedQueryId,
      setGeometryData,
      setSelectedEntity,
      setValidation,
      showAxes,
      showGrid,
      showLabels,
      snapEnabled,
      snapThreshold,
      toggleManualLocked,
      toggleManualVisibility,
      undoManual,
      undoStack.length,
      updatePointPosition,
      validation,
      workspaceMode,
    ],
  )

  return (
    <GeometryContext.Provider value={contextValue}>
      {children}
    </GeometryContext.Provider>
  )
}

export function useGeometry() {
  const context = useContext(GeometryContext)
  if (context === undefined) {
    throw new Error('useGeometry must be used within GeometryProvider')
  }
  return context
}
