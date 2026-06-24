'use client'

import type { GeometryData, SolveArtifact, SectionData } from '../geometry-context'
import {
  addVec3,
  createEmptyManualDocument,
  dotVec3,
  scaleVec3,
  serializeManualProject,
  subVec3,
  type ManualCircle,
  type ManualCut,
  type ManualDocument,
  type ManualPoint,
  type ManualPolygon,
  type ManualProjectSnapshot,
  type ManualSegment,
  type ManualSolid,
  type Vec3,
} from '../manual-editor'

export interface ImportCanvasState {
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

export interface ImportSolveArtifactOptions extends ImportCanvasState {
  problemText?: string
}

export interface ImportResult {
  geometryJson: string
  warnings: string[]
  manualDocument: ManualDocument
}

type ConstructionPayload = {
  schemaVersion?: number
  metadata?: unknown
  entities?: {
    points?: string[]
    segments?: string[]
    planes?: string[]
    solids?: string[]
    sections?: SectionData[]
  }
  facts?: Array<{
    id?: string
    type?: string
    data?: any
    raw_text?: string
  }>
  queries?: unknown[]
  aliases?: Record<string, string>
  points?: Record<string, { x: number; y: number; z: number }>
  sections?: SectionData[]
}

const LABEL_RE = /[A-Z][0-9]*'?/g

function normalizeLabel(label: string) {
  return label.trim().toUpperCase()
}

function safeId(prefix: string, label: string, used: Set<string>) {
  const base = `${prefix}_${label.replace(/[^A-Z0-9]+/gi, '_')}`
  let candidate = base
  let index = 1
  while (used.has(candidate)) {
    index += 1
    candidate = `${base}_${index}`
  }
  used.add(candidate)
  return candidate
}

function cloneVec3(value: Vec3): Vec3 {
  return [value[0], value[1], value[2]]
}

function toVec3(coords?: [number, number, number] | Vec3 | null): Vec3 {
  if (!coords) return [0, 0, 0]
  return [coords[0], coords[1], coords[2]]
}

function parseVertexLabels(value?: string | null) {
  if (!value) return []
  return (value.match(LABEL_RE) || []).map(normalizeLabel)
}

function parseEntityLabels(value?: string | null) {
  return parseVertexLabels(value)
}

function ensurePoint(
  document: ManualDocument,
  pointMap: Map<string, string>,
  usedIds: Set<string>,
  label: string,
  position: Vec3,
  pointKind: ManualPoint['pointKind'] = 'free',
  extra: Partial<ManualPoint> = {},
) {
  const normalized = normalizeLabel(label)
  const existingId = pointMap.get(normalized)
  if (existingId) return existingId

  const id = safeId('pt', normalized, usedIds)
  const point: ManualPoint = {
    id,
    label: normalized,
    createdByTool: pointKind === 'free' ? 'point' : 'select',
    dependsOn: [],
    locked: pointKind !== 'free',
    visible: true,
    selectable: true,
    entityType: 'point',
    pointKind,
    position: cloneVec3(position),
    ...extra,
  } as ManualPoint
  document.points.push(point)
  pointMap.set(normalized, id)
  return id
}

function ensureSegment(
  document: ManualDocument,
  segmentMap: Map<string, string>,
  usedIds: Set<string>,
  pointMap: Map<string, string>,
  startLabel: string,
  endLabel: string,
  extraDependsOn: string[] = [],
) {
  const a = normalizeLabel(startLabel)
  const b = normalizeLabel(endLabel)
  const key = [a, b].sort().join('-')
  const existingId = segmentMap.get(key)
  if (existingId) return existingId
  const startPointId = pointMap.get(a)
  const endPointId = pointMap.get(b)
  if (!startPointId || !endPointId) return null

  const id = safeId('seg', key, usedIds)
  const segment: ManualSegment = {
    id,
    label: `${a}${b}`,
    createdByTool: 'segment',
    dependsOn: [...extraDependsOn, startPointId, endPointId],
    locked: true,
    visible: true,
    selectable: true,
    entityType: 'segment',
    startPointId,
    endPointId,
  }
  document.segments.push(segment)
  segmentMap.set(key, id)
  return id
}

function ensurePolygon(
  document: ManualDocument,
  polygonMap: Map<string, string>,
  segmentMap: Map<string, string>,
  usedIds: Set<string>,
  pointMap: Map<string, string>,
  labels: string[],
  explicitId?: string,
  options: {
    internal?: boolean
    generateBoundarySegments?: boolean
  } = {},
) {
  const normalized = labels.map(normalizeLabel).filter(Boolean)
  if (normalized.length < 3) return null
  const key = normalized.slice().sort().join('|')
  const existingId = polygonMap.get(key)
  if (existingId) return existingId

  const pointIds = normalized.map((label) => pointMap.get(label)).filter(Boolean) as string[]
  if (pointIds.length < 3) return null

  const id = explicitId || safeId('poly', key, usedIds)
  const polygon: ManualPolygon = {
    id,
    label: normalized.join(''),
    createdByTool: 'polygon',
    dependsOn: pointIds,
    locked: true,
    visible: !options.internal,
    selectable: !options.internal,
    entityType: 'polygon',
    pointIds,
    internal: options.internal,
  }
  document.polygons.push(polygon)
  polygonMap.set(key, id)
  if (options.generateBoundarySegments !== false && !options.internal) {
    for (let index = 0; index < normalized.length; index += 1) {
      ensureSegment(
        document,
        segmentMap,
        usedIds,
        pointMap,
        normalized[index],
        normalized[(index + 1) % normalized.length],
        [id],
      )
    }
  }
  return id
}

function ensureCircle(
  document: ManualDocument,
  circleMap: Map<string, string>,
  usedIds: Set<string>,
  pointMap: Map<string, string>,
  centerLabel: string,
  radius: number,
  circleKind: ManualCircle['circleKind'] = 'centerRadius',
) {
  const key = `${normalizeLabel(centerLabel)}_${radius.toFixed(4)}_${circleKind}`
  const existingId = circleMap.get(key)
  if (existingId) return existingId
  const centerPointId = pointMap.get(normalizeLabel(centerLabel))
  if (!centerPointId) return null

  const id = safeId('cir', key, usedIds)
  const circle: ManualCircle = {
    id,
    label: normalizeLabel(centerLabel),
    createdByTool: 'circle',
    dependsOn: [centerPointId],
    locked: true,
    visible: true,
    selectable: true,
    entityType: 'circle',
    circleKind,
    centerPointId,
    radius,
  }
  document.circles.push(circle)
  circleMap.set(key, id)
  return id
}

function addSolidVertexPoints(
  document: ManualDocument,
  usedIds: Set<string>,
  solidId: string,
  labels: string[],
  positions: Record<string, Vec3>,
  startIndex = 0,
) {
  labels.forEach((label, index) => {
    const normalized = normalizeLabel(label)
    const pos = positions[normalized] || [0, 0, 0]
    const id = safeId('pt', `${solidId}_${index}`, usedIds)
    document.points.push({
      id,
      label: normalized,
      createdByTool: 'select',
      dependsOn: [],
      locked: true,
      visible: true,
      selectable: true,
      entityType: 'point',
      pointKind: 'solidVertex',
      solidId,
      vertexIndex: startIndex + index,
      position: cloneVec3(pos),
    })
  })
}

function parseSolidDefinition(
  solidStr: string,
  geometryData: GeometryData,
  positions: Record<string, Vec3>,
  document: ManualDocument,
  pointMap: Map<string, string>,
  polygonMap: Map<string, string>,
  segmentMap: Map<string, string>,
  usedIds: Set<string>,
  warnings: string[],
) {
  const normalized = solidStr.trim()
  if (!normalized) return null

  const parts = normalized.split('.').map(part => part.trim()).filter(Boolean)
  if (parts.length === 2) {
    const topLabels = parseEntityLabels(parts[0])
    const baseLabels = parseEntityLabels(parts[1])
    if (topLabels.length === 1 && baseLabels.length >= 3) {
      const basePolygonId = ensurePolygon(document, polygonMap, segmentMap, usedIds, pointMap, baseLabels, undefined, {
        internal: true,
        generateBoundarySegments: false,
      })
      if (!basePolygonId) return null
      const solidId = safeId('solid', normalized, usedIds)
      const apexLabel = topLabels[0]
      const apexPointId = ensureFreePoint(document, pointMap, usedIds, apexLabel, positions[apexLabel] || [0, 0, 0])
      document.solids.push({
        id: solidId,
        label: normalized,
        createdByTool: 'pyramid',
        dependsOn: [basePolygonId, apexPointId].filter(Boolean) as string[],
        locked: true,
        visible: true,
        selectable: true,
        entityType: 'solid',
        solidType: 'pyramid',
        basePolygonId,
        apexPointId,
      })
      return solidId
    }

    if (topLabels.length >= 3 && baseLabels.length >= 3 && topLabels.length === baseLabels.length) {
      const basePolygonId = ensurePolygon(document, polygonMap, segmentMap, usedIds, pointMap, baseLabels, undefined, {
        internal: true,
        generateBoundarySegments: false,
      })
      if (!basePolygonId) return null
      const solidId = safeId('solid', normalized, usedIds)
      document.solids.push({
        id: solidId,
        label: normalized,
        createdByTool: 'prism',
        dependsOn: [basePolygonId],
        locked: true,
        visible: true,
        selectable: true,
        entityType: 'solid',
        solidType: 'prism',
        basePolygonId,
        topPointId: pointMap.get(topLabels[0]) || undefined,
      })
      addSolidVertexPoints(document, usedIds, solidId, topLabels, positions, baseLabels.length)
      return solidId
    }
  }

  const labels = parseEntityLabels(normalized)
  if (labels.length === 4) {
    const basePolygonId = ensurePolygon(document, polygonMap, segmentMap, usedIds, pointMap, labels.slice(0, 3), undefined, {
      internal: true,
      generateBoundarySegments: false,
    })
    if (!basePolygonId) return null
    const apexLabel = labels[3]
    const solidId = safeId('solid', normalized, usedIds)
    const apexPointId = ensureFreePoint(document, pointMap, usedIds, apexLabel, positions[apexLabel] || [0, 0, 0])
    document.solids.push({
      id: solidId,
      label: normalized,
      createdByTool: 'pyramid',
      dependsOn: [basePolygonId, apexPointId].filter(Boolean) as string[],
      locked: true,
      visible: true,
      selectable: true,
      entityType: 'solid',
      solidType: 'pyramid',
      basePolygonId,
      apexPointId,
    })
    return solidId
  }

  if (labels.length >= 8) {
    const cornerPointIds = labels.slice(0, 3)
      .map(label => pointMap.get(label))
      .filter(Boolean) as string[]
    if (cornerPointIds.length >= 2) {
      const solidId = safeId('solid', normalized, usedIds)
      document.solids.push({
        id: solidId,
        label: normalized,
        createdByTool: 'box',
        dependsOn: cornerPointIds,
        locked: true,
        visible: true,
        selectable: true,
        entityType: 'solid',
        solidType: 'box',
        cornerPointIds,
      })
      addSolidVertexPoints(document, usedIds, solidId, labels.slice(0, 8), positions)
      return solidId
    }
  }

  warnings.push(`Chua the nhan dien khoi: ${solidStr}`)
  return null
}

function ensureFreePoint(
  document: ManualDocument,
  pointMap: Map<string, string>,
  usedIds: Set<string>,
  label: string,
  position: Vec3,
) {
  const normalized = normalizeLabel(label)
  const existingId = pointMap.get(normalized)
  if (!existingId) {
    return ensurePoint(document, pointMap, usedIds, normalized, position, 'free')
  }

  const point = document.points.find((candidate) => candidate.id === existingId)
  if (!point) return existingId

  point.pointKind = 'free'
  point.createdByTool = 'point'
  point.dependsOn = []
  point.locked = false
  point.position = cloneVec3(position)
  delete point.solidId
  delete point.vertexIndex
  delete point.sourcePointId
  delete point.sourceSegmentId
  delete point.targetSegmentId
  delete point.targetPolygonId
  delete point.sourcePointIds
  delete point.segmentId
  delete point.t
  return existingId
}

function parseRatioValue(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return 0.5
  if (trimmed.includes('/')) {
    const [num, den] = trimmed.split('/').map((part) => parseFloat(part.trim()))
    if (Number.isFinite(num) && Number.isFinite(den) && Math.abs(den) > 1e-9) {
      return num / den
    }
  }
  const parsed = parseFloat(trimmed)
  return Number.isFinite(parsed) ? parsed : 0.5
}

function parseRatioTarget(data: any) {
  const segment1 = String(data?.segment1 || data?.Segment1 || '')
  const segment2 = String(data?.segment2 || data?.Segment2 || '')
  const value = String(data?.value || data?.Value || '')
  const v1 = parseEntityLabels(segment1)
  const v2 = parseEntityLabels(segment2)

  if (v1.length === 2 && v2.length === 2 && v1[1] === v2[0]) {
    const apOverPb = parseRatioValue(value)
    return {
      point: v1[1],
      start: v1[0],
      end: v2[1],
      t: apOverPb / (1 + apOverPb),
    }
  }

  if (v1.length >= 2 && v2.length >= 2 && v1[0] === v2[0]) {
    return {
      point: v1[1],
      start: v1[0],
      end: v2[1],
      t: parseRatioValue(value),
    }
  }

  return null
}

const POLYGON_SHAPE_TYPES = new Set([
  'triangle',
  'equilateral_triangle',
  'isosceles_triangle',
  'right_triangle',
  'isosceles_right_triangle',
  'square',
  'rectangle',
  'rhombus',
  'parallelogram',
  'trapezoid',
])

function getManualPoint(document: ManualDocument, pointMap: Map<string, string>, label: string) {
  const pointId = pointMap.get(normalizeLabel(label))
  if (!pointId) return null
  return document.points.find((candidate) => candidate.id === pointId) ?? null
}

function computeSegmentParameter(start: Vec3, end: Vec3, point: Vec3) {
  const dx = end[0] - start[0]
  const dy = end[1] - start[1]
  const dz = end[2] - start[2]
  const lenSq = dx * dx + dy * dy + dz * dz
  if (lenSq < 1e-9) return 0
  const px = point[0] - start[0]
  const py = point[1] - start[1]
  const pz = point[2] - start[2]
  return (px * dx + py * dy + pz * dz) / lenSq
}

function computeAngleBisectorDistance(
  vertex: Vec3,
  rayA: Vec3,
  rayC: Vec3,
  point: Vec3,
) {
  const vBA = subVec3(rayA, vertex)
  const vBC = subVec3(rayC, vertex)
  const lenBA = Math.hypot(vBA[0], vBA[1], vBA[2])
  const lenBC = Math.hypot(vBC[0], vBC[1], vBC[2])
  if (lenBA < 1e-9 || lenBC < 1e-9) return 20

  const uBA = scaleVec3(vBA, 1 / lenBA)
  const uBC = scaleVec3(vBC, 1 / lenBC)
  let dir = addVec3(uBA, uBC)
  let lenDir = Math.hypot(dir[0], dir[1], dir[2])
  if (lenDir < 1e-5) {
    dir = [-uBA[1], uBA[0], 0]
    lenDir = Math.hypot(dir[0], dir[1])
  }
  if (lenDir < 1e-9) return 20
  const dirNorm = scaleVec3(dir, 1 / lenDir)
  const offset = subVec3(point, vertex)
  return Math.abs(dotVec3(offset, dirNorm)) || 20
}

function applyTriangleCenterFact(
  document: ManualDocument,
  pointMap: Map<string, string>,
  segmentMap: Map<string, string>,
  polygonMap: Map<string, string>,
  usedIds: Set<string>,
  pointLabel: string,
  shapeName: string,
  pointKind: 'centroid' | 'incenter' | 'orthocenter' | 'circumcenter',
  createdByTool: ManualPoint['createdByTool'],
) {
  const shapeLabels = parseEntityLabels(shapeName)
  if (shapeLabels.length < 3) return

  const vertexIds = shapeLabels
    .map((label) => pointMap.get(label))
    .filter(Boolean) as string[]
  if (vertexIds.length < 3) return

  const polygonId = ensurePolygon(document, polygonMap, segmentMap, usedIds, pointMap, shapeLabels)
  const manualPoint = getManualPoint(document, pointMap, pointLabel)
  if (!manualPoint) return

  manualPoint.pointKind = pointKind
  manualPoint.createdByTool = createdByTool
  manualPoint.sourcePointIds = vertexIds
  if (polygonId) manualPoint.targetPolygonId = polygonId
  manualPoint.dependsOn = polygonId ? [polygonId, ...vertexIds] : [...vertexIds]
  manualPoint.locked = true
}

function applyConstructionFacts(
  document: ManualDocument,
  pointMap: Map<string, string>,
  segmentMap: Map<string, string>,
  polygonMap: Map<string, string>,
  usedIds: Set<string>,
  construction?: ConstructionPayload,
) {
  if (!construction?.facts?.length) return

  ;(construction.entities?.segments || []).forEach((segmentLabel) => {
    const labels = parseEntityLabels(segmentLabel)
    if (labels.length === 2) {
      ensureSegment(document, segmentMap, usedIds, pointMap, labels[0], labels[1])
    }
  })

  construction.facts.forEach((fact) => {
    const type = String(fact.type || '').toLowerCase()
    const data = fact.data || {}

    if (type === 'shape') {
      const target = String(data?.target || data?.Target || '')
      const shape = String(data?.shape || data?.Shape || '').toLowerCase()
      const labels = parseEntityLabels(target)
      if (!target.includes('.') && POLYGON_SHAPE_TYPES.has(shape) && labels.length >= 3) {
        ensurePolygon(document, polygonMap, segmentMap, usedIds, pointMap, labels)
      }
    }
  })

  construction.facts.forEach((fact) => {
    const type = String(fact.type || '').toLowerCase()
    const data = fact.data || {}

    if (type === 'midpoint') {
      const { point, labels } = parseSimpleMidpointData(data)
      if (!point || labels.length < 2) return
      const startId = pointMap.get(labels[0])
      const endId = pointMap.get(labels[1])
      if (!startId || !endId) return
      const manualPoint = getManualPoint(document, pointMap, point)
      if (!manualPoint) return
      manualPoint.pointKind = 'midpoint'
      manualPoint.createdByTool = 'midpoint'
      manualPoint.sourcePointIds = [startId, endId]
      manualPoint.dependsOn = [startId, endId]
      manualPoint.locked = true
      return
    }

    if (type === 'ratio') {
      const ratio = parseRatioTarget(data)
      if (!ratio) return
      const startId = pointMap.get(ratio.start)
      const endId = pointMap.get(ratio.end)
      if (!startId || !endId) return
      const segmentId = ensureSegment(document, segmentMap, usedIds, pointMap, ratio.start, ratio.end)
      if (!segmentId) return
      const manualPoint = getManualPoint(document, pointMap, ratio.point)
      if (!manualPoint) return
      manualPoint.pointKind = 'segment'
      manualPoint.createdByTool = 'segment'
      manualPoint.segmentId = segmentId
      manualPoint.t = ratio.t
      manualPoint.dependsOn = [startId, endId, segmentId]
      manualPoint.locked = true
      return
    }

    if (type === 'projection') {
      const { point, from, onto } = parseSimpleProjectionData(data)
      if (!point || !from || !onto) return
      const fromId = pointMap.get(from)
      if (!fromId) return
      const manualPoint = getManualPoint(document, pointMap, point)
      if (!manualPoint) return
      const ontoLabels = parseEntityLabels(onto)
      manualPoint.pointKind = 'projection'
      manualPoint.createdByTool = 'projection'
      manualPoint.sourcePointId = fromId
      manualPoint.dependsOn = [fromId]
      manualPoint.locked = true

      if (ontoLabels.length >= 3) {
        const polygonId = ensurePolygon(document, polygonMap, segmentMap, usedIds, pointMap, ontoLabels, undefined, {
          internal: true,
          generateBoundarySegments: false,
        })
        if (polygonId) {
          manualPoint.targetPolygonId = polygonId
          manualPoint.dependsOn = [fromId, polygonId]
        }
      } else if (ontoLabels.length === 2) {
        const segmentId = ensureSegment(document, segmentMap, usedIds, pointMap, ontoLabels[0], ontoLabels[1])
        if (segmentId) {
          manualPoint.targetSegmentId = segmentId
          manualPoint.dependsOn = [fromId, segmentId]
        }
      }
      return
    }

    if (type === 'centroid') {
      const pointLabel = normalizeLabel(String(data?.point || data?.Point || ''))
      const objects = Array.isArray(data?.objects) ? data.objects.map((value: unknown) => String(value)) : []
      if (!pointLabel || objects.length === 0) return
      applyTriangleCenterFact(
        document,
        pointMap,
        segmentMap,
        polygonMap,
        usedIds,
        pointLabel,
        objects[0],
        'centroid',
        'centroid',
      )
      return
    }

    if (type === 'incenter' || type === 'orthocenter' || type === 'circumcenter') {
      const pointLabel = normalizeLabel(String(data?.point || data?.Point || ''))
      const shapeName = String(data?.shape || data?.Shape || '')
      if (!pointLabel || !shapeName) return
      applyTriangleCenterFact(
        document,
        pointMap,
        segmentMap,
        polygonMap,
        usedIds,
        pointLabel,
        shapeName,
        type as 'incenter' | 'orthocenter' | 'circumcenter',
        'select',
      )
      return
    }

    if (type === 'intersection') {
      const { objects, value } = parseSimpleIntersectionData(data)
      if (!value || objects.length < 2) return
      const seg1 = parseEntityLabels(objects[0])
      const seg2 = parseEntityLabels(objects[1])
      if (seg1.length !== 2 || seg2.length !== 2) return
      const segmentIdA = ensureSegment(document, segmentMap, usedIds, pointMap, seg1[0], seg1[1])
      const segmentIdB = ensureSegment(document, segmentMap, usedIds, pointMap, seg2[0], seg2[1])
      if (!segmentIdA || !segmentIdB) return
      const manualPoint = getManualPoint(document, pointMap, value)
      if (!manualPoint) return
      manualPoint.pointKind = 'intersection'
      manualPoint.createdByTool = 'intersection'
      manualPoint.sourceSegmentIds = [segmentIdA, segmentIdB]
      manualPoint.dependsOn = [segmentIdA, segmentIdB]
      manualPoint.locked = true
      return
    }

    if (type === 'belongs_to') {
      const { point, target } = parseSimpleBelongsToData(data)
      if (!point || !target) return
      const targetLabels = parseEntityLabels(target)
      const manualPoint = getManualPoint(document, pointMap, point)
      if (!manualPoint) return

      if (targetLabels.length === 2) {
        const startId = pointMap.get(targetLabels[0])
        const endId = pointMap.get(targetLabels[1])
        if (!startId || !endId) return
        const segmentId = ensureSegment(document, segmentMap, usedIds, pointMap, targetLabels[0], targetLabels[1])
        if (!segmentId) return
        const startPoint = document.points.find((candidate) => candidate.id === startId)
        const endPoint = document.points.find((candidate) => candidate.id === endId)
        if (!startPoint || !endPoint) return
        manualPoint.pointKind = 'segment'
        manualPoint.createdByTool = 'segment'
        manualPoint.segmentId = segmentId
        manualPoint.t = computeSegmentParameter(startPoint.position, endPoint.position, manualPoint.position)
        manualPoint.dependsOn = [startId, endId, segmentId]
        manualPoint.locked = true
        return
      }

      if (targetLabels.length >= 3) {
        const vertexIds = targetLabels
          .map((label) => pointMap.get(label))
          .filter(Boolean) as string[]
        if (vertexIds.length < 3) return
        manualPoint.pointKind = 'facePoint'
        manualPoint.createdByTool = 'select'
        manualPoint.sourcePointIds = vertexIds.slice(0, 3)
        manualPoint.dependsOn = vertexIds.slice(0, 3)
        manualPoint.locked = true
      }
      return
    }

    if (type === 'angle_bisector') {
      const pointLabel = normalizeLabel(String(data?.point || data?.Point || ''))
      const vertexLabel = normalizeLabel(String(data?.vertex || data?.Vertex || ''))
      const ray1Label = normalizeLabel(String(data?.ray_1 || data?.ray1 || data?.Ray_1 || ''))
      const ray2Label = normalizeLabel(String(data?.ray_2 || data?.ray2 || data?.Ray_2 || ''))
      if (!pointLabel || !vertexLabel || !ray1Label || !ray2Label) return

      const vertexId = pointMap.get(vertexLabel)
      const ray1Id = pointMap.get(ray1Label)
      const ray2Id = pointMap.get(ray2Label)
      const manualPoint = getManualPoint(document, pointMap, pointLabel)
      if (!vertexId || !ray1Id || !ray2Id || !manualPoint) return

      const vertexPoint = document.points.find((candidate) => candidate.id === vertexId)
      const ray1Point = document.points.find((candidate) => candidate.id === ray1Id)
      const ray2Point = document.points.find((candidate) => candidate.id === ray2Id)
      if (!vertexPoint || !ray1Point || !ray2Point) return

      manualPoint.pointKind = 'angleBisectorPoint'
      manualPoint.createdByTool = 'angleBisector'
      manualPoint.sourcePointIds = [ray1Id, vertexId, ray2Id]
      manualPoint.t = computeAngleBisectorDistance(
        vertexPoint.position,
        ray1Point.position,
        ray2Point.position,
        manualPoint.position,
      )
      manualPoint.dependsOn = [ray1Id, vertexId, ray2Id]
      manualPoint.locked = true
    }
  })
}

function parseSimpleMidpointData(data: any) {
  const point = normalizeLabel(String(data?.point || data?.Point || ''))
  const segment = String(data?.segment || data?.Segment || '')
  const labels = parseEntityLabels(segment)
  return { point, labels }
}

function parseSimpleProjectionData(data: any) {
  const point = normalizeLabel(String(data?.point || data?.Point || ''))
  const from = normalizeLabel(String(data?.from || data?.From || ''))
  const onto = String(data?.onto || data?.Onto || '')
  return { point, from, onto }
}

function parseSimpleIntersectionData(data: any) {
  const objects = Array.isArray(data?.objects) ? data.objects.map((v: any) => String(v)) : []
  const value = normalizeLabel(String(data?.result?.value || data?.Result?.Value || ''))
  return { objects, value }
}

function parseSimpleBelongsToData(data: any) {
  const point = normalizeLabel(String(data?.point || data?.Point || ''))
  const target = String(data?.target || data?.Target || '')
  return { point, target }
}

function createFallbackGeometryDocument(
  geometryData: GeometryData,
) {
  const document = createEmptyManualDocument()
  const pointMap = new Map<string, string>()
  const segmentMap = new Map<string, string>()
  const polygonMap = new Map<string, string>()
  const circleMap = new Map<string, string>()
  const usedIds = new Set<string>()
  const positions: Record<string, Vec3> = {}

  Object.entries(geometryData.points || {}).forEach(([label, coords]) => {
    const normalized = normalizeLabel(label)
    const pos = toVec3(coords)
    positions[normalized] = pos
    ensurePoint(document, pointMap, usedIds, normalized, pos, 'free')
  })

  ;(geometryData.spheres || []).forEach((sphere) => {
    const centerId = pointMap.get(normalizeLabel(sphere.center))
    if (!centerId) return
    const solidId = safeId('solid', `sphere_${sphere.center}`, usedIds)
    document.solids.push({
      id: solidId,
      label: sphere.center,
      createdByTool: 'sphere',
      dependsOn: [centerId],
      locked: true,
      visible: true,
      selectable: true,
      entityType: 'solid',
      solidType: 'sphere',
      centerPointId: centerId,
      radius: sphere.radius,
    })
  })

  ;(geometryData.cones || []).forEach((cone) => {
    const centerId = pointMap.get(normalizeLabel(cone.center))
    const apexId = pointMap.get(normalizeLabel(cone.apex))
    if (!centerId || !apexId) return
    const solidId = safeId('solid', `cone_${cone.center}_${cone.apex}`, usedIds)
    document.solids.push({
      id: solidId,
      label: `${cone.center}.${cone.apex}`,
      createdByTool: 'cone',
      dependsOn: [centerId, apexId],
      locked: true,
      visible: true,
      selectable: true,
      entityType: 'solid',
      solidType: 'cone',
      centerPointId: centerId,
      apexPointId: apexId,
      radius: cone.radius,
    })
  })

  ;(geometryData.cylinders || []).forEach((cyl) => {
    const bottomId = pointMap.get(normalizeLabel(cyl.centerBottom))
    const topId = pointMap.get(normalizeLabel(cyl.centerTop))
    if (!bottomId || !topId) return
    const solidId = safeId('solid', `cyl_${cyl.centerBottom}_${cyl.centerTop}`, usedIds)
    document.solids.push({
      id: solidId,
      label: `${cyl.centerBottom}.${cyl.centerTop}`,
      createdByTool: 'cylinder',
      dependsOn: [bottomId, topId],
      locked: true,
      visible: true,
      selectable: true,
      entityType: 'solid',
      solidType: 'cylinder',
      centerPointId: bottomId,
      apexPointId: topId,
      radius: cyl.radius,
    })
  })

  return { document, pointMap, segmentMap, polygonMap, circleMap, positions }
}

function buildConstructionAwareDocument(
  geometryData: GeometryData,
  construction: ConstructionPayload | undefined,
) {
  const fallback = createFallbackGeometryDocument(geometryData)
  if (!construction?.facts?.length && !construction?.entities?.solids?.length) {
    return { ...fallback, warnings: [] as string[] }
  }

  const document = fallback.document
  const pointMap = fallback.pointMap
  const segmentMap = fallback.segmentMap
  const polygonMap = fallback.polygonMap
  const circleMap = fallback.circleMap
  const positions = fallback.positions
  const usedIds = new Set<string>([
    ...document.points.map((point) => point.id),
    ...document.segments.map((segment) => segment.id),
    ...document.polygons.map((polygon) => polygon.id),
    ...document.solids.map((solid) => solid.id),
    ...document.circles.map((circle) => circle.id),
  ])
  const warnings: string[] = []

  ;(construction.entities?.points || []).forEach((label) => {
    const normalized = normalizeLabel(label)
    if (!pointMap.has(normalized)) {
      const pos = positions[normalized] || [0, 0, 0]
      ensurePoint(document, pointMap, usedIds, normalized, pos, 'free')
    }
  })

  ;(construction.entities?.solids || []).forEach((solidStr) => {
    parseSolidDefinition(solidStr, geometryData, positions, document, pointMap, polygonMap, segmentMap, usedIds, warnings)
  })

  applyConstructionFacts(document, pointMap, segmentMap, polygonMap, usedIds, construction)

  return { document, warnings }
}

export function buildImportedManualProjectJson(
  artifact: SolveArtifact | null,
  options: ImportSolveArtifactOptions = {},
  fallbackGeometryData?: GeometryData | null,
): ImportResult {
  const rawResult = artifact?.rawResult as { manualDocument?: ManualDocument } | undefined
  if (rawResult?.manualDocument) {
    const snapshot: ManualProjectSnapshot = {
      mode: 'manual',
      schemaVersion: 2,
      manualDocument: rawResult.manualDocument,
      previewGeometryData: artifact?.geometryData ?? fallbackGeometryData ?? null,
      viewState: {
        showAxes: options.showAxes,
        showGrid: options.showGrid,
        showLabels: options.showLabels,
        cameraControls: options.cameraControls,
        bitmaskVisibility: options.bitmaskVisibility,
        orderedSectionIds: options.orderedSectionIds,
        explodeAmount: options.explodeAmount,
      },
      source: {
        kind: 'ai-import',
        problemText: options.problemText,
        importedAt: new Date().toISOString(),
        warnings: [],
        construction: (artifact?.rawResult as { construction?: unknown } | undefined)?.construction,
      },
    }

    return {
      geometryJson: serializeManualProject(
        snapshot.manualDocument,
        snapshot.viewState,
        {
          schemaVersion: snapshot.schemaVersion,
          previewGeometryData: snapshot.previewGeometryData,
          source: snapshot.source,
        },
      ),
      warnings: [],
      manualDocument: snapshot.manualDocument,
    }
  }

  const geometryData = artifact?.geometryData || fallbackGeometryData || ({
    points: {},
    edges: [],
    planes: [],
    is_consistent: true,
    queries: [],
  } as GeometryData)
  const construction = (artifact?.rawResult as { construction?: ConstructionPayload } | undefined)?.construction
  const { document, warnings } = buildConstructionAwareDocument(geometryData, construction)

  const snapshot: ManualProjectSnapshot = {
    mode: 'manual',
    schemaVersion: 2,
    manualDocument: document,
    previewGeometryData: artifact?.geometryData ?? fallbackGeometryData ?? null,
    viewState: {
      showAxes: options.showAxes,
      showGrid: options.showGrid,
      showLabels: options.showLabels,
      cameraControls: options.cameraControls,
      bitmaskVisibility: options.bitmaskVisibility,
      orderedSectionIds: options.orderedSectionIds,
      explodeAmount: options.explodeAmount,
    },
    source: {
      kind: 'ai-import',
      problemText: options.problemText,
      importedAt: new Date().toISOString(),
      warnings,
      construction,
    },
  }

  return {
    geometryJson: serializeManualProject(
      snapshot.manualDocument,
      snapshot.viewState,
      {
        schemaVersion: snapshot.schemaVersion,
        previewGeometryData: snapshot.previewGeometryData,
        source: snapshot.source,
      },
    ),
    warnings,
    manualDocument: document,
  }
}
