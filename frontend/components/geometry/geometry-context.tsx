'use client'

import React, { createContext, useCallback, useContext, useMemo, useState, useRef, useEffect } from 'react'
import { toast } from 'sonner'
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
  centroid,
  getPolygonNormal,
  distance,
  crossVec3,
  resolveCircleProps,
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
  autoRevertToSelect: boolean
  setAutoRevertToSelect: (v: boolean) => void
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
  updatePointT: (pointId: string, t: number) => void
  updateSegmentLength: (segmentId: string, newLength: number) => void
  updateSolidHeight: (solidId: string, newHeight: number) => void
  updateCircleRadius: (circleId: string, newRadius: number) => void
  createCircleAngleDependentPoint: (sourcePointId: string, customAngleRad?: number) => void
  updatePointAngle: (pointId: string, angle: number) => void
  saveManualState: () => void
  createMidpoint: (pointIdA: string, pointIdB: string) => string | null
  createIntersection: (segmentIdA: string, segmentIdB: string) => string | null
  createProjection: (pointId: string, targetId: string, targetKind: 'segment' | 'polygon') => string | null
  createProjectionByPoints: (pointId: string, targetPointIds: string[]) => string | null
  createCentroid: (targetPolygonId?: string, sourcePointIds?: string[]) => string | null
  createPerpendicularBisector: (segmentId?: string, pointIdA?: string, pointIdB?: string) => string | null
  createAngleBisector: (pointIdA: string, pointIdB: string, pointIdC: string) => string | null
  createParallelLine: (pointId: string, segmentId: string) => string | null
  createPerpendicularLine: (pointId: string, segmentId: string) => string | null
  createSegment: (startPointId: string, endPointId: string) => string | null
  createPolygon: (pointIds: string[]) => string | null
  createBox: (cornerPointIds: string[], height: number) => string | null
  createCube: (pointIdA: string, pointIdB: string) => string | null
  createPyramid: (basePolygonId: string, height: number, apexPointId?: string) => string | null
  createRegularPyramid: (basePolygonId: string) => string | null
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
  addSphereRing: (solidId: string) => void
  removeSphereRing: (solidId: string, ringId: string) => void
  updateSphereRingOrientation: (solidId: string, ringId: string, phi: number, theta: number) => void
  createSphereAngleDependentPoint: (sourcePointId: string, customAngleRad?: number) => void
}

const isPointCoplanarWithPolygon = (pointId: string, polygonId: string, doc: ManualDocument) => {
  const poly = doc.polygons.find(p => p.id === polygonId)
  if (!poly || poly.pointIds.length < 3) return false
  const resolved = resolvePointPositions(doc)
  const p0 = resolved[poly.pointIds[0]]
  const p1 = resolved[poly.pointIds[1]]
  const p2 = resolved[poly.pointIds[2]]
  const target = resolved[pointId]
  if (!p0 || !p1 || !p2 || !target) return false

  const v1 = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]]
  const v2 = [p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]]
  const normal = [
    v1[1]*v2[2] - v1[2]*v2[1],
    v1[2]*v2[0] - v1[0]*v2[2],
    v1[0]*v2[1] - v1[1]*v2[0]
  ]
  const len = Math.hypot(normal[0], normal[1], normal[2])
  if (len < 1e-9) return false
  
  const n = [normal[0]/len, normal[1]/len, normal[2]/len]
  const vTarget = [target[0] - p0[0], target[1] - p0[1], target[2] - p0[2]]
  const dot = Math.abs(vTarget[0]*n[0] + vTarget[1]*n[1] + vTarget[2]*n[2])
  
  return dot < 1e-4
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

function deduplicateDocumentPoints(current: ManualDocument, next: ManualDocument): ManualDocument {
  const currentPointIds = new Set(current.points.map(p => p.id))
  const newPoints = next.points.filter(p => !currentPointIds.has(p.id))
  if (newPoints.length === 0) return next

  const resolved = resolvePointPositions(next)
  const replacements = new Map<string, string>()
  const pointsToRemove = new Set<string>()
  const upgrades = new Map<string, Partial<ManualPoint>>()

  for (const newPt of newPoints) {
    const newPos = resolved[newPt.id]
    if (!newPos) continue

    const match = next.points.find(p => {
      if (p.id === newPt.id) return false
      if (pointsToRemove.has(p.id)) return false
      
      const pPos = resolved[p.id]
      if (!pPos) return false

      const dist = Math.hypot(pPos[0] - newPos[0], pPos[1] - newPos[1], pPos[2] - newPos[2])
      return dist < 0.25
    })

    if (match) {
      replacements.set(newPt.id, match.id)
      pointsToRemove.add(newPt.id)

      const isMatchFree = match.pointKind === 'free' || !match.pointKind
      if (isMatchFree && newPt.pointKind && newPt.pointKind !== 'free') {
        upgrades.set(match.id, {
          pointKind: newPt.pointKind,
          shapeType: newPt.shapeType,
          sourcePointIds: newPt.sourcePointIds,
          sourceSegmentId: newPt.sourceSegmentId,
          sourceSegmentIds: newPt.sourceSegmentIds,
          sourcePointId: newPt.sourcePointId,
          targetSegmentId: newPt.targetSegmentId,
          targetPolygonId: newPt.targetPolygonId,
          t: newPt.t,
          dependsOn: newPt.dependsOn,
          locked: newPt.locked,
          segmentId: newPt.segmentId,
          sideIndex: newPt.sideIndex,
          totalSides: newPt.totalSides,
          anchorPointId: newPt.anchorPointId,
        })
      }
    }
  }

  if (replacements.size === 0) return next

  const replaceId = (id: string) => replacements.get(id) ?? id
  const replaceIds = (ids: string[]) => ids.map(replaceId)

  const result = cloneDocument(next)

  result.points = result.points.filter(p => !pointsToRemove.has(p.id))

  result.points = result.points.map(p => {
    const upgrade = upgrades.get(p.id)
    if (upgrade) {
      return {
        ...p,
        ...upgrade,
        sourcePointIds: upgrade.sourcePointIds ? replaceIds(upgrade.sourcePointIds) : undefined,
        sourceSegmentId: upgrade.sourceSegmentId ? replaceId(upgrade.sourceSegmentId) : undefined,
        sourceSegmentIds: upgrade.sourceSegmentIds ? [replaceId(upgrade.sourceSegmentIds[0]), replaceId(upgrade.sourceSegmentIds[1])] : undefined,
        sourcePointId: upgrade.sourcePointId ? replaceId(upgrade.sourcePointId) : undefined,
        targetSegmentId: upgrade.targetSegmentId ? replaceId(upgrade.targetSegmentId) : undefined,
        targetPolygonId: upgrade.targetPolygonId ? replaceId(upgrade.targetPolygonId) : undefined,
        dependsOn: upgrade.dependsOn ? replaceIds(upgrade.dependsOn) : undefined,
        segmentId: upgrade.segmentId ? replaceId(upgrade.segmentId) : undefined,
        anchorPointId: upgrade.anchorPointId ? replaceId(upgrade.anchorPointId) : undefined,
      } as ManualPoint
    }
    return p
  })

  result.points = result.points.map(p => {
    if (p.dependsOn) p.dependsOn = replaceIds(p.dependsOn)
    if (p.sourcePointIds) p.sourcePointIds = replaceIds(p.sourcePointIds)
    if (p.sourcePointId) p.sourcePointId = replaceId(p.sourcePointId)
    if (p.anchorPointId) p.anchorPointId = replaceId(p.anchorPointId)
    if (p.segmentId) p.segmentId = replaceId(p.segmentId)
    return p
  })

  result.segments = result.segments.map(s => {
    const oldStartId = s.startPointId
    const oldEndId = s.endPointId

    s.startPointId = replaceId(s.startPointId)
    s.endPointId = replaceId(s.endPointId)
    if (s.dependsOn) s.dependsOn = replaceIds(s.dependsOn)

    if (s.startPointId !== oldStartId || s.endPointId !== oldEndId) {
      const oldStartPt = next.points.find(p => p.id === oldStartId)
      const oldEndPt = next.points.find(p => p.id === oldEndId)
      const newStartPt = result.points.find(p => p.id === s.startPointId)
      const newEndPt = result.points.find(p => p.id === s.endPointId)

      if (oldStartPt && oldEndPt && newStartPt && newEndPt) {
        const oldDefault1 = `${oldStartPt.label}${oldEndPt.label}`
        const oldDefault2 = `${oldEndPt.label}${oldStartPt.label}`
        if (!s.label || s.label === oldDefault1 || s.label === oldDefault2) {
          s.label = `${newStartPt.label}${newEndPt.label}`
        }
      }
    }
    return s
  })

  result.polygons = result.polygons.map(poly => {
    poly.pointIds = replaceIds(poly.pointIds)
    if (poly.dependsOn) poly.dependsOn = replaceIds(poly.dependsOn)
    return poly
  })

  result.solids = result.solids.map(solid => {
    if (solid.cornerPointIds) {
      solid.cornerPointIds = solid.cornerPointIds.map(replaceId) as [string, string, string]
    }
    if (solid.centerPointId) solid.centerPointId = replaceId(solid.centerPointId)
    if (solid.apexPointId) solid.apexPointId = replaceId(solid.apexPointId)
    if (solid.topPointId) solid.topPointId = replaceId(solid.topPointId)
    if (solid.radiusPointId) solid.radiusPointId = replaceId(solid.radiusPointId)
    if (solid.dependsOn) solid.dependsOn = replaceIds(solid.dependsOn)
    return solid
  })

  result.circles = result.circles.map(circle => {
    if (circle.centerPointId) circle.centerPointId = replaceId(circle.centerPointId)
    if (circle.radiusPointId) circle.radiusPointId = replaceId(circle.radiusPointId)
    if (circle.sourcePointIds) circle.sourcePointIds = replaceIds(circle.sourcePointIds)
    if (circle.dependsOn) circle.dependsOn = replaceIds(circle.dependsOn)
    return circle
  })

  return result
}

