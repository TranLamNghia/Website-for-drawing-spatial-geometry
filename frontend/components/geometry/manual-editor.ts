'use client'

import type { GeometryData } from './geometry-context'

export type Vec3 = [number, number, number]

export type ManualTool =
  | 'select'
  | 'point'
  | 'segment'
  | 'polygon'
  | 'box'
  | 'pyramid'
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
  position: Vec3
  segmentId?: string
  t?: number
  sourcePointIds?: string[]
  sourceSegmentIds?: [string, string]
  sourcePointId?: string
  sourceSegmentId?: string
  targetSegmentId?: string
  targetPolygonId?: string
  sideIndex?: number
  totalSides?: number
  anchorPointId?: string
  shapeType?:
    | 'parallelogram_D'
    | 'rhombus_C'
    | 'rhombus_D'
    | 'rightIsosceles_C'
    | 'equilateral_C'
    | 'square_C'
    | 'square_D'
}

export interface ManualSegment extends ManualEntityMeta {
  entityType: 'segment'
  startPointId: string
  endPointId: string
}

export interface ManualPolygon extends ManualEntityMeta {
  entityType: 'polygon'
  pointIds: string[]
}

export interface ManualCircle extends ManualEntityMeta {
  entityType: 'circle'
  circleKind: 'threePoints' | 'centerRadius' | 'centerPoint'
  centerPointId?: string
  radiusPointId?: string
  radius?: number
  sourcePointIds?: string[]
}

export interface ManualSolid extends ManualEntityMeta {
  entityType: 'solid'
  solidType: 'box' | 'pyramid' | 'prism' | 'sphere' | 'cone' | 'cylinder'
  height?: number
  radius?: number
  cornerPointIds?: [string, string]
  basePolygonId?: string
  baseCircleId?: string
  centerPointId?: string
  apexPointId?: string
  topPointId?: string
  radiusPointId?: string
}

export interface ManualDocument {
  points: ManualPoint[]
  segments: ManualSegment[]
  polygons: ManualPolygon[]
  solids: ManualSolid[]
  circles: ManualCircle[]
}

export interface ManualSnapTarget {
  kind: 'point' | 'midpoint' | 'segment' | 'workplane'
  label: string
  position: Vec3
  pointId?: string
  segmentId?: string
  t?: number
}

export interface ManualDraft {
  tool: ManualTool
  pointIds?: string[]
  segmentIds?: string[]
  basePolygonId?: string | null
  baseCircleId?: string | null
  height?: number
  radius?: number
  centerPointId?: string | null
  apexPointId?: string | null
  topPointId?: string | null
  radiusPointId?: string | null
  previewPosition?: Vec3 | null
  snapTarget?: ManualSnapTarget | null
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
  sourceKind: 'polygon' | 'solid'
  sourceId: string
  fillColor: string
  opacity: number
  visible: boolean
}

export interface ManualDisplayCircle {
  id: string
  label: string
  center: Vec3
  radius: number
  normal: Vec3
  sourceKind: 'circle'
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
  manualDocument: ManualDocument
  viewState?: {
    showAxes?: boolean
    showGrid?: boolean
    showLabels?: boolean
  }
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

function round(value: number, digits = 3) {
  return Number(value.toFixed(digits))
}

function cloneVec3(vec: Vec3): Vec3 {
  return [vec[0], vec[1], vec[2]]
}

function addVec3(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
}

function scaleVec3(vec: Vec3, scalar: number): Vec3 {
  return [vec[0] * scalar, vec[1] * scalar, vec[2] * scalar]
}

function lerpVec3(a: Vec3, b: Vec3, t: number): Vec3 {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ]
}

function distance(a: Vec3, b: Vec3) {
  return Math.sqrt(
    (a[0] - b[0]) ** 2 +
      (a[1] - b[1]) ** 2 +
      (a[2] - b[2]) ** 2,
  )
}

function dotVec3(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

function crossVec3(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ]
}

