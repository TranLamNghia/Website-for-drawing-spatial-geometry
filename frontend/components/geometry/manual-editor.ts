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

export type ManualSelection =
  | { kind: 'point' | 'segment' | 'polygon' | 'solid'; id: string }
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
  pointKind: 'free' | 'segment'
  position: Vec3
  segmentId?: string
  t?: number
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

export interface ManualSolid extends ManualEntityMeta {
  entityType: 'solid'
  solidType: 'box' | 'pyramid' | 'prism'
  height: number
  cornerPointIds?: [string, string]
  basePolygonId?: string
}

export interface ManualDocument {
  points: ManualPoint[]
  segments: ManualSegment[]
  polygons: ManualPolygon[]
  solids: ManualSolid[]
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
  basePolygonId?: string | null
  height?: number
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

export interface ManualDerived {
  geometry: GeometryData
  pointPositions: Record<string, Vec3>
  displayPoints: ManualDisplayPoint[]
  displaySegments: ManualDisplaySegment[]
  displayPolygons: ManualDisplayPolygon[]
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

export function buildManualDerived(document: ManualDocument): ManualDerived {
  const geometry = emptyGeometry()
  const pointPositions = resolvePointPositions(document)
  const displayPoints: ManualDisplayPoint[] = []
  const displaySegments: ManualDisplaySegment[] = []
  const displayPolygons: ManualDisplayPolygon[] = []
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
      const topA: Vec3 = [baseA[0], baseA[1], solid.height]
      const topB: Vec3 = [baseB[0], baseB[1], solid.height]
      const topC: Vec3 = [baseC[0], baseC[1], solid.height]
      const topD: Vec3 = [baseD[0], baseD[1], solid.height]
      const baseLabels = [firstPoint.label, `${solid.label}B`, thirdPoint.label, `${solid.label}D`]
      const topLabels = baseLabels.map((label) => `${label}'`)
      const allPoints = [baseA, baseB, baseC, baseD, topA, topB, topC, topD]
      const allLabels = [...baseLabels, ...topLabels]

      allPoints.forEach((point, index) => pushGeometryPoint(geometry, allLabels[index], point))

      allPoints.forEach((point, index) => {
        displayPoints.push({
          id: `${solid.id}_point_${index}`,
          label: allLabels[index],
          position: point,
          sourceKind: 'solid',
          sourceId: solid.id,
          selectable: false,
          generated: true,
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
        height: round(Math.abs(solid.height)),
        baseArea: round(baseArea),
        volume: round(baseArea * Math.abs(solid.height)),
        formula: `V = S_đáy * h = ${round(baseArea)} * ${round(Math.abs(solid.height))}`,
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
      const apex: Vec3 = [center[0], center[1], solid.height]
      const apexLabel = `${solid.label}S`
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
      solidInfo[solid.id] = {
        solidType: 'pyramid',
        baseLabel: basePolygon.label,
        height: round(Math.abs(solid.height)),
        baseArea: round(baseArea),
        volume: round((baseArea * Math.abs(solid.height)) / 3),
        formula: `V = S_đáy * h / 3 = ${round(baseArea)} * ${round(Math.abs(solid.height))} / 3`,
        vertexCount: basePoints.length + 1,
        faceCount: basePoints.length + 1,
      }
      return
    }

    const topPoints = basePoints.map<Vec3>((point) => [point[0], point[1], point[2] + solid.height])
    const topLabels = baseLabels.map((label) => `${label}'`)
    topPoints.forEach((point, index) => {
      pushGeometryPoint(geometry, topLabels[index], point)
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
      height: round(Math.abs(solid.height)),
      baseArea: round(baseArea),
      volume: round(baseArea * Math.abs(solid.height)),
      formula: `V = S_đáy * h = ${round(baseArea)} * ${round(Math.abs(solid.height))}`,
      vertexCount: basePoints.length * 2,
      faceCount: basePoints.length + 2,
    }
  })

  return {
    geometry,
    pointPositions,
    displayPoints,
    displaySegments,
    displayPolygons,
    pointInfo,
    segmentInfo,
    polygonInfo,
    solidInfo,
  }
}

