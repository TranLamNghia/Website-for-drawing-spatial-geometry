'use client'

import type { GeometryData } from './geometry-context'

export type Vec3 = [number, number, number]

export type ManualTool =
  | 'select'
  | 'point'
  | 'segment'
  | 'polygon'
  | 'box'
  | 'cube'
  | 'pyramid'
  | 'regularPyramid'
  | 'rightPyramid'
  | 'prism'
  | 'sphere'
  | 'cone'
  | 'cylinder'
  | 'midpoint'
  | 'intersection'
  | 'projection'
  | 'regularPolygon'
  | 'specialTriangle'
  | 'specialQuadrilateral'
  | 'circle'
  | 'centroid'
  | 'perpendicularBisector'
  | 'angleBisector'
  | 'parallelLine'
  | 'perpendicularLine'
  | 'slice'

export type ManualSelection =
  | { kind: 'point' | 'segment' | 'polygon' | 'solid' | 'circle'; id: string }
  | null

export interface ManualEntityMeta {
  id: string
  label: string
  createdByTool: ManualTool
  dependsOn: string[]
  locked: boolean
  visible: boolean
  selectable: boolean
  trackable?: boolean
}

export interface ManualPoint extends ManualEntityMeta {
  entityType: 'point'
  pointKind:
    | 'free'
    | 'segment'
    | 'midpoint'
    | 'intersection'
    | 'projection'
    | 'regularPolygonVertex'
    | 'perpendicularLinePoint'
    | 'bisectorLinePoint'
    | 'specialShapeVertex'
    | 'centroid'
    | 'angleBisectorPoint'
    | 'parallelLinePoint'
    | 'solidVertex'
    | 'spherePoint'
    | 'circlePoint'
    | 'circleAngleDependent'
    | 'sphereRingPoint'
    | 'sphereAngleDependent'
    | 'conePoint'
    | 'cylinderPoint'
    | 'facePoint'
  position: Vec3
  segmentId?: string
  t?: number
  ratio?: number
  u?: number
  v?: number
  angle?: number
  sourcePointIds?: string[]
  sourceSegmentIds?: [string, string]
  sourcePointId?: string
  sourceSegmentId?: string
  targetSegmentId?: string
  targetPolygonId?: string
  targetPointIds?: string[]
  sideIndex?: number
  totalSides?: number
  anchorPointId?: string
  shapeType?:
    | 'parallelogram_D'
    | 'rectangle_C'
    | 'rhombus_C'
    | 'rhombus_D'
    | 'rightIsosceles_C'
    | 'equilateral_C'
    | 'square_C'
    | 'square_D'
  solidId?: string
  circleId?: string
  angleOffset?: number
  vertexIndex?: number
  flip?: number
}

export interface ManualSegment extends ManualEntityMeta {
  entityType: 'segment'
  startPointId: string
  endPointId: string
}

export interface ManualPolygon extends ManualEntityMeta {
  entityType: 'polygon'
  pointIds: string[]
  internal?: boolean
}

export interface ManualCircle extends ManualEntityMeta {
  entityType: 'circle'
  circleKind: 'threePoints' | 'centerRadius' | 'centerPoint'
  centerPointId?: string
  radiusPointId?: string
  radius?: number
  sourcePointIds?: string[]
}

export interface ManualCut {
  id: string
  planePointIds: string[]
  visible: boolean
}

export interface ManualSolid extends ManualEntityMeta {
  entityType: 'solid'
  solidType: 'box' | 'cube' | 'pyramid' | 'regularPyramid' | 'prism' | 'sphere' | 'cone' | 'cylinder'
  height?: number
  radius?: number
  cornerPointIds?: string[]
  basePolygonId?: string
  baseCircleId?: string
  centerPointId?: string
  apexPointId?: string
  apexAnchorPointId?: string
  topPointId?: string
  radiusPointId?: string
  sphereRings?: {
    id: string
    phi: number
    theta: number
  }[]
  cuts?: ManualCut[]
}

export interface ManualDocument {
  points: ManualPoint[]
  segments: ManualSegment[]
  polygons: ManualPolygon[]
  solids: ManualSolid[]
  circles: ManualCircle[]
}

export interface ManualSnapTarget {
  kind: 'point' | 'midpoint' | 'segment' | 'workplane' | 'sphere' | 'circle' | 'solid'
  label: string
  position: Vec3
  pointId?: string
  segmentId?: string
  circleId?: string
  solidId?: string
  facePointIds?: string[]
  t?: number
}

export interface ManualDraft {
  tool: ManualTool
  pointIds?: string[]
  segmentIds?: string[]
  basePolygonId?: string | null
  baseCircleId?: string | null
  height?: number
  heightManuallySet?: boolean
  radius?: number
  centerPointId?: string | null
  apexPointId?: string | null
  apexAnchorPointId?: string | null
  topPointId?: string | null
  radiusPointId?: string | null
  previewPosition?: Vec3 | null
  snapTarget?: ManualSnapTarget | null
  targetId?: string | null
}

export interface ManualPointInfo {
  coords: Vec3
  relation: string
}

export interface ManualSegmentInfo {
  startLabel: string
  endLabel: string
  length: number
  formula: string
}

export interface ManualPolygonInfo {
  labels: string[]
  perimeter: number
  area: number
  normal: Vec3
  formula: string
}

export interface ManualSolidInfo {
  solidType: ManualSolid['solidType']
  baseLabel: string
  height: number
  baseArea: number
  volume: number
  formula: string
  vertexCount: number
  faceCount: number
}

export interface ManualDisplayPoint {
  id: string
  label: string
  position: Vec3
  sourceKind: 'point' | 'solid'
  sourceId: string
  selectable: boolean
  generated: boolean
  visible: boolean
}

export interface ManualDisplaySegment {
  id: string
  label: string
  start: Vec3
  end: Vec3
  sourceKind: 'segment' | 'polygon' | 'solid'
  sourceId: string
  visible: boolean
}

export interface ManualDisplayPolygon {
  id: string
  label: string
  points: Vec3[]
  pointIds?: string[]
  sourceKind: 'polygon' | 'solid'
  sourceId: string
  fillColor: string
  opacity: number
  visible: boolean
  isVirtual?: boolean
}

export interface ManualDisplayCircle {
  id: string
  label: string
  center: Vec3
  radius: number
  normal: Vec3
  sourceKind: 'circle' | 'solid'
  sourceId: string
  visible: boolean
}

export interface ManualDerived {
  geometry: GeometryData
  pointPositions: Record<string, Vec3>
  displayPoints: ManualDisplayPoint[]
  displaySegments: ManualDisplaySegment[]
  displayPolygons: ManualDisplayPolygon[]
  displayCircles: ManualDisplayCircle[]
  pointInfo: Record<string, ManualPointInfo>
  segmentInfo: Record<string, ManualSegmentInfo>
  polygonInfo: Record<string, ManualPolygonInfo>
  solidInfo: Record<string, ManualSolidInfo>
}

export interface ManualProjectSnapshot {
  mode: 'manual'
  schemaVersion?: number
  manualDocument: ManualDocument
  viewState?: {
    showAxes?: boolean
    showGrid?: boolean
    showLabels?: boolean
    cameraControls?: {
      rotateX: number
      rotateY: number
      zoom: number
      panX: number
      panY: number
    }
    bitmaskVisibility?: Record<string, boolean>
    orderedSectionIds?: string[]
    explodeAmount?: number
  }
  previewGeometryData?: GeometryData | null
  source?: {
    kind: 'manual' | 'ai-import'
    problemText?: string
    importedAt?: string
    warnings?: string[]
    construction?: unknown
  }
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

function round(value: number, digits = 3) {
  return Number(value.toFixed(digits))
}

function cloneVec3(vec: Vec3): Vec3 {
  return [vec[0], vec[1], vec[2]]
}

export function addVec3(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
}

export function scaleVec3(vec: Vec3, scalar: number): Vec3 {
  return [vec[0] * scalar, vec[1] * scalar, vec[2] * scalar]
}

function lerpVec3(a: Vec3, b: Vec3, t: number): Vec3 {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ]
}

export function distance(a: Vec3, b: Vec3) {
  return Math.sqrt(
    (a[0] - b[0]) ** 2 +
      (a[1] - b[1]) ** 2 +
      (a[2] - b[2]) ** 2,
  )
}

export function dotVec3(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

export function crossVec3(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ]
}

export function subVec3(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
}

export function lineLineIntersection3D(a1: Vec3, a2: Vec3, b1: Vec3, b2: Vec3): Vec3 | null {
  const d1 = subVec3(a2, a1)
  const d2 = subVec3(b2, b1)
  const w = subVec3(a1, b1)
  const a = dotVec3(d1, d1)
  const b = dotVec3(d1, d2)
  const c = dotVec3(d2, d2)
  const d = dotVec3(d1, w)
  const e = dotVec3(d2, w)
  const denom = a * c - b * b
  if (Math.abs(denom) < 1e-10) return null
  const s = (b * e - c * d) / denom
  const t = (a * e - b * d) / denom
  const closest1: Vec3 = [a1[0] + s * d1[0], a1[1] + s * d1[1], a1[2] + s * d1[2]]
  const closest2: Vec3 = [b1[0] + t * d2[0], b1[1] + t * d2[1], b1[2] + t * d2[2]]
  const dist = distance(closest1, closest2)
  if (dist > 0.05) return null
  return [(closest1[0] + closest2[0]) / 2, (closest1[1] + closest2[1]) / 2, (closest1[2] + closest2[2]) / 2]
}

export function projectPointOnLine(point: Vec3, lineStart: Vec3, lineEnd: Vec3): Vec3 {
  const d = subVec3(lineEnd, lineStart)
  const w = subVec3(point, lineStart)
  const lenSq = dotVec3(d, d)
  if (lenSq < 1e-12) return cloneVec3(lineStart)
  const t = dotVec3(w, d) / lenSq
  return [lineStart[0] + t * d[0], lineStart[1] + t * d[1], lineStart[2] + t * d[2]]
}

export function projectPointOnPlane(point: Vec3, p1: Vec3, p2: Vec3, p3: Vec3): Vec3 {
  const v1 = subVec3(p2, p1)
  const v2 = subVec3(p3, p1)
  const normal = crossVec3(v1, v2)
  const normalLenSq = dotVec3(normal, normal)
  if (normalLenSq < 1e-12) return cloneVec3(point)
  const w = subVec3(point, p1)
  const dist = dotVec3(w, normal) / normalLenSq
  return [point[0] - dist * normal[0], point[1] - dist * normal[1], point[2] - dist * normal[2]]
}

export function circleThreePoints3D(a: Vec3, b: Vec3, c: Vec3): { center: Vec3; radius: number; normal: Vec3 } | null {
  const v1 = subVec3(b, a)
  const v2 = subVec3(c, a)
  const v12 = crossVec3(v1, v2)
  const len12Sq = dotVec3(v12, v12)
  if (len12Sq < 1e-12) return null
  const len12 = Math.sqrt(len12Sq)
  const normal: Vec3 = [v12[0] / len12, v12[1] / len12, v12[2] / len12]

  const len1Sq = dotVec3(v1, v1)
  const len2Sq = dotVec3(v2, v2)

  const term1 = scaleVec3(v1, len2Sq)
  const term2 = scaleVec3(v2, len1Sq)
  const diff = subVec3(term1, term2)
  const crossDiff = crossVec3(v12, diff)

  const offset = scaleVec3(crossDiff, 1 / (2 * len12Sq))
  const center = addVec3(a, offset)
  const radius = distance(center, a)
  return { center, radius, normal }
}

export function centroid(points: Vec3[]): Vec3 {
  if (!points.length) return [0, 0, 0]
  const total = points.reduce<Vec3>(
    (acc, point) => addVec3(acc, point),
    [0, 0, 0],
  )
  return [
    total[0] / points.length,
    total[1] / points.length,
    total[2] / points.length,
  ]
}

function polygonArea2D(points: Vec3[]) {
  if (points.length < 3) return 0
  let sum = 0
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index]
    const next = points[(index + 1) % points.length]
    sum += current[0] * next[1] - next[0] * current[1]
  }
  return Math.abs(sum) * 0.5
}

function polygonPerimeter(points: Vec3[]) {
  if (points.length < 2) return 0
  let total = 0
  for (let index = 0; index < points.length; index += 1) {
    total += distance(points[index], points[(index + 1) % points.length])
  }
  return total
}

function formatVec3(point: Vec3) {
  return `(${round(point[0])}, ${round(point[1])}, ${round(point[2])})`
}

function emptyGeometry(): GeometryData {
  return {
    points: {},
    edges: [],
    planes: [],
    is_consistent: true,
    queries: [],
  }
}

export function createEmptyManualDocument(): ManualDocument {
  return {
    points: [],
    segments: [],
    polygons: [],
    solids: [],
    circles: [],
  }
}

export function isManualProjectSnapshot(value: unknown): value is ManualProjectSnapshot {
  return !!value &&
    typeof value === 'object' &&
    (value as ManualProjectSnapshot).mode === 'manual' &&
    !!(value as ManualProjectSnapshot).manualDocument
}

export function serializeManualProject(
  manualDocument: ManualDocument,
  viewState?: ManualProjectSnapshot['viewState'],
  extras?: Partial<Pick<ManualProjectSnapshot, 'schemaVersion' | 'previewGeometryData' | 'source'>>,
) {
  return JSON.stringify({
    mode: 'manual',
    schemaVersion: extras?.schemaVersion ?? 2,
    manualDocument,
    viewState,
    previewGeometryData: extras?.previewGeometryData ?? null,
    source: extras?.source,
  } satisfies ManualProjectSnapshot)
}

export function nextPointLabel(document: ManualDocument) {
  const usedLabels = new Set(document.points.map((point) => point.label))
  for (let pass = 0; pass < 10; pass += 1) {
    for (const letter of LETTERS) {
      const candidate = pass === 0 ? letter : `${letter}${pass}`
      if (!usedLabels.has(candidate)) return candidate
    }
  }
  return `P${document.points.length + 1}`
}