function subVec3(a: Vec3, b: Vec3): Vec3 {
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

function centroid(points: Vec3[]): Vec3 {
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
) {
  return JSON.stringify({
    mode: 'manual',
    manualDocument,
    viewState,
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

export function resolvePointPositions(document: ManualDocument) {
  const pointMap = new Map(document.points.map((point) => [point.id, point]))
  const positions: Record<string, Vec3> = {}

  const resolvePoint = (pointId: string, visiting = new Set<string>()): Vec3 => {
    if (positions[pointId]) return positions[pointId]
    const point = pointMap.get(pointId)
    if (!point) return [0, 0, 0]
    if (visiting.has(pointId)) return cloneVec3(point.position)
    visiting.add(pointId)

    if (point.pointKind === 'segment' && point.segmentId) {
      const segment = document.segments.find((candidate) => candidate.id === point.segmentId)
      if (segment) {
        const start = resolvePoint(segment.startPointId, visiting)
        const end = resolvePoint(segment.endPointId, visiting)
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
      const segA = document.segments.find((s) => s.id === point.sourceSegmentIds![0])
      const segB = document.segments.find((s) => s.id === point.sourceSegmentIds![1])
      if (segA && segB) {
        const a1 = resolvePoint(segA.startPointId, visiting)
        const a2 = resolvePoint(segA.endPointId, visiting)
        const b1 = resolvePoint(segB.startPointId, visiting)
        const b2 = resolvePoint(segB.endPointId, visiting)
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
        const seg = document.segments.find((s) => s.id === point.targetSegmentId)
        if (seg) {
          const src = resolvePoint(point.sourcePointId, visiting)
          const ls = resolvePoint(seg.startPointId, visiting)
          const le = resolvePoint(seg.endPointId, visiting)
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
      const seg = document.segments.find((s) => s.id === point.sourceSegmentId)
      if (seg) {
        const posStart = resolvePoint(seg.startPointId, visiting)
        const posEnd = resolvePoint(seg.endPointId, visiting)
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
      if ((point.shapeType === 'rhombus_C' || point.shapeType === 'rhombus_D') && point.sourcePointIds.length >= 2) {
        const posA = resolvePoint(point.sourcePointIds[0], visiting)
        const posB = resolvePoint(point.sourcePointIds[1], visiting)
        const M = scaleVec3(addVec3(posA, posB), 0.5)
        const E = subVec3(posB, posA)
        const lenE = Math.hypot(E[0], E[1], E[2])
        const w: Vec3 = [-E[1], E[0], 0]
        const lenw = Math.hypot(w[0], w[1])
        const w_norm = lenw > 1e-9 ? scaleVec3(w, 1 / lenw) : [0, 1, 0] as Vec3
        const offset = scaleVec3(w_norm, lenE * 0.4)
        positions[pointId] = point.shapeType === 'rhombus_C' ? addVec3(M, offset) : subVec3(M, offset)
        visiting.delete(pointId)
        return positions[pointId]
      }
      if (point.shapeType === 'rightIsosceles_C' && point.sourcePointIds.length >= 2) {
        const posA = resolvePoint(point.sourcePointIds[0], visiting)
        const posB = resolvePoint(point.sourcePointIds[1], visiting)
        const v = subVec3(posB, posA)
        const vRot: Vec3 = [-v[1], v[0], 0]
        positions[pointId] = addVec3(posA, vRot)
        visiting.delete(pointId)
        return positions[pointId]
      }
      if (point.shapeType === 'equilateral_C' && point.sourcePointIds.length >= 2) {
        const posA = resolvePoint(point.sourcePointIds[0], visiting)
        const posB = resolvePoint(point.sourcePointIds[1], visiting)
        const v = subVec3(posB, posA)
        const cos60 = 0.5
        const sin60 = 0.8660254
        const vRot: Vec3 = [
          v[0] * cos60 - v[1] * sin60,
          v[0] * sin60 + v[1] * cos60,
          0
        ]
        positions[pointId] = addVec3(posA, vRot)
        visiting.delete(pointId)
        return positions[pointId]
      }
      if (point.shapeType === 'square_C' && point.sourcePointIds.length >= 2) {
        const posA = resolvePoint(point.sourcePointIds[0], visiting)
        const posB = resolvePoint(point.sourcePointIds[1], visiting)
        const v = subVec3(posB, posA)
        const vRot: Vec3 = [-v[1], v[0], 0]
        positions[pointId] = addVec3(posB, vRot)
        visiting.delete(pointId)
        return positions[pointId]
      }
      if (point.shapeType === 'square_D' && point.sourcePointIds.length >= 2) {
        const posA = resolvePoint(point.sourcePointIds[0], visiting)
        const posB = resolvePoint(point.sourcePointIds[1], visiting)
        const v = subVec3(posB, posA)
        const vRot: Vec3 = [-v[1], v[0], 0]
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
      const seg = document.segments.find((s) => s.id === point.sourceSegmentId)
      if (seg) {
        const posStart = resolvePoint(seg.startPointId, visiting)
        const posEnd = resolvePoint(seg.endPointId, visiting)
        const anchor = resolvePoint(point.anchorPointId, visiting)

        const E = subVec3(posEnd, posStart)
        const lenE = Math.hypot(E[0], E[1], E[2])
        const E_norm = lenE > 1e-9 ? scaleVec3(E, 1 / lenE) : ([1, 0, 0] as Vec3)

        positions[pointId] = addVec3(anchor, scaleVec3(E_norm, point.t ?? 0))
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

function getPolygonNormal(points: Vec3[]): Vec3 {
  if (points.length < 3) return [0, 0, 1]
  const v1 = subVec3(points[1], points[0])
  const v2 = subVec3(points[2], points[0])
  const cross = crossVec3(v1, v2)
  const len = Math.hypot(cross[0], cross[1], cross[2])
  if (len < 1e-9) {
    for (let i = 2; i < points.length - 1; i++) {
      const v1_alt = subVec3(points[i], points[0])
      const v2_alt = subVec3(points[i+1], points[0])
      const cross_alt = crossVec3(v1_alt, v2_alt)
      const len_alt = Math.hypot(cross_alt[0], cross_alt[1], cross_alt[2])
      if (len_alt > 1e-9) {
        return [cross_alt[0] / len_alt, cross_alt[1] / len_alt, cross_alt[2] / len_alt]
      }
    }
    return [0, 0, 1]
  }
  return [cross[0] / len, cross[1] / len, cross[2] / len]
}

function resolveCircleProps(
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
      return { center: cPos, radius: distance(cPos, rPos), normal: [0, 0, 1] }
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

  document.points.forEach((point) => {
    const resolved = pointPositions[point.id]
    if (!resolved) return

    displayPoints.push({
      id: point.id,
      label: point.label,
      position: resolved,
      sourceKind: 'point',
      sourceId: point.id,
      selectable: point.selectable,
      generated: false,
      visible: point.visible,
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

    displaySegments.push({
      id: segment.id,
      label: segment.label,
      start,
      end,
      sourceKind: 'segment',
      sourceId: segment.id,
      visible: segment.visible,
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
    const polygonPoints = polygon.pointIds
      .map((pointId) => pointPositions[pointId])
      .filter(Boolean) as Vec3[]
    const polygonLabels = polygon.pointIds
      .map((pointId) => pointMap.get(pointId)?.label)
      .filter(Boolean) as string[]
    if (polygonPoints.length < 3 || polygonLabels.length < 3) return

    displayPolygons.push({
      id: polygon.id,
      label: polygon.label,
      points: polygonPoints,
      sourceKind: 'polygon',
      sourceId: polygon.id,
      fillColor: '#0f766e',
      opacity: 0.18,
      visible: polygon.visible,
    })

    buildPolygonEdges(polygon.id, polygonLabels, polygonPoints, polygon.visible).forEach(
      (edge) => displaySegments.push(edge),
    )
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
    if (solid.solidType === 'box' && solid.cornerPointIds) {
      const first = pointPositions[solid.cornerPointIds[0]]
      const third = pointPositions[solid.cornerPointIds[1]]
      const firstPoint = pointMap.get(solid.cornerPointIds[0])
      const thirdPoint = pointMap.get(solid.cornerPointIds[1])
      if (!first || !third || !firstPoint || !thirdPoint) return

      const baseA: Vec3 = [first[0], first[1], 0]
      const baseB: Vec3 = [third[0], first[1], 0]
      const baseC: Vec3 = [third[0], third[1], 0]
      const baseD: Vec3 = [first[0], third[1], 0]
      const topA: Vec3 = [baseA[0], baseA[1], solid.height ?? 0]
      const topB: Vec3 = [baseB[0], baseB[1], solid.height ?? 0]
      const topC: Vec3 = [baseC[0], baseC[1], solid.height ?? 0]
      const topD: Vec3 = [baseD[0], baseD[1], solid.height ?? 0]
      const labelA = firstPoint.label
      let labelB = `${solid.label}B`
      let labelD = `${solid.label}D`

      // Smart distinct label assignment to avoid duplicates and preserve alphabet order
      const usedLabelsInDoc = new Set(document.points.map((p) => p.label))
      usedLabelsInDoc.add(labelA)
      usedLabelsInDoc.add(thirdPoint.label)

      const getNextAvailableLetter = () => {
        for (let pass = 0; pass < 10; pass += 1) {
          for (const letter of LETTERS) {
            const candidate = pass === 0 ? letter : `${letter}${pass}`
            if (!usedLabelsInDoc.has(candidate)) {
              usedLabelsInDoc.add(candidate)
              return candidate
            }
          }
        }
        return `P_${crypto.randomUUID().slice(0, 4)}`
      }

      const codeA = labelA.charCodeAt(0)
      if (labelA.length === 1 && codeA >= 65 && codeA <= 90) {
        const candidateB = String.fromCharCode(((codeA - 65 + 1) % 26) + 65)
        const candidateD = String.fromCharCode(((codeA - 65 + 3) % 26) + 65)

        if (candidateB === thirdPoint.label || document.points.some((p) => p.label === candidateB)) {
          labelB = getNextAvailableLetter()
        } else {
          labelB = candidateB
          usedLabelsInDoc.add(labelB)
        }

        if (candidateD === thirdPoint.label || document.points.some((p) => p.label === candidateD)) {
          labelD = getNextAvailableLetter()
        } else {
          labelD = candidateD
          usedLabelsInDoc.add(labelD)
        }
      } else {
        labelB = getNextAvailableLetter()
        labelD = getNextAvailableLetter()
      }

      const baseLabels = [labelA, labelB, thirdPoint.label, labelD]
      const topLabels = baseLabels.map((label) => `${label}'`)
      const allPoints = [baseA, baseB, baseC, baseD, topA, topB, topC, topD]
      const allLabels = [...baseLabels, ...topLabels]

      allPoints.forEach((point, index) => pushGeometryPoint(geometry, allLabels[index], point))

      allPoints.forEach((point, index) => {
        const isCorner = index === 0 || index === 2
        displayPoints.push({
          id: isCorner ? (index === 0 ? solid.cornerPointIds![0] : solid.cornerPointIds![1]) : `${solid.id}_point_${index}`,
          label: allLabels[index],
          position: point,
          sourceKind: isCorner ? 'point' : 'solid',
          sourceId: isCorner ? (index === 0 ? solid.cornerPointIds![0] : solid.cornerPointIds![1]) : solid.id,
          selectable: true,
          generated: !isCorner,
          visible: solid.visible,
        })
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

      const width = Math.abs(baseB[0] - baseA[0])
      const depth = Math.abs(baseD[1] - baseA[1])
      const baseArea = width * depth
      solidInfo[solid.id] = {
        solidType: 'box',
        baseLabel: baseLabels.join(', '),
        height: round(Math.abs(solid.height ?? 0)),
        baseArea: round(baseArea),
        volume: round(baseArea * Math.abs(solid.height ?? 0)),
        formula: `V = S_đáy * h = ${round(baseArea)} * ${round(Math.abs(solid.height ?? 0))}`,
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

    if (solid.solidType === 'pyramid') {
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
          sourceKind: 'solid',
          sourceId: solid.id,
          fillColor: '#ea580c',
          opacity: 0.12,
          visible: solid.visible,
        })
      }
      pushGeometryPlane(geometry, baseLabels, '#f59e0b', 0.12)

      const distVec = subVec3(apex, basePoints[0])
      const resolvedHeight = Math.abs(dotVec3(distVec, normal))
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
      const isRealPoint = index === 0 && hasTopPoint
      pushGeometryPoint(geometry, topLabels[index], point)
      if (!isRealPoint) {
        displayPoints.push({
          id: `${solid.id}_top_${index}`,
          label: topLabels[index],
          position: point,
          sourceKind: 'solid',
          sourceId: solid.id,
          selectable: false,
          generated: true,
          visible: solid.visible,
        })
      }
    })

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

  // ──── Sphere / Cone / Cylinder (round solids) ────
  document.solids.forEach((solid) => {
    if (solid.solidType === 'sphere' && solid.centerPointId && solid.radius) {
      const center = pointPositions[solid.centerPointId]
      const centerPoint = pointMap.get(solid.centerPointId)
      if (!center || !centerPoint) return
      const r = solid.radius

      // Generate wireframe circle points for display (3 circles: XY, XZ, YZ)
      const circleSegments = 32
      const circleColors = ['#e11d48', '#2563eb', '#16a34a']
      const circleNormals: Vec3[] = [[0, 0, 1], [0, 1, 0], [1, 0, 0]]

      circleNormals.forEach((normal, circleIdx) => {
        const circlePoints: Vec3[] = []
        for (let i = 0; i <= circleSegments; i++) {
          const angle = (i / circleSegments) * Math.PI * 2
          const cos = Math.cos(angle)
          const sin = Math.sin(angle)
          let pt: Vec3
          if (normal[2] === 1) pt = [center[0] + r * cos, center[1] + r * sin, center[2]]
          else if (normal[1] === 1) pt = [center[0] + r * cos, center[1], center[2] + r * sin]
          else pt = [center[0], center[1] + r * cos, center[2] + r * sin]
          circlePoints.push(pt)
        }
        for (let i = 0; i < circlePoints.length - 1; i++) {
          displaySegments.push({
            id: `${solid.id}_circle${circleIdx}_${i}`,
            label: '',
            start: circlePoints[i],
            end: circlePoints[i + 1],
            sourceKind: 'solid',
            sourceId: solid.id,
            visible: solid.visible,
          })
        }
      })

      // Display center point
      displayPoints.push({
        id: `${solid.id}_center`,
        label: centerPoint.label,
        position: center,
        sourceKind: 'solid',
        sourceId: solid.id,
        selectable: false,
        generated: true,
        visible: solid.visible,
      })

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

      const h = solid.height ?? 5
      const apex: Vec3 = addVec3(center, scaleVec3(normal, h))
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

      // Slant lines (4 generatrices)
      for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2
        const cos = Math.cos(angle)
        const sin = Math.sin(angle)
        const basePoint = addVec3(center, addVec3(scaleVec3(u_norm, r * cos), scaleVec3(w_norm, r * sin)))
        displaySegments.push({
          id: `${solid.id}_slant_${i}`,
          label: '',
          start: basePoint,
          end: apex,
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

      const h = solid.height ?? 5
      const topCenter: Vec3 = addVec3(center, scaleVec3(normal, h))
      const topLabel = hasBaseCircle ? `${baseLabel}'` : (solid.centerPointId && pointMap.get(solid.centerPointId) ? `${pointMap.get(solid.centerPointId)!.label}'` : `${solid.label}'`)

      if (!hasBaseCircle && solid.centerPointId) {
        const cMeta = pointMap.get(solid.centerPointId)
        if (cMeta) {
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

      // Vertical generatrices (4 lines)
      for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2
        const cos = Math.cos(angle)
        const sin = Math.sin(angle)
        const offset = addVec3(scaleVec3(u_norm, r * cos), scaleVec3(w_norm, r * sin))
        displaySegments.push({
          id: `${solid.id}_gen_${i}`,
          label: '',
          start: addVec3(center, offset),
          end: addVec3(topCenter, offset),
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
          center = cPos
          radius = distance(cPos, rPos)
          normal = [0, 0, 1]
        }
      }

      displayCircles.push({
        id: circle.id,
        label: circle.label,
        center,
        radius,
        normal,
        sourceKind: 'circle',
        sourceId: circle.id,
        visible: circle.visible,
      })
    })
  }

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