function resolvePointPlacement(
  document: ManualDocument,
  target: ManualSnapTarget | null,
  fallback: Vec3,
): ManualPoint {
  if (target?.kind === 'solid' && target.solidId) {
    const solid = document.solids.find((s) => s.id === target.solidId)
    if (solid) {
      if (solid.solidType === 'cone') {
        const pointPositions = resolvePointPositions(document)
        let center: Vec3 = [0, 0, 0]
        let r = solid.radius ?? 3
        let normal: Vec3 = [0, 0, 1]
        
        if (solid.baseCircleId) {
          const circle = document.circles?.find((c) => c.id === solid.baseCircleId)
          if (circle) {
            const props = resolveCircleProps(circle, pointPositions)
            if (props) {
              center = props.center
              r = props.radius
              normal = props.normal
            }
          }
        } else if (solid.centerPointId) {
          const cPos = pointPositions[solid.centerPointId]
          if (cPos) center = cPos
        }
        
        let apex: Vec3 = addVec3(center, scaleVec3(normal, solid.height ?? 5))
        if (solid.apexPointId && pointPositions[solid.apexPointId]) {
          apex = pointPositions[solid.apexPointId]
        }
        
        const pos = target.position ?? fallback
        const axisVec = subVec3(apex, center)
        const axisLenSq = axisVec[0]*axisVec[0] + axisVec[1]*axisVec[1] + axisVec[2]*axisVec[2]
        const ptVec = subVec3(pos, center)
        const dot = ptVec[0]*axisVec[0] + ptVec[1]*axisVec[1] + ptVec[2]*axisVec[2]
        const rawRatio = axisLenSq > 1e-9 ? dot / axisLenSq : 0
        const ratio = Math.max(0, Math.min(1, rawRatio))
        
        const projOnAxis = addVec3(center, scaleVec3(axisVec, ratio))
        const radial = subVec3(pos, projOnAxis)
        
        let u: Vec3 = [1, 0, 0]
        if (Math.abs(normal[0]) > 0.9) u = [0, 1, 0]
        const w = crossVec3(normal, u)
        const w_len = Math.hypot(w[0], w[1], w[2])
        const w_norm = scaleVec3(w, w_len > 1e-9 ? 1 / w_len : 1)
        const u_new = crossVec3(w_norm, normal)
        const u_len = Math.hypot(u_new[0], u_new[1], u_new[2])
        const u_norm = scaleVec3(u_new, u_len > 1e-9 ? 1 / u_len : 1)
        
        const x = radial[0]*u_norm[0] + radial[1]*u_norm[1] + radial[2]*u_norm[2]
        const y = radial[0]*w_norm[0] + radial[1]*w_norm[1] + radial[2]*w_norm[2]
        const t = Math.atan2(y, x)
        
        return {
          id: createEntityId('point'),
          label: nextPointLabel(document),
          entityType: 'point',
          pointKind: 'conePoint',
          position: pos,
          solidId: solid.id,
          t,
          ratio,
          createdByTool: 'point',
          dependsOn: [solid.id],
          locked: false,
          visible: true,
          selectable: true,
        }
      }
      
      if (solid.solidType === 'cylinder') {
        const pointPositions = resolvePointPositions(document)
        let center: Vec3 = [0, 0, 0]
        let r = solid.radius ?? 3
        let normal: Vec3 = [0, 0, 1]
        
        if (solid.baseCircleId) {
          const circle = document.circles?.find((c) => c.id === solid.baseCircleId)
          if (circle) {
            const props = resolveCircleProps(circle, pointPositions)
            if (props) {
              center = props.center
              r = props.radius
              normal = props.normal
            }
          }
        } else if (solid.centerPointId) {
          const cPos = pointPositions[solid.centerPointId]
          if (cPos) center = cPos
        }
        
        const h = solid.height ?? 5
        const axisVec = scaleVec3(normal, h)
        const axisLenSq = axisVec[0]*axisVec[0] + axisVec[1]*axisVec[1] + axisVec[2]*axisVec[2]
        
        const pos = target.position ?? fallback
        const ptVec = subVec3(pos, center)
        const dot = ptVec[0]*axisVec[0] + ptVec[1]*axisVec[1] + ptVec[2]*axisVec[2]
        const rawRatio = axisLenSq > 1e-9 ? dot / axisLenSq : 0
        const ratio = Math.max(0, Math.min(1, rawRatio))
        
        const projOnAxis = addVec3(center, scaleVec3(axisVec, ratio))
        const radial = subVec3(pos, projOnAxis)
        
        let u: Vec3 = [1, 0, 0]
        if (Math.abs(normal[0]) > 0.9) u = [0, 1, 0]
        const w = crossVec3(normal, u)
        const w_len = Math.hypot(w[0], w[1], w[2])
        const w_norm = scaleVec3(w, w_len > 1e-9 ? 1 / w_len : 1)
        const u_new = crossVec3(w_norm, normal)
        const u_len = Math.hypot(u_new[0], u_new[1], u_new[2])
        const u_norm = scaleVec3(u_new, u_len > 1e-9 ? 1 / u_len : 1)
        
        const x = radial[0]*u_norm[0] + radial[1]*u_norm[1] + radial[2]*u_norm[2]
        const y = radial[0]*w_norm[0] + radial[1]*w_norm[1] + radial[2]*w_norm[2]
        const t = Math.atan2(y, x)
        
        return {
          id: createEntityId('point'),
          label: nextPointLabel(document),
          entityType: 'point',
          pointKind: 'cylinderPoint',
          position: pos,
          solidId: solid.id,
          t,
          ratio,
          createdByTool: 'point',
          dependsOn: [solid.id],
          locked: false,
          visible: true,
          selectable: true,
        }
      }
    }
  }

  if (target?.kind === 'solid' && target.facePointIds && target.facePointIds.length >= 3) {
    const pointPositions = resolvePointPositions(document)
    const v0 = pointPositions[target.facePointIds[0]]
    const v1 = pointPositions[target.facePointIds[1]]
    const v2 = pointPositions[target.facePointIds[2]]
    
    if (v0 && v1 && v2) {
      const pos = target.position ?? fallback
      const e1 = subVec3(v1, v0)
      const e2 = subVec3(v2, v0)
      
      const normal = crossVec3(e1, e2)
      const normal_len = Math.hypot(normal[0], normal[1], normal[2])
      const normal_norm = scaleVec3(normal, normal_len > 1e-9 ? 1 / normal_len : 1)
      
      const u_len = Math.hypot(e1[0], e1[1], e1[2])
      const u_norm = scaleVec3(e1, u_len > 1e-9 ? 1 / u_len : 1)
      
      const w_norm = crossVec3(normal_norm, u_norm)
      
      const ptVec = subVec3(pos, v0)
      const uVal = ptVec[0]*u_norm[0] + ptVec[1]*u_norm[1] + ptVec[2]*u_norm[2]
      const vVal = ptVec[0]*w_norm[0] + ptVec[1]*w_norm[1] + ptVec[2]*w_norm[2]
      
      return {
        id: createEntityId('point'),
        label: nextPointLabel(document),
        entityType: 'point',
        pointKind: 'facePoint',
        position: pos,
        sourcePointIds: [target.facePointIds[0], target.facePointIds[1], target.facePointIds[2]],
        u: uVal,
        v: vVal,
        createdByTool: 'point',
        dependsOn: [target.facePointIds[0], target.facePointIds[1], target.facePointIds[2]],
        locked: false,
        visible: true,
        selectable: true,
      }
    }
  }

  if (target?.kind === 'sphere' && target.solidId) {
    return {
      id: createEntityId('point'),
      label: nextPointLabel(document),
      entityType: 'point',
      pointKind: 'spherePoint',
      position: target.position ?? fallback,
      solidId: target.solidId,
      createdByTool: 'point',
      dependsOn: [target.solidId],
      locked: false,
      visible: true,
      selectable: true,
    }
  }

  if (target?.kind === 'circle' && target.circleId) {
    const circle = document.circles.find((c) => c.id === target.circleId)
    if (circle) {
      let initialT = 0
      const pointPositions = resolvePointPositions(document)
      const props = resolveCircleProps(circle, pointPositions)
      if (props) {
        const { center, normal } = props
        const pos = target.position ?? fallback
        const vx = pos[0] - center[0]
        const vy = pos[1] - center[1]
        const vz = pos[2] - center[2]
        
        let u: Vec3 = [1, 0, 0]
        if (Math.abs(normal[0]) > 0.9) u = [0, 1, 0]
        const w = crossVec3(normal, u)
        const w_len = Math.hypot(w[0], w[1], w[2])
        const w_norm = scaleVec3(w, w_len > 1e-9 ? 1 / w_len : 1)
        const u_new = crossVec3(w_norm, normal)
        const u_len = Math.hypot(u_new[0], u_new[1], u_new[2])
        const u_norm = scaleVec3(u_new, u_len > 1e-9 ? 1 / u_len : 1)
        
        const x = vx * u_norm[0] + vy * u_norm[1] + vz * u_norm[2]
        const y = vx * w_norm[0] + vy * w_norm[1] + vz * w_norm[2]
        initialT = Math.atan2(y, x)
      }
      return {
        id: createEntityId('point'),
        label: nextPointLabel(document),
        entityType: 'point',
        pointKind: 'circlePoint',
        position: target.position ?? fallback,
        circleId: target.circleId,
        t: initialT,
        createdByTool: 'point',
        dependsOn: [target.circleId],
        locked: false,
        visible: true,
        selectable: true,
      }
    } else {
      // Find sphere solid containing this ring
      const solid = document.solids.find(s => s.solidType === 'sphere' && s.sphereRings?.some(r => r.id === target.circleId))
      if (solid) {
        let initialT = 0
        const ring = solid.sphereRings?.find(r => r.id === target.circleId)
        if (ring) {
          const pointPositions = resolvePointPositions(document)
          const center = pointPositions[solid.centerPointId!]
          if (center) {
            const phi = ring.phi
            const theta = ring.theta
            const pos = target.position ?? fallback
            const vx = pos[0] - center[0]
            const vy = pos[1] - center[1]
            const vz = pos[2] - center[2]
            
            const u_norm: Vec3 = [
              -Math.sin(theta),
              Math.cos(theta),
              0
            ]
            const w_norm: Vec3 = [
              -Math.sin(phi) * Math.cos(theta),
              -Math.sin(phi) * Math.sin(theta),
              Math.cos(phi)
            ]
            
            const x = vx * u_norm[0] + vy * u_norm[1] + vz * u_norm[2]
            const y = vx * w_norm[0] + vy * w_norm[1] + vz * w_norm[2]
            initialT = Math.atan2(y, x)
          }
        }
        return {
          id: createEntityId('point'),
          label: nextPointLabel(document),
          entityType: 'point',
          pointKind: 'sphereRingPoint',
          position: target.position ?? fallback,
          solidId: solid.id,
          circleId: target.circleId,
          t: initialT,
          createdByTool: 'point',
          dependsOn: [solid.id],
          locked: false,
          visible: true,
          selectable: true,
        }
      }
    }
  }

  if ((target?.kind === 'segment' || target?.kind === 'midpoint') && target.segmentId) {
    return {
      id: createEntityId('point'),
      label: nextPointLabel(document),
      entityType: 'point',
      pointKind: 'segment',
      position: target.position ?? fallback,
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
  const [activeToolState, setActiveToolState] = useState<ManualTool>('select')
  const activeTool = activeToolState
  const [autoRevertToSelect, setAutoRevertToSelect] = useState(true)
  const [draftOperation, setDraftOperation] = useState<ManualDraft | null>(null)
  
  const setActiveTool = useCallback((tool: ManualTool) => {
    setActiveToolState(tool)
    if (tool === 'select') {
      setManualSelection(null)
      setDraftOperation(null)
    }
  }, [setManualSelection, setDraftOperation])

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

        const resolvedBefore = resolvePointPositions(current)
        const resolvedAfter = resolvePointPositions(next)
        let finalPoints = [...next.points]
        let hasShift = false

        next.solids.forEach((solid) => {
          if ((solid.solidType === 'cone' || solid.solidType === 'cylinder') && solid.baseCircleId && solid.apexPointId) {
            const circle = next.circles.find(c => c.id === solid.baseCircleId)
            if (circle) {
              const propsBefore = resolveCircleProps(circle, resolvedBefore)
              const propsAfter = resolveCircleProps(circle, resolvedAfter)
              if (propsBefore && propsAfter) {
                const shiftX = propsAfter.center[0] - propsBefore.center[0]
                const shiftY = propsAfter.center[1] - propsBefore.center[1]
                const shiftZ = propsAfter.center[2] - propsBefore.center[2]
                
                if (Math.hypot(shiftX, shiftY, shiftZ) > 1e-6) {
                  const apexIdx = finalPoints.findIndex(p => p.id === solid.apexPointId)
                  if (apexIdx !== -1) {
                    const apexPt = finalPoints[apexIdx]
                    if (apexPt.pointKind === 'free') {
                      hasShift = true
                      finalPoints[apexIdx] = {
                        ...apexPt,
                        position: [
                          apexPt.position[0] + shiftX,
                          apexPt.position[1] + shiftY,
                          apexPt.position[2] + shiftZ
                        ]
                      }
                    }
                  }
                }
              }
            }
          }
        })

        const finalDoc = hasShift ? { ...next, points: finalPoints } : next
        const deduplicated = deduplicateDocumentPoints(current, finalDoc)
        if (!isTransient) {
          setTimeout(() => {
            setUndoStack((stack) => [...stack, cloneDocument(current)].slice(-60))
            setRedoStack([])
          }, 0)
        }
        return cloneDocument(deduplicated)
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

      const createdPointId = createEntityId('point')
      commitManualDocument((current) => {
        const createdPoint = resolvePointPlacement(current, target, fallback)
        createdPoint.id = createdPointId
        return {
          ...current,
          points: [...current.points, createdPoint],
        }
      })
      setManualSelection({ kind: 'point', id: createdPointId })
      return createdPointId
    },
    [commitManualDocument],
  )

  const updatePointPosition = useCallback(
    (pointId: string, position: Vec3, target?: ManualSnapTarget | null) => {
      commitManualDocument((current) => {
        const point = current.points.find((candidate) => candidate.id === pointId)
        if (!point || point.locked) return current

        const linkedTopSolid = current.solids.find((s) => 
          (s.solidType === 'prism' && s.topPointId === pointId) ||
          ((s.solidType === 'pyramid' || s.solidType === 'regularPyramid' || s.solidType === 'cone' || s.solidType === 'cylinder') && s.apexPointId === pointId)
        )
        if (linkedTopSolid) {
          const resolved = resolvePointPositions(current)
          const oldResolved = resolved[pointId]
          if (oldResolved) {
             const deltaZ = position[2] - oldResolved[2]
             const nextPos: Vec3 = [oldResolved[0], oldResolved[1], oldResolved[2] + deltaZ]
             
             let center: Vec3 = [0, 0, 0]
             let normal: Vec3 = [0, 0, 1]
             if (linkedTopSolid.solidType === 'cone' || linkedTopSolid.solidType === 'cylinder') {
               if (linkedTopSolid.baseCircleId) {
                 const circle = current.circles?.find((c) => c.id === linkedTopSolid.baseCircleId)
                 if (circle) {
                   const props = resolveCircleProps(circle, resolved)
                   if (props) {
                     center = props.center
                     normal = props.normal
                   }
                 }
               } else if (linkedTopSolid.centerPointId) {
                 const cPos = resolved[linkedTopSolid.centerPointId]
                 if (cPos) center = cPos
               }
             } else {
               if (linkedTopSolid.basePolygonId) {
                 const basePolygon = current.polygons.find((p) => p.id === linkedTopSolid.basePolygonId)
                 if (basePolygon) {
                   const basePoints = basePolygon.pointIds.map((id) => resolved[id]).filter(Boolean) as Vec3[]
                   if (basePoints.length > 0) {
                     center = centroid(basePoints)
                     normal = getPolygonNormal(basePoints)
                   }
                 }
               }
             }
             
             const nextHeight = Math.max(0.1, dotVec3(subVec3(nextPos, center), normal))

             return {
                ...current,
                points: mapEntities(current.points, pointId, (candidate) => ({
                   ...candidate,
                   position: nextPos
                })),
                solids: current.solids.map((s) => s.id === linkedTopSolid.id ? { ...s, height: nextHeight } : s)
             }
          }
        }

        // Handle dragging point on sphere surface
        if (point.pointKind === 'spherePoint' && point.solidId) {
          const solid = current.solids.find((s) => s.id === point.solidId)
          if (solid && solid.solidType === 'sphere' && solid.centerPointId && solid.radius) {
            const resolved = resolvePointPositions(current)
            const center = resolved[solid.centerPointId]
            if (center) {
              const dx = position[0] - center[0]
              const dy = position[1] - center[1]
              const dz = position[2] - center[2]
              const dist = Math.hypot(dx, dy, dz)
              if (dist > 1e-9) {
                const ratio = solid.radius / dist
                const nextPos: Vec3 = [
                  center[0] + dx * ratio,
                  center[1] + dy * ratio,
                  center[2] + dz * ratio,
                ]
                return {
                  ...current,
                  points: mapEntities(current.points, pointId, (candidate) => ({
                     ...candidate,
                     position: nextPos
                  }))
                }
              }
            }
          }
        }

        // Handle dragging point on cone surface
        if (point.pointKind === 'conePoint' && point.solidId) {
          const solid = current.solids.find((s) => s.id === point.solidId)
          if (solid && solid.solidType === 'cone') {
            const resolved = resolvePointPositions(current)
            let center: Vec3 = [0, 0, 0]
            let normal: Vec3 = [0, 0, 1]
            
            if (solid.baseCircleId) {
              const circle = current.circles?.find((c) => c.id === solid.baseCircleId)
              if (circle) {
                const props = resolveCircleProps(circle, resolved)
                if (props) {
                  center = props.center
                  normal = props.normal
                }
              }
            } else if (solid.centerPointId) {
              const cPos = resolved[solid.centerPointId]
              if (cPos) center = cPos
            }
            
            let apex: Vec3 = addVec3(center, scaleVec3(normal, solid.height ?? 5))
            if (solid.apexPointId && resolved[solid.apexPointId]) {
              apex = resolved[solid.apexPointId]
            }
            
            const axisVec = subVec3(apex, center)
            const axisLenSq = axisVec[0]*axisVec[0] + axisVec[1]*axisVec[1] + axisVec[2]*axisVec[2]
            const ptVec = subVec3(position, center)
            const dot = ptVec[0]*axisVec[0] + ptVec[1]*axisVec[1] + ptVec[2]*axisVec[2]
            const rawRatio = axisLenSq > 1e-9 ? dot / axisLenSq : 0
            const nextRatio = Math.max(0, Math.min(1, rawRatio))
            
            const projOnAxis = addVec3(center, scaleVec3(axisVec, nextRatio))
            const radial = subVec3(position, projOnAxis)
            
            let u: Vec3 = [1, 0, 0]
            if (Math.abs(normal[0]) > 0.9) u = [0, 1, 0]
            const w = crossVec3(normal, u)
            const w_len = Math.hypot(w[0], w[1], w[2])
            const w_norm = scaleVec3(w, w_len > 1e-9 ? 1 / w_len : 1)
            const u_new = crossVec3(w_norm, normal)
            const u_len = Math.hypot(u_new[0], u_new[1], u_new[2])
            const u_norm = scaleVec3(u_new, u_len > 1e-9 ? 1 / u_len : 1)
            
            const x = radial[0]*u_norm[0] + radial[1]*u_norm[1] + radial[2]*u_norm[2]
            const y = radial[0]*w_norm[0] + radial[1]*w_norm[1] + radial[2]*w_norm[2]
            const nextT = Math.atan2(y, x)
            
            return {
              ...current,
              points: mapEntities(current.points, pointId, (candidate) => ({
                ...candidate,
                t: nextT,
                ratio: nextRatio,
              })),
            }
          }
        }
        
        // Handle dragging point on cylinder surface
        if (point.pointKind === 'cylinderPoint' && point.solidId) {
          const solid = current.solids.find((s) => s.id === point.solidId)
          if (solid && solid.solidType === 'cylinder') {
            const resolved = resolvePointPositions(current)
            let center: Vec3 = [0, 0, 0]
            let normal: Vec3 = [0, 0, 1]
            
            if (solid.baseCircleId) {
              const circle = current.circles?.find((c) => c.id === solid.baseCircleId)
              if (circle) {
                const props = resolveCircleProps(circle, resolved)
                if (props) {
                  center = props.center
                  normal = props.normal
                }
              }
            } else if (solid.centerPointId) {
              const cPos = resolved[solid.centerPointId]
              if (cPos) center = cPos
            }
            
            const h = solid.height ?? 5
            const axisVec = scaleVec3(normal, h)
            const axisLenSq = axisVec[0]*axisVec[0] + axisVec[1]*axisVec[1] + axisVec[2]*axisVec[2]
            
            const ptVec = subVec3(position, center)
            const dot = ptVec[0]*axisVec[0] + ptVec[1]*axisVec[1] + ptVec[2]*axisVec[2]
            const rawRatio = axisLenSq > 1e-9 ? dot / axisLenSq : 0
            const nextRatio = Math.max(0, Math.min(1, rawRatio))
            
            const projOnAxis = addVec3(center, scaleVec3(axisVec, nextRatio))
            const radial = subVec3(position, projOnAxis)
            
            let u: Vec3 = [1, 0, 0]
            if (Math.abs(normal[0]) > 0.9) u = [0, 1, 0]
            const w = crossVec3(normal, u)
            const w_len = Math.hypot(w[0], w[1], w[2])
            const w_norm = scaleVec3(w, w_len > 1e-9 ? 1 / w_len : 1)
            const u_new = crossVec3(w_norm, normal)
            const u_len = Math.hypot(u_new[0], u_new[1], u_new[2])
            const u_norm = scaleVec3(u_new, u_len > 1e-9 ? 1 / u_len : 1)
            
            const x = radial[0]*u_norm[0] + radial[1]*u_norm[1] + radial[2]*u_norm[2]
            const y = radial[0]*w_norm[0] + radial[1]*w_norm[1] + radial[2]*w_norm[2]
            const nextT = Math.atan2(y, x)
            
            return {
              ...current,
              points: mapEntities(current.points, pointId, (candidate) => ({
                ...candidate,
                t: nextT,
                ratio: nextRatio,
              })),
            }
          }
        }

        // Handle dragging point on polygon face
        if (point.pointKind === 'facePoint' && point.sourcePointIds && point.sourcePointIds.length >= 3) {
          const resolved = resolvePointPositions(current)
          const v0 = resolved[point.sourcePointIds[0]]
          const v1 = resolved[point.sourcePointIds[1]]
          const v2 = resolved[point.sourcePointIds[2]]
          
          if (v0 && v1 && v2) {
            const e1 = subVec3(v1, v0)
            const e2 = subVec3(v2, v0)
            
            const normal = crossVec3(e1, e2)
            const normal_len = Math.hypot(normal[0], normal[1], normal[2])
            const normal_norm = scaleVec3(normal, normal_len > 1e-9 ? 1 / normal_len : 1)
            
            const u_len = Math.hypot(e1[0], e1[1], e1[2])
            const u_norm = scaleVec3(e1, u_len > 1e-9 ? 1 / u_len : 1)
            
            const w_norm = crossVec3(normal_norm, u_norm)
            
            const ptVec = subVec3(position, v0)
            const nextU = ptVec[0]*u_norm[0] + ptVec[1]*u_norm[1] + ptVec[2]*u_norm[2]
            const nextV = ptVec[0]*w_norm[0] + ptVec[1]*w_norm[1] + ptVec[2]*w_norm[2]
            
            return {
              ...current,
              points: mapEntities(current.points, pointId, (candidate) => ({
                ...candidate,
                u: nextU,
                v: nextV,
              })),
            }
          }
        }

        // Handle dragging point on circle
        if (point.pointKind === 'circlePoint' && point.circleId) {
          const circle = current.circles.find((c) => c.id === point.circleId)
          if (circle) {
            const resolved = resolvePointPositions(current)
            const props = resolveCircleProps(circle, resolved)
            if (props) {
              const { center, normal } = props
              const vx = position[0] - center[0]
              const vy = position[1] - center[1]
              const vz = position[2] - center[2]
              
              let u: Vec3 = [1, 0, 0]
              if (Math.abs(normal[0]) > 0.9) u = [0, 1, 0]
              const w = crossVec3(normal, u)
              const w_len = Math.hypot(w[0], w[1], w[2])
              const w_norm = scaleVec3(w, w_len > 1e-9 ? 1 / w_len : 1)
              const u_new = crossVec3(w_norm, normal)
              const u_len = Math.hypot(u_new[0], u_new[1], u_new[2])
              const u_norm = scaleVec3(u_new, u_len > 1e-9 ? 1 / u_len : 1)
              
              const x = vx * u_norm[0] + vy * u_norm[1] + vz * u_norm[2]
              const y = vx * w_norm[0] + vy * w_norm[1] + vz * w_norm[2]
              const nextT = Math.atan2(y, x)
              
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

        // Handle dragging circle angle dependent point
        if (point.pointKind === 'circleAngleDependent' && point.circleId && point.sourcePointId) {
          const circle = current.circles.find((c) => c.id === point.circleId)
          if (circle) {
            const resolved = resolvePointPositions(current)
            const posB = resolved[point.sourcePointId]
            const props = resolveCircleProps(circle, resolved)
            if (props && posB) {
              const { center, normal } = props
              
              let u: Vec3 = [1, 0, 0]
              if (Math.abs(normal[0]) > 0.9) u = [0, 1, 0]
              const w = crossVec3(normal, u)
              const w_len = Math.hypot(w[0], w[1], w[2])
              const w_norm = scaleVec3(w, w_len > 1e-9 ? 1 / w_len : 1)
              const u_new = crossVec3(w_norm, normal)
              const u_len = Math.hypot(u_new[0], u_new[1], u_new[2])
              const u_norm = scaleVec3(u_new, u_len > 1e-9 ? 1 / u_len : 1)
              
              const vxB = posB[0] - center[0]
              const vyB = posB[1] - center[1]
              const vzB = posB[2] - center[2]
              const xB = vxB * u_norm[0] + vyB * u_norm[1] + vzB * u_norm[2]
              const yB = vxB * w_norm[0] + vyB * w_norm[1] + vzB * w_norm[2]
              const tB = Math.atan2(yB, xB)
              
              const vxC = position[0] - center[0]
              const vyC = position[1] - center[1]
              const vzC = position[2] - center[2]
              const xC = vxC * u_norm[0] + vyC * u_norm[1] + vzC * u_norm[2]
              const yC = vxC * w_norm[0] + vyC * w_norm[1] + vzC * w_norm[2]
              const tC = Math.atan2(yC, xC)
              
              let nextAlpha = tC - tB
              while (nextAlpha < -Math.PI) nextAlpha += 2 * Math.PI
              while (nextAlpha > Math.PI) nextAlpha -= 2 * Math.PI
              
              return {
                ...current,
                points: mapEntities(current.points, pointId, (candidate) => ({
                  ...candidate,
                  angleOffset: nextAlpha,
                })),
              }
            }
          }
        }

        // Handle dragging sphere ring point
        if (point.pointKind === 'sphereRingPoint' && point.solidId && point.circleId) {
          const solid = current.solids.find((s) => s.id === point.solidId)
          if (solid && solid.solidType === 'sphere' && solid.centerPointId && solid.radius) {
            const resolved = resolvePointPositions(current)
            const ring = solid.sphereRings?.find((r) => r.id === point.circleId)
            const center = resolved[solid.centerPointId]
            if (center && ring) {
              const phi = ring.phi
              const theta = ring.theta
              const vx = position[0] - center[0]
              const vy = position[1] - center[1]
              const vz = position[2] - center[2]
              
              const u_norm: Vec3 = [
                -Math.sin(theta),
                Math.cos(theta),
                0
              ]
              const w_norm: Vec3 = [
                -Math.sin(phi) * Math.cos(theta),
                -Math.sin(phi) * Math.sin(theta),
                Math.cos(phi)
              ]
              
              const x = vx * u_norm[0] + vy * u_norm[1] + vz * u_norm[2]
              const y = vx * w_norm[0] + vy * w_norm[1] + vz * w_norm[2]
              const nextT = Math.atan2(y, x)
              
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

        // Handle dragging sphere angle dependent point
        if (point.pointKind === 'sphereAngleDependent' && point.solidId && point.circleId && point.sourcePointId) {
          const solid = current.solids.find((s) => s.id === point.solidId)
          if (solid && solid.solidType === 'sphere' && solid.centerPointId && solid.radius) {
            const resolved = resolvePointPositions(current)
            const posB = resolved[point.sourcePointId]
            const ring = solid.sphereRings?.find((r) => r.id === point.circleId)
            const center = resolved[solid.centerPointId]
            if (center && ring && posB) {
              const phi = ring.phi
              const theta = ring.theta
              
              const u_norm: Vec3 = [
                -Math.sin(theta),
                Math.cos(theta),
                0
              ]
              const w_norm: Vec3 = [
                -Math.sin(phi) * Math.cos(theta),
                -Math.sin(phi) * Math.sin(theta),
                Math.cos(phi)
              ]
              
              const vxB = posB[0] - center[0]
              const vyB = posB[1] - center[1]
              const vzB = posB[2] - center[2]
              const xB = vxB * u_norm[0] + vyB * u_norm[1] + vzB * u_norm[2]
              const yB = vxB * w_norm[0] + vyB * w_norm[1] + vzB * w_norm[2]
              const tB = Math.atan2(yB, xB)
              
              const vxC = position[0] - center[0]
              const vyC = position[1] - center[1]
              const vzC = position[2] - center[2]
              const xC = vxC * u_norm[0] + vyC * u_norm[1] + vzC * u_norm[2]
              const yC = vxC * w_norm[0] + vyC * w_norm[1] + vzC * w_norm[2]
              const tC = Math.atan2(yC, xC)
              
              let nextAlpha = tC - tB
              while (nextAlpha < -Math.PI) nextAlpha += 2 * Math.PI
              while (nextAlpha > Math.PI) nextAlpha -= 2 * Math.PI
              
              return {
                ...current,
                points: mapEntities(current.points, pointId, (candidate) => ({
                  ...candidate,
                  angle: nextAlpha,
                })),
              }
            }
          }
        }

        // Handle dragging solid vertices
        if (point.pointKind === 'solidVertex' && point.solidId) {
          const solid = current.solids.find((s) => s.id === point.solidId)
          if (solid) {
            if (solid.solidType === 'cube' && solid.cornerPointIds) {
              const index = point.vertexIndex ?? 0
              if (index < 4) return current

              const p1Id = solid.cornerPointIds[0]
              const p2Id = solid.cornerPointIds[1]
              const p1 = current.points.find((p) => p.id === p1Id)
              const p2 = current.points.find((p) => p.id === p2Id)
              if (!p1 || !p2) return current

              const resolved = resolvePointPositions(current)
              const oldResolved = resolved[pointId]
              if (oldResolved) {
                const baseA = resolved[p1Id]
                if (!baseA) return current
                const oldHeight = Math.hypot(p2.position[0] - p1.position[0], p2.position[1] - p1.position[1], p2.position[2] - p1.position[2])
                const deltaZ = position[2] - oldResolved[2]
                const newHeight = Math.max(0.1, oldHeight + deltaZ)
                const scale = oldHeight > 1e-9 ? newHeight / oldHeight : 1

                return {
                  ...current,
                  points: current.points.map((p) => {
                    if (p.id === p2Id) {
                      return {
                        ...p,
                        position: [
                          p1.position[0] + (p2.position[0] - p1.position[0]) * scale,
                          p1.position[1] + (p2.position[1] - p1.position[1]) * scale,
                          p1.position[2] + (p2.position[2] - p1.position[2]) * scale,
                        ],
                      }
                    }
                    return p
                  }),
                }
              }
              return current
            }
            if (solid.solidType === 'box' && solid.cornerPointIds) {
              const index = point.vertexIndex ?? 0
              if (index < 4) return current
              
              const resolved = resolvePointPositions(current)
              const oldResolved = resolved[pointId]
              if (oldResolved) {
                const deltaZ = position[2] - oldResolved[2]
                const newHeight = Math.max(0.1, (solid.height ?? 4) + deltaZ)
                return {
                  ...current,
                  solids: current.solids.map((s) => (s.id === solid.id ? { ...s, height: newHeight } : s)),
                }
              }
              return current
            } else if (solid.solidType === 'regularPyramid') {
               const resolved = resolvePointPositions(current)
               const basePolygon = current.polygons.find((p) => p.id === solid.basePolygonId)
               if (basePolygon && point.vertexIndex === 0) {
                 const basePoints = basePolygon.pointIds.map((id) => resolved[id]).filter(Boolean) as Vec3[]
                 const c = centroid(basePoints)
                 const normal = getPolygonNormal(basePoints)
                 // Project position onto the normal passing through centroid
                 const v = subVec3(position, c)
                 const nextHeight = Math.max(0.1, dotVec3(v, normal))
                  return {
                     ...current,
                     solids: current.solids.map((s) => s.id === solid.id ? { ...s, height: nextHeight } : s)
                  }
                }
             } else if (solid.solidType === 'prism') {
               const resolved = resolvePointPositions(current)
               const oldResolved = resolved[pointId]
               if (oldResolved) {
                  if (solid.topPointId) {
                     const deltaZ = position[2] - oldResolved[2]
                     const oldTopPoint = resolved[solid.topPointId]
                     if (oldTopPoint) {
                        const nextPos: Vec3 = [oldTopPoint[0], oldTopPoint[1], oldTopPoint[2] + deltaZ]
                        return {
                           ...current,
                           points: current.points.map(p => p.id === solid.topPointId ? { ...p, position: nextPos } : p)
                        }
                     }
                  } else {
                     const deltaZ = position[2] - oldResolved[2]
                     const newHeight = Math.max(0.1, (solid.height ?? 4) + deltaZ)
                     return {
                       ...current,
                       solids: current.solids.map((s) => (s.id === solid.id ? { ...s, height: newHeight } : s)),
                     }
                  }
               }
             }
          }
        }

        if (point.pointKind === 'segment' && point.segmentId) {
          const segment = current.segments.find(
            (candidate) => candidate.id === point.segmentId,
          )
          if (!segment) return null
          const resolved = resolvePointPositions(current)
          const start = resolved[segment.startPointId]
          const end = resolved[segment.endPointId]
          if (!start || !end) return null
          const v = subVec3(end, start)
          const lengthSquared = v[0] * v[0] + v[1] * v[1] + v[2] * v[2]
          const nextT =
            target?.kind === 'segment' && target.segmentId === point.segmentId
              ? target.t ?? point.t ?? 0.5
              : lengthSquared === 0
                ? point.t ?? 0.5
                : Math.min(
                    1,
                    Math.max(
                      0,
                      ((position[0] - start[0]) * v[0] + (position[1] - start[1]) * v[1] + (position[2] - start[2]) * v[2]) /
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

        if (point.pointKind === 'specialShapeVertex') {
          if (point.shapeType === 'rectangle_C' && point.sourcePointIds) {
            const resolved = resolvePointPositions(current)
            const posA = resolved[point.sourcePointIds[0]]
            const posB = resolved[point.sourcePointIds[1]]
            if (posA && posB) {
              const E = subVec3(posB, posA)
              const D_vec: Vec3 = [-E[1], E[0], 0]
              const lenD = Math.hypot(D_vec[0], D_vec[1])
              const D_norm = lenD > 1e-9 ? scaleVec3(D_vec, 1 / lenD) : ([0, 1, 0] as Vec3)
              const proj = subVec3(position, posB)
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

          if (point.shapeType === 'parallelogram_D' && point.sourcePointIds) {
            const resolved = resolvePointPositions(current)
            const posA = resolved[point.sourcePointIds[0]]
            const posB = resolved[point.sourcePointIds[1]]
            const posCId = point.sourcePointIds[2]
            const posCPoint = current.points.find((p) => p.id === posCId)
            if (posA && posB && posCPoint) {
              if (posCPoint.shapeType === 'rectangle_C') {
                const C_ideal_x = position[0] + posB[0] - posA[0]
                const C_ideal_y = position[1] + posB[1] - posA[1]
                const E = subVec3(posB, posA)
                const D_vec: Vec3 = [-E[1], E[0], 0]
                const lenD = Math.hypot(D_vec[0], D_vec[1])
                const D_norm = lenD > 1e-9 ? scaleVec3(D_vec, 1 / lenD) : ([0, 1, 0] as Vec3)
                const proj = subVec3([C_ideal_x, C_ideal_y, 0], posB)
                const nextT = dotVec3(proj, D_norm)
                return {
                  ...current,
                  points: current.points.map((p) => p.id === posCId ? { ...p, t: nextT } : p),
                }
              } else {
                const C_ideal_x = position[0] + posB[0] - posA[0]
                const C_ideal_y = position[1] + posB[1] - posA[1]
                return {
                  ...current,
                  points: current.points.map((p) => p.id === posCId ? { ...p, position: [C_ideal_x, C_ideal_y, posCPoint.position[2]] } : p),
                }
              }
            }
          }

          if (point.shapeType === 'rhombus_C' && point.sourcePointIds) {
            const resolved = resolvePointPositions(current)
            const posA = resolved[point.sourcePointIds[0]]
            const posB = resolved[point.sourcePointIds[1]]
            if (posA && posB) {
              const BA: Vec3 = [posA[0] - posB[0], posA[1] - posB[1], 0]
              const BC: Vec3 = [position[0] - posB[0], position[1] - posB[1], 0]
              const angleBA = Math.atan2(BA[1], BA[0])
              const angleBC = Math.atan2(BC[1], BC[0])
              let nextT = angleBC - angleBA
              while (nextT < -Math.PI) nextT += 2 * Math.PI
              while (nextT > Math.PI) nextT -= 2 * Math.PI
              return {
                ...current,
                points: mapEntities(current.points, pointId, (candidate) => ({
                  ...candidate,
                  t: nextT,
                })),
              }
            }
          }

          if (point.shapeType === 'rhombus_D' && point.sourcePointIds) {
            const resolved = resolvePointPositions(current)
            const posA = resolved[point.sourcePointIds[0]]
            const posB = resolved[point.sourcePointIds[1]]
            const posCId = point.sourcePointIds[2]
            const posC = resolved[posCId]
            if (posA && posB && posC) {
              const C_ideal_x = position[0] + posB[0] - posA[0]
              const C_ideal_y = position[1] + posB[1] - posA[1]
              const BA: Vec3 = [posA[0] - posB[0], posA[1] - posB[1], 0]
              const BC: Vec3 = [C_ideal_x - posB[0], C_ideal_y - posB[1], 0]
              const angleBA = Math.atan2(BA[1], BA[0])
              const angleBC = Math.atan2(BC[1], BC[0])
              let nextT = angleBC - angleBA
              while (nextT < -Math.PI) nextT += 2 * Math.PI
              while (nextT > Math.PI) nextT -= 2 * Math.PI
              return {
                ...current,
                points: current.points.map((p) => p.id === posCId ? { ...p, t: nextT } : p),
              }
            }
          }

          if (point.shapeType === 'square_C' && point.sourcePointIds) {
            const sourcePointIds = point.sourcePointIds
            const resolved = resolvePointPositions(current)
            const posA = resolved[sourcePointIds[0]]
            const posB = resolved[sourcePointIds[1]]
            if (posA && posB) {
              const E = subVec3(posB, posA)
              const lenE = Math.hypot(E[0], E[1])
              const u_AB = lenE > 1e-9 ? scaleVec3(E, 1 / lenE) : ([1, 0, 0] as Vec3)
              const u_rot: Vec3 = [-u_AB[1], u_AB[0], 0]
              const proj = subVec3(position, posB)
              const L_new = Math.max(0.1, Math.abs(dotVec3(proj, u_rot)))
              const isFlipped = dotVec3(proj, u_rot) < 0
              const nextFlip = isFlipped ? -1 : 1
              const nextB_pos = addVec3(posA, scaleVec3(u_AB, L_new))
              const posDPoint = current.points.find((p) => p.createdByTool === 'specialQuadrilateral' && p.shapeType === 'square_D' && p.sourcePointIds?.[0] === sourcePointIds[0])
              const posDId = posDPoint?.id

              return {
                ...current,
                points: current.points.map((p) => {
                  if (p.id === sourcePointIds[1]) return { ...p, position: nextB_pos }
                  if (p.id === pointId) return { ...p, flip: nextFlip }
                  if (posDId && p.id === posDId) return { ...p, flip: nextFlip }
                  return p
                }),
              }
            }
          }

          if (point.shapeType === 'square_D' && point.sourcePointIds) {
            const sourcePointIds = point.sourcePointIds
            const resolved = resolvePointPositions(current)
            const posA = resolved[sourcePointIds[0]]
            const posB = resolved[sourcePointIds[1]]
            if (posA && posB) {
              const E = subVec3(posB, posA)
              const lenE = Math.hypot(E[0], E[1])
              const u_AB = lenE > 1e-9 ? scaleVec3(E, 1 / lenE) : ([1, 0, 0] as Vec3)
              const u_rot: Vec3 = [-u_AB[1], u_AB[0], 0]
              const proj = subVec3(position, posA)
              const L_new = Math.max(0.1, Math.abs(dotVec3(proj, u_rot)))
              const isFlipped = dotVec3(proj, u_rot) < 0
              const nextFlip = isFlipped ? -1 : 1
              const nextB_pos = addVec3(posA, scaleVec3(u_AB, L_new))
              const posCPoint = current.points.find((p) => p.createdByTool === 'specialQuadrilateral' && p.shapeType === 'square_C' && p.sourcePointIds?.[0] === sourcePointIds[0])
              const posCId = posCPoint?.id

              return {
                ...current,
                points: current.points.map((p) => {
                  if (p.id === sourcePointIds[1]) return { ...p, position: nextB_pos }
                  if (p.id === pointId) return { ...p, flip: nextFlip }
                  if (posCId && p.id === posCId) return { ...p, flip: nextFlip }
                  return p
                }),
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

  const updateSolidHeight = useCallback(
    (solidId: string, newHeight: number) => {
      commitManualDocument((current) => {
        const solid = current.solids.find((s) => s.id === solidId)
        if (!solid) return current

        const nextSolids = current.solids.map((s) => (s.id === solidId ? { ...s, height: newHeight } : s))
        let nextPoints = [...current.points]

        const resolved = resolvePointPositions(current)

        if (
          (solid.solidType === 'pyramid' ||
            solid.solidType === 'regularPyramid' ||
            solid.solidType === 'cone' ||
            solid.solidType === 'cylinder') &&
          solid.apexPointId
        ) {
          let center: Vec3 = [0, 0, 0]
          let normal: Vec3 = [0, 0, 1]

          if (solid.solidType === 'cone' || solid.solidType === 'cylinder') {
            if (solid.baseCircleId) {
              const circle = current.circles?.find((c) => c.id === solid.baseCircleId)
              if (circle) {
                const props = resolveCircleProps(circle, resolved)
                if (props) {
                  center = props.center
                  normal = props.normal
                }
              }
            } else if (solid.centerPointId) {
              const cPos = resolved[solid.centerPointId]
              if (cPos) center = cPos
            }
          } else {
            if (solid.basePolygonId) {
              const basePolygon = current.polygons.find((p) => p.id === solid.basePolygonId)
              if (basePolygon) {
                const basePoints = basePolygon.pointIds.map((id) => resolved[id]).filter(Boolean) as Vec3[]
                if (basePoints.length > 0) {
                  center = centroid(basePoints)
                  normal = getPolygonNormal(basePoints)
                }
              }
            }
          }

          const nextApexPos: Vec3 = [
            center[0] + normal[0] * newHeight,
            center[1] + normal[1] * newHeight,
            center[2] + normal[2] * newHeight,
          ]

          nextPoints = nextPoints.map((p) =>
            p.id === solid.apexPointId ? { ...p, position: nextApexPos } : p
          )
        } else if (solid.solidType === 'prism' && solid.topPointId) {
          if (solid.basePolygonId) {
            const basePolygon = current.polygons.find((p) => p.id === solid.basePolygonId)
            if (basePolygon) {
              const basePoints = basePolygon.pointIds.map((id) => resolved[id]).filter(Boolean) as Vec3[]
              if (basePoints.length > 0) {
                const v0 = resolved[basePolygon.pointIds[0]]
                const normal = getPolygonNormal(basePoints)
                if (v0) {
                  const nextTopPos: Vec3 = [
                    v0[0] + normal[0] * newHeight,
                    v0[1] + normal[1] * newHeight,
                    v0[2] + normal[2] * newHeight,
                  ]
                  nextPoints = nextPoints.map((p) =>
                    p.id === solid.topPointId ? { ...p, position: nextTopPos } : p
                  )
                }
              }
            }
          }
        } else if ((solid.solidType === 'box' || solid.solidType === 'cube') && solid.cornerPointIds && solid.cornerPointIds.length === 8) {
          for (let i = 4; i < 8; i++) {
            const bottomPt = current.points.find(p => p.id === solid.cornerPointIds![i - 4])
            if (bottomPt) {
              const nextTopPos: Vec3 = [
                bottomPt.position[0],
                bottomPt.position[1],
                bottomPt.position[2] + newHeight,
              ]
              nextPoints = nextPoints.map((p) =>
                p.id === solid.cornerPointIds![i] ? { ...p, position: nextTopPos } : p
              )
            }
          }
        }

        return {
          ...current,
          solids: nextSolids,
          points: nextPoints,
        }
      })
    },
    [commitManualDocument],
  )

  const addSphereRing = useCallback((solidId: string) => {
    commitManualDocument((current) => {
      const solid = current.solids.find((s) => s.id === solidId)
      if (!solid || solid.solidType !== 'sphere') return current
      
      const newRing = {
        id: createEntityId('sphereRing'),
        phi: Math.PI / 2,
        theta: 0,
      }
      
      return {
        ...current,
        solids: mapEntities(current.solids, solidId, (s) => ({
          ...s,
          sphereRings: [...(s.sphereRings || []), newRing]
        }))
      }
    })
  }, [commitManualDocument])

  const removeSphereRing = useCallback((solidId: string, ringId: string) => {
    commitManualDocument((current) => {
      return {
        ...current,
        solids: mapEntities(current.solids, solidId, (s) => ({
          ...s,
          sphereRings: s.sphereRings?.filter((r) => r.id !== ringId) || []
        }))
      }
    })
  }, [commitManualDocument])

  const updateSphereRingOrientation = useCallback((solidId: string, ringId: string, phi: number, theta: number) => {
    commitManualDocument((current) => {
      return {
        ...current,
        solids: mapEntities(current.solids, solidId, (s) => ({
          ...s,
          sphereRings: s.sphereRings?.map((r) => r.id === ringId ? { ...r, phi, theta } : r) || []
        }))
      }
    })
  }, [commitManualDocument])

  const updatePointT = useCallback((pointId: string, t: number) => {
    commitManualDocument((current) => {
      const point = current.points.find((p) => p.id === pointId)
      if (!point || (point.pointKind !== 'segment' && point.pointKind !== 'midpoint')) return null
      
      const newKind = 'segment' // Change to segment in case it was a midpoint so it persists the `t`
      return {
        ...current,
        points: current.points.map((p) =>
          p.id === pointId ? { ...p, t: Math.max(0, Math.min(1, t)), pointKind: newKind, sourcePointIds: p.sourcePointIds, segmentId: p.segmentId } : p
        ),
      }
    })
  }, [commitManualDocument])

  const createCircleAngleDependentPoint = useCallback(
    (sourcePointId: string, customAngleRad?: number) => {
      commitManualDocument((current) => {
        const pointB = current.points.find((p) => p.id === sourcePointId)
        if (!pointB || !pointB.circleId) return current
        
        const createdPointId = createEntityId('point')
        const createdPoint: ManualPoint = {
          id: createdPointId,
          label: nextPointLabel(current),
          entityType: 'point',
          pointKind: 'circleAngleDependent',
          position: [0, 0, 0],
          circleId: pointB.circleId,
          sourcePointId: sourcePointId,
          angleOffset: customAngleRad ?? (Math.PI / 3),
          createdByTool: 'point',
          dependsOn: [sourcePointId, pointB.circleId],
          locked: false,
          visible: true,
          selectable: true,
        }
        
        return {
          ...current,
          points: [...current.points, createdPoint],
        }
      })
    },
    [commitManualDocument]
  )

  const createSphereAngleDependentPoint = useCallback(
    (sourcePointId: string, customAngleRad?: number) => {
      commitManualDocument((current) => {
        const pointB = current.points.find((p) => p.id === sourcePointId)
        if (!pointB || !pointB.solidId || !pointB.circleId) return current
        
        const createdPointId = createEntityId('point')
        const createdPoint: ManualPoint = {
          id: createdPointId,
          label: nextPointLabel(current),
          entityType: 'point',
          pointKind: 'sphereAngleDependent',
          position: [0, 0, 0],
          solidId: pointB.solidId,
          circleId: pointB.circleId,
          sourcePointId: sourcePointId,
          angle: customAngleRad ?? 0.5,
          createdByTool: 'point',
          dependsOn: [sourcePointId, pointB.solidId],
          locked: false,
          visible: true,
          selectable: true,
        }
        
        return {
          ...current,
          points: [...current.points, createdPoint],
        }
      })
    },
    [commitManualDocument]
  )

  const updatePointAngle = useCallback(
    (pointId: string, angle: number) => {
      commitManualDocument((current) => {
        return {
          ...current,
          points: current.points.map((p) => {
            if (p.id === pointId) {
              if (p.pointKind === 'circlePoint' || p.pointKind === 'sphereRingPoint') {
                return { ...p, t: angle }
              }
              if (p.pointKind === 'circleAngleDependent') {
                return { ...p, angleOffset: angle }
              }
              if (p.pointKind === 'sphereAngleDependent') {
                return { ...p, angle }
              }
              return { ...p, angle }
            }
            return p
          }),
        }
      })
    },
    [commitManualDocument]
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
      
      const existing = manualDocument.segments.find(
        (s) =>
          (s.startPointId === startPointId && s.endPointId === endPointId) ||
          (s.startPointId === endPointId && s.endPointId === startPointId)
      )
      if (existing) {
        setManualSelection({ kind: 'segment', id: existing.id })
        return existing.id
      }

      const nextId = createEntityId('segment')
      commitManualDocument((current) => {
        const doubleCheck = current.segments.find(
          (s) =>
            (s.startPointId === startPointId && s.endPointId === endPointId) ||
            (s.startPointId === endPointId && s.endPointId === startPointId)
        )
        if (doubleCheck) {
          return null
        }

        const startPoint = current.points.find((point) => point.id === startPointId)
        const endPoint = current.points.find((point) => point.id === endPointId)
        const startLabel = startPoint?.label ?? 'A'
        const endLabel = endPoint?.label ?? 'B'

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

        return {
          ...current,
          segments: [...current.segments, segment],
        }
      })

      setManualSelection({ kind: 'segment', id: nextId })
      return nextId
    },
    [commitManualDocument, manualDocument.segments],
  )

  const createMidpoint = useCallback(
    (pointIdA: string, pointIdB: string) => {
      if (pointIdA === pointIdB) return null
      const midId = createEntityId('point')
      commitManualDocument((current) => {
        const midPoint: ManualPoint = {
          id: midId,
          label: nextPointLabel(current),
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
        return {
          ...current,
          points: [...current.points, midPoint],
        }
      })
      setManualSelection({ kind: 'point', id: midId })
      return midId
    },
    [commitManualDocument],
  )

  const createIntersection = useCallback(
    (segmentIdA: string, segmentIdB: string) => {
      if (segmentIdA === segmentIdB) return null
      const intId = createEntityId('point')
      commitManualDocument((current) => {
        const intPoint: ManualPoint = {
          id: intId,
          label: nextPointLabel(current),
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
        const derived = resolvePointPositions({ ...current, points: [...current.points, intPoint] })
        if (!derived[intId]) return current
        return { ...current, points: [...current.points, intPoint] }
      })
      setManualSelection({ kind: 'point', id: intId })
      return intId
    },
    [commitManualDocument],
  )

  const createProjection = useCallback(
    (pointId: string, targetId: string, targetKind: 'segment' | 'polygon') => {
      const projId = createEntityId('point')
      commitManualDocument((current) => {
        const projPoint: ManualPoint = {
          id: projId,
          label: nextPointLabel(current),
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
        return {
          ...current,
          points: [...current.points, projPoint],
        }
      })
      setManualSelection({ kind: 'point', id: projId })
      return projId
    },
    [commitManualDocument],
  )

  const createProjectionByPoints = useCallback(
    (pointId: string, targetPointIds: string[]) => {
      if (targetPointIds.length < 2) return null
      const projId = createEntityId('point')
      commitManualDocument((current) => {
        const projPoint: ManualPoint = {
          id: projId,
          label: nextPointLabel(current),
          entityType: 'point',
          pointKind: 'projection',
          position: [0, 0, 0],
          sourcePointId: pointId,
          targetPointIds,
          createdByTool: 'projection',
          dependsOn: [pointId, ...targetPointIds],
          locked: true,
          visible: true,
          selectable: true,
        }
        return {
          ...current,
          points: [...current.points, projPoint],
        }
      })
      setManualSelection({ kind: 'point', id: projId })
      return projId
    },
    [commitManualDocument],
  )

  const createCentroid = useCallback(
    (targetPolygonId?: string, sourcePointIds?: string[]) => {
      saveManualState()
      const cId = createEntityId('point')
      const dependsOn: string[] = []
      if (targetPolygonId) dependsOn.push(targetPolygonId)
      if (sourcePointIds) dependsOn.push(...sourcePointIds)

      commitManualDocument((current) => {
        const cPoint: ManualPoint = {
          id: cId,
          label: nextPointLabel(current),
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
        return {
          ...current,
          points: [...current.points, cPoint],
        }
      })
      setManualSelection({ kind: 'point', id: cId })
      return cId
    },
    [commitManualDocument, saveManualState],
  )

  const createPerpendicularBisector = useCallback(
    (segmentId?: string, pointIdA?: string, pointIdB?: string) => {
      saveManualState()
      
      const tVal = draftOperation?.radius ?? 20
      const p1Id = createEntityId('point')
      const p2Id = createEntityId('point')
      const lineSegId = createEntityId('segment')

      commitManualDocument((current) => {
        let pA = pointIdA
        let pB = pointIdB
        const dependsOn: string[] = []

        if (segmentId) {
          dependsOn.push(segmentId)
          const seg = current.segments.find((s) => s.id === segmentId)
          if (seg) {
            pA = seg.startPointId
            pB = seg.endPointId
          }
        }

        if (!pA || !pB) return current
        if (!segmentId) {
          dependsOn.push(pA, pB)
        }

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

        return {
          ...current,
          points: [...current.points, p1, p2],
          segments: [...current.segments, lineSeg],
        }
      })

      setManualSelection({ kind: 'segment', id: lineSegId })
      return lineSegId
    },
    [commitManualDocument, saveManualState, draftOperation],
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
      const polygonId = createEntityId('polygon')

      commitManualDocument((current) => {
        const generatedPoints: ManualPoint[] = []
        const allPointIds = [pointIdA, pointIdB]

        for (let i = 2; i < sides; i++) {
          const pid = createEntityId('point')
          const pt: ManualPoint = {
            id: pid,
            label: nextPointLabel({
              ...current,
              points: [...current.points, ...generatedPoints],
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

        const allPointsList = [...current.points, ...generatedPoints]
        const generatedSegments: ManualSegment[] = []
        for (let i = 0; i < sides; i++) {
          const sid = createEntityId('segment')
          const startId = allPointIds[i]
          const endId = allPointIds[(i + 1) % sides]
          const startLabel = allPointsList.find((p) => p.id === startId)?.label ?? 'A'
          const endLabel = allPointsList.find((p) => p.id === endId)?.label ?? 'B'

          const seg: ManualSegment = {
            id: sid,
            label: `${startLabel}${endLabel}`,
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

        return {
          ...current,
          points: [...current.points, ...generatedPoints],
          segments: [...current.segments, ...generatedSegments],
          polygons: [...current.polygons, polygon],
        }
      })

      setManualSelection({ kind: 'polygon', id: polygonId })
      return polygonId
    },
    [commitManualDocument, saveManualState],
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
          const startLabel = current.points.find((p) => p.id === pointIdA)?.label ?? 'A'
          const endLabel = current.points.find((p) => p.id === pointIdB)?.label ?? 'B'
          const newSeg: ManualSegment = {
            id: segId,
            label: `${startLabel}${endLabel}`,
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
            flip: 1,
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
            flip: 1,
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
        const allPointsList = [...current.points, cPoint]
        const checkAndAddSegment = (p1: string, p2: string) => {
          const existing = current.segments.find(
            (s) => (s.startPointId === p1 && s.endPointId === p2)
              || (s.startPointId === p2 && s.endPointId === p1)
          ) || addedSegments.find(
            (s) => (s.startPointId === p1 && s.endPointId === p2)
              || (s.startPointId === p2 && s.endPointId === p1)
          )
          if (!existing) {
            const startLabel = allPointsList.find((p) => p.id === p1)?.label ?? 'A'
            const endLabel = allPointsList.find((p) => p.id === p2)?.label ?? 'B'
            addedSegments.push({
              id: createEntityId('segment'),
              label: `${startLabel}${endLabel}`,
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
      const polygonId = createEntityId('polygon')

      commitManualDocument((current) => {
        const generatedPoints: ManualPoint[] = []
        const generatedSegments: ManualSegment[] = []
        let allPointIds = [...pointIds]
        let pointsList = [...current.points]

        if ((type === 'binh_huanh' || type === 'chu_nhat') && pointIds.length >= 3) {
          const [pA, pB, pC] = pointIds
          const posA = current.points.find(p => p.id === pA)?.position ?? [0, 0, 0]
          const posB = current.points.find(p => p.id === pB)?.position ?? [0, 0, 0]
          const posC = current.points.find(p => p.id === pC)?.position ?? [0, 0, 0]

          const expectedD: Vec3 = [
            posA[0] + posC[0] - posB[0],
            posA[1] + posC[1] - posB[1],
            posA[2] + posC[2] - posB[2]
          ]

          const resolved = resolvePointPositions(current)
          const existingD = current.points.find(p => {
            if (pointIds.includes(p.id)) return false
            const pos = resolved[p.id]
            if (!pos) return false
            return Math.hypot(pos[0] - expectedD[0], pos[1] - expectedD[1], pos[2] - expectedD[2]) < 0.25
          })

          const pD = existingD ? existingD.id : createEntityId('point')

          if (type === 'chu_nhat') {
            const E = subVec3(posB, posA)
            const D_vec: Vec3 = [-E[1], E[0], 0]
            const lenD = Math.hypot(D_vec[0], D_vec[1])
            const D_norm = lenD > 1e-9 ? scaleVec3(D_vec, 1 / lenD) : [0, 1, 0] as Vec3
            const proj = subVec3(posC, posB)
            const tVal = dotVec3(proj, D_norm)

            pointsList = pointsList.map((p) => {
              if (p.id === pC) {
                return {
                  ...p,
                  pointKind: 'specialShapeVertex',
                  shapeType: 'rectangle_C' as any,
                  sourcePointIds: [pA, pB],
                  dependsOn: [pA, pB],
                  t: tVal,
                  locked: false,
                }
              }
              return p
            })
          }

          if (existingD) {
            pointsList = pointsList.map((p) => {
              if (p.id === pD) {
                return {
                  ...p,
                  pointKind: 'specialShapeVertex',
                  shapeType: 'parallelogram_D',
                  sourcePointIds: [pA, pB, pC],
                  dependsOn: [pA, pB, pC],
                  locked: false,
                }
              }
              return p
            })
          } else {
            const cPoint: ManualPoint = {
              id: pD,
              label: nextPointLabel({ ...current, points: [...pointsList, ...generatedPoints] }),
              entityType: 'point',
              pointKind: 'specialShapeVertex',
              shapeType: 'parallelogram_D',
              sourcePointIds: [pA, pB, pC],
              position: expectedD,
              createdByTool: 'specialQuadrilateral',
              dependsOn: [pA, pB, pC],
              locked: false,
              visible: true,
              selectable: true,
            }
            generatedPoints.push(cPoint)
          }

          allPointIds.push(pD)
        } else if (type === 'thoi' && pointIds.length >= 2) {
          const [pA, pB] = pointIds
          const posA = current.points.find(p => p.id === pA)?.position ?? [0, 0, 0]
          const posB = current.points.find(p => p.id === pB)?.position ?? [0, 0, 0]

          const E = subVec3(posA, posB)
          const theta = Math.PI / 3 // 60 deg default
          const cosT = Math.cos(theta)
          const sinT = Math.sin(theta)
          const E_rot: Vec3 = [
            E[0] * cosT - E[1] * sinT,
            E[0] * sinT + E[1] * cosT,
            0
          ]
          const expectedC = addVec3(posB, E_rot)
          const expectedD = addVec3(posA, subVec3(expectedC, posB))

          const resolved = resolvePointPositions(current)
          const existingC = current.points.find(p => {
            if (pointIds.includes(p.id)) return false
            const pos = resolved[p.id]
            if (!pos) return false
            return Math.hypot(pos[0] - expectedC[0], pos[1] - expectedC[1], pos[2] - expectedC[2]) < 0.25
          })

          const pC = existingC ? existingC.id : createEntityId('point')

          const existingD = current.points.find(p => {
            if (pointIds.includes(p.id) || p.id === pC) return false
            const pos = resolved[p.id]
            if (!pos) return false
            return Math.hypot(pos[0] - expectedD[0], pos[1] - expectedD[1], pos[2] - expectedD[2]) < 0.25
          })

          const pD = existingD ? existingD.id : createEntityId('point')

          if (existingC) {
            pointsList = pointsList.map(p => {
              if (p.id === pC) {
                return {
                  ...p,
                  pointKind: 'specialShapeVertex',
                  shapeType: 'rhombus_C',
                  sourcePointIds: [pA, pB],
                  dependsOn: [pA, pB],
                  t: theta,
                  locked: false,
                }
              }
              return p
            })
          } else {
            const ptC: ManualPoint = {
              id: pC,
              label: nextPointLabel({ ...current, points: [...pointsList, ...generatedPoints] }),
              entityType: 'point',
              pointKind: 'specialShapeVertex',
              shapeType: 'rhombus_C',
              sourcePointIds: [pA, pB],
              position: expectedC,
              createdByTool: 'specialQuadrilateral',
              dependsOn: [pA, pB],
              locked: false,
              visible: true,
              selectable: true,
              t: theta,
            }
            generatedPoints.push(ptC)
          }

          if (existingD) {
            pointsList = pointsList.map(p => {
              if (p.id === pD) {
                return {
                  ...p,
                  pointKind: 'specialShapeVertex',
                  shapeType: 'rhombus_D',
                  sourcePointIds: [pA, pB, pC],
                  dependsOn: [pA, pB, pC],
                  locked: false,
                }
              }
              return p
            })
          } else {
            const ptD: ManualPoint = {
              id: pD,
              label: nextPointLabel({ ...current, points: [...pointsList, ...generatedPoints] }),
              entityType: 'point',
              pointKind: 'specialShapeVertex',
              shapeType: 'rhombus_D',
              sourcePointIds: [pA, pB, pC],
              position: expectedD,
              createdByTool: 'specialQuadrilateral',
              dependsOn: [pA, pB, pC],
              locked: false,
              visible: true,
              selectable: true,
            }
            generatedPoints.push(ptD)
          }

          allPointIds = [pA, pB, pC, pD]
        } else if (type === 'vuong' && pointIds.length >= 2) {
          const [pA, pB] = pointIds
          const posA = current.points.find(p => p.id === pA)?.position ?? [0, 0, 0]
          const posB = current.points.find(p => p.id === pB)?.position ?? [0, 0, 0]

          const v = subVec3(posB, posA)
          const expectedC = addVec3(posB, [-v[1], v[0], 0])
          const expectedD = addVec3(posA, [-v[1], v[0], 0])

          const resolved = resolvePointPositions(current)
          const existingC = current.points.find(p => {
            if (pointIds.includes(p.id)) return false
            const pos = resolved[p.id]
            if (!pos) return false
            return Math.hypot(pos[0] - expectedC[0], pos[1] - expectedC[1], pos[2] - expectedC[2]) < 0.25
          })

          const pC = existingC ? existingC.id : createEntityId('point')

          const existingD = current.points.find(p => {
            if (pointIds.includes(p.id) || p.id === pC) return false
            const pos = resolved[p.id]
            if (!pos) return false
            return Math.hypot(pos[0] - expectedD[0], pos[1] - expectedD[1], pos[2] - expectedD[2]) < 0.25
          })

          const pD = existingD ? existingD.id : createEntityId('point')

          if (existingC) {
            pointsList = pointsList.map(p => {
              if (p.id === pC) {
                return {
                  ...p,
                  pointKind: 'specialShapeVertex',
                  shapeType: 'square_C' as any,
                  sourcePointIds: [pA, pB],
                  dependsOn: [pA, pB],
                  locked: false,
                  flip: 1,
                }
              }
              return p
            })
          } else {
            const ptC: ManualPoint = {
              id: pC,
              label: nextPointLabel({ ...current, points: [...pointsList, ...generatedPoints] }),
              entityType: 'point',
              pointKind: 'specialShapeVertex',
              shapeType: 'square_C' as any,
              sourcePointIds: [pA, pB],
              position: expectedC,
              createdByTool: 'specialQuadrilateral',
              dependsOn: [pA, pB],
              locked: false,
              visible: true,
              selectable: true,
              flip: 1,
            }
            generatedPoints.push(ptC)
          }

          if (existingD) {
            pointsList = pointsList.map(p => {
              if (p.id === pD) {
                return {
                  ...p,
                  pointKind: 'specialShapeVertex',
                  shapeType: 'square_D' as any,
                  sourcePointIds: [pA, pB],
                  dependsOn: [pA, pB],
                  locked: false,
                  flip: 1,
                }
              }
              return p
            })
          } else {
            const ptD: ManualPoint = {
              id: pD,
              label: nextPointLabel({ ...current, points: [...pointsList, ...generatedPoints] }),
              entityType: 'point',
              pointKind: 'specialShapeVertex',
              shapeType: 'square_D' as any,
              sourcePointIds: [pA, pB],
              position: expectedD,
              createdByTool: 'specialQuadrilateral',
              dependsOn: [pA, pB],
              locked: false,
              visible: true,
              selectable: true,
              flip: 1,
            }
            generatedPoints.push(ptD)
          }

          allPointIds = [pA, pB, pC, pD]
        }

        const allPointsList = [...pointsList, ...generatedPoints]
        const sides = allPointIds.length
        for (let i = 0; i < sides; i++) {
          const startId = allPointIds[i]
          const endId = allPointIds[(i + 1) % sides]
          const existing = current.segments.find(
            (s) => (s.startPointId === startId && s.endPointId === endId)
              || (s.startPointId === endId && s.endPointId === startId)
          )
          if (!existing) {
            const startLabel = allPointsList.find((p) => p.id === startId)?.label ?? 'A'
            const endLabel = allPointsList.find((p) => p.id === endId)?.label ?? 'B'
            generatedSegments.push({
              id: createEntityId('segment'),
              label: `${startLabel}${endLabel}`,
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

        const polygon = {
          id: polygonId,
          label: type === 'binh_huanh' ? 'Hình bình hành' : type === 'thoi' ? 'Hình thoi' : type === 'chu_nhat' ? 'Hình chữ nhật' : 'Hình vuông',
          entityType: 'polygon' as const,
          pointIds: allPointIds,
          createdByTool: 'specialQuadrilateral' as const,
          dependsOn: [...allPointIds],
          locked: true,
          visible: true,
          selectable: true,
        }

        return {
          ...current,
          points: [...pointsList, ...generatedPoints],
          segments: [...current.segments, ...generatedSegments],
          polygons: [...current.polygons, polygon],
        }
      })

      setManualSelection({ kind: 'polygon', id: polygonId })
      return polygonId
    },
    [commitManualDocument, saveManualState],
  )

  const createPolygon = useCallback(
    (pointIds: string[]) => {
      const uniqueIds = pointIds.filter(
        (pointId, index) => pointIds.indexOf(pointId) === index,
      )
      if (uniqueIds.length < 3) return null
      const polygonId = createEntityId('polygon')
      const numPoints = uniqueIds.length
      const prefix = numPoints === 3 ? 'Tam giác' : numPoints === 4 ? 'Tứ giác' : 'Đa giác'
      const polygon = {
        id: polygonId,
        label: `${prefix} ${manualDocument.polygons.length + 1}`,
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
    (cornerPointIds: string[], height: number) => {
      if (height <= 0) return null
      const solidId = createEntityId('solid')

      commitManualDocument((current) => {
        const p0 = current.points.find(p => p.id === cornerPointIds[0])
        const p1 = current.points.find(p => p.id === cornerPointIds[1])
        const p2 = current.points.find(p => p.id === cornerPointIds[2])
        if (!p0 || !p1 || !p2) return current

        const solid: ManualSolid = {
          id: solidId,
          label: `Hộp ${current.solids.length + 1}`,
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

        const newPoints: ManualPoint[] = []
        const baseA = p0.label
        const baseB = p1.label
        const baseC = p2.label
        
        const usedLabels = new Set(current.points.map(p => p.label))
        usedLabels.add(baseA)
        usedLabels.add(baseB)
        usedLabels.add(baseC)
        const getNextLabel = () => {
           for (let i = 0; i < 26; i++) {
              const ch = String.fromCharCode(65 + i)
              if (!usedLabels.has(ch) && ch !== 'S' && ch !== 'I' && ch !== 'O') {
                 usedLabels.add(ch)
                 return ch
              }
           }
           const next = `P${usedLabels.size}`
           usedLabels.add(next)
           return next
        }

        let baseD = 'D'
        if (baseA === 'A' && baseB === 'B' && baseC === 'C' && !usedLabels.has('D')) {
           usedLabels.add('D')
        } else {
           baseD = getNextLabel()
        }

        const pts = [baseA, baseB, baseC, baseD, `${baseA}'`, `${baseB}'`, `${baseC}'`, `${baseD}'`]
        const ptIds = [p0.id, p1.id, p2.id, '', '', '', '', '']

        for (let i = 0; i < 8; i++) {
          if (i !== 0 && i !== 1 && i !== 2) {
            const pid = createEntityId('point')
            ptIds[i] = pid
            newPoints.push({
              id: pid,
              label: pts[i],
              entityType: 'point',
              pointKind: 'solidVertex',
              solidId: solid.id,
              vertexIndex: i,
              position: [0, 0, 0], // calculated by resolvePointPositions
              createdByTool: 'box',
              dependsOn: [solid.id],
              locked: false,
              visible: true,
              selectable: true,
            })
          }
        }

        const E = subVec3(p1.position, p0.position)
        const D_vec: Vec3 = [-E[1], E[0], 0]
        const lenD = Math.hypot(D_vec[0], D_vec[1])
        const D_norm = lenD > 1e-9 ? scaleVec3(D_vec, 1 / lenD) : ([0, 1, 0] as Vec3)
        const proj = subVec3(p2.position, p1.position)
        const tVal = dotVec3(proj, D_norm)

        const pointsList = current.points.map((p) => {
          if (p.id === p2.id) {
            return {
              ...p,
              pointKind: 'specialShapeVertex' as const,
              shapeType: 'rectangle_C' as any,
              sourcePointIds: [p0.id, p1.id],
              dependsOn: [p0.id, p1.id],
              t: tVal,
              locked: false,
            } as ManualPoint
          }
          return p
        })

        return {
          ...current,
          solids: [...current.solids, solid],
          points: [...pointsList, ...newPoints],
        }
      })
      setManualSelection({ kind: 'solid', id: solidId })
      return solidId
    },
    [commitManualDocument, manualDocument.solids.length],
  )

  const createCube = useCallback(
    (pointIdA: string, pointIdB: string) => {
      saveManualState()
      const solidId = createEntityId('solid')

      commitManualDocument((current) => {
        const p0 = current.points.find(p => p.id === pointIdA)
        const p1 = current.points.find(p => p.id === pointIdB)
        if (!p0 || !p1) return current

        const solid: ManualSolid = {
          id: solidId,
          label: `Hộp ${current.solids.length + 1}`,
          entityType: 'solid',
          solidType: 'cube',
          cornerPointIds: [pointIdA, pointIdB],
          createdByTool: 'cube',
          dependsOn: [pointIdA, pointIdB],
          locked: false,
          visible: true,
          selectable: true,
        }

        const newPoints: ManualPoint[] = []
        const baseA = p0.label
        const baseB = p1.label
        
        const usedLabels = new Set(current.points.map(p => p.label))
        usedLabels.add(baseA)
        usedLabels.add(baseB)
        const getNextLabel = () => {
           for (let i = 0; i < 26; i++) {
              const ch = String.fromCharCode(65 + i)
              if (!usedLabels.has(ch) && ch !== 'S' && ch !== 'I' && ch !== 'O') {
                 usedLabels.add(ch)
                 return ch
              }
           }
           const next = `P${usedLabels.size}`
           usedLabels.add(next)
           return next
        }

        let baseC = 'C'
        if (baseA === 'A' && baseB === 'B' && !usedLabels.has('C')) {
           usedLabels.add('C')
        } else {
           baseC = getNextLabel()
        }

        let baseD = 'D'
        if (baseA === 'A' && baseB === 'B' && baseC === 'C' && !usedLabels.has('D')) {
           usedLabels.add('D')
        } else {
           baseD = getNextLabel()
        }

        const pts = [baseA, baseB, baseC, baseD, `${baseA}'`, `${baseB}'`, `${baseC}'`, `${baseD}'`]
        const ptIds = [p0.id, p1.id, '', '', '', '', '', '']

        for (let i = 0; i < 8; i++) {
          if (i !== 0 && i !== 1) {
            const pid = createEntityId('point')
            ptIds[i] = pid
            newPoints.push({
              id: pid,
              label: pts[i],
              entityType: 'point',
              pointKind: 'solidVertex',
              solidId: solid.id,
              vertexIndex: i,
              position: [0, 0, 0], // calculated by resolvePointPositions
              createdByTool: 'cube',
              dependsOn: [solid.id],
              locked: false,
              visible: true,
              selectable: true,
            })
          }
        }

        return {
          ...current,
          solids: [...current.solids, solid],
          points: [...current.points, ...newPoints],
        }
      })
      setManualSelection({ kind: 'solid', id: solidId })
      return solidId
    },
    [commitManualDocument, manualDocument.solids.length],
  )

  const createPyramid = useCallback(
    (basePolygonId: string, height: number, apexPointId?: string) => {
      if (height <= 0 && !apexPointId) return null
      
      if (apexPointId && apexPointId !== 'auto_generate') {
        if (isPointCoplanarWithPolygon(apexPointId, basePolygonId, manualDocument)) {
          toast.error('Đỉnh chóp không được nằm trên cùng mặt phẳng với mặt đáy.')
          return null
        }
      }

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

  const createRegularPyramid = useCallback(
    (basePolygonId: string) => {
      saveManualState()
      const solidId = createEntityId('solid')

      commitManualDocument((current) => {
        const poly = current.polygons.find(p => p.id === basePolygonId)
        if (!poly) return current

        const solid: ManualSolid = {
          id: solidId,
          label: `Chóp ${current.solids.length + 1}`,
          entityType: 'solid',
          solidType: 'regularPyramid',
          basePolygonId,
          createdByTool: 'regularPyramid',
          dependsOn: [basePolygonId],
          height: 4, // Default height
          locked: false,
          visible: true,
          selectable: true,
        }

        const newPoints: ManualPoint[] = []
        const resolved = resolvePointPositions(current)
        const basePoints = poly.pointIds.map((id) => resolved[id]).filter(Boolean) as Vec3[]
        
        if (basePoints.length >= 3) {
           const c = centroid(basePoints)
           const normal = getPolygonNormal(basePoints)
           const height = solid.height!
           const apexPos: Vec3 = [c[0] + normal[0] * height, c[1] + normal[1] * height, c[2] + normal[2] * height]
           
           const existingPoint = current.points.find(p => {
              const pos = resolved[p.id]
              return pos && distance(pos, apexPos) < 1e-4
           })
           
           if (existingPoint) {
              solid.apexPointId = existingPoint.id
           } else {
              const apexId = createEntityId('point')
              const usedLabels = new Set(current.points.map(p => p.label))
              let apexLabel = 'S'
              if (usedLabels.has('S')) {
                for (let i = 0; i < 10; i++) {
                   if (!usedLabels.has(`S${i}`)) {
                      apexLabel = `S${i}`
                      break
                   }
                }
              }

              solid.apexPointId = apexId
              newPoints.push({
                 id: apexId,
                 label: apexLabel,
                 entityType: 'point',
                 pointKind: 'solidVertex',
                 solidId: solid.id,
                 vertexIndex: 0,
                 position: [0, 0, 0], // dynamically resolved
                 createdByTool: 'regularPyramid',
                 dependsOn: [solid.id],
                 locked: false,
                 visible: true,
                 selectable: true,
              })
           }
        }

        return {
          ...current,
          solids: [...current.solids, solid],
          points: [...current.points, ...newPoints],
        }
      })
      setManualSelection({ kind: 'solid', id: solidId })
      return solidId
    },
    [commitManualDocument, saveManualState],
  )

  const createPrism = useCallback(
    (basePolygonId: string, height: number, topPointId?: string) => {
      if (height <= 0 && !topPointId) return null
      
      if (topPointId && topPointId !== 'auto_generate') {
        if (isPointCoplanarWithPolygon(topPointId, basePolygonId, manualDocument)) {
          toast.error('Đỉnh nắp không được nằm trên cùng mặt phẳng với mặt đáy.')
          return null
        }
      }

      saveManualState()

      const solidId = createEntityId('solid')
      let finalTopPointId = topPointId === 'auto_generate' ? undefined : topPointId
      let generatedPoints: ManualPoint[] = []

      const poly = manualDocument.polygons.find((p) => p.id === basePolygonId)
      const basePointLabels = poly ? poly.pointIds.map(id => manualDocument.points.find(p => p.id === id)?.label ?? 'P') : []

      if (poly) {
        const n = poly.pointIds.length
        const usedLabels = new Set(manualDocument.points.map(p => p.label))
        
        for (let i = 0; i < n; i++) {
           if (i === 0 && finalTopPointId) {
             continue
           }
           
           const pid = createEntityId('point')
           let label = `${basePointLabels[i]}'`
           while (usedLabels.has(label)) label += "'"
           usedLabels.add(label)
           
           generatedPoints.push({
             id: pid,
             label: label,
             entityType: 'point',
             pointKind: 'solidVertex',
             solidId: solidId,
             vertexIndex: n + i,
             position: [0, 0, 0], // dynamically resolved
             createdByTool: 'prism',
             dependsOn: [solidId],
             locked: false,
             visible: true,
             selectable: true,
           })
        }
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
        sphereRings: [
          {
            id: createEntityId('sphereRing'),
            phi: Math.PI / 2,
            theta: 0,
          }
        ]
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
      saveManualState()
      const solidId = createEntityId('solid')

      commitManualDocument((current) => {
        let center: Vec3 = [0, 0, 0]
        let normal: Vec3 = [0, 0, 1]

        const resolved = resolvePointPositions(current)
        if (baseCircleId) {
          const circle = current.circles.find(c => c.id === baseCircleId)
          if (circle) {
            const props = resolveCircleProps(circle, resolved)
            if (props) {
              center = props.center
              normal = props.normal
            }
          }
        } else if (centerPointId) {
          const cPos = resolved[centerPointId]
          if (cPos) center = cPos
        }

        const apexPos: Vec3 = [
          center[0] + normal[0] * height,
          center[1] + normal[1] * height,
          center[2] + normal[2] * height,
        ]

        const existingPoint = current.points.find(p => {
          const pos = resolved[p.id]
          return pos && distance(pos, apexPos) < 1e-4
        })

        let apexId = ''
        const newPoints: ManualPoint[] = []

        if (existingPoint) {
          apexId = existingPoint.id
        } else {
          apexId = createEntityId('point')
          const usedLabels = new Set(current.points.map(p => p.label))
          let apexLabel = 'S'
          if (usedLabels.has('S')) {
            for (let i = 0; i < 10; i++) {
              if (!usedLabels.has(`S${i}`)) {
                apexLabel = `S${i}`
                break
              }
            }
          }
          newPoints.push({
            id: apexId,
            label: apexLabel,
            entityType: 'point',
            pointKind: 'free',
            position: apexPos,
            createdByTool: 'cone',
            dependsOn: [],
            locked: false,
            visible: true,
            selectable: true,
          })
        }

        const solid: ManualSolid = {
          id: solidId,
          label: `Nón ${current.solids.length + 1}`,
          entityType: 'solid',
          solidType: 'cone',
          radius,
          height,
          centerPointId: baseCircleId ? undefined : centerPointId,
          baseCircleId,
          apexPointId: apexId,
          createdByTool: 'cone',
          dependsOn: [
            ...(baseCircleId ? [baseCircleId] : (centerPointId ? [centerPointId] : [])),
            apexId,
          ],
          locked: false,
          visible: true,
          selectable: true,
        }

        return {
          ...current,
          points: [...current.points, ...newPoints],
          solids: [...current.solids, solid],
        }
      })

      setManualSelection({ kind: 'solid', id: solidId })
      return solidId
    },
    [commitManualDocument, saveManualState],
  )

  const createCylinder = useCallback(
    (centerPointId: string, radius: number, height: number, baseCircleId?: string) => {
      if (radius <= 0 || height <= 0) return null
      const solidId = createEntityId('solid')
      
      commitManualDocument((current) => {
        const resolved = resolvePointPositions(current)
        let center: Vec3 = [0, 0, 0]
        let normal: Vec3 = [0, 0, 1]

        if (baseCircleId) {
          const circle = current.circles.find(c => c.id === baseCircleId)
          if (circle) {
            const props = resolveCircleProps(circle, resolved)
            if (props) {
              center = props.center
              normal = props.normal
            }
          }
        } else if (centerPointId) {
          const cPos = resolved[centerPointId]
          if (cPos) center = cPos
        }

        const topPos: Vec3 = [
          center[0] + normal[0] * height,
          center[1] + normal[1] * height,
          center[2] + normal[2] * height,
        ]

        // Find existing point or create a new one
        const existingPoint = current.points.find(p => {
          const pos = resolved[p.id]
          return pos && distance(pos, topPos) < 1e-4
        })

        let topCenterId = ''
        const newPoints: ManualPoint[] = []

        if (existingPoint) {
          topCenterId = existingPoint.id
        } else {
          topCenterId = createEntityId('point')
          let topLabel = 'A\''
          const baseCenterId = centerPointId || (baseCircleId ? current.circles.find(c => c.id === baseCircleId)?.centerPointId : '')
          const basePoint = current.points.find(p => p.id === baseCenterId)
          if (basePoint && basePoint.label) {
            topLabel = basePoint.label + '\''
          } else {
            topLabel = nextPointLabel(current)
          }

          newPoints.push({
            id: topCenterId,
            label: topLabel,
            entityType: 'point',
            pointKind: 'free',
            position: topPos,
            createdByTool: 'cylinder',
            dependsOn: [],
            locked: false,
            visible: true,
            selectable: true,
          })
        }

        const solid: ManualSolid = {
          id: solidId,
          label: `Trụ ${current.solids.length + 1}`,
          entityType: 'solid',
          solidType: 'cylinder',
          radius,
          height,
          centerPointId: baseCircleId ? undefined : centerPointId,
          baseCircleId,
          apexPointId: topCenterId,
          createdByTool: 'cylinder',
          dependsOn: [
            ...(baseCircleId ? [baseCircleId] : (centerPointId ? [centerPointId] : [])),
            topCenterId,
          ],
          locked: false,
          visible: true,
          selectable: true,
        }

        return {
          ...current,
          points: [...current.points, ...newPoints],
          solids: [...current.solids, solid],
        }
      })

      setManualSelection({ kind: 'solid', id: solidId })
      return solidId
    },
    [commitManualDocument],
  )

  const renameManualEntity = useCallback(
    (kind: 'point' | 'segment' | 'polygon' | 'solid' | 'circle', id: string, label: string) => {
      const nextLabel = label.trim()
      if (!nextLabel) return
      commitManualDocument((current) => {
        if (kind === 'point') {
          const oldPoint = current.points.find((p) => p.id === id)
          if (!oldPoint) return current
          const oldLabel = oldPoint.label
          const nextPoints = mapEntities(current.points, id, (point) => ({ ...point, label: nextLabel }))

          const nextSegments = current.segments.map((seg) => {
            if (seg.startPointId === id || seg.endPointId === id) {
              const startP = nextPoints.find((p) => p.id === seg.startPointId)
              const endP = nextPoints.find((p) => p.id === seg.endPointId)
              if (startP && endP) {
                const oldStartL = seg.startPointId === id ? oldLabel : startP.label
                const oldEndL = seg.endPointId === id ? oldLabel : endP.label
                const defaultLabel1 = `${oldStartL}${oldEndL}`
                const defaultLabel2 = `${oldEndL}${oldStartL}`

                if (!seg.label || seg.label === defaultLabel1 || seg.label === defaultLabel2) {
                  return { ...seg, label: `${startP.label}${endP.label}` }
                }
              }
            }
            return seg
          })

          return {
            ...current,
            points: nextPoints,
            segments: nextSegments,
          }
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
      autoRevertToSelect,
      setAutoRevertToSelect,
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
      updatePointT,
      updateSegmentLength,
      updateSolidHeight,
      updateCircleRadius,
      createCircleAngleDependentPoint,
      createSphereAngleDependentPoint,
      updatePointAngle,
      createSegment,
      createPolygon,
      createBox,
      createCube,
      createPyramid,
      createRegularPyramid,
      createPrism,
      createSphere,
      createCone,
      createCylinder,
      saveManualState,
      createMidpoint,
      createIntersection,
      createProjection,
      createProjectionByPoints,
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
      addSphereRing,
      removeSphereRing,
      updateSphereRingOrientation,
    }),
    [
      activeTool,
      autoRevertToSelect,
      bitmaskVisibility,
      cameraControls,
      cancelManualDraft,
      createBox,
      createCube,
      createPointFromTarget,
      createPolygon,
      createPrism,
      createPyramid,
      createRegularPyramid,
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
      updatePointT,
      updateSegmentLength,
      updateSolidHeight,
      updateCircleRadius,
      createCircleAngleDependentPoint,
      createSphereAngleDependentPoint,
      updatePointAngle,
      validation,
      workspaceMode,
      saveManualState,
      createMidpoint,
      createIntersection,
      createProjection,
      createProjectionByPoints,
      createCentroid,
      createPerpendicularBisector,
      createAngleBisector,
      createParallelLine,
      createPerpendicularLine,
      addSphereRing,
      removeSphereRing,
      updateSphereRingOrientation,
    ],
  )

  if (typeof window !== 'undefined') {
    (window as any).debugGeometryContext = contextValue
  }

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