export function createEntityId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`
}

export function rotateVector3D(v: Vec3, angleRad: number): Vec3 {
  const lenSq = v[0] * v[0] + v[1] * v[1] + v[2] * v[2]
  if (lenSq < 1e-9) return [0, 0, 0]
  const len = Math.sqrt(lenSq)
  const u: Vec3 = [v[0] / len, v[1] / len, v[2] / len]
  
  let w: Vec3
  const xyLenSq = u[0] * u[0] + u[1] * u[1]
  if (xyLenSq > 1e-9) {
    const xyLen = Math.sqrt(xyLenSq)
    w = [-u[1] / xyLen, u[0] / xyLen, 0]
  } else {
    w = [1, 0, 0]
  }
  
  const cosT = Math.cos(angleRad)
  const sinT = Math.sin(angleRad)
  
  return [
    len * (cosT * u[0] + sinT * w[0]),
    len * (cosT * u[1] + sinT * w[1]),
    len * (cosT * u[2] + sinT * w[2]),
  ]
}

export function resolvePointPositions(document: ManualDocument) {
  const pointMap = new Map(document.points.map((point) => [point.id, point]))
  const positions: Record<string, Vec3> = {}

  
  const resolveSegmentEndpoints = (segId: string, visiting: Set<string>): [Vec3, Vec3] | null => {
    const seg = document.segments.find((s) => s.id === segId)
    if (seg) {
      return [resolvePoint(seg.startPointId, visiting), resolvePoint(seg.endPointId, visiting)]
    }
    if (segId.includes('_edge_')) {
      const match = segId.match(/^(.*)_edge_(\d+)$/)
      if (match) {
        const polyId = match[1]
        const edgeIdx = parseInt(match[2], 10)
        const poly = document.polygons.find(p => p.id === polyId)
        if (poly && poly.pointIds.length > edgeIdx) {
          const p1Id = poly.pointIds[edgeIdx]
          const p2Id = poly.pointIds[(edgeIdx + 1) % poly.pointIds.length]
          return [resolvePoint(p1Id, visiting), resolvePoint(p2Id, visiting)]
        }
        
        const solid = document.solids.find(s => s.id === polyId)
        if (solid && (solid.solidType === 'box' || solid.solidType === 'cube')) {
          const allPointIds = Array(8).fill('')
          if (solid.cornerPointIds) {
            allPointIds[0] = solid.cornerPointIds[0]
            allPointIds[1] = solid.cornerPointIds[1]
            if (solid.cornerPointIds[2]) allPointIds[2] = solid.cornerPointIds[2]
          }
          document.points.forEach(p => {
            if (p.pointKind === 'solidVertex' && p.solidId === solid.id && p.vertexIndex !== undefined) {
              allPointIds[p.vertexIndex] = p.id
            }
          })
          const edgePairs = [
            [0, 1], [1, 2], [2, 3], [3, 0],
            [4, 5], [5, 6], [6, 7], [7, 4],
            [0, 4], [1, 5], [2, 6], [3, 7],
          ]
          if (edgePairs[edgeIdx]) {
            return [resolvePoint(allPointIds[edgePairs[edgeIdx][0]], visiting), resolvePoint(allPointIds[edgePairs[edgeIdx][1]], visiting)]
          }
        }
      }
    }

    if (segId.includes('_base_') || segId.includes('_top_') || segId.includes('_side_')) {
      const match = segId.match(/^(.*)_(base|top|side)_(\d+)$/)
      if (match) {
        const solidId = match[1]
        const edgeType = match[2]
        const edgeIdx = parseInt(match[3], 10)
        const solid = document.solids.find(s => s.id === solidId)
        
        if (solid && solid.solidType === 'prism' && solid.basePolygonId) {
          const basePoly = document.polygons.find(p => p.id === solid.basePolygonId)
          if (basePoly) {
            const basePoints = basePoly.pointIds
            const n = basePoints.length
            // Build topPointIds with explicit index mapping to handle oblique prisms
            // where index-0 top vertex is solid.topPointId (a free point, not a solidVertex)
            const topPoints: string[] = new Array(n).fill('')
            if (solid.topPointId) topPoints[0] = solid.topPointId
            document.points.forEach(p => {
              if (p.pointKind === 'solidVertex' && p.solidId === solid.id && p.vertexIndex !== undefined && p.vertexIndex >= n) {
                topPoints[p.vertexIndex - n] = p.id
              }
            })

            if (edgeType === 'base') {
              return [resolvePoint(basePoints[edgeIdx], visiting), resolvePoint(basePoints[(edgeIdx + 1) % n], visiting)]
            } else if (edgeType === 'top') {
              return [resolvePoint(topPoints[edgeIdx], visiting), resolvePoint(topPoints[(edgeIdx + 1) % n], visiting)]
            } else if (edgeType === 'side') {
              return [resolvePoint(basePoints[edgeIdx], visiting), resolvePoint(topPoints[edgeIdx], visiting)]
            }
          }
        }
        
        if (solid && (solid.solidType === 'pyramid' || solid.solidType === 'regularPyramid') && solid.basePolygonId) {
          const basePoly = document.polygons.find(p => p.id === solid.basePolygonId)
          if (basePoly) {
            const basePoints = basePoly.pointIds
            const apexId = solid.apexPointId ?? document.points.find(p => p.pointKind === 'solidVertex' && p.solidId === solid.id && p.vertexIndex === 0)?.id
            if (apexId) {
              if (edgeType === 'base') {
                return [resolvePoint(basePoints[edgeIdx], visiting), resolvePoint(basePoints[(edgeIdx + 1) % basePoints.length], visiting)]
              } else if (edgeType === 'side') {
                return [resolvePoint(basePoints[edgeIdx], visiting), resolvePoint(apexId, visiting)]
              }
            }
          }
        }
      }
    }
    return null
  }

  const resolvePoint = (pointId: string, visiting = new Set<string>()): Vec3 => {
    if (positions[pointId]) return positions[pointId]
    const point = pointMap.get(pointId)
    if (!point) return [0, 0, 0]
    if (visiting.has(pointId)) return cloneVec3(point.position)
    visiting.add(pointId)

    if (point.pointKind === 'solidVertex' && point.solidId && point.vertexIndex !== undefined) {
      const solid = document.solids.find((s) => s.id === point.solidId)
      if (solid) {
        if (solid.solidType === 'box' && solid.cornerPointIds) {
          const pA = resolvePoint(solid.cornerPointIds[0], visiting)
          const pB = resolvePoint(solid.cornerPointIds[1], visiting)
          const pC = solid.cornerPointIds[2] ? resolvePoint(solid.cornerPointIds[2], visiting) : pB
          const baseA: Vec3 = [pA[0], pA[1], pA[2]]
          const baseB: Vec3 = [pB[0], pB[1], pB[2]]
          const baseC: Vec3 = [pC[0], pC[1], pC[2]]
          const baseD: Vec3 = [pA[0] + pC[0] - pB[0], pA[1] + pC[1] - pB[1], pA[2] + pC[2] - pB[2]]
          const h = solid.height ?? 4
          const pts = [
            baseA, baseB, baseC, baseD,
            [baseA[0], baseA[1], baseA[2] + h],
            [baseB[0], baseB[1], baseB[2] + h],
            [baseC[0], baseC[1], baseC[2] + h],
            [baseD[0], baseD[1], baseD[2] + h],
          ]
          positions[pointId] = pts[point.vertexIndex] as Vec3
          visiting.delete(pointId)
          return positions[pointId]
        } else if (solid.solidType === 'cube' && solid.cornerPointIds) {
          const pA = resolvePoint(solid.cornerPointIds[0], visiting)
          const pB = resolvePoint(solid.cornerPointIds[1], visiting)
          const baseA: Vec3 = [pA[0], pA[1], pA[2]]
          const baseB: Vec3 = [pB[0], pB[1], pB[2]]
          
          const E = [baseB[0] - baseA[0], baseB[1] - baseA[1], baseB[2] - baseA[2]]
          const D_vec: Vec3 = [-E[1], E[0], 0]
          const lenD = Math.hypot(D_vec[0], D_vec[1])
          const lenE = Math.hypot(E[0], E[1], E[2])
          const D_norm = lenD > 1e-9 ? [D_vec[0]/lenD, D_vec[1]/lenD, 0] as Vec3 : [0, 1, 0] as Vec3
          
          const baseD: Vec3 = [baseA[0] + D_norm[0] * lenE, baseA[1] + D_norm[1] * lenE, baseA[2]]
          const baseC: Vec3 = [baseB[0] + D_norm[0] * lenE, baseB[1] + D_norm[1] * lenE, baseB[2]]
          const h = lenE
          const pts = [
            baseA, baseB, baseC, baseD,
            [baseA[0], baseA[1], baseA[2] + h],
            [baseB[0], baseB[1], baseB[2] + h],
            [baseC[0], baseC[1], baseC[2] + h],
            [baseD[0], baseD[1], baseD[2] + h],
          ]
          positions[pointId] = pts[point.vertexIndex] as Vec3
          visiting.delete(pointId)
          return positions[pointId]
        } else if (solid.solidType === 'regularPyramid' && solid.basePolygonId) {
          const basePoly = document.polygons.find((p) => p.id === solid.basePolygonId)
          if (basePoly) {
            const basePoints = basePoly.pointIds.map((id) => resolvePoint(id, visiting))
            const c = centroid(basePoints)
            if (point.vertexIndex === 0) {
              const normal = getPolygonNormal(basePoints)
              const h = solid.height ?? 4
              positions[pointId] = [
                c[0] + normal[0] * h,
                c[1] + normal[1] * h,
                c[2] + normal[2] * h
              ]
              visiting.delete(pointId)
              return positions[pointId]
            }
          }
        } else if (solid.solidType === 'pyramid' && solid.basePolygonId) {
          const basePoly = document.polygons.find((p) => p.id === solid.basePolygonId)
          if (basePoly) {
            const basePoints = basePoly.pointIds.map((id) => resolvePoint(id, visiting))
            const c = centroid(basePoints)
            if (point.vertexIndex === 0) {
              const normal = getPolygonNormal(basePoints)
              if (solid.apexAnchorPointId) {
                const anchorPt = resolvePoint(solid.apexAnchorPointId, visiting)
                if (anchorPt) {
                  positions[pointId] = [
                    anchorPt[0] + normal[0] * (solid.height ?? 4),
                    anchorPt[1] + normal[1] * (solid.height ?? 4),
                    anchorPt[2] + normal[2] * (solid.height ?? 4)
                  ]
                  visiting.delete(pointId)
                  return positions[pointId]
                }
              }
              const hasApex = !!(solid.apexPointId && pointMap.has(solid.apexPointId))
              positions[pointId] = hasApex
                ? resolvePoint(solid.apexPointId!, visiting)
                : addVec3(c, scaleVec3(normal, solid.height ?? 4))
            } else {
              positions[pointId] = basePoints[point.vertexIndex - 1] as Vec3
            }
            visiting.delete(pointId)
            return positions[pointId]
          }
        } else if (solid.solidType === 'prism' && solid.basePolygonId) {
          const basePoly = document.polygons.find((p) => p.id === solid.basePolygonId)
          if (basePoly) {
            const basePoints = basePoly.pointIds.map((id) => resolvePoint(id, visiting))
            const n = basePoints.length
            if (point.vertexIndex < n) {
              positions[pointId] = basePoints[point.vertexIndex] as Vec3
            } else {
              const hasTop = !!(solid.topPointId && pointMap.has(solid.topPointId))
              const normal = getPolygonNormal(basePoints)
              const topOffset = hasTop
                ? subVec3(resolvePoint(solid.topPointId!, visiting), basePoints[0])
                : scaleVec3(normal, solid.height ?? 4)
              positions[pointId] = addVec3(basePoints[point.vertexIndex - n], topOffset) as Vec3
            }
            visiting.delete(pointId)
            return positions[pointId]
          }
        }
      }
    }

    if (point.pointKind === 'segment' && point.segmentId) {
      const endpoints = resolveSegmentEndpoints(point.segmentId, visiting)
      if (endpoints) {
        const [start, end] = endpoints
        positions[pointId] = lerpVec3(start, end, point.t ?? 0.5)
        visiting.delete(pointId)
        return positions[pointId]
      }
    }

    if (point.pointKind === 'midpoint' && point.sourcePointIds) {
      const posA = resolvePoint(point.sourcePointIds[0], visiting)
      const posB = resolvePoint(point.sourcePointIds[1], visiting)
      positions[pointId] = [(posA[0] + posB[0]) / 2, (posA[1] + posB[1]) / 2, (posA[2] + posB[2]) / 2]
      visiting.delete(pointId)
      return positions[pointId]
    }

    if (point.pointKind === 'intersection' && point.sourceSegmentIds) {
      const epsA = resolveSegmentEndpoints(point.sourceSegmentIds![0], visiting)
      const epsB = resolveSegmentEndpoints(point.sourceSegmentIds![1], visiting)
      if (epsA && epsB) {
        const [a1, a2] = epsA
        const [b1, b2] = epsB
        const ix = lineLineIntersection3D(a1, a2, b1, b2)
        if (ix) {
          positions[pointId] = ix
          visiting.delete(pointId)
          return positions[pointId]
        }
      }
    }

    if (point.pointKind === 'projection' && point.sourcePointId) {
      if (point.targetSegmentId) {
        const eps = resolveSegmentEndpoints(point.targetSegmentId, visiting)
        if (eps) {
          const src = resolvePoint(point.sourcePointId, visiting)
          const [ls, le] = eps
          positions[pointId] = projectPointOnLine(src, ls, le)
          visiting.delete(pointId)
          return positions[pointId]
        }
      }
      if (point.targetPolygonId) {
        const poly = document.polygons.find((p) => p.id === point.targetPolygonId)
        if (poly && poly.pointIds.length >= 3) {
          const src = resolvePoint(point.sourcePointId, visiting)
          const pp = poly.pointIds.slice(0, 3).map((pid) => resolvePoint(pid, visiting))
          positions[pointId] = projectPointOnPlane(src, pp[0], pp[1], pp[2])
          visiting.delete(pointId)
          return positions[pointId]
        }
      }
      if (point.targetPointIds && point.targetPointIds.length >= 2) {
        const src = resolvePoint(point.sourcePointId, visiting)
        if (point.targetPointIds.length === 2) {
          const ls = resolvePoint(point.targetPointIds[0], visiting)
          const le = resolvePoint(point.targetPointIds[1], visiting)
          positions[pointId] = projectPointOnLine(src, ls, le)
          visiting.delete(pointId)
          return positions[pointId]
        } else if (point.targetPointIds.length >= 3) {
          const p1 = resolvePoint(point.targetPointIds[0], visiting)
          const p2 = resolvePoint(point.targetPointIds[1], visiting)
          const p3 = resolvePoint(point.targetPointIds[2], visiting)
          positions[pointId] = projectPointOnPlane(src, p1, p2, p3)
          visiting.delete(pointId)
          return positions[pointId]
        }
      }
    }
    if (point.pointKind === 'regularPolygonVertex' && point.sourcePointIds && point.sourcePointIds.length >= 2) {
      const posA = resolvePoint(point.sourcePointIds[0], visiting)
      const posB = resolvePoint(point.sourcePointIds[1], visiting)
      const n = point.totalSides ?? 5
      const idx = point.sideIndex ?? 2
      const L = distance(posA, posB)
      const M = scaleVec3(addVec3(posA, posB), 0.5)
      const E = subVec3(posB, posA)
      const N: Vec3 = [0, 0, 1] // base normal (default Oxy workplane)
      const crossNE = crossVec3(N, E)
      const lenCross = Math.hypot(crossNE[0], crossNE[1], crossNE[2])
      const P = lenCross > 1e-9 ? scaleVec3(crossNE, 1 / lenCross) : [0, 1, 0] as Vec3
      const h = L / (2 * Math.tan(Math.PI / n))
      const O = addVec3(M, scaleVec3(P, h))

      const angle = (idx * 2 * Math.PI) / n
      const v = subVec3(posA, O)
      const cosA = Math.cos(angle)
      const sinA = Math.sin(angle)
      const crossNv = crossVec3(N, v)
      const vRot: Vec3 = [
        v[0] * cosA + crossNv[0] * sinA,
        v[1] * cosA + crossNv[1] * sinA,
        v[2] * cosA + crossNv[2] * sinA,
      ]
      positions[pointId] = addVec3(O, vRot)
      visiting.delete(pointId)
      return positions[pointId]
    }

    if (point.pointKind === 'perpendicularLinePoint' && point.sourceSegmentId && point.anchorPointId) {
      const eps = resolveSegmentEndpoints(point.sourceSegmentId, visiting)
      if (eps) {
        const [posStart, posEnd] = eps
        const anchor = resolvePoint(point.anchorPointId, visiting)
        const E = subVec3(posEnd, posStart)
        const D: Vec3 = [-E[1], E[0], 0]
        const lenD = Math.hypot(D[0], D[1])
        const D_norm = lenD > 1e-9 ? scaleVec3(D, 1 / lenD) : [0, 1, 0] as Vec3
        positions[pointId] = addVec3(anchor, scaleVec3(D_norm, point.t ?? 0))
        visiting.delete(pointId)
        return positions[pointId]
      }
    }

    if (point.pointKind === 'bisectorLinePoint' && point.sourcePointIds && point.sourcePointIds.length >= 2) {
      const posA = resolvePoint(point.sourcePointIds[0], visiting)
      const posB = resolvePoint(point.sourcePointIds[1], visiting)
      const M = scaleVec3(addVec3(posA, posB), 0.5)
      const E = subVec3(posB, posA)
      const D: Vec3 = [-E[1], E[0], 0]
      const lenD = Math.hypot(D[0], D[1])
      const D_norm = lenD > 1e-9 ? scaleVec3(D, 1 / lenD) : [0, 1, 0] as Vec3
      positions[pointId] = addVec3(M, scaleVec3(D_norm, point.t ?? 0))
      visiting.delete(pointId)
      return positions[pointId]
    }

    if (point.pointKind === 'specialShapeVertex' && point.sourcePointIds) {
      if (point.shapeType === 'parallelogram_D' && point.sourcePointIds.length >= 3) {
        const posA = resolvePoint(point.sourcePointIds[0], visiting)
        const posB = resolvePoint(point.sourcePointIds[1], visiting)
        const posC = resolvePoint(point.sourcePointIds[2], visiting)
        positions[pointId] = addVec3(posA, subVec3(posC, posB))
        visiting.delete(pointId)
        return positions[pointId]
      }
      if (point.shapeType === 'rectangle_C' && point.sourcePointIds.length >= 2) {
        const posA = resolvePoint(point.sourcePointIds[0], visiting)
        const posB = resolvePoint(point.sourcePointIds[1], visiting)
        const E = subVec3(posB, posA)
        const D_vec = rotateVector3D(E, Math.PI / 2)
        const lenD = Math.hypot(D_vec[0], D_vec[1], D_vec[2])
        const D_norm = lenD > 1e-9 ? scaleVec3(D_vec, 1 / lenD) : [0, 1, 0] as Vec3
        positions[pointId] = addVec3(posB, scaleVec3(D_norm, point.t ?? 4))
        visiting.delete(pointId)
        return positions[pointId]
      }
      if (point.shapeType === 'rhombus_C' && point.sourcePointIds.length >= 2) {
        const posA = resolvePoint(point.sourcePointIds[0], visiting)
        const posB = resolvePoint(point.sourcePointIds[1], visiting)
        const E = subVec3(posA, posB) // vector BA
        const theta = point.t ?? (Math.PI / 3) // 60 deg default
        const E_rot = rotateVector3D(E, theta)
        positions[pointId] = addVec3(posB, E_rot)
        visiting.delete(pointId)
        return positions[pointId]
      }
      if (point.shapeType === 'rhombus_D' && point.sourcePointIds.length >= 3) {
        const posA = resolvePoint(point.sourcePointIds[0], visiting)
        const posB = resolvePoint(point.sourcePointIds[1], visiting)
        const posC = resolvePoint(point.sourcePointIds[2], visiting)
        positions[pointId] = addVec3(posA, subVec3(posC, posB)) // D = A + C - B
        visiting.delete(pointId)
        return positions[pointId]
      }
      if (point.shapeType === 'rightIsosceles_C' && point.sourcePointIds.length >= 2) {
        const posA = resolvePoint(point.sourcePointIds[0], visiting)
        const posB = resolvePoint(point.sourcePointIds[1], visiting)
        const v = subVec3(posB, posA)
        const flip = point.flip ?? 1
        const vRot = rotateVector3D(v, (Math.PI / 2) * flip)
        positions[pointId] = addVec3(posA, vRot)
        visiting.delete(pointId)
        return positions[pointId]
      }
      if (point.shapeType === 'equilateral_C' && point.sourcePointIds.length >= 2) {
        const posA = resolvePoint(point.sourcePointIds[0], visiting)
        const posB = resolvePoint(point.sourcePointIds[1], visiting)
        const v = subVec3(posB, posA)
        const flip = point.flip ?? 1
        const vRot = rotateVector3D(v, (Math.PI / 3) * flip)
        positions[pointId] = addVec3(posA, vRot)
        visiting.delete(pointId)
        return positions[pointId]
      }
      if (point.shapeType === 'square_C' && point.sourcePointIds.length >= 2) {
        const posA = resolvePoint(point.sourcePointIds[0], visiting)
        const posB = resolvePoint(point.sourcePointIds[1], visiting)
        const v = subVec3(posB, posA)
        const flip = point.flip ?? 1
        const vRot = rotateVector3D(v, (Math.PI / 2) * flip)
        positions[pointId] = addVec3(posB, vRot)
        visiting.delete(pointId)
        return positions[pointId]
      }
      if (point.shapeType === 'square_D' && point.sourcePointIds.length >= 2) {
        const posA = resolvePoint(point.sourcePointIds[0], visiting)
        const posB = resolvePoint(point.sourcePointIds[1], visiting)
        const v = subVec3(posB, posA)
        const flip = point.flip ?? 1
        const vRot = rotateVector3D(v, (Math.PI / 2) * flip)
        positions[pointId] = addVec3(posA, vRot)
        visiting.delete(pointId)
        return positions[pointId]
      }
    }

    if (point.pointKind === 'centroid') {
      if (point.targetPolygonId) {
        const poly = document.polygons.find((p) => p.id === point.targetPolygonId)
        if (poly && poly.pointIds.length >= 3) {
          const vertexPositions = poly.pointIds.map((pid) => resolvePoint(pid, visiting))
          positions[pointId] = centroid(vertexPositions)
          visiting.delete(pointId)
          return positions[pointId]
        }
      }
      if (point.sourcePointIds && point.sourcePointIds.length >= 3) {
        const vertexPositions = point.sourcePointIds.map((pid) => resolvePoint(pid, visiting))
        positions[pointId] = centroid(vertexPositions)
        visiting.delete(pointId)
        return positions[pointId]
      }
    }

    if (point.pointKind === 'angleBisectorPoint' && point.sourcePointIds && point.sourcePointIds.length >= 3) {
      const posA = resolvePoint(point.sourcePointIds[0], visiting)
      const posB = resolvePoint(point.sourcePointIds[1], visiting) // vertex
      const posC = resolvePoint(point.sourcePointIds[2], visiting)

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
        positions[pointId] = addVec3(posB, scaleVec3(dirNorm, point.t ?? 20))
        visiting.delete(pointId)
        return positions[pointId]
      }
    }

    if (point.pointKind === 'parallelLinePoint' && point.anchorPointId && point.sourceSegmentId) {
      const eps = resolveSegmentEndpoints(point.sourceSegmentId, visiting)
      if (eps) {
        const [posStart, posEnd] = eps
        const anchor = resolvePoint(point.anchorPointId, visiting)

        const E = subVec3(posEnd, posStart)
        const lenE = Math.hypot(E[0], E[1], E[2])
        const E_norm = lenE > 1e-9 ? scaleVec3(E, 1 / lenE) : ([1, 0, 0] as Vec3)

        positions[pointId] = addVec3(anchor, scaleVec3(E_norm, point.t ?? 0))
        visiting.delete(pointId)
        return positions[pointId]
      }
    }

    if (point.pointKind === 'circlePoint' && point.circleId) {
      const circle = document.circles.find((c) => c.id === point.circleId)
      if (circle) {
        if (circle.circleKind === 'threePoints' && circle.sourcePointIds) {
          circle.sourcePointIds.forEach(pid => resolvePoint(pid, visiting))
        } else if (circle.circleKind === 'centerRadius' && circle.centerPointId) {
          resolvePoint(circle.centerPointId, visiting)
        } else if (circle.circleKind === 'centerPoint' && circle.centerPointId && circle.radiusPointId) {
          resolvePoint(circle.centerPointId, visiting)
          resolvePoint(circle.radiusPointId, visiting)
        }
        const props = resolveCircleProps(circle, positions)
        if (props) {
          const { center, radius, normal } = props
          const t = point.t ?? 0
          
          let u: Vec3 = [1, 0, 0]
          if (Math.abs(normal[0]) > 0.9) u = [0, 1, 0]
          const w = crossVec3(normal, u)
          const w_len = Math.hypot(w[0], w[1], w[2])
          const w_norm = scaleVec3(w, w_len > 1e-9 ? 1 / w_len : 1)
          const u_new = crossVec3(w_norm, normal)
          const u_len = Math.hypot(u_new[0], u_new[1], u_new[2])
          const u_norm = scaleVec3(u_new, u_len > 1e-9 ? 1 / u_len : 1)
          
          positions[pointId] = [
            center[0] + radius * Math.cos(t) * u_norm[0] + radius * Math.sin(t) * w_norm[0],
            center[1] + radius * Math.cos(t) * u_norm[1] + radius * Math.sin(t) * w_norm[1],
            center[2] + radius * Math.cos(t) * u_norm[2] + radius * Math.sin(t) * w_norm[2],
          ]
          visiting.delete(pointId)
          return positions[pointId]
        }
      }
    }

    if (point.pointKind === 'circleAngleDependent' && point.circleId && point.sourcePointId) {
      const circle = document.circles.find((c) => c.id === point.circleId)
      if (circle) {
        if (circle.circleKind === 'threePoints' && circle.sourcePointIds) {
          circle.sourcePointIds.forEach(pid => resolvePoint(pid, visiting))
        } else if (circle.circleKind === 'centerRadius' && circle.centerPointId) {
          resolvePoint(circle.centerPointId, visiting)
        } else if (circle.circleKind === 'centerPoint' && circle.centerPointId && circle.radiusPointId) {
          resolvePoint(circle.centerPointId, visiting)
          resolvePoint(circle.radiusPointId, visiting)
        }
        const posB = resolvePoint(point.sourcePointId, visiting)
        const props = resolveCircleProps(circle, positions)
        if (props && posB) {
          const { center, radius, normal } = props
          
          let u: Vec3 = [1, 0, 0]
          if (Math.abs(normal[0]) > 0.9) u = [0, 1, 0]
          const w = crossVec3(normal, u)
          const w_len = Math.hypot(w[0], w[1], w[2])
          const w_norm = scaleVec3(w, w_len > 1e-9 ? 1 / w_len : 1)
          const u_new = crossVec3(w_norm, normal)
          const u_len = Math.hypot(u_new[0], u_new[1], u_new[2])
          const u_norm = scaleVec3(u_new, u_len > 1e-9 ? 1 / u_len : 1)
          
          const vx = posB[0] - center[0]
          const vy = posB[1] - center[1]
          const vz = posB[2] - center[2]
          const xB = vx * u_norm[0] + vy * u_norm[1] + vz * u_norm[2]
          const yB = vx * w_norm[0] + vy * w_norm[1] + vz * w_norm[2]
          const tB = Math.atan2(yB, xB)
          
          const alpha = point.angleOffset ?? 0
          const tC = tB + alpha
          
          positions[pointId] = [
            center[0] + radius * Math.cos(tC) * u_norm[0] + radius * Math.sin(tC) * w_norm[0],
            center[1] + radius * Math.cos(tC) * u_norm[1] + radius * Math.sin(tC) * w_norm[1],
            center[2] + radius * Math.cos(tC) * u_norm[2] + radius * Math.sin(tC) * w_norm[2],
          ]
          visiting.delete(pointId)
          return positions[pointId]
        }
      }
    }
    if (point.pointKind === 'sphereRingPoint' && point.solidId && point.circleId) {
      const solid = document.solids.find((s) => s.id === point.solidId)
      if (solid && solid.solidType === 'sphere' && solid.centerPointId && solid.radius) {
        resolvePoint(solid.centerPointId, visiting)
        if (solid.radiusPointId) resolvePoint(solid.radiusPointId, visiting)
        
        const ring = solid.sphereRings?.find((r) => r.id === point.circleId)
        const center = positions[solid.centerPointId]
        if (center && ring) {
          const r = solid.radius
          const phi = ring.phi
          const theta = ring.theta
          const t = point.t ?? 0
          
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
          
          positions[pointId] = [
            center[0] + r * Math.cos(t) * u_norm[0] + r * Math.sin(t) * w_norm[0],
            center[1] + r * Math.cos(t) * u_norm[1] + r * Math.sin(t) * w_norm[1],
            center[2] + r * Math.cos(t) * u_norm[2] + r * Math.sin(t) * w_norm[2],
          ]
          visiting.delete(pointId)
          return positions[pointId]
        }
      }
    }

    if (point.pointKind === 'sphereAngleDependent' && point.solidId && point.circleId && point.sourcePointId) {
      const solid = document.solids.find((s) => s.id === point.solidId)
      if (solid && solid.solidType === 'sphere' && solid.centerPointId && solid.radius) {
        resolvePoint(solid.centerPointId, visiting)
        if (solid.radiusPointId) resolvePoint(solid.radiusPointId, visiting)
        
        const posB = resolvePoint(point.sourcePointId, visiting)
        const ring = solid.sphereRings?.find((r) => r.id === point.circleId)
        const center = positions[solid.centerPointId]
        
        if (center && ring && posB) {
          const r = solid.radius
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
          
          const vx = posB[0] - center[0]
          const vy = posB[1] - center[1]
          const vz = posB[2] - center[2]
          const xB = vx * u_norm[0] + vy * u_norm[1] + vz * u_norm[2]
          const yB = vx * w_norm[0] + vy * w_norm[1] + vz * w_norm[2]
          const tB = Math.atan2(yB, xB)
          
          const alpha = point.angle ?? 0
          const tC = tB + alpha
          
          positions[pointId] = [
            center[0] + r * Math.cos(tC) * u_norm[0] + r * Math.sin(tC) * w_norm[0],
            center[1] + r * Math.cos(tC) * u_norm[1] + r * Math.sin(tC) * w_norm[1],
            center[2] + r * Math.cos(tC) * u_norm[2] + r * Math.sin(tC) * w_norm[2],
          ]
          visiting.delete(pointId)
          return positions[pointId]
        }
      }
    }

    if (point.pointKind === 'conePoint' && point.solidId) {
      const solid = document.solids.find((s) => s.id === point.solidId)
      if (solid && solid.solidType === 'cone') {
        let center: Vec3 = [0, 0, 0]
        let r = solid.radius ?? 3
        let normal: Vec3 = [0, 0, 1]
        
        if (solid.baseCircleId) {
          const circle = document.circles?.find((c) => c.id === solid.baseCircleId)
          if (circle) {
            const props = resolveCircleProps(circle, positions)
            if (props) {
              center = props.center
              r = props.radius
              normal = props.normal
            }
          }
        } else if (solid.centerPointId) {
          resolvePoint(solid.centerPointId, visiting)
          const cPos = positions[solid.centerPointId]
          if (cPos) center = cPos
        }
        
        let apex: Vec3 = addVec3(center, scaleVec3(normal, solid.height ?? 5))
        if (solid.apexPointId) {
          resolvePoint(solid.apexPointId, visiting)
          if (positions[solid.apexPointId]) apex = positions[solid.apexPointId]
        }
        
        const t = point.t ?? 0
        const ratio = point.ratio ?? 0 // 0 = base, 1 = apex
        
        // Orthogonal vectors to base normal
        let u: Vec3 = [1, 0, 0]
        if (Math.abs(normal[0]) > 0.9) u = [0, 1, 0]
        const w = crossVec3(normal, u)
        const w_len = Math.hypot(w[0], w[1], w[2])
        const w_norm = scaleVec3(w, w_len > 1e-9 ? 1 / w_len : 1)
        const u_new = crossVec3(w_norm, normal)
        const u_len = Math.hypot(u_new[0], u_new[1], u_new[2])
        const u_norm = scaleVec3(u_new, u_len > 1e-9 ? 1 / u_len : 1)
        
        const basePt = addVec3(center, addVec3(scaleVec3(u_norm, r * Math.cos(t)), scaleVec3(w_norm, r * Math.sin(t))))
        
        positions[pointId] = [
          (1 - ratio) * basePt[0] + ratio * apex[0],
          (1 - ratio) * basePt[1] + ratio * apex[1],
          (1 - ratio) * basePt[2] + ratio * apex[2]
        ]
        visiting.delete(pointId)
        return positions[pointId]
      }
    }

    if (point.pointKind === 'cylinderPoint' && point.solidId) {
      const solid = document.solids.find((s) => s.id === point.solidId)
      if (solid && solid.solidType === 'cylinder') {
        let center: Vec3 = [0, 0, 0]
        let r = solid.radius ?? 3
        let normal: Vec3 = [0, 0, 1]
        
        if (solid.baseCircleId) {
          const circle = document.circles?.find((c) => c.id === solid.baseCircleId)
          if (circle) {
            const props = resolveCircleProps(circle, positions)
            if (props) {
              center = props.center
              r = props.radius
              normal = props.normal
            }
          }
        } else if (solid.centerPointId) {
          resolvePoint(solid.centerPointId, visiting)
          const cPos = positions[solid.centerPointId]
          if (cPos) center = cPos
        }
        
        const h = solid.height ?? 5
        const axisVec = scaleVec3(normal, h)
        
        const t = point.t ?? 0
        const ratio = point.ratio ?? 0 // 0 = bottom, 1 = top
        
        // Orthogonal vectors to base normal
        let u: Vec3 = [1, 0, 0]
        if (Math.abs(normal[0]) > 0.9) u = [0, 1, 0]
        const w = crossVec3(normal, u)
        const w_len = Math.hypot(w[0], w[1], w[2])
        const w_norm = scaleVec3(w, w_len > 1e-9 ? 1 / w_len : 1)
        const u_new = crossVec3(w_norm, normal)
        const u_len = Math.hypot(u_new[0], u_new[1], u_new[2])
        const u_norm = scaleVec3(u_new, u_len > 1e-9 ? 1 / u_len : 1)
        
        const bottomPt = addVec3(center, addVec3(scaleVec3(u_norm, r * Math.cos(t)), scaleVec3(w_norm, r * Math.sin(t))))
        
        positions[pointId] = [
          bottomPt[0] + ratio * axisVec[0],
          bottomPt[1] + ratio * axisVec[1],
          bottomPt[2] + ratio * axisVec[2]
        ]
        visiting.delete(pointId)
        return positions[pointId]
      }
    }

    if (point.pointKind === 'facePoint' && point.sourcePointIds && point.sourcePointIds.length >= 3) {
      resolvePoint(point.sourcePointIds[0], visiting)
      resolvePoint(point.sourcePointIds[1], visiting)
      resolvePoint(point.sourcePointIds[2], visiting)
      
      const v0 = positions[point.sourcePointIds[0]]
      const v1 = positions[point.sourcePointIds[1]]
      const v2 = positions[point.sourcePointIds[2]]
      
      if (v0 && v1 && v2) {
        const e1 = subVec3(v1, v0)
        const e2 = subVec3(v2, v0)
        
        const normal = crossVec3(e1, e2)
        const normal_len = Math.hypot(normal[0], normal[1], normal[2])
        const normal_norm = scaleVec3(normal, normal_len > 1e-9 ? 1 / normal_len : 1)
        
        const u_len = Math.hypot(e1[0], e1[1], e1[2])
        const u_norm = scaleVec3(e1, u_len > 1e-9 ? 1 / u_len : 1)
        
        const w_norm = crossVec3(normal_norm, u_norm)
        
        const uVal = point.u ?? 0
        const vVal = point.v ?? 0
        
        positions[pointId] = [
          v0[0] + uVal * u_norm[0] + vVal * w_norm[0],
          v0[1] + uVal * u_norm[1] + vVal * w_norm[1],
          v0[2] + uVal * u_norm[2] + vVal * w_norm[2]
        ]
        visiting.delete(pointId)
        return positions[pointId]
      }
    }

    positions[pointId] = cloneVec3(point.position)
    visiting.delete(pointId)
    return positions[pointId]
  }

  document.points.forEach((point) => {
    resolvePoint(point.id)
  })

  return positions
}

function buildPolygonEdges(
  polygonId: string,
  labels: string[],
  points: Vec3[],
  visible: boolean,
) {
  const edges: ManualDisplaySegment[] = []
  for (let index = 0; index < points.length; index += 1) {
    edges.push({
      id: `${polygonId}_edge_${index}`,
      label: `${labels[index]}-${labels[(index + 1) % labels.length]}`,
      start: points[index],
      end: points[(index + 1) % points.length],
      sourceKind: 'polygon',
      sourceId: polygonId,
      visible,
    })
  }
  return edges
}

function addPolygonBoundarySegments(
  document: ManualDocument,
  polygon: ManualPolygon,
  pointMap: Map<string, ManualPoint>,
) {
  if (polygon.internal) return
  const pointIds = polygon.pointIds
  if (!pointIds || pointIds.length < 3) return

  for (let index = 0; index < pointIds.length; index += 1) {
    const startPointId = pointIds[index]
    const endPointId = pointIds[(index + 1) % pointIds.length]
    const startPoint = pointMap.get(startPointId)
    const endPoint = pointMap.get(endPointId)
    if (!startPoint || !endPoint) continue

    const exists = document.segments.some((segment) => (
      (segment.startPointId === startPointId && segment.endPointId === endPointId) ||
      (segment.startPointId === endPointId && segment.endPointId === startPointId)
    ))
    if (exists) continue

    document.segments.push({
      id: createEntityId(`seg_${polygon.id}_${index}`),
      label: `${startPoint.label}${endPoint.label}`,
      createdByTool: 'segment',
      dependsOn: [startPointId, endPointId],
      locked: true,
      visible: true,
      selectable: true,
      entityType: 'segment',
      startPointId,
      endPointId,
    })
  }
}

function pushGeometryPoint(geometry: GeometryData, label: string, point: Vec3) {
  geometry.points[label] = point
}

function pushGeometryEdge(geometry: GeometryData, start: string, end: string) {
  geometry.edges?.push(`${start}-${end}`)
}

function pushGeometryPlane(
  geometry: GeometryData,
  labels: string[],
  color: string,
  opacity: number,
) {
  geometry.planes?.push({
    points: labels,
    color,
    opacity,
    density: 15,
  })
}

export function getPolygonNormal(points: Vec3[]): Vec3 {
  if (points.length < 3) return [0, 0, 1]
  const v1 = subVec3(points[1], points[0])
  const v2 = subVec3(points[2], points[0])
  const cross = crossVec3(v1, v2)
  const len = Math.hypot(cross[0], cross[1], cross[2])
  let normal: Vec3 = [0, 0, 1]
  if (len < 1e-9) {
    let found = false
    for (let i = 2; i < points.length - 1; i++) {
      const v1_alt = subVec3(points[i], points[0])
      const v2_alt = subVec3(points[i+1], points[0])
      const cross_alt = crossVec3(v1_alt, v2_alt)
      const len_alt = Math.hypot(cross_alt[0], cross_alt[1], cross_alt[2])
      if (len_alt > 1e-9) {
        normal = [cross_alt[0] / len_alt, cross_alt[1] / len_alt, cross_alt[2] / len_alt]
        found = true
        break
      }
    }
    if (!found) {
      normal = [0, 0, 1]
    }
  } else {
    normal = [cross[0] / len, cross[1] / len, cross[2] / len]
  }

  // Ensure normal always points upwards (z >= 0) so 3D solids project upwards
  if (normal[2] < 0) {
    normal = [-normal[0], -normal[1], -normal[2]]
  }
  return normal
}

export function resolveCircleProps(
  circle: ManualCircle,
  pointPositions: Record<string, Vec3>,
): { center: Vec3; radius: number; normal: Vec3 } | null {
  if (circle.circleKind === 'threePoints' && circle.sourcePointIds && circle.sourcePointIds.length >= 3) {
    const p1 = pointPositions[circle.sourcePointIds[0]]
    const p2 = pointPositions[circle.sourcePointIds[1]]
    const p3 = pointPositions[circle.sourcePointIds[2]]
    if (p1 && p2 && p3) {
      return circleThreePoints3D(p1, p2, p3)
    }
  } else if (circle.circleKind === 'centerRadius' && circle.centerPointId && circle.radius) {
    const cPos = pointPositions[circle.centerPointId]
    if (cPos) {
      return { center: cPos, radius: Number(circle.radius), normal: [0, 0, 1] }
    }
  } else if (circle.circleKind === 'centerPoint' && circle.centerPointId && circle.radiusPointId) {
    const cPos = pointPositions[circle.centerPointId]
    const rPos = pointPositions[circle.radiusPointId]
    if (cPos && rPos) {
      const vx = rPos[0] - cPos[0]
      const vy = rPos[1] - cPos[1]
      const vz = rPos[2] - cPos[2]
      const len2DSq = vx * vx + vy * vy
      let normal: Vec3 = [0, 0, 1]
      let radius = Math.hypot(vx, vy)
      if (len2DSq > 1e-9) {
        const rawNormal: Vec3 = [-vx * vz, -vy * vz, len2DSq]
        const lenN = Math.hypot(rawNormal[0], rawNormal[1], rawNormal[2])
        if (lenN > 1e-9) {
          normal = [rawNormal[0] / lenN, rawNormal[1] / lenN, rawNormal[2] / lenN]
        }
        radius = Math.sqrt(vx * vx + vy * vy + vz * vz)
      } else {
        radius = Math.abs(vz)
        normal = [1, 0, 0]
      }
      if (normal[2] < 0) {
        normal = [-normal[0], -normal[1], -normal[2]]
      }
      return { center: cPos, radius, normal }
    }
  }
  return null
}

export function buildManualDerived(document: ManualDocument): ManualDerived {
  const geometry = emptyGeometry()
  const pointPositions = resolvePointPositions(document)
  const displayPoints: ManualDisplayPoint[] = []
  const displaySegments: ManualDisplaySegment[] = []
  const displayPolygons: ManualDisplayPolygon[] = []
  const displayCircles: ManualDisplayCircle[] = []
  const pointInfo: Record<string, ManualPointInfo> = {}
  const segmentInfo: Record<string, ManualSegmentInfo> = {}
  const polygonInfo: Record<string, ManualPolygonInfo> = {}
  const solidInfo: Record<string, ManualSolidInfo> = {}

  const pointMap = new Map(document.points.map((point) => [point.id, point]))
  const segmentMap = new Map(document.segments.map((segment) => [segment.id, segment]))
  const polygonMap = new Map(document.polygons.map((polygon) => [polygon.id, polygon]))

  // Build a quick lookup: solidId → solid for checking solid visibility
  const solidMap = new Map(document.solids.map((s) => [s.id, s]))

  // Build a set of basePolygonIds that belong to hidden solids
  const hiddenBasePolygonIds = new Set<string>(
    document.solids
      .filter((s) => s.visible === false && s.basePolygonId)
      .map((s) => s.basePolygonId!)
  )

  // Build a set of baseCircleIds that belong to hidden solids
  const hiddenBaseCircleIds = new Set<string>(
    document.solids
      .filter((s) => s.visible === false && s.baseCircleId)
      .map((s) => s.baseCircleId!)
  )

  document.points.forEach((point) => {
    const resolved = pointPositions[point.id]
    if (!resolved) return

    // If this is a solid vertex, inherit parent solid visibility
    let effectiveVisible = point.visible
    if (point.pointKind === 'solidVertex' && point.solidId) {
      const parentSolid = solidMap.get(point.solidId)
      if (parentSolid && parentSolid.visible === false) {
        effectiveVisible = false
      }
    }

    displayPoints.push({
      id: point.id,
      label: point.label,
      position: resolved,
      sourceKind: 'point',
      sourceId: point.id,
      selectable: point.selectable,
      generated: point.pointKind === 'solidVertex' ||
                 ['prism', 'box', 'cube', 'pyramid', 'regularPyramid'].includes(point.createdByTool ?? ''),
      visible: effectiveVisible,
    })

    pushGeometryPoint(geometry, point.label, resolved)
    pointInfo[point.id] = {
      coords: resolved,
      relation:
        point.pointKind === 'segment' && point.segmentId
          ? `Điểm thuộc đoạn ${segmentMap.get(point.segmentId)?.label ?? ''}`
          : 'Điểm tự do trên mặt phẳng làm việc',
    }
  })

  document.segments.forEach((segment) => {
    const start = pointPositions[segment.startPointId]
    const end = pointPositions[segment.endPointId]
    const startPoint = pointMap.get(segment.startPointId)
    const endPoint = pointMap.get(segment.endPointId)
    if (!start || !end || !startPoint || !endPoint) return

    // Find all parent polygons that contain this segment as a boundary edge
    const parentPolygons = document.polygons.filter((poly) => {
      const pids = poly.pointIds
      const n = pids.length
      for (let i = 0; i < n; i++) {
        const p1 = pids[i]
        const p2 = pids[(i + 1) % n]
        if (
          (p1 === segment.startPointId && p2 === segment.endPointId) ||
          (p2 === segment.startPointId && p1 === segment.endPointId)
        ) {
          return true
        }
      }
      return false
    })

    // A segment is hidden if all polygons it belongs to are hidden
    let effectiveSegmentVisible = segment.visible
    if (parentPolygons.length > 0) {
      const allParentsHidden = parentPolygons.every((poly) => {
        const isPolyHidden = poly.visible === false || hiddenBasePolygonIds.has(poly.id)
        return isPolyHidden
      })
      if (allParentsHidden) {
        effectiveSegmentVisible = false
      }
    }

    displaySegments.push({
      id: segment.id,
      label: segment.label,
      start,
      end,
      sourceKind: 'segment',
      sourceId: segment.id,
      visible: effectiveSegmentVisible,
    })

    pushGeometryEdge(geometry, startPoint.label, endPoint.label)
    segmentInfo[segment.id] = {
      startLabel: startPoint.label,
      endLabel: endPoint.label,
      length: round(distance(start, end)),
      formula: `${segment.label} = sqrt((x2-x1)^2 + (y2-y1)^2 + (z2-z1)^2)`,
    }
  })

  document.polygons.forEach((polygon) => {
    if (polygon.internal) return
    const polygonPoints = polygon.pointIds
      .map((pointId) => pointPositions[pointId])
      .filter(Boolean) as Vec3[]
    const polygonLabels = polygon.pointIds
      .map((pointId) => pointMap.get(pointId)?.label)
      .filter(Boolean) as string[]
    if (polygonPoints.length < 3 || polygonLabels.length < 3) return

    // If this polygon is the base of a hidden solid, inherit the solid's visibility
    const effectivePolygonVisible = hiddenBasePolygonIds.has(polygon.id) ? false : polygon.visible

    displayPolygons.push({
      id: polygon.id,
      label: polygon.label,
      points: polygonPoints,
      sourceKind: 'polygon',
      sourceId: polygon.id,
      fillColor: '#0f766e',
      opacity: 0.18,
      visible: effectivePolygonVisible,
    })

    const polygonEdgeSegments = buildPolygonEdges(polygon.id, polygonLabels, polygonPoints, effectivePolygonVisible)
    polygonEdgeSegments.forEach((edge, index) => {
      const startLabel = polygonLabels[index]
      const endLabel = polygonLabels[(index + 1) % polygonLabels.length]
      const hasRealSegment = document.segments.some((segment) => {
        const start = pointMap.get(segment.startPointId)?.label
        const end = pointMap.get(segment.endPointId)?.label
        if (!start || !end) return false
        return (
          (start === startLabel && end === endLabel) ||
          (start === endLabel && end === startLabel)
        )
      })
      if (!hasRealSegment) {
        displaySegments.push(edge)
      }
    })
    pushGeometryPlane(geometry, polygonLabels, '#0f766e', 0.14)
    for (let index = 0; index < polygonLabels.length; index += 1) {
      pushGeometryEdge(
        geometry,
        polygonLabels[index],
        polygonLabels[(index + 1) % polygonLabels.length],
      )
    }

    polygonInfo[polygon.id] = {
      labels: polygonLabels,
      perimeter: round(polygonPerimeter(polygonPoints)),
      area: round(polygonArea2D(polygonPoints)),
      normal: [0, 0, 1],
      formula: `S = công thức shoelace trên các đỉnh ${polygonLabels.join(', ')}`,
    }
  })

  document.solids.forEach((solid) => {
    if ((solid.solidType === 'box' || solid.solidType === 'cube') && solid.cornerPointIds) {
      const posA = pointPositions[solid.cornerPointIds[0]]
      const posB = pointPositions[solid.cornerPointIds[1]]
      
      const ptA = pointMap.get(solid.cornerPointIds[0])
      const ptB = pointMap.get(solid.cornerPointIds[1])

      if (!posA || !posB || !ptA || !ptB) return

      let baseA: Vec3 = [posA[0], posA[1], posA[2]]
      let baseB: Vec3 = [posB[0], posB[1], posB[2]]
      let baseC: Vec3, baseD: Vec3, h: number
      let ptC = solid.cornerPointIds[2] ? pointMap.get(solid.cornerPointIds[2]) : ptB
      
      if (solid.solidType === 'cube') {
        const E = [baseB[0] - baseA[0], baseB[1] - baseA[1], baseB[2] - baseA[2]]
        const D_vec: Vec3 = [-E[1], E[0], 0]
        const lenD = Math.hypot(D_vec[0], D_vec[1])
        const lenE = Math.hypot(E[0], E[1], E[2])
        const D_norm = lenD > 1e-9 ? [D_vec[0]/lenD, D_vec[1]/lenD, 0] as Vec3 : [0, 1, 0] as Vec3
        
        baseD = [baseA[0] + D_norm[0] * lenE, baseA[1] + D_norm[1] * lenE, baseA[2]]
        baseC = [baseB[0] + D_norm[0] * lenE, baseB[1] + D_norm[1] * lenE, baseB[2]]
        h = lenE
        // Find C label generated by context
        const generatedC = document.points.find(p => p.solidId === solid.id && p.vertexIndex === 2)
        if (generatedC) ptC = generatedC
      } else {
        const posC = solid.cornerPointIds[2] ? pointPositions[solid.cornerPointIds[2]] : posB
        if (!posC) return
        baseC = [posC[0], posC[1], posC[2]]
        baseD = [posA[0] + posC[0] - posB[0], posA[1] + posC[1] - posB[1], posA[2] + posC[2] - posB[2]]
        h = solid.height ?? 4
      }

      const topA: Vec3 = [baseA[0], baseA[1], baseA[2] + h]
      const topB: Vec3 = [baseB[0], baseB[1], baseB[2] + h]
      const topC: Vec3 = [baseC[0], baseC[1], baseC[2] + h]
      const topD: Vec3 = [baseD[0], baseD[1], baseD[2] + h]

      const labelA = ptA.label
      let labelB = ptB.label
      let labelC = ptC?.label ?? `${solid.label}C`
      let labelD = `${solid.label}D`

      // Smart distinct label assignment to avoid duplicates and preserve alphabet order
      const usedLabelsInDoc = new Set(document.points.map((p) => p.label))
      usedLabelsInDoc.add(labelA)
      usedLabelsInDoc.add(labelB)
      usedLabelsInDoc.add(labelC)

      const getNextAvailableLetter = () => {
        for (let pass = 0; pass < 10; pass += 1) {
          for (let i = 0; i < 26; i++) {
            const letter = String.fromCharCode(65 + i)
            const candidate = pass === 0 ? letter : `${letter}${pass}`
            if (!usedLabelsInDoc.has(candidate)) {
              usedLabelsInDoc.add(candidate)
              return candidate
            }
          }
        }
        return `P_${crypto.randomUUID().slice(0, 4)}`
      }

      const generatedD = document.points.find(p => p.solidId === solid.id && p.vertexIndex === 3)
      if (generatedD) {
        labelD = generatedD.label
        usedLabelsInDoc.add(labelD)
      } else if (labelA === 'A' && labelB === 'B' && labelC === 'C' && !usedLabelsInDoc.has('D')) {
        labelD = 'D'
        usedLabelsInDoc.add('D')
      } else {
        labelD = 'D' // Simplify since generated point logic already assigns unique labels
      }

      const baseLabels = [labelA, labelB, labelC, labelD]
      const topLabels = baseLabels.map((label) => `${label}'`)
      const allPoints = [baseA, baseB, baseC, baseD, topA, topB, topC, topD]
      const allLabels = [...baseLabels, ...topLabels]

      allPoints.forEach((point, index) => pushGeometryPoint(geometry, allLabels[index], point))

      // We no longer push to displayPoints here because box vertices are stored in document.points
      // and pushed in document.points.forEach with their correct generated flag.
      allPoints.forEach((point, index) => {
        // Just push to geometry to ensure they exist for drawing edges/faces
      })

      const edgePairs = [
        [0, 1], [1, 2], [2, 3], [3, 0],
        [4, 5], [5, 6], [6, 7], [7, 4],
        [0, 4], [1, 5], [2, 6], [3, 7],
      ] as const
      edgePairs.forEach(([startIndex, endIndex], edgeIndex) => {
        pushGeometryEdge(geometry, allLabels[startIndex], allLabels[endIndex])
        displaySegments.push({
          id: `${solid.id}_edge_${edgeIndex}`,
          label: `${allLabels[startIndex]}-${allLabels[endIndex]}`,
          start: allPoints[startIndex],
          end: allPoints[endIndex],
          sourceKind: 'solid',
          sourceId: solid.id,
          visible: solid.visible,
        })
      })

      // Collect actual point IDs for all 8 vertices
      const allPointIds: string[] = []
      if (solid.cornerPointIds) {
        allPointIds[0] = solid.cornerPointIds[0]
        allPointIds[1] = solid.cornerPointIds[1]
        if (solid.cornerPointIds[2]) allPointIds[2] = solid.cornerPointIds[2]
      }
      document.points.forEach(p => {
        if (p.pointKind === 'solidVertex' && p.solidId === solid.id && p.vertexIndex !== undefined) {
          allPointIds[p.vertexIndex] = p.id
        }
      })

      const faces = [
        [0, 1, 2, 3],
        [4, 5, 6, 7],
        [0, 1, 5, 4],
        [1, 2, 6, 5],
        [2, 3, 7, 6],
        [3, 0, 4, 7],
      ]
      faces.forEach((indices, faceIndex) => {
        displayPolygons.push({
          id: `${solid.id}_face_${faceIndex}`,
          label: `${solid.label}_face_${faceIndex + 1}`,
          points: indices.map((index) => allPoints[index]),
          pointIds: indices.map((index) => allPointIds[index]).filter(Boolean),
          sourceKind: 'solid',
          sourceId: solid.id,
          fillColor: '#2563eb',
          opacity: 0.14,
          visible: solid.visible,
        })
        pushGeometryPlane(
          geometry,
          indices.map((index) => allLabels[index]),
          '#2563eb',
          0.12,
        )
      })

      // Virtual diagonal planes for picking
      const diagonals = [
        [0, 2, 6, 4],  // AC'CA' diagonal
        [1, 3, 7, 5],  // BD'DB' diagonal
      ]
      diagonals.forEach((indices, dIdx) => {
        const diagPointIds = indices.map(i => allPointIds[i]).filter(Boolean)
        if (diagPointIds.length >= 3) {
          displayPolygons.push({
            id: `${solid.id}_vdiag_${dIdx}`,
            label: indices.map(i => allLabels[i]).join(''),
            points: indices.map(i => allPoints[i]),
            pointIds: diagPointIds,
            sourceKind: 'solid',
            sourceId: solid.id,
            fillColor: '#f59e0b',
            opacity: 0,
            visible: solid.visible,
            isVirtual: true,
          })
        }
      })

      const width = Math.abs(baseB[0] - baseA[0])
      const depth = Math.abs(baseD[1] - baseA[1])
      const baseArea = width * depth
      solidInfo[solid.id] = {
        solidType: solid.solidType === 'cube' ? 'cube' : 'box',
        baseLabel: baseLabels.join(', '),
        height: round(Math.abs(h)),
        baseArea: round(baseArea),
        volume: round(baseArea * Math.abs(h)),
        formula: `V = S_đáy * h = ${round(baseArea)} * ${round(Math.abs(h))}`,
        vertexCount: 8,
        faceCount: 6,
      }
      return
    }

    if (!solid.basePolygonId) return
    const basePolygon = polygonMap.get(solid.basePolygonId)
    if (!basePolygon) return
    const basePoints = basePolygon.pointIds
      .map((pointId) => pointPositions[pointId])
      .filter(Boolean) as Vec3[]
    const baseLabels = basePolygon.pointIds
      .map((pointId) => pointMap.get(pointId)?.label)
      .filter(Boolean) as string[]
    if (basePoints.length < 3 || baseLabels.length < 3) return

    const baseArea = polygonArea2D(basePoints)
    const center = centroid(basePoints)

    if (solid.solidType === 'pyramid' || solid.solidType === 'regularPyramid') {
      const hasApex = !!(solid.apexPointId && pointPositions[solid.apexPointId])
      const normal = getPolygonNormal(basePoints)
      const apex: Vec3 = hasApex
        ? pointPositions[solid.apexPointId!]
        : addVec3(center, scaleVec3(normal, solid.height ?? 4))
      const apexLabel = hasApex
        ? (pointMap.get(solid.apexPointId!)?.label ?? 'S')
        : `${solid.label}S`

      pushGeometryPoint(geometry, apexLabel, apex)
      if (!hasApex) {
        displayPoints.push({
          id: `${solid.id}_apex`,
          label: apexLabel,
          position: apex,
          sourceKind: 'solid',
          sourceId: solid.id,
          selectable: false,
          generated: true,
          visible: solid.visible,
        })
      }

      for (let index = 0; index < basePoints.length; index += 1) {
        pushGeometryEdge(geometry, baseLabels[index], baseLabels[(index + 1) % baseLabels.length])
        pushGeometryEdge(geometry, baseLabels[index], apexLabel)
        displaySegments.push({
          id: `${solid.id}_base_${index}`,
          label: `${baseLabels[index]}-${baseLabels[(index + 1) % baseLabels.length]}`,
          start: basePoints[index],
          end: basePoints[(index + 1) % basePoints.length],
          sourceKind: 'solid',
          sourceId: solid.id,
          visible: solid.visible,
        })
        displaySegments.push({
          id: `${solid.id}_side_${index}`,
          label: `${baseLabels[index]}-${apexLabel}`,
          start: basePoints[index],
          end: apex,
          sourceKind: 'solid',
          sourceId: solid.id,
          visible: solid.visible,
        })
        pushGeometryPlane(
          geometry,
          [baseLabels[index], baseLabels[(index + 1) % baseLabels.length], apexLabel],
          '#ea580c',
          0.12,
        )
        displayPolygons.push({
          id: `${solid.id}_face_${index}`,
          label: `${solid.label}_tam_giac_${index + 1}`,
          points: [basePoints[index], basePoints[(index + 1) % basePoints.length], apex],
          pointIds: [
            basePolygon.pointIds[index],
            basePolygon.pointIds[(index + 1) % basePolygon.pointIds.length],
            solid.apexPointId ?? `${solid.id}_apex`,
          ],
          sourceKind: 'solid',
          sourceId: solid.id,
          fillColor: '#ea580c',
          opacity: 0.12,
          visible: solid.visible,
        })
      }
      pushGeometryPlane(geometry, baseLabels, '#f59e0b', 0.12)

      // Pyramid base face polygon for picking
      displayPolygons.push({
        id: `${solid.id}_base_face`,
        label: `${solid.label}_mat_day`,
        points: basePoints,
        pointIds: basePolygon.pointIds,
        sourceKind: 'solid',
        sourceId: solid.id,
        fillColor: '#f59e0b',
        opacity: 0.12,
        visible: solid.visible,
      })

      // Virtual diagonal planes for pyramid (through apex and non-adjacent base edges)
      const pn = basePolygon.pointIds.length
      if (pn >= 4) {
        const apexPid = solid.apexPointId ?? `${solid.id}_apex`
        for (let i = 0; i < pn; i++) {
          for (let j = i + 2; j < pn; j++) {
            if (j === (i + pn - 1) % pn) continue
            const diagPids = [basePolygon.pointIds[i], basePolygon.pointIds[j], apexPid]
            displayPolygons.push({
              id: `${solid.id}_vdiag_${i}_${j}`,
              label: `${baseLabels[i]}${baseLabels[j]}${apexLabel}`,
              points: [basePoints[i], basePoints[j], apex],
              pointIds: diagPids,
              sourceKind: 'solid',
              sourceId: solid.id,
              fillColor: '#f59e0b',
              opacity: 0,
              visible: solid.visible,
              isVirtual: true,
            })
          }
        }
      }

      const distVec = subVec3(apex, basePoints[0])
      const resolvedHeight = Math.abs(dotVec3(distVec, normal))
      if (solid.solidType === 'regularPyramid') {
        solidInfo[solid.id] = {
          solidType: 'regularPyramid',
          baseLabel: `${apexLabel} - ${basePolygon.label}`, // Đỉnh: S - Đáy: ABCD
          height: round(resolvedHeight),
          baseArea: round(baseArea),
          volume: round((baseArea * resolvedHeight) / 3),
          formula: `V = S_đáy * h / 3 = ${round(baseArea)} * ${round(resolvedHeight)} / 3`,
          vertexCount: basePoints.length + 1,
          faceCount: basePoints.length + 1,
        }
      } else {
        solidInfo[solid.id] = {
          solidType: 'pyramid',
          baseLabel: basePolygon.label,
          height: round(resolvedHeight),
          baseArea: round(baseArea),
          volume: round((baseArea * resolvedHeight) / 3),
          formula: `V = S_đáy * h / 3 = ${round(baseArea)} * ${round(resolvedHeight)} / 3`,
          vertexCount: basePoints.length + 1,
          faceCount: basePoints.length + 1,
        }
      }
      return
    }

    const hasTopPoint = !!(solid.topPointId && pointPositions[solid.topPointId])
    const normal = getPolygonNormal(basePoints)
    const sideLen = distance(basePoints[0], basePoints[1])
    const translation = hasTopPoint
      ? subVec3(pointPositions[solid.topPointId!], basePoints[0])
      : scaleVec3(normal, solid.height ?? sideLen)

    const resolvedHeight = Math.abs(dotVec3(translation, normal))
    const topPoints = basePoints.map<Vec3>((pt) => addVec3(pt, translation))
    const topLabels = baseLabels.map((label) => `${label}'`)

    topPoints.forEach((point, index) => {
      pushGeometryPoint(geometry, topLabels[index], point)
    })

    // Collect top point IDs for prism with explicit index mapping
    // Oblique prisms store index-0 as solid.topPointId (free point), not a solidVertex
    const _pn = basePolygon.pointIds.length
    const topPointIds: string[] = new Array(_pn).fill('')
    if (solid.topPointId) topPointIds[0] = solid.topPointId
    document.points.forEach(p => {
      if (p.pointKind === 'solidVertex' && p.solidId === solid.id && p.vertexIndex !== undefined && p.vertexIndex >= _pn) {
        topPointIds[p.vertexIndex - _pn] = p.id
      }
    })
    const basePointIds = basePolygon.pointIds

    for (let index = 0; index < basePoints.length; index += 1) {
      pushGeometryEdge(geometry, baseLabels[index], baseLabels[(index + 1) % baseLabels.length])
      pushGeometryEdge(geometry, topLabels[index], topLabels[(index + 1) % topLabels.length])
      pushGeometryEdge(geometry, baseLabels[index], topLabels[index])
      displaySegments.push({
        id: `${solid.id}_base_${index}`,
        label: `${baseLabels[index]}-${baseLabels[(index + 1) % baseLabels.length]}`,
        start: basePoints[index],
        end: basePoints[(index + 1) % basePoints.length],
        sourceKind: 'solid',
        sourceId: solid.id,
        visible: solid.visible,
      })
      displaySegments.push({
        id: `${solid.id}_top_${index}`,
        label: `${topLabels[index]}-${topLabels[(index + 1) % topLabels.length]}`,
        start: topPoints[index],
        end: topPoints[(index + 1) % topPoints.length],
        sourceKind: 'solid',
        sourceId: solid.id,
        visible: solid.visible,
      })
      displaySegments.push({
        id: `${solid.id}_side_${index}`,
        label: `${baseLabels[index]}-${topLabels[index]}`,
        start: basePoints[index],
        end: topPoints[index],
        sourceKind: 'solid',
        sourceId: solid.id,
        visible: solid.visible,
      })
      displayPolygons.push({
        id: `${solid.id}_quad_${index}`,
        label: `${solid.label}_mat_${index + 1}`,
        points: [
          basePoints[index],
          basePoints[(index + 1) % basePoints.length],
          topPoints[(index + 1) % topPoints.length],
          topPoints[index],
        ],
        pointIds: [
          basePointIds[index],
          basePointIds[(index + 1) % basePointIds.length],
          topPointIds[(index + 1) % topPointIds.length] ?? '',
          topPointIds[index] ?? '',
        ].filter(Boolean),
        sourceKind: 'solid',
        sourceId: solid.id,
        fillColor: '#7c3aed',
        opacity: 0.12,
        visible: solid.visible,
      })
      pushGeometryPlane(
        geometry,
        [
          baseLabels[index],
          baseLabels[(index + 1) % baseLabels.length],
          topLabels[(index + 1) % topLabels.length],
          topLabels[index],
        ],
        '#7c3aed',
        0.12,
      )
    }

    pushGeometryPlane(geometry, baseLabels, '#0f766e', 0.1)
    pushGeometryPlane(geometry, topLabels, '#7c3aed', 0.1)
    
    // Add missing top face polygon for selection/interaction
    displayPolygons.push({
      id: `${solid.id}_top_face`,
      label: `${solid.label}_mat_tren`,
      points: topPoints,
      pointIds: topPointIds,
      sourceKind: 'solid',
      sourceId: solid.id,
      fillColor: '#7c3aed',
      opacity: 0.12,
      visible: solid.visible,
    })

    // Add base face polygon for picking
    displayPolygons.push({
      id: `${solid.id}_base_face`,
      label: `${solid.label}_mat_day`,
      points: basePoints,
      pointIds: basePointIds,
      sourceKind: 'solid',
      sourceId: solid.id,
      fillColor: '#0f766e',
      opacity: 0.12,
      visible: solid.visible,
    })

    // Virtual diagonal planes for prism picking
    const n = basePointIds.length
    if (n >= 4) {
      for (let i = 0; i < n; i++) {
        for (let j = i + 2; j < n; j++) {
          if (j === (i + n - 1) % n) continue // skip adjacent
          const diagPids = [
            basePointIds[i], basePointIds[j],
            topPointIds[j] ?? '', topPointIds[i] ?? '',
          ].filter(Boolean)
          if (diagPids.length >= 3) {
            displayPolygons.push({
              id: `${solid.id}_vdiag_${i}_${j}`,
              label: `${baseLabels[i]}${baseLabels[j]}${topLabels[j]}${topLabels[i]}`,
              points: [basePoints[i], basePoints[j], topPoints[j], topPoints[i]],
              pointIds: diagPids,
              sourceKind: 'solid',
              sourceId: solid.id,
              fillColor: '#f59e0b',
              opacity: 0,
              visible: solid.visible,
              isVirtual: true,
            })
          }
        }
      }
    }

    solidInfo[solid.id] = {
      solidType: 'prism',
      baseLabel: basePolygon.label,
      height: round(resolvedHeight),
      baseArea: round(baseArea),
      volume: round(baseArea * resolvedHeight),
      formula: `V = S_đáy * h = ${round(baseArea)} * ${round(resolvedHeight)}`,
      vertexCount: basePoints.length * 2,
      faceCount: basePoints.length + 2,
    }
  })

  // 🔴🔴🔴🔴 Sphere / Cone / Cylinder (round solids) 🔴🔴🔴🔴────
  document.solids.forEach((solid) => {
    if (solid.solidType === 'sphere' && solid.centerPointId && solid.radius) {
      const center = pointPositions[solid.centerPointId]
      const centerPoint = pointMap.get(solid.centerPointId)
      if (!center || !centerPoint) return
      const r = solid.radius

      // Generate circles from solid.sphereRings
      if (solid.sphereRings && solid.sphereRings.length > 0) {
        solid.sphereRings.forEach((ring) => {
          const phi = ring.phi
          const theta = ring.theta
          const normal: Vec3 = [
            Math.cos(phi) * Math.cos(theta),
            Math.cos(phi) * Math.sin(theta),
            Math.sin(phi),
          ]
          displayCircles.push({
            id: ring.id,
            label: '',
            center: center,
            radius: r,
            normal: normal,
            sourceKind: 'solid',
            sourceId: solid.id,
            visible: solid.visible,
          })
        })
      }

      // Radius point (if defined)
      if (solid.radiusPointId) {
        const rp = pointPositions[solid.radiusPointId]
        const rpMeta = pointMap.get(solid.radiusPointId)
        if (rp && rpMeta) {
          displayPoints.push({
            id: `${solid.id}_radius_pt`,
            label: rpMeta.label,
            position: rp,
            sourceKind: 'solid',
            sourceId: solid.id,
            selectable: false,
            generated: true,
            visible: solid.visible,
          })
          displaySegments.push({
            id: `${solid.id}_radius_line`,
            label: `${centerPoint.label}-${rpMeta.label}`,
            start: center,
            end: rp,
            sourceKind: 'solid',
            sourceId: solid.id,
            visible: solid.visible,
          })
        }
      }

      pushGeometryPoint(geometry, centerPoint.label, center)
      solidInfo[solid.id] = {
        solidType: 'sphere',
        baseLabel: centerPoint.label,
        height: round(r * 2),
        baseArea: round(4 * Math.PI * r * r),
        volume: round((4 / 3) * Math.PI * r * r * r),
        formula: `V = 4/3·π·R³ = 4/3·π·${round(r)}³`,
        vertexCount: 1,
        faceCount: 1,
      }
      return
    }

    if (solid.solidType === 'cone') {
      const hasBaseCircle = !!solid.baseCircleId
      let center: Vec3 = [0, 0, 0]
      let r = solid.radius ?? 3
      let normal: Vec3 = [0, 0, 1]
      let baseLabel = 'C'

      if (hasBaseCircle) {
        const circle = document.circles?.find((c) => c.id === solid.baseCircleId)
        if (circle) {
          baseLabel = circle.label
          const props = resolveCircleProps(circle, pointPositions)
          if (props) {
            center = props.center
            r = props.radius
            normal = props.normal
          }
        }
      } else if (solid.centerPointId) {
        const cPos = pointPositions[solid.centerPointId]
        const cMeta = pointMap.get(solid.centerPointId)
        if (cPos && cMeta) {
          center = cPos
          baseLabel = cMeta.label
        }
      }

      let apex: Vec3 = addVec3(center, scaleVec3(normal, solid.height ?? 5))
      let h = solid.height ?? 5
      if (solid.apexPointId && pointPositions[solid.apexPointId]) {
        apex = pointPositions[solid.apexPointId]
        h = dotVec3(subVec3(apex, center), normal)
      }
      const apexLabel = solid.apexPointId
        ? (pointMap.get(solid.apexPointId)?.label ?? `${solid.label}S`)
        : `${solid.label}S`

      if (!solid.apexPointId) {
        pushGeometryPoint(geometry, apexLabel, apex)
        displayPoints.push({
          id: `${solid.id}_apex`,
          label: apexLabel,
          position: apex,
          sourceKind: 'solid',
          sourceId: solid.id,
          selectable: false,
          generated: true,
          visible: solid.visible,
        })
      } else {
        pushGeometryPoint(geometry, apexLabel, apex)
      }

      if (!hasBaseCircle && solid.centerPointId) {
        const cMeta = pointMap.get(solid.centerPointId)
        if (cMeta) {
          pushGeometryPoint(geometry, cMeta.label, center)
          displayPoints.push({
            id: `${solid.id}_center`,
            label: cMeta.label,
            position: center,
            sourceKind: 'solid',
            sourceId: solid.id,
            selectable: false,
            generated: true,
            visible: solid.visible,
          })
        }
      }

      // Height line (center -> apex)
      displaySegments.push({
        id: `${solid.id}_height`,
        label: '',
        start: center,
        end: apex,
        sourceKind: 'solid',
        sourceId: solid.id,
        visible: solid.visible,
      })

      // Orthogonal vectors to circle normal
      let u: Vec3 = [1, 0, 0]
      if (Math.abs(normal[0]) > 0.9) u = [0, 1, 0]
      const w = crossVec3(normal, u)
      const w_len = Math.hypot(w[0], w[1], w[2])
      const w_norm = scaleVec3(w, w_len > 1e-9 ? 1 / w_len : 1)
      const u_new = crossVec3(w_norm, normal)
      const u_len = Math.hypot(u_new[0], u_new[1], u_new[2])
      const u_norm = scaleVec3(u_new, u_len > 1e-9 ? 1 / u_len : 1)

      // Base circle wireframe
      const circleSegments = 32
      const circlePoints: Vec3[] = []
      for (let i = 0; i <= circleSegments; i++) {
        const angle = (i / circleSegments) * Math.PI * 2
        const cos = Math.cos(angle)
        const sin = Math.sin(angle)
        const pt = addVec3(center, addVec3(scaleVec3(u_norm, r * cos), scaleVec3(w_norm, r * sin)))
        circlePoints.push(pt)
      }
      for (let i = 0; i < circlePoints.length - 1; i++) {
        displaySegments.push({
          id: `${solid.id}_base_circle_${i}`,
          label: '',
          start: circlePoints[i],
          end: circlePoints[i + 1],
          sourceKind: 'solid',
          sourceId: solid.id,
          visible: solid.visible,
        })
      }



      solidInfo[solid.id] = {
        solidType: 'cone',
        baseLabel,
        height: round(Math.abs(h)),
        baseArea: round(Math.PI * r * r),
        volume: round((1 / 3) * Math.PI * r * r * Math.abs(h)),
        formula: `V = 1/3·π·R²·h = 1/3·π·${round(r)}²·${round(Math.abs(h))}`,
        vertexCount: 2,
        faceCount: 2,
      }
      return
    }

    if (solid.solidType === 'cylinder') {
      const hasBaseCircle = !!solid.baseCircleId
      let center: Vec3 = [0, 0, 0]
      let r = solid.radius ?? 3
      let normal: Vec3 = [0, 0, 1]
      let baseLabel = 'C'

      if (hasBaseCircle) {
        const circle = document.circles?.find((c) => c.id === solid.baseCircleId)
        if (circle) {
          baseLabel = circle.label
          const props = resolveCircleProps(circle, pointPositions)
          if (props) {
            center = props.center
            r = props.radius
            normal = props.normal
          }
        }
      } else if (solid.centerPointId) {
        const cPos = pointPositions[solid.centerPointId]
        const cMeta = pointMap.get(solid.centerPointId)
        if (cPos && cMeta) {
          center = cPos
          baseLabel = cMeta.label
        }
      }

      let topCenter = addVec3(center, scaleVec3(normal, solid.height ?? 5))
      if (solid.apexPointId && pointPositions[solid.apexPointId]) {
        topCenter = pointPositions[solid.apexPointId]
      }
      const h = dotVec3(subVec3(topCenter, center), normal)

      const circle = hasBaseCircle ? document.circles?.find((c) => c.id === solid.baseCircleId) : null
      const baseCenterPtId = circle ? circle.centerPointId : solid.centerPointId
      const cMeta = baseCenterPtId ? pointMap.get(baseCenterPtId) : null
      const topLabel = cMeta ? `${cMeta.label}'` : `${solid.label}'`

      const hasRealTopCenter = solid.apexPointId && document.points.some(p => p.id === solid.apexPointId)

      if (!hasRealTopCenter && cMeta) {
        if (!hasBaseCircle) {
          pushGeometryPoint(geometry, cMeta.label, center)
          displayPoints.push({
            id: `${solid.id}_bottom_center`,
            label: cMeta.label,
            position: center,
            sourceKind: 'solid',
            sourceId: solid.id,
            selectable: false,
            generated: true,
            visible: solid.visible,
          })
        }
        pushGeometryPoint(geometry, topLabel, topCenter)
        displayPoints.push({
          id: `${solid.id}_top_center`,
          label: topLabel,
          position: topCenter,
          sourceKind: 'solid',
          sourceId: solid.id,
          selectable: false,
          generated: true,
          visible: solid.visible,
        })
      } else if (hasRealTopCenter) {
        const topPt = document.points.find(p => p.id === solid.apexPointId)
        if (topPt) {
          pushGeometryPoint(geometry, topPt.label, topCenter)
        }
      }

      // Axis line
      displaySegments.push({
        id: `${solid.id}_axis`,
        label: '',
        start: center,
        end: topCenter,
        sourceKind: 'solid',
        sourceId: solid.id,
        visible: solid.visible,
      })

      // Orthogonal vectors to circle normal
      let u: Vec3 = [1, 0, 0]
      if (Math.abs(normal[0]) > 0.9) u = [0, 1, 0]
      const w = crossVec3(normal, u)
      const w_len = Math.hypot(w[0], w[1], w[2])
      const w_norm = scaleVec3(w, w_len > 1e-9 ? 1 / w_len : 1)
      const u_new = crossVec3(w_norm, normal)
      const u_len = Math.hypot(u_new[0], u_new[1], u_new[2])
      const u_norm = scaleVec3(u_new, u_len > 1e-9 ? 1 / u_len : 1)

      // Bottom and top circles
      const circleSegments = 32
      const bottomPts: Vec3[] = []
      const topPts: Vec3[] = []
      for (let i = 0; i <= circleSegments; i++) {
        const angle = (i / circleSegments) * Math.PI * 2
        const cos = Math.cos(angle)
        const sin = Math.sin(angle)
        const offset = addVec3(scaleVec3(u_norm, r * cos), scaleVec3(w_norm, r * sin))
        bottomPts.push(addVec3(center, offset))
        topPts.push(addVec3(topCenter, offset))
      }
      for (let i = 0; i < circleSegments; i++) {
        displaySegments.push({
          id: `${solid.id}_bottom_${i}`,
          label: '',
          start: bottomPts[i],
          end: bottomPts[i + 1],
          sourceKind: 'solid',
          sourceId: solid.id,
          visible: solid.visible,
        })
        displaySegments.push({
          id: `${solid.id}_top_${i}`,
          label: '',
          start: topPts[i],
          end: topPts[i + 1],
          sourceKind: 'solid',
          sourceId: solid.id,
          visible: solid.visible,
        })
      }



      solidInfo[solid.id] = {
        solidType: 'cylinder',
        baseLabel,
        height: round(Math.abs(h)),
        baseArea: round(Math.PI * r * r),
        volume: round(Math.PI * r * r * Math.abs(h)),
        formula: `V = π·R²·h = π·${round(r)}²·${round(Math.abs(h))}`,
        vertexCount: 2,
        faceCount: 3,
      }
      return
    }
  })

  // Resolve Manual Circles
  if (document.circles) {
    document.circles.forEach((circle) => {
      let center: Vec3 = [0, 0, 0]
      let radius = 1
      let normal: Vec3 = [0, 0, 1]

      if (circle.circleKind === 'threePoints' && circle.sourcePointIds && circle.sourcePointIds.length >= 3) {
        const p1 = pointPositions[circle.sourcePointIds[0]]
        const p2 = pointPositions[circle.sourcePointIds[1]]
        const p3 = pointPositions[circle.sourcePointIds[2]]
        if (p1 && p2 && p3) {
          const solved = circleThreePoints3D(p1, p2, p3)
          if (solved) {
            center = solved.center
            radius = solved.radius
            normal = solved.normal
          }
        }
      } else if (circle.circleKind === 'centerRadius' && circle.centerPointId && circle.radius) {
        const cPos = pointPositions[circle.centerPointId]
        if (cPos) {
          center = cPos
          radius = Number(circle.radius)
          normal = [0, 0, 1]
        }
      } else if (circle.circleKind === 'centerPoint' && circle.centerPointId && circle.radiusPointId) {
        const cPos = pointPositions[circle.centerPointId]
        const rPos = pointPositions[circle.radiusPointId]
        if (cPos && rPos) {
          const vx = rPos[0] - cPos[0]
          const vy = rPos[1] - cPos[1]
          const vz = rPos[2] - cPos[2]
          const len2DSq = vx * vx + vy * vy
          center = cPos
          normal = [0, 0, 1]
          radius = Math.hypot(vx, vy)
          if (len2DSq > 1e-9) {
            const rawNormal: Vec3 = [-vx * vz, -vy * vz, len2DSq]
            const lenN = Math.hypot(rawNormal[0], rawNormal[1], rawNormal[2])
            if (lenN > 1e-9) {
              normal = [rawNormal[0] / lenN, rawNormal[1] / lenN, rawNormal[2] / lenN]
            }
            radius = Math.sqrt(vx * vx + vy * vy + vz * vz)
          } else {
            radius = Math.abs(vz)
            normal = [1, 0, 0]
          }
          if (normal[2] < 0) {
            normal = [-normal[0], -normal[1], -normal[2]]
          }
        }
      }

      const effectiveCircleVisible = hiddenBaseCircleIds.has(circle.id) ? false : circle.visible

      displayCircles.push({
        id: circle.id,
        label: circle.label,
        center,
        radius,
        normal,
        sourceKind: 'circle',
        sourceId: circle.id,
        visible: effectiveCircleVisible,
      })
    })
  }

  // Generate temporary intersection points (CS1, CS2...) for solid cuts
  let intersectionCount = 1
  document.solids.forEach((solid) => {
    if (solid.visible && solid.cuts) {
      solid.cuts.forEach((cut) => {
        if (cut.visible) {
          const planePts = cut.planePointIds.map(id => {
            const pObj = document.points.find(p => p.label === id)
            return pObj ? pointPositions[pObj.id] : null
          }).filter(Boolean) as Vec3[]
          if (planePts.length === 3) {
            const intersect = computeSolidPlaneIntersection(solid, planePts, pointPositions, document)
            if (intersect && !intersect.isCircle && intersect.polygon) {
              intersect.polygon.forEach((pt) => {
                // Check if any existing document point is at (or very near) this position
                const EPS = 1e-4
                const existingPt = document.points.find((p) => {
                  const pos = pointPositions[p.id]
                  if (!pos) return false
                  return (
                    Math.abs(pos[0] - pt[0]) < EPS &&
                    Math.abs(pos[1] - pt[1]) < EPS &&
                    Math.abs(pos[2] - pt[2]) < EPS
                  )
                })

                if (existingPt) {
                  // Reuse the existing point's label/id — do NOT push a duplicate displayPoint
                  // (it's already in displayPoints from the document.points loop above)
                  return
                }

                const label = `CS${intersectionCount++}`
                displayPoints.push({
                  id: `cs_point_${solid.id}_${cut.id}_${label}`,
                  label,
                  position: pt,
                  sourceKind: 'point',
                  sourceId: solid.id,
                  selectable: false,
                  generated: true,
                  visible: solid.visible,
                })
              })
            }
          }
        }
      })
    }
  })

  return {
    geometry,
    pointPositions,
    displayPoints,
    displaySegments,
    displayPolygons,
    displayCircles,
    pointInfo,
    segmentInfo,
    polygonInfo,
    solidInfo,
  }
}

