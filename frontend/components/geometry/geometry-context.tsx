'use client'

import React, { createContext, useCallback, useContext, useMemo, useState, useRef, useEffect } from 'react'
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
  ManualSegment,
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
  showSmartGuides: boolean
  setShowSmartGuides: (v: boolean) => void
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
  canUndo: boolean
  canRedo: boolean
  undoManual: () => void
  redoManual: () => void
  cancelManualDraft: () => void
  createPointFromTarget: (target: ManualSnapTarget | null, fallback: Vec3) => string | null
  updatePointPosition: (pointId: string, position: Vec3, target?: ManualSnapTarget | null) => void
  updateSegmentLength: (segmentId: string, newLength: number) => void
  updateCircleRadius: (circleId: string, newRadius: number) => void
  saveManualState: () => void
  createMidpoint: (pointIdA: string, pointIdB: string) => string | null
  createIntersection: (segmentIdA: string, segmentIdB: string) => string | null
  createProjection: (pointId: string, targetId: string, targetKind: 'segment' | 'polygon') => string | null
  createCentroid: (targetPolygonId?: string, sourcePointIds?: string[]) => string | null
  createPerpendicularBisector: (segmentId?: string, pointIdA?: string, pointIdB?: string) => string | null
  createAngleBisector: (pointIdA: string, pointIdB: string, pointIdC: string) => string | null
  createParallelLine: (pointId: string, segmentId: string) => string | null
  createPerpendicularLine: (pointId: string, segmentId: string) => string | null
  createSegment: (startPointId: string, endPointId: string) => string | null
  createPolygon: (pointIds: string[]) => string | null
  createBox: (cornerPointIds: [string, string], height: number) => string | null
  createPyramid: (basePolygonId: string, height: number, apexPointId?: string) => string | null
  createPrism: (basePolygonId: string, height: number, topPointId?: string) => string | null
  createSphere: (centerPointId: string, radius: number, radiusPointId?: string) => string | null
  createCone: (centerPointId: string, radius: number, height: number, baseCircleId?: string) => string | null
  createCylinder: (centerPointId: string, radius: number, height: number, baseCircleId?: string) => string | null
  createCircle: (
    kind: 'threePoints' | 'centerRadius' | 'centerPoint',
    args: { centerPointId?: string; radiusPointId?: string; radius?: number; sourcePointIds?: string[] }
  ) => string | null
  createRegularPolygon: (pointIdA: string, pointIdB: string, sides: number) => string | null
  createSpecialTriangle: (
    type: 'vuong' | 'can' | 'vuong_can' | 'deu',
    pointIdA: string,
    pointIdB: string,
    anchorPointId?: string
  ) => string | null
  createSpecialQuadrilateral: (
    type: 'binh_huanh' | 'chu_nhat' | 'thoi' | 'vuong',
    pointIds: string[]
  ) => string | null
  renameManualEntity: (
    kind: 'point' | 'segment' | 'polygon' | 'solid' | 'circle',
    id: string,
    label: string,
  ) => void
  toggleManualVisibility: (
    kind: 'point' | 'segment' | 'polygon' | 'solid' | 'circle',
    id: string,
  ) => void
  toggleManualLocked: (
    kind: 'point' | 'segment' | 'polygon' | 'solid' | 'circle',
    id: string,
  ) => void
  removeManualEntity: (
    kind: 'point' | 'segment' | 'polygon' | 'solid' | 'circle',
    id: string,
  ) => void
}

const GeometryContext = createContext<GeometryContextType | undefined>(undefined)

function cloneDocument(document: ManualDocument): ManualDocument {
  return JSON.parse(JSON.stringify(document)) as ManualDocument
}

function addVec3(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
}

function subVec3(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
}

function scaleVec3(vec: Vec3, scalar: number): Vec3 {
  return [vec[0] * scalar, vec[1] * scalar, vec[2] * scalar]
}