export function arePointsCollinear3D(p1: Vec3, p2: Vec3, p3: Vec3): boolean {
  const u: Vec3 = [p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]]
  const v: Vec3 = [p3[0] - p1[0], p3[1] - p1[1], p3[2] - p1[2]]
  const wx = u[1] * v[2] - u[2] * v[1]
  const wy = u[2] * v[0] - u[0] * v[2]
  const wz = u[0] * v[1] - u[1] * v[0]
  const len = Math.sqrt(wx * wx + wy * wy + wz * wz)
  return len < 1e-4
}

export function linePlaneIntersection3D(a: Vec3, b: Vec3, p0: Vec3, normal: Vec3): Vec3 | null {
  const ab: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]
  const denom = ab[0] * normal[0] + ab[1] * normal[1] + ab[2] * normal[2]
  if (Math.abs(denom) < 1e-6) return null
  
  const ap0: Vec3 = [p0[0] - a[0], p0[1] - a[1], p0[2] - a[2]]
  const numer = ap0[0] * normal[0] + ap0[1] * normal[1] + ap0[2] * normal[2]
  const t = numer / denom
  if (t >= -1e-5 && t <= 1 + 1e-5) {
    return [
      a[0] + t * ab[0],
      a[1] + t * ab[1],
      a[2] + t * ab[2]
    ]
  }
  return null
}

export function sortPointsClockwise3D(pts: Vec3[], normal: Vec3): Vec3[] {
  if (pts.length < 3) return pts
  
  const C: Vec3 = [0, 0, 0]
  pts.forEach(p => {
    C[0] += p[0]
    C[1] += p[1]
    C[2] += p[2]
  })
  C[0] /= pts.length
  C[1] /= pts.length
  C[2] /= pts.length
  
  const normLen = Math.sqrt(normal[0]*normal[0] + normal[1]*normal[1] + normal[2]*normal[2])
  const norm: Vec3 = [normal[0]/normLen, normal[1]/normLen, normal[2]/normLen]
  
  let u: Vec3 = [1, 0, 0]
  const dot = norm[0] * u[0] + norm[1] * u[1] + norm[2] * u[2]
  if (Math.abs(dot) > 0.9) {
    u = [0, 1, 0]
  }
  
  const w: Vec3 = [
    norm[1] * u[2] - norm[2] * u[1],
    norm[2] * u[0] - norm[0] * u[2],
    norm[0] * u[1] - norm[1] * u[0]
  ]
  const wLen = Math.sqrt(w[0]*w[0] + w[1]*w[1] + w[2]*w[2])
  w[0] /= wLen; w[1] /= wLen; w[2] /= wLen
  
  u = [
    w[1] * norm[2] - w[2] * norm[1],
    w[2] * norm[0] - w[0] * norm[2],
    w[0] * norm[1] - w[1] * norm[0]
  ]
  const uLen = Math.sqrt(u[0]*u[0] + u[1]*u[1] + u[2]*u[2])
  u[0] /= uLen; u[1] /= uLen; u[2] /= uLen
  
  const withAngles = pts.map(p => {
    const dx = p[0] - C[0]
    const dy = p[1] - C[1]
    const dz = p[2] - C[2]
    const x = dx * u[0] + dy * u[1] + dz * u[2]
    const y = dx * w[0] + dy * w[1] + dz * w[2]
    const angle = Math.atan2(y, x)
    return { p, angle }
  })
  
  withAngles.sort((a, b) => a.angle - b.angle)
  return withAngles.map(item => item.p)
}