function dotVec3(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
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
  kind: 'point' | 'segment' | 'polygon' | 'solid' | 'circle',
  entityId: string,
) {
  let nextDocument = cloneDocument(document)
  const removedIds = new Set<string>([entityId])

  // Simple recursive dependency resolver
  let foundNew = true
  while (foundNew) {
    foundNew = false

    // Check points
    nextDocument.points.forEach((p) => {
      if (removedIds.has(p.id)) return
      const hasRemovedDep = (p.dependsOn && p.dependsOn.some((depId) => removedIds.has(depId)))
        || (p.segmentId && removedIds.has(p.segmentId))
      if (hasRemovedDep) {
        removedIds.add(p.id)
        foundNew = true
      }
    })

    // Check segments
    nextDocument.segments.forEach((s) => {
      if (removedIds.has(s.id)) return
      const hasRemovedDep = removedIds.has(s.startPointId) || removedIds.has(s.endPointId)
        || (s.dependsOn && s.dependsOn.some((depId) => removedIds.has(depId)))
      if (hasRemovedDep) {
        removedIds.add(s.id)
        foundNew = true
      }
    })

    // Check polygons
    nextDocument.polygons.forEach((poly) => {
      if (removedIds.has(poly.id)) return
      const hasRemovedDep = poly.pointIds.some((pid) => removedIds.has(pid))
        || (poly.dependsOn && poly.dependsOn.some((depId) => removedIds.has(depId)))
      if (hasRemovedDep) {
        removedIds.add(poly.id)
        foundNew = true
      }
    })

    // Check solids
    nextDocument.solids.forEach((solid) => {
      if (removedIds.has(solid.id)) return
      const hasRemovedDep = (solid.basePolygonId && removedIds.has(solid.basePolygonId))
        || (solid.cornerPointIds && solid.cornerPointIds.some((pid) => removedIds.has(pid)))
        || (solid.centerPointId && removedIds.has(solid.centerPointId))
        || (solid.dependsOn && solid.dependsOn.some((depId) => removedIds.has(depId)))
      if (hasRemovedDep) {
        removedIds.add(solid.id)
        foundNew = true
      }
    })

    // Check circles
    nextDocument.circles.forEach((circle) => {
      if (removedIds.has(circle.id)) return
      const hasRemovedDep = (circle.centerPointId && removedIds.has(circle.centerPointId))
        || (circle.radiusPointId && removedIds.has(circle.radiusPointId))
        || (circle.sourcePointIds && circle.sourcePointIds.some((pid) => removedIds.has(pid)))
        || (circle.dependsOn && circle.dependsOn.some((depId) => removedIds.has(depId)))
      if (hasRemovedDep) {
        removedIds.add(circle.id)
        foundNew = true
      }
    })
  }

  // Filter out all removed entities
  nextDocument.points = nextDocument.points.filter((p) => !removedIds.has(p.id))
  nextDocument.segments = nextDocument.segments.filter((s) => !removedIds.has(s.id))
  nextDocument.polygons = nextDocument.polygons.filter((poly) => !removedIds.has(poly.id))
  nextDocument.solids = nextDocument.solids.filter((solid) => !removedIds.has(solid.id))
  nextDocument.circles = nextDocument.circles.filter((circle) => !removedIds.has(circle.id))

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
  const [showSmartGuides, setShowSmartGuides] = useState(true)
  const [resetTrigger, setResetTrigger] = useState(0)

  const [manualDocument, setManualDocumentState] = useState<ManualDocument>(
    createEmptyManualDocument(),
  )
  const [manualSelection, setManualSelection] = useState<ManualSelection>(null)
  const [activeTool, setActiveTool] = useState<ManualTool>('select')
  const [draftOperation, setDraftOperation] = useState<ManualDraft | null>(null)
  const [hoveredSnapTarget, setHoveredSnapTarget] = useState<ManualSnapTarget | null>(null)
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

  const manualDocumentRef = useRef(manualDocument)
  useEffect(() => {
    manualDocumentRef.current = manualDocument
  }, [manualDocument])

  const commitManualDocument = useCallback(
    (updater: (document: ManualDocument) => ManualDocument | null, isTransient: boolean = false) => {
      setManualDocumentState((current) => {
        const next = updater(current)
        if (!next) return current
        if (!isTransient) {
          setTimeout(() => {
            setUndoStack((stack) => [...stack, cloneDocument(current)].slice(-60))
            setRedoStack([])
          }, 0)
        }
        return cloneDocument(next)
      })
    },
    [],
  )

  const saveManualState = useCallback(() => {
    setUndoStack((stack) => [...stack, cloneDocument(manualDocumentRef.current)].slice(-60))
    setRedoStack([])
  }, [])

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
        if (pointId.includes('_point_')) {
          const parts = pointId.split('_point_')
          const solidId = parts[0]
          const index = parseInt(parts[1], 10)

          const solid = current.solids.find((s) => s.id === solidId)
          if (solid && solid.solidType === 'box' && solid.cornerPointIds) {
            const p1Id = solid.cornerPointIds[0]
            const p2Id = solid.cornerPointIds[1]
            const p1 = current.points.find((p) => p.id === p1Id)
            const p2 = current.points.find((p) => p.id === p2Id)
            if (!p1 || !p2) return null

            let nextPoints = [...current.points]
            let nextHeight = solid.height ?? 4
            const [newX, newY, newZ] = position

            if (index === 1 || index === 5) {
              nextPoints = current.points.map((p) => {
                if (p.id === p2Id) return { ...p, position: [newX, p.position[1], p.position[2]] }
                if (p.id === p1Id) return { ...p, position: [p.position[0], newY, p.position[2]] }
                return p
              })
            } else if (index === 3 || index === 7) {
              nextPoints = current.points.map((p) => {
                if (p.id === p1Id) return { ...p, position: [newX, p.position[1], p.position[2]] }
                if (p.id === p2Id) return { ...p, position: [p.position[0], newY, p.position[2]] }
                return p
              })
            } else if (index === 0 || index === 4) {
              nextPoints = current.points.map((p) => {
                if (p.id === p1Id) return { ...p, position: [newX, newY, p.position[2]] }
                return p
              })
            } else if (index === 2 || index === 6) {
              nextPoints = current.points.map((p) => {
                if (p.id === p2Id) return { ...p, position: [newX, newY, p.position[2]] }
                return p
              })
            }

            if (index >= 4) {
              nextHeight = Math.max(0.1, newZ)
            }

            return {
              ...current,
              points: nextPoints,
              solids: current.solids.map((s) => s.id === solidId ? { ...s, height: nextHeight } : s)
            }
          }
        }

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

        if (point.pointKind === 'perpendicularLinePoint' && point.sourceSegmentId && point.anchorPointId) {
          const seg = current.segments.find((candidate) => candidate.id === point.sourceSegmentId)
          if (seg) {
            const resolved = resolvePointPositions(current)
            const posStart = resolved[seg.startPointId]
            const posEnd = resolved[seg.endPointId]
            const anchor = resolved[point.anchorPointId]
            if (posStart && posEnd && anchor) {
              const E = subVec3(posEnd, posStart)
              const D: Vec3 = [-E[1], E[0], 0]
              const lenD = Math.hypot(D[0], D[1])
              const D_norm = lenD > 1e-9 ? scaleVec3(D, 1 / lenD) : [0, 1, 0] as Vec3
              const proj = subVec3(position, anchor)
              const nextT = dotVec3(proj, D_norm)
              return {
                ...current,
                points: mapEntities(current.points, pointId, (candidate) => ({
                  ...candidate,
                  t: nextT,
                })),
              }
            }
          }
        }

        if (point.pointKind === 'bisectorLinePoint' && point.sourcePointIds && point.sourcePointIds.length >= 2) {
          const resolved = resolvePointPositions(current)
          const posA = resolved[point.sourcePointIds[0]]
          const posB = resolved[point.sourcePointIds[1]]
          if (posA && posB) {
            const M = scaleVec3(addVec3(posA, posB), 0.5)
            const E = subVec3(posB, posA)
            const D: Vec3 = [-E[1], E[0], 0]
            const lenD = Math.hypot(D[0], D[1])
            const D_norm = lenD > 1e-9 ? scaleVec3(D, 1 / lenD) : [0, 1, 0] as Vec3
            const proj = subVec3(position, M)
            const nextT = dotVec3(proj, D_norm)
            return {
              ...current,
              points: mapEntities(current.points, pointId, (candidate) => ({
                ...candidate,
                t: nextT,
              })),
            }
          }
        }

        if (point.pointKind === 'parallelLinePoint' && point.anchorPointId && point.sourceSegmentId) {
          const seg = current.segments.find((candidate) => candidate.id === point.sourceSegmentId)
          if (seg) {
            const resolved = resolvePointPositions(current)
            const posStart = resolved[seg.startPointId]
            const posEnd = resolved[seg.endPointId]
            const anchor = resolved[point.anchorPointId]
            if (posStart && posEnd && anchor) {
              const E = subVec3(posEnd, posStart)
              const lenE = Math.hypot(E[0], E[1], E[2])
              const E_norm = lenE > 1e-9 ? scaleVec3(E, 1 / lenE) : ([1, 0, 0] as Vec3)
              const proj = subVec3(position, anchor)
              const nextT = dotVec3(proj, E_norm)
              return {
                ...current,
                points: mapEntities(current.points, pointId, (candidate) => ({
                  ...candidate,
                  t: nextT,
                })),
              }
            }
          }
        }

        if (point.pointKind === 'angleBisectorPoint' && point.sourcePointIds && point.sourcePointIds.length >= 3) {
          const resolved = resolvePointPositions(current)
          const posA = resolved[point.sourcePointIds[0]]
          const posB = resolved[point.sourcePointIds[1]]
          const posC = resolved[point.sourcePointIds[2]]
          if (posA && posB && posC) {
            const vBA = subVec3(posA, posB)
            const vBC = subVec3(posC, posB)
            const lenBA = Math.hypot(vBA[0], vBA[1], vBA[2])
            const lenBC = Math.hypot(vBC[0], vBC[1], vBC[2])
            if (lenBA > 1e-9 && lenBC > 1e-9) {
              const uBA = scaleVec3(vBA, 1 / lenBA)
              const uBC = scaleVec3(vBC, 1 / lenBC)
              let dir = addVec3(uBA, uBC)
              let lenDir = Math.hypot(dir[0], dir[1], dir[2])
              if (lenDir < 1e-5) {
                dir = [-uBA[1], uBA[0], 0]
                lenDir = Math.hypot(dir[0], dir[1])
              }
              const dirNorm = lenDir > 1e-9 ? scaleVec3(dir, 1 / lenDir) : ([1, 0, 0] as Vec3)
              const proj = subVec3(position, posB)
              const nextT = dotVec3(proj, dirNorm)
              return {
                ...current,
                points: mapEntities(current.points, pointId, (candidate) => ({
                  ...candidate,
                  t: nextT,
                })),
              }
            }
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
      }, true)
    },
    [commitManualDocument],
  )

  const updateSegmentLength = useCallback(
    (segmentId: string, newLength: number) => {
      commitManualDocument((current) => {
        const seg = current.segments.find((s) => s.id === segmentId)
        if (!seg) return null

        const p1 = current.points.find((p) => p.id === seg.startPointId)
        const p2 = current.points.find((p) => p.id === seg.endPointId)
        if (!p1 || !p2) return null

        const nextPoints = current.points.map((p) => {
          if (p.id === p1.id && p.t !== undefined) {
            return { ...p, t: p.t < 0 ? -newLength : newLength }
          }
          if (p.id === p2.id && p.t !== undefined) {
            return { ...p, t: p.t < 0 ? -newLength : newLength }
          }
          return p
        })

        return {
          ...current,
          points: nextPoints,
        }
      })
    },
    [commitManualDocument],
  )

  const updateCircleRadius = useCallback(
    (circleId: string, newRadius: number) => {
      commitManualDocument((current) => {
        const circle = current.circles?.find((c) => c.id === circleId)
        if (!circle || circle.circleKind !== 'centerRadius') return null

        return {
          ...current,
          circles: mapEntities(current.circles ?? [], circleId, (c) => ({
            ...c,
            radius: newRadius,
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

  const createMidpoint = useCallback(
    (pointIdA: string, pointIdB: string) => {
      if (pointIdA === pointIdB) return null
      const labelA = manualDocument.points.find((p) => p.id === pointIdA)?.label ?? '?'
      const labelB = manualDocument.points.find((p) => p.id === pointIdB)?.label ?? '?'
      const midId = createEntityId('point')
      const midPoint: ManualPoint = {
        id: midId,
        label: nextPointLabel(manualDocument),
        entityType: 'point',
        pointKind: 'midpoint',
        position: [0, 0, 0],
        sourcePointIds: [pointIdA, pointIdB],
        createdByTool: 'midpoint',
        dependsOn: [pointIdA, pointIdB],
        locked: true,
        visible: true,
        selectable: true,
      }
      commitManualDocument((current) => ({
        ...current,
        points: [...current.points, midPoint],
      }))
      setManualSelection({ kind: 'point', id: midId })
      return midId
    },
    [commitManualDocument, manualDocument],
  )

  const createIntersection = useCallback(
    (segmentIdA: string, segmentIdB: string) => {
      if (segmentIdA === segmentIdB) return null
      const intId = createEntityId('point')
      const intPoint: ManualPoint = {
        id: intId,
        label: nextPointLabel(manualDocument),
        entityType: 'point',
        pointKind: 'intersection',
        position: [0, 0, 0],
        sourceSegmentIds: [segmentIdA, segmentIdB],
        createdByTool: 'intersection',
        dependsOn: [segmentIdA, segmentIdB],
        locked: true,
        visible: true,
        selectable: true,
      }
      commitManualDocument((current) => {
        const derived = resolvePointPositions({ ...current, points: [...current.points, intPoint] })
        if (!derived[intId]) return null
        return { ...current, points: [...current.points, intPoint] }
      })
      setManualSelection({ kind: 'point', id: intId })
      return intId
    },
    [commitManualDocument, manualDocument],
  )

  const createProjection = useCallback(
    (pointId: string, targetId: string, targetKind: 'segment' | 'polygon') => {
      const projId = createEntityId('point')
      const projPoint: ManualPoint = {
        id: projId,
        label: nextPointLabel(manualDocument),
        entityType: 'point',
        pointKind: 'projection',
        position: [0, 0, 0],
        sourcePointId: pointId,
        ...(targetKind === 'segment' ? { targetSegmentId: targetId } : { targetPolygonId: targetId }),
        createdByTool: 'projection',
        dependsOn: [pointId, targetId],
        locked: true,
        visible: true,
        selectable: true,
      }
      commitManualDocument((current) => ({
        ...current,
        points: [...current.points, projPoint],
      }))
      setManualSelection({ kind: 'point', id: projId })
      return projId
    },
    [commitManualDocument, manualDocument],
  )

  const createCentroid = useCallback(
    (targetPolygonId?: string, sourcePointIds?: string[]) => {
      saveManualState()
      const cId = createEntityId('point')
      const dependsOn: string[] = []
      if (targetPolygonId) dependsOn.push(targetPolygonId)
      if (sourcePointIds) dependsOn.push(...sourcePointIds)

      const cPoint: ManualPoint = {
        id: cId,
        label: nextPointLabel(manualDocument),
        entityType: 'point',
        pointKind: 'centroid',
        position: [0, 0, 0],
        targetPolygonId,
        sourcePointIds,
        createdByTool: 'centroid',
        dependsOn,
        locked: true,
        visible: true,
        selectable: true,
      }

      commitManualDocument((current) => ({
        ...current,
        points: [...current.points, cPoint],
      }))
      setManualSelection({ kind: 'point', id: cId })
      return cId
    },
    [commitManualDocument, manualDocument, saveManualState],
  )

  const createPerpendicularBisector = useCallback(
    (segmentId?: string, pointIdA?: string, pointIdB?: string) => {
      saveManualState()
      
      let pA = pointIdA
      let pB = pointIdB
      const dependsOn: string[] = []

      if (segmentId) {
        dependsOn.push(segmentId)
        const seg = manualDocument.segments.find((s) => s.id === segmentId)
        if (seg) {
          pA = seg.startPointId
          pB = seg.endPointId
        }
      }

      if (!pA || !pB) return null
      if (!segmentId) {
        dependsOn.push(pA, pB)
      }

      const tVal = draftOperation?.radius ?? 20
      const p1Id = createEntityId('point')
      const p2Id = createEntityId('point')

      const p1: ManualPoint = {
        id: p1Id,
        label: '',
        entityType: 'point',
        pointKind: 'bisectorLinePoint',
        position: [0, 0, 0],
        sourcePointIds: [pA, pB],
        t: -tVal,
        createdByTool: 'perpendicularBisector',
        dependsOn: [pA, pB],
        locked: true,
        visible: false,
        selectable: false,
      }

      const p2: ManualPoint = {
        id: p2Id,
        label: '',
        entityType: 'point',
        pointKind: 'bisectorLinePoint',
        position: [0, 0, 0],
        sourcePointIds: [pA, pB],
        t: tVal,
        createdByTool: 'perpendicularBisector',
        dependsOn: [pA, pB],
        locked: true,
        visible: false,
        selectable: false,
      }

      const lineSegId = createEntityId('segment')
      const lineSeg = {
        id: lineSegId,
        label: `d_trung_truc`,
        entityType: 'segment' as const,
        startPointId: p1Id,
        endPointId: p2Id,
        createdByTool: 'perpendicularBisector' as const,
        dependsOn: [p1Id, p2Id, ...dependsOn],
        locked: true,
        visible: true,
        selectable: true,
      }

      commitManualDocument((current) => ({
        ...current,
        points: [...current.points, p1, p2],
        segments: [...current.segments, lineSeg],
      }))

      setManualSelection({ kind: 'segment', id: lineSegId })
      return lineSegId
    },
    [commitManualDocument, manualDocument, saveManualState, draftOperation],
  )

  const createAngleBisector = useCallback(
    (pointIdA: string, pointIdB: string, pointIdC: string) => {
      saveManualState()
      
      const tVal = draftOperation?.radius ?? 20
      const pId = createEntityId('point')
      const p: ManualPoint = {
        id: pId,
        label: '',
        entityType: 'point',
        pointKind: 'angleBisectorPoint',
        position: [0, 0, 0],
        sourcePointIds: [pointIdA, pointIdB, pointIdC],
        t: tVal,
        createdByTool: 'angleBisector',
        dependsOn: [pointIdA, pointIdB, pointIdC],
        locked: true,
        visible: false,
        selectable: false,
      }

      const rayId = createEntityId('segment')
      const ray = {
        id: rayId,
        label: `d_phan_giac`,
        entityType: 'segment' as const,
        startPointId: pointIdB,
        endPointId: pId,
        createdByTool: 'angleBisector' as const,
        dependsOn: [pointIdB, pId],
        locked: true,
        visible: true,
        selectable: true,
      }

      commitManualDocument((current) => ({
        ...current,
        points: [...current.points, p],
        segments: [...current.segments, ray],
      }))

      setManualSelection({ kind: 'segment', id: rayId })
      return rayId
    },
    [commitManualDocument, saveManualState, draftOperation],
  )

  const createParallelLine = useCallback(
    (pointId: string, segmentId: string) => {
      saveManualState()

      const tVal = draftOperation?.radius ?? 20
      const p1Id = createEntityId('point')
      const p2Id = createEntityId('point')

      const p1: ManualPoint = {
        id: p1Id,
        label: '',
        entityType: 'point',
        pointKind: 'parallelLinePoint',
        position: [0, 0, 0],
        anchorPointId: pointId,
        sourceSegmentId: segmentId,
        t: -tVal,
        createdByTool: 'parallelLine',
        dependsOn: [pointId, segmentId],
        locked: true,
        visible: false,
        selectable: false,
      }

      const p2: ManualPoint = {
        id: p2Id,
        label: '',
        entityType: 'point',
        pointKind: 'parallelLinePoint',
        position: [0, 0, 0],
        anchorPointId: pointId,
        sourceSegmentId: segmentId,
        t: tVal,
        createdByTool: 'parallelLine',
        dependsOn: [pointId, segmentId],
        locked: true,
        visible: false,
        selectable: false,
      }

      const lineId = createEntityId('segment')
      const line = {
        id: lineId,
        label: `d_song_song`,
        entityType: 'segment' as const,
        startPointId: p1Id,
        endPointId: p2Id,
        createdByTool: 'parallelLine' as const,
        dependsOn: [p1Id, p2Id],
        locked: true,
        visible: true,
        selectable: true,
      }

      commitManualDocument((current) => ({
        ...current,
        points: [...current.points, p1, p2],
        segments: [...current.segments, line],
      }))

      setManualSelection({ kind: 'segment', id: lineId })
      return lineId
    },
    [commitManualDocument, saveManualState, draftOperation],
  )

  const createPerpendicularLine = useCallback(
    (pointId: string, segmentId: string) => {
      saveManualState()

      const tVal = draftOperation?.radius ?? 20
      const p1Id = createEntityId('point')
      const p2Id = createEntityId('point')

      const p1: ManualPoint = {
        id: p1Id,
        label: '',
        entityType: 'point',
        pointKind: 'perpendicularLinePoint',
        position: [0, 0, 0],
        anchorPointId: pointId,
        sourceSegmentId: segmentId,
        t: -tVal,
        createdByTool: 'perpendicularLine',
        dependsOn: [pointId, segmentId],
        locked: true,
        visible: false,
        selectable: false,
      }

      const p2: ManualPoint = {
        id: p2Id,
        label: '',
        entityType: 'point',
        pointKind: 'perpendicularLinePoint',
        position: [0, 0, 0],
        anchorPointId: pointId,
        sourceSegmentId: segmentId,
        t: tVal,
        createdByTool: 'perpendicularLine',
        dependsOn: [pointId, segmentId],
        locked: true,
        visible: false,
        selectable: false,
      }

      const lineId = createEntityId('segment')
      const line = {
        id: lineId,
        label: `d_vuong_goc`,
        entityType: 'segment' as const,
        startPointId: p1Id,
        endPointId: p2Id,
        createdByTool: 'perpendicularLine' as const,
        dependsOn: [p1Id, p2Id],
        locked: true,
        visible: true,
        selectable: true,
      }

      commitManualDocument((current) => ({
        ...current,
        points: [...current.points, p1, p2],
        segments: [...current.segments, line],
      }))

      setManualSelection({ kind: 'segment', id: lineId })
      return lineId
    },
    [commitManualDocument, saveManualState, draftOperation],
  )

  const createCircle = useCallback(
    (
      kind: 'threePoints' | 'centerRadius' | 'centerPoint',
      args: { centerPointId?: string; radiusPointId?: string; radius?: number; sourcePointIds?: string[] }
    ) => {
      const circleId = createEntityId('circle')
      const dependsOn: string[] = []
      if (args.centerPointId) dependsOn.push(args.centerPointId)
      if (args.radiusPointId) dependsOn.push(args.radiusPointId)
      if (args.sourcePointIds) dependsOn.push(...args.sourcePointIds)

      const circle = {
        id: circleId,
        label: `Đường tròn ${manualDocument.circles ? manualDocument.circles.length + 1 : 1}`,
        entityType: 'circle' as const,
        circleKind: kind,
        centerPointId: args.centerPointId,
        radiusPointId: args.radiusPointId,
        radius: args.radius,
        sourcePointIds: args.sourcePointIds,
        createdByTool: 'circle' as const,
        dependsOn,
        locked: false,
        visible: true,
        selectable: true,
      }

      commitManualDocument((current) => ({
        ...current,
        circles: [...(current.circles ?? []), circle],
      }))
      setManualSelection({ kind: 'circle', id: circleId })
      return circleId
    },
    [commitManualDocument, manualDocument.circles],
  )

  const createRegularPolygon = useCallback(
    (pointIdA: string, pointIdB: string, sides: number) => {
      if (sides < 3) return null
      saveManualState()

      const generatedPoints: ManualPoint[] = []
      const allPointIds = [pointIdA, pointIdB]

      for (let i = 2; i < sides; i++) {
        const pid = createEntityId('point')
        const pt: ManualPoint = {
          id: pid,
          label: nextPointLabel({
            ...manualDocument,
            points: [...manualDocument.points, ...generatedPoints],
          }),
          entityType: 'point',
          pointKind: 'regularPolygonVertex',
          position: [0, 0, 0],
          sourcePointIds: [pointIdA, pointIdB],
          sideIndex: i,
          totalSides: sides,
          createdByTool: 'regularPolygon',
          dependsOn: [pointIdA, pointIdB],
          locked: true,
          visible: true,
          selectable: true,
        }
        generatedPoints.push(pt)
        allPointIds.push(pid)
      }

      const generatedSegments: ManualSegment[] = []
      for (let i = 0; i < sides; i++) {
        const sid = createEntityId('segment')
        const startId = allPointIds[i]
        const endId = allPointIds[(i + 1) % sides]

        const seg: ManualSegment = {
          id: sid,
          label: '',
          entityType: 'segment',
          startPointId: startId,
          endPointId: endId,
          createdByTool: 'regularPolygon',
          dependsOn: [startId, endId],
          locked: true,
          visible: true,
          selectable: true,
        }
        generatedSegments.push(seg)
      }

      const polygonId = createEntityId('polygon')
      const polygon = {
        id: polygonId,
        label: `Đa giác đều ${sides} cạnh`,
        entityType: 'polygon' as const,
        pointIds: allPointIds,
        createdByTool: 'regularPolygon' as const,
        dependsOn: [...allPointIds],
        locked: true,
        visible: true,
        selectable: true,
      }

      commitManualDocument((current) => ({
        ...current,
        points: [...current.points, ...generatedPoints],
        segments: [...current.segments, ...generatedSegments],
        polygons: [...current.polygons, polygon],
      }))
      setManualSelection({ kind: 'polygon', id: polygonId })
      return polygonId
    },
    [commitManualDocument, manualDocument, saveManualState],
  )

  const createSpecialTriangle = useCallback(
    (type: 'vuong' | 'can' | 'vuong_can' | 'deu', pointIdA: string, pointIdB: string, anchorPointId?: string) => {
      saveManualState()
      const cId = createEntityId('point')
      const polygonId = createEntityId('polygon')

      commitManualDocument((current) => {
        let seg = current.segments.find(
          (s) => (s.startPointId === pointIdA && s.endPointId === pointIdB)
            || (s.startPointId === pointIdB && s.endPointId === pointIdA)
        )
        let segId = seg?.id
        const addedSegments: ManualSegment[] = []

        if (!segId && type === 'vuong') {
          segId = createEntityId('segment')
          const newSeg: ManualSegment = {
            id: segId,
            label: '',
            entityType: 'segment',
            startPointId: pointIdA,
            endPointId: pointIdB,
            createdByTool: 'specialTriangle',
            dependsOn: [pointIdA, pointIdB],
            locked: false,
            visible: true,
            selectable: true,
          }
          addedSegments.push(newSeg)
        }

        let cPoint: ManualPoint
        if (type === 'vuong_can') {
          cPoint = {
            id: cId,
            label: nextPointLabel(current),
            entityType: 'point',
            pointKind: 'specialShapeVertex',
            shapeType: 'rightIsosceles_C' as any,
            position: [0, 0, 0],
            sourcePointIds: [pointIdA, pointIdB],
            createdByTool: 'specialTriangle',
            dependsOn: [pointIdA, pointIdB],
            locked: true,
            visible: true,
            selectable: true,
          }
        } else if (type === 'deu') {
          cPoint = {
            id: cId,
            label: nextPointLabel(current),
            entityType: 'point',
            pointKind: 'specialShapeVertex',
            shapeType: 'equilateral_C' as any,
            position: [0, 0, 0],
            sourcePointIds: [pointIdA, pointIdB],
            createdByTool: 'specialTriangle',
            dependsOn: [pointIdA, pointIdB],
            locked: true,
            visible: true,
            selectable: true,
          }
        } else if (type === 'vuong') {
          const anchor = anchorPointId ?? pointIdA
          const resolvedSegId = segId!
          cPoint = {
            id: cId,
            label: nextPointLabel(current),
            entityType: 'point',
            pointKind: 'perpendicularLinePoint',
            anchorPointId: anchor,
            sourceSegmentId: resolvedSegId,
            t: 4,
            position: [0, 0, 0],
            createdByTool: 'specialTriangle',
            dependsOn: [resolvedSegId, anchor],
            locked: false,
            visible: true,
            selectable: true,
          }
        } else {
          cPoint = {
            id: cId,
            label: nextPointLabel(current),
            entityType: 'point',
            pointKind: 'bisectorLinePoint',
            sourcePointIds: [pointIdA, pointIdB],
            t: 4,
            position: [0, 0, 0],
            createdByTool: 'specialTriangle',
            dependsOn: [pointIdA, pointIdB],
            locked: false,
            visible: true,
            selectable: true,
          }
        }

        const allPointIds = [pointIdA, pointIdB, cId]
        const checkAndAddSegment = (p1: string, p2: string) => {
          const existing = current.segments.find(
            (s) => (s.startPointId === p1 && s.endPointId === p2)
              || (s.startPointId === p2 && s.endPointId === p1)
          ) || addedSegments.find(
            (s) => (s.startPointId === p1 && s.endPointId === p2)
              || (s.startPointId === p2 && s.endPointId === p1)
          )
          if (!existing) {
            addedSegments.push({
              id: createEntityId('segment'),
              label: '',
              entityType: 'segment',
              startPointId: p1,
              endPointId: p2,
              createdByTool: 'specialTriangle',
              dependsOn: [p1, p2],
              locked: true,
              visible: true,
              selectable: true,
            })
          }
        }

        checkAndAddSegment(pointIdA, pointIdB)
        checkAndAddSegment(pointIdB, cId)
        checkAndAddSegment(cId, pointIdA)

        const polygon = {
          id: polygonId,
          label: `Tam giác ${type === 'vuong' ? 'vuông' : type === 'can' ? 'cân' : type === 'vuong_can' ? 'vuông cân' : 'đều'}`,
          entityType: 'polygon' as const,
          pointIds: allPointIds,
          createdByTool: 'specialTriangle' as const,
          dependsOn: [...allPointIds],
          locked: true,
          visible: true,
          selectable: true,
        }

        return {
          ...current,
          points: [...current.points, cPoint],
          segments: [...current.segments, ...addedSegments],
          polygons: [...current.polygons, polygon],
        }
      })

      setManualSelection({ kind: 'polygon', id: polygonId })
      return polygonId
    },
    [commitManualDocument, saveManualState],
  )

  const createSpecialQuadrilateral = useCallback(
    (type: 'binh_huanh' | 'chu_nhat' | 'thoi' | 'vuong', pointIds: string[]) => {
      saveManualState()
      const generatedPoints: ManualPoint[] = []
      const generatedSegments: ManualSegment[] = []
      let allPointIds = [...pointIds]

      if ((type === 'binh_huanh' || type === 'chu_nhat') && pointIds.length >= 3) {
        const [pA, pB, pC] = pointIds
        const pD = createEntityId('point')
        const cPoint: ManualPoint = {
          id: pD,
          label: nextPointLabel(manualDocument),
          entityType: 'point',
          pointKind: 'specialShapeVertex',
          shapeType: 'parallelogram_D',
          sourcePointIds: [pA, pB, pC],
          position: [0, 0, 0],
          createdByTool: 'specialQuadrilateral',
          dependsOn: [pA, pB, pC],
          locked: true,
          visible: true,
          selectable: true,
        }
        generatedPoints.push(cPoint)
        allPointIds.push(pD)
      } else if (type === 'thoi' && pointIds.length >= 2) {
        const [pA, pB] = pointIds
        const pC = createEntityId('point')
        const pD = createEntityId('point')

        const ptC: ManualPoint = {
          id: pC,
          label: nextPointLabel({ ...manualDocument, points: [...manualDocument.points, ...generatedPoints] }),
          entityType: 'point',
          pointKind: 'specialShapeVertex',
          shapeType: 'rhombus_C',
          sourcePointIds: [pA, pB],
          position: [0, 0, 0],
          createdByTool: 'specialQuadrilateral',
          dependsOn: [pA, pB],
          locked: true,
          visible: true,
          selectable: true,
        }
        generatedPoints.push(ptC)

        const ptD: ManualPoint = {
          id: pD,
          label: nextPointLabel({ ...manualDocument, points: [...manualDocument.points, ...generatedPoints] }),
          entityType: 'point',
          pointKind: 'specialShapeVertex',
          shapeType: 'rhombus_D',
          sourcePointIds: [pA, pB],
          position: [0, 0, 0],
          createdByTool: 'specialQuadrilateral',
          dependsOn: [pA, pB],
          locked: true,
          visible: true,
          selectable: true,
         }
        generatedPoints.push(ptD)

        allPointIds = [pA, pC, pB, pD]
      } else if (type === 'vuong' && pointIds.length >= 2) {
        const [pA, pB] = pointIds
        const pC = createEntityId('point')
        const pD = createEntityId('point')

        const ptC: ManualPoint = {
          id: pC,
          label: nextPointLabel({ ...manualDocument, points: [...manualDocument.points, ...generatedPoints] }),
          entityType: 'point',
          pointKind: 'specialShapeVertex',
          shapeType: 'square_C' as any,
          sourcePointIds: [pA, pB],
          position: [0, 0, 0],
          createdByTool: 'specialQuadrilateral',
          dependsOn: [pA, pB],
          locked: true,
          visible: true,
          selectable: true,
        }
        generatedPoints.push(ptC)

        const ptD: ManualPoint = {
          id: pD,
          label: nextPointLabel({ ...manualDocument, points: [...manualDocument.points, ...generatedPoints] }),
          entityType: 'point',
          pointKind: 'specialShapeVertex',
          shapeType: 'square_D' as any,
          sourcePointIds: [pA, pB],
          position: [0, 0, 0],
          createdByTool: 'specialQuadrilateral',
          dependsOn: [pA, pB],
          locked: true,
          visible: true,
          selectable: true,
         }
        generatedPoints.push(ptD)

        allPointIds = [pA, pC, pB, pD]
      }

      const sides = allPointIds.length
      for (let i = 0; i < sides; i++) {
        const startId = allPointIds[i]
        const endId = allPointIds[(i + 1) % sides]
        const existing = manualDocument.segments.find(
          (s) => (s.startPointId === startId && s.endPointId === endId)
            || (s.startPointId === endId && s.endPointId === startId)
        )
        if (!existing) {
          generatedSegments.push({
            id: createEntityId('segment'),
            label: '',
            entityType: 'segment',
            startPointId: startId,
            endPointId: endId,
            createdByTool: 'specialQuadrilateral',
            dependsOn: [startId, endId],
            locked: true,
            visible: true,
            selectable: true,
          })
        }
      }

      const polygonId = createEntityId('polygon')
      const polygon = {
        id: polygonId,
        label: `Tứ giác ${type === 'binh_huanh' ? 'bình hành' : type === 'thoi' ? 'thoi' : type === 'chu_nhat' ? 'chữ nhật' : 'vuông'}`,
        entityType: 'polygon' as const,
        pointIds: allPointIds,
        createdByTool: 'specialQuadrilateral' as const,
        dependsOn: [...allPointIds],
        locked: true,
        visible: true,
        selectable: true,
      }

      commitManualDocument((current) => ({
        ...current,
        points: [...current.points, ...generatedPoints],
        segments: [...current.segments, ...generatedSegments],
        polygons: [...current.polygons, polygon],
      }))
      setManualSelection({ kind: 'polygon', id: polygonId })
      return polygonId
    },
    [commitManualDocument, manualDocument, saveManualState],
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
    (basePolygonId: string, height: number, apexPointId?: string) => {
      if (height <= 0 && !apexPointId) return null
      saveManualState()

      const solidId = createEntityId('solid')
      let finalApexPointId = apexPointId
      let generatedPoints: ManualPoint[] = []

      if (apexPointId === 'auto_generate') {
        const apexId = createEntityId('point')
        finalApexPointId = apexId

        const poly = manualDocument.polygons.find((p) => p.id === basePolygonId)
        let targetPos: Vec3 = [0, 0, height > 0 ? height : 4]
        if (poly && poly.pointIds.length > 0) {
          const resolved = resolvePointPositions(manualDocument)
          const pts = poly.pointIds.map((pid) => resolved[pid] || [0, 0, 0])
          let cx = 0, cy = 0, cz = 0
          pts.forEach((pt) => {
            cx += pt[0]
            cy += pt[1]
            cz += pt[2]
          })
          const N = pts.length
          targetPos = [cx / N, cy / N, cz / N + (height > 0 ? height : 4)]
        }

        const ptS: ManualPoint = {
          id: apexId,
          label: 'S',
          entityType: 'point',
          pointKind: 'free',
          position: targetPos,
          createdByTool: 'pyramid',
          dependsOn: [],
          locked: false,
          visible: true,
          selectable: true,
        }
        generatedPoints.push(ptS)
      }

      const solid: ManualSolid = {
        id: solidId,
        label: `Chóp ${manualDocument.solids.length + 1}`,
        entityType: 'solid',
        solidType: 'pyramid',
        basePolygonId,
        height: height > 0 ? height : undefined,
        apexPointId: finalApexPointId,
        createdByTool: 'pyramid',
        dependsOn: [basePolygonId, ...(finalApexPointId ? [finalApexPointId] : [])],
        locked: false,
        visible: true,
        selectable: true,
      }

      commitManualDocument((current) => ({
        ...current,
        points: [...current.points, ...generatedPoints],
        solids: [...current.solids, solid],
      }))
      setManualSelection({ kind: 'solid', id: solidId })
      return solidId
    },
    [commitManualDocument, manualDocument, saveManualState],
  )

  const createPrism = useCallback(
    (basePolygonId: string, height: number, topPointId?: string) => {
      if (height <= 0 && !topPointId) return null
      saveManualState()

      const solidId = createEntityId('solid')
      let finalTopPointId = topPointId
      let generatedPoints: ManualPoint[] = []

      if (topPointId === 'auto_generate') {
        const topId = createEntityId('point')
        finalTopPointId = topId

        const poly = manualDocument.polygons.find((p) => p.id === basePolygonId)
        let targetPos: Vec3 = [0, 0, height > 0 ? height : 4]
        if (poly && poly.pointIds.length > 0) {
          const resolved = resolvePointPositions(manualDocument)
          const pts = poly.pointIds.map((pid) => resolved[pid] || [0, 0, 0])
          let cx = 0, cy = 0, cz = 0
          pts.forEach((pt) => {
            cx += pt[0]
            cy += pt[1]
            cz += pt[2]
          })
          const N = pts.length
          const firstPt = pts[0]
          targetPos = [firstPt[0], firstPt[1], firstPt[2] + (height > 0 ? height : 4)]
        }

        const baseFirstPtLabel = poly && poly.pointIds.length > 0
          ? manualDocument.points.find(p => p.id === poly.pointIds[0])?.label ?? 'A'
          : 'A'

        const ptS: ManualPoint = {
          id: topId,
          label: `${baseFirstPtLabel}'`,
          entityType: 'point',
          pointKind: 'free',
          position: targetPos,
          createdByTool: 'prism',
          dependsOn: [],
          locked: false,
          visible: true,
          selectable: true,
        }
        generatedPoints.push(ptS)
      }

      const solid: ManualSolid = {
        id: solidId,
        label: `Lăng trụ ${manualDocument.solids.length + 1}`,
        entityType: 'solid',
        solidType: 'prism',
        basePolygonId,
        height: height > 0 ? height : undefined,
        topPointId: finalTopPointId,
        createdByTool: 'prism',
        dependsOn: [basePolygonId, ...(finalTopPointId ? [finalTopPointId] : [])],
        locked: false,
        visible: true,
        selectable: true,
      }

      commitManualDocument((current) => ({
        ...current,
        points: [...current.points, ...generatedPoints],
        solids: [...current.solids, solid],
      }))
      setManualSelection({ kind: 'solid', id: solidId })
      return solidId
    },
    [commitManualDocument, manualDocument, saveManualState],
  )

  const createSphere = useCallback(
    (centerPointId: string, radius: number, radiusPointId?: string) => {
      if (radius <= 0) return null
      const solidId = createEntityId('solid')
      const solid: ManualSolid = {
        id: solidId,
        label: `Cầu ${manualDocument.solids.length + 1}`,
        entityType: 'solid',
        solidType: 'sphere',
        radius,
        centerPointId,
        radiusPointId,
        createdByTool: 'sphere',
        dependsOn: [centerPointId, ...(radiusPointId ? [radiusPointId] : [])],
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

  const createCone = useCallback(
    (centerPointId: string, radius: number, height: number, baseCircleId?: string) => {
      if (radius <= 0 || height <= 0) return null
      const solidId = createEntityId('solid')
      const solid: ManualSolid = {
        id: solidId,
        label: `Nón ${manualDocument.solids.length + 1}`,
        entityType: 'solid',
        solidType: 'cone',
        radius,
        height,
        centerPointId: baseCircleId ? undefined : centerPointId,
        baseCircleId,
        createdByTool: 'cone',
        dependsOn: baseCircleId ? [baseCircleId] : [centerPointId],
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

  const createCylinder = useCallback(
    (centerPointId: string, radius: number, height: number, baseCircleId?: string) => {
      if (radius <= 0 || height <= 0) return null
      const solidId = createEntityId('solid')
      const solid: ManualSolid = {
        id: solidId,
        label: `Trụ ${manualDocument.solids.length + 1}`,
        entityType: 'solid',
        solidType: 'cylinder',
        radius,
        height,
        centerPointId: baseCircleId ? undefined : centerPointId,
        baseCircleId,
        createdByTool: 'cylinder',
        dependsOn: baseCircleId ? [baseCircleId] : [centerPointId],
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
    (kind: 'point' | 'segment' | 'polygon' | 'solid' | 'circle', id: string, label: string) => {
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
        if (kind === 'solid') {
          return { ...current, solids: mapEntities(current.solids, id, (solid) => ({ ...solid, label: nextLabel })) }
        }
        return { ...current, circles: mapEntities(current.circles ?? [], id, (circle) => ({ ...circle, label: nextLabel })) }
      })
    },
    [commitManualDocument],
  )

  const toggleManualVisibility = useCallback(
    (kind: 'point' | 'segment' | 'polygon' | 'solid' | 'circle', id: string) => {
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
        if (kind === 'solid') {
          return { ...current, solids: mapEntities(current.solids, id, (solid) => ({ ...solid, visible: !solid.visible })) }
        }
        return { ...current, circles: mapEntities(current.circles ?? [], id, (circle) => ({ ...circle, visible: !circle.visible })) }
      })
    },
    [commitManualDocument],
  )

  const toggleManualLocked = useCallback(
    (kind: 'point' | 'segment' | 'polygon' | 'solid' | 'circle', id: string) => {
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
        if (kind === 'solid') {
          return { ...current, solids: mapEntities(current.solids, id, (solid) => ({ ...solid, locked: !solid.locked })) }
        }
        return { ...current, circles: mapEntities(current.circles ?? [], id, (circle) => ({ ...circle, locked: !circle.locked })) }
      })
    },
    [commitManualDocument],
  )

  const removeManualEntity = useCallback(
    (kind: 'point' | 'segment' | 'polygon' | 'solid' | 'circle', id: string) => {
      commitManualDocument((current) => {
        const next = removeEntityDependencies(current, kind, id)
        setTimeout(() => {
          setManualSelection((sel) => {
            if (!sel) return null
            if (sel.kind === 'point' && !next.points.some((p) => p.id === sel.id)) return null
            if (sel.kind === 'segment' && !next.segments.some((s) => s.id === sel.id)) return null
            if (sel.kind === 'polygon' && !next.polygons.some((p) => p.id === sel.id)) return null
            if (sel.kind === 'solid' && !next.solids.some((s) => s.id === sel.id)) return null
            if (sel.kind === 'circle' && !next.circles.some((c) => c.id === sel.id)) return null
            return sel
          })
        }, 0)
        return next
      })
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
      showSmartGuides,
      setShowSmartGuides,
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
      canUndo: undoStack.length > 0,
      canRedo: redoStack.length > 0,
      undoManual,
      redoManual,
      cancelManualDraft,
      createPointFromTarget,
      updatePointPosition,
      updateSegmentLength,
      updateCircleRadius,
      createSegment,
      createPolygon,
      createBox,
      createPyramid,
      createPrism,
      createSphere,
      createCone,
      createCylinder,
      saveManualState,
      createMidpoint,
      createIntersection,
      createProjection,
      createCentroid,
      createPerpendicularBisector,
      createAngleBisector,
      createParallelLine,
      createPerpendicularLine,
      createCircle,
      createRegularPolygon,
      createSpecialTriangle,
      createSpecialQuadrilateral,
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
      createSphere,
      createCone,
      createCylinder,
      createCircle,
      createRegularPolygon,
      createSpecialTriangle,
      createSpecialQuadrilateral,
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
      showSmartGuides,
      toggleManualLocked,
      toggleManualVisibility,
      undoManual,
      undoStack.length,
      updatePointPosition,
      updateSegmentLength,
      updateCircleRadius,
      validation,
      workspaceMode,
      saveManualState,
      createMidpoint,
      createIntersection,
      createProjection,
      createCentroid,
      createPerpendicularBisector,
      createAngleBisector,
      createParallelLine,
      createPerpendicularLine,
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