export function computeSolidPlaneIntersection(
  solid: ManualSolid,
  planePointCoords: Vec3[],
  resolvedPoints: Record<string, Vec3>,
  document: ManualDocument
): { isCircle: boolean; circleCenter?: Vec3; circleRadius?: number; normal?: Vec3; polygon?: Vec3[] } | null {
  if (planePointCoords.length < 3) return null
  const p0 = planePointCoords[0]
  const p1 = planePointCoords[1]
  const p2 = planePointCoords[2]
  
  const ux = p1[0] - p0[0], uy = p1[1] - p0[1], uz = p1[2] - p0[2]
  const vx = p2[0] - p0[0], vy = p2[1] - p0[1], vz = p2[2] - p0[2]
  
  const nx = uy * vz - uz * vy
  const ny = uz * vx - ux * vz
  const nz = ux * vy - uy * vx
  const len = Math.sqrt(nx * nx + ny * ny + nz * nz)
  if (len < 1e-6) return null
  const normal: Vec3 = [nx / len, ny / len, nz / len]

  if (solid.solidType === 'sphere') {
    if (!solid.centerPointId) return null
    const center = resolvedPoints[solid.centerPointId]
    if (!center) return null
    const R = solid.radius ?? 3
    
    const dx = center[0] - p0[0]
    const dy = center[1] - p0[1]
    const dz = center[2] - p0[2]
    const dist = dx * normal[0] + dy * normal[1] + dz * normal[2]
    
    if (Math.abs(dist) < R) {
      const circleCenter: Vec3 = [
        center[0] - dist * normal[0],
        center[1] - dist * normal[1],
        center[2] - dist * normal[2]
      ]
      const circleRadius = Math.sqrt(R * R - dist * dist)
      return { isCircle: true, circleCenter, circleRadius, normal }
    }
    return null
  }

  const edges: [Vec3, Vec3][] = []
  
  if (solid.solidType === 'box' || solid.solidType === 'cube') {
    const pts: Array<Vec3 | undefined> = new Array(8)
    solid.cornerPointIds?.forEach((id, index) => {
      if (index < pts.length) pts[index] = resolvedPoints[id]
    })
    document.points.forEach((point) => {
      if (
        point.pointKind === 'solidVertex' &&
        point.solidId === solid.id &&
        point.vertexIndex !== undefined &&
        point.vertexIndex >= 0 &&
        point.vertexIndex < pts.length
      ) {
        pts[point.vertexIndex] = resolvedPoints[point.id]
      }
    })

    if (pts.every((point): point is Vec3 => !!point)) {
      edges.push([pts[0], pts[1]], [pts[1], pts[2]], [pts[2], pts[3]], [pts[3], pts[0]])
      edges.push([pts[4], pts[5]], [pts[5], pts[6]], [pts[6], pts[7]], [pts[7], pts[4]])
      edges.push([pts[0], pts[4]], [pts[1], pts[5]], [pts[2], pts[6]], [pts[3], pts[7]])
    }
  } else if (solid.solidType === 'pyramid' || solid.solidType === 'regularPyramid') {
    if (solid.basePolygonId) {
      const basePoly = document.polygons.find(p => p.id === solid.basePolygonId)
      const apexId = solid.apexPointId
      if (basePoly && apexId) {
        const basePts = basePoly.pointIds.map(id => resolvedPoints[id]).filter(Boolean) as Vec3[]
        const apex = resolvedPoints[apexId]
        if (basePts.length > 0 && apex) {
          const k = basePts.length
          for (let i = 0; i < k; i++) {
            edges.push([basePts[i], basePts[(i + 1) % k]])
            edges.push([basePts[i], apex])
          }
        }
      }
    }
  } else if (solid.solidType === 'prism') {
    if (solid.basePolygonId) {
      const basePoly = document.polygons.find(p => p.id === solid.basePolygonId)
      if (basePoly) {
        const basePts = basePoly.pointIds.map(id => resolvedPoints[id]).filter(Boolean) as Vec3[]
        const k = basePts.length
        if (k > 0) {
          const topPts: Vec3[] = new Array(k)
          document.points.forEach(p => {
            if (p.pointKind === 'solidVertex' && p.solidId === solid.id && p.vertexIndex !== undefined && p.vertexIndex >= k) {
              const pos = resolvedPoints[p.id]
              if (pos) topPts[p.vertexIndex - k] = pos
            }
          })
          if (solid.topPointId) {
            const pos = resolvedPoints[solid.topPointId]
            if (pos) topPts[0] = pos
          }
          
          const validTop = topPts.filter(Boolean)
          if (validTop.length === k) {
            for (let i = 0; i < k; i++) {
              edges.push([basePts[i], basePts[(i + 1) % k]])
              edges.push([topPts[i], topPts[(i + 1) % k]])
              edges.push([basePts[i], topPts[i]])
            }
          }
        }
      }
    }
  } else if (solid.solidType === 'cone') {
    let center: Vec3 | null = null
    let r = solid.radius ?? 3
    if (solid.baseCircleId) {
      const circle = document.circles.find(c => c.id === solid.baseCircleId)
      if (circle && circle.centerPointId) {
        center = resolvedPoints[circle.centerPointId]
        if (circle.radius) r = circle.radius
      }
    } else if (solid.centerPointId) {
      center = resolvedPoints[solid.centerPointId]
    }
    const apex = solid.apexPointId ? resolvedPoints[solid.apexPointId] : null
    
    if (center && apex) {
      const normalAxis: Vec3 = [apex[0] - center[0], apex[1] - center[1], apex[2] - center[2]]
      const lenA = Math.sqrt(normalAxis[0]*normalAxis[0] + normalAxis[1]*normalAxis[1] + normalAxis[2]*normalAxis[2])
      const normN: Vec3 = lenA > 0 ? [normalAxis[0]/lenA, normalAxis[1]/lenA, normalAxis[2]/lenA] : [0, 0, 1]
      
      let u: Vec3 = [1, 0, 0]
      if (Math.abs(normN[0]) > 0.9) u = [0, 1, 0]
      const w: Vec3 = [
        normN[1]*u[2] - normN[2]*u[1],
        normN[2]*u[0] - normN[0]*u[2],
        normN[0]*u[1] - normN[1]*u[0]
      ]
      const wLen = Math.sqrt(w[0]*w[0] + w[1]*w[1] + w[2]*w[2])
      w[0] /= wLen; w[1] /= wLen; w[2] /= wLen
      u = [
        w[1]*normN[2] - w[2]*normN[1],
        w[2]*normN[0] - w[0]*normN[2],
        w[0]*normN[1] - w[1]*normN[0]
      ]
      
      const boundaryPts: Vec3[] = []
      const divisions = 32
      for (let i = 0; i < divisions; i++) {
        const theta = (i / divisions) * Math.PI * 2
        const cos = Math.cos(theta) * r
        const sin = Math.sin(theta) * r
        const pt: Vec3 = [
          center[0] + cos * u[0] + sin * w[0],
          center[1] + cos * u[1] + sin * w[1],
          center[2] + cos * u[2] + sin * w[2]
        ]
        boundaryPts.push(pt)
      }
      for (let i = 0; i < divisions; i++) {
        edges.push([boundaryPts[i], boundaryPts[(i + 1) % divisions]])
        edges.push([boundaryPts[i], apex])
      }
    }
  } else if (solid.solidType === 'cylinder') {
    let centerBottom: Vec3 | null = null
    let r = solid.radius ?? 3
    if (solid.baseCircleId) {
      const circle = document.circles.find(c => c.id === solid.baseCircleId)
      if (circle && circle.centerPointId) {
        centerBottom = resolvedPoints[circle.centerPointId]
        if (circle.radius) r = circle.radius
      }
    } else if (solid.centerPointId) {
      centerBottom = resolvedPoints[solid.centerPointId]
    }
    const centerTop = solid.apexPointId ? resolvedPoints[solid.apexPointId] : null
    
    if (centerBottom && centerTop) {
      const normalAxis: Vec3 = [centerTop[0] - centerBottom[0], centerTop[1] - centerBottom[1], centerTop[2] - centerBottom[2]]
      const lenA = Math.sqrt(normalAxis[0]*normalAxis[0] + normalAxis[1]*normalAxis[1] + normalAxis[2]*normalAxis[2])
      const normN: Vec3 = lenA > 0 ? [normalAxis[0]/lenA, normalAxis[1]/lenA, normalAxis[2]/lenA] : [0, 0, 1]
      
      let u: Vec3 = [1, 0, 0]
      if (Math.abs(normN[0]) > 0.9) u = [0, 1, 0]
      const w: Vec3 = [
        normN[1]*u[2] - normN[2]*u[1],
        normN[2]*u[0] - normN[0]*u[2],
        normN[0]*u[1] - normN[1]*u[0]
      ]
      const wLen = Math.sqrt(w[0]*w[0] + w[1]*w[1] + w[2]*w[2])
      w[0] /= wLen; w[1] /= wLen; w[2] /= wLen
      u = [
        w[1]*normN[2] - w[2]*normN[1],
        w[2]*normN[0] - w[0]*normN[2],
        w[0]*normN[1] - w[1]*normN[0]
      ]
      
      const bottomBoundaryPts: Vec3[] = []
      const topBoundaryPts: Vec3[] = []
      const divisions = 32
      for (let i = 0; i < divisions; i++) {
        const theta = (i / divisions) * Math.PI * 2
        const cos = Math.cos(theta) * r
        const sin = Math.sin(theta) * r
        const bPt: Vec3 = [
          centerBottom[0] + cos * u[0] + sin * w[0],
          centerBottom[1] + cos * u[1] + sin * w[1],
          centerBottom[2] + cos * u[2] + sin * w[2]
        ]
        const tPt: Vec3 = [
          centerTop[0] + cos * u[0] + sin * w[0],
          centerTop[1] + cos * u[1] + sin * w[1],
          centerTop[2] + cos * u[2] + sin * w[2]
        ]
        bottomBoundaryPts.push(bPt)
        topBoundaryPts.push(tPt)
      }
      for (let i = 0; i < divisions; i++) {
        edges.push([bottomBoundaryPts[i], bottomBoundaryPts[(i + 1) % divisions]])
        edges.push([topBoundaryPts[i], topBoundaryPts[(i + 1) % divisions]])
        edges.push([bottomBoundaryPts[i], topBoundaryPts[i]])
      }
    }
  }

  const intersectPoints: Vec3[] = []
  edges.forEach(([a, b]) => {
    const pt = linePlaneIntersection3D(a, b, p0, normal)
    if (pt) {
      const exists = intersectPoints.some(existing => {
        const dx = existing[0] - pt[0]
        const dy = existing[1] - pt[1]
        const dz = existing[2] - pt[2]
        return Math.sqrt(dx * dx + dy * dy + dz * dz) < 1e-3
      })
      if (!exists) {
        intersectPoints.push(pt)
      }
    }
  })

  if (intersectPoints.length >= 3) {
    const sorted = sortPointsClockwise3D(intersectPoints, normal)
    return { isCircle: false, polygon: sorted, normal }
  }
  
  return null
}

