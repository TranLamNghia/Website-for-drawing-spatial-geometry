'use client'

import type { GeometryData, SolveArtifact, SectionData } from '../geometry-context'
import {
  createEmptyManualDocument,
  serializeManualProject,
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
      const apexPointId = pointMap.get(apexLabel) || ensurePoint(document, pointMap, usedIds, apexLabel, positions[apexLabel] || [0, 0, 0], 'free')
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
    const apexPointId = pointMap.get(apexLabel) || ensurePoint(document, pointMap, usedIds, apexLabel, positions[apexLabel] || [0, 0, 0], 'free')
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

function createFallbackGeometryDocument(geometryData: GeometryData) {
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

  ;(geometryData.edges || []).forEach((edge) => {
    const labels = parseVertexLabels(edge)
    if (labels.length >= 2) {
      ensureSegment(document, segmentMap, usedIds, pointMap, labels[0], labels[1])
    }
  })

  ;(geometryData.planes || []).forEach((plane, index) => {
    if (plane.isSolidFace) return
    const labels = Array.isArray(plane.points) ? plane.points.map(normalizeLabel) : []
    ensurePolygon(document, polygonMap, segmentMap, usedIds, pointMap, labels, `plane_${index}`)
  })

  ;(geometryData.circles || []).forEach((circle) => {
    ensureCircle(document, circleMap, usedIds, pointMap, circle.center, circle.radius, 'centerRadius')
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

  ;(geometryData.sections || []).forEach((section) => {
    const targetSolid = section.targetSolid
    const labels = (section.cuttingPlane || []).map(normalizeLabel)
    if (!targetSolid || labels.length < 3) return
    const solid = document.solids.find((item) => item.label === targetSolid)
    if (!solid) return
    const cut: ManualCut = {
      id: section.id,
      planePointIds: labels,
      visible: true,
    }
    solid.cuts = [...(solid.cuts || []), cut]
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

  ;(construction.entities?.segments || []).forEach((segment) => {
    const labels = parseEntityLabels(segment)
    if (labels.length >= 2) {
      ensureSegment(document, segmentMap, usedIds, pointMap, labels[0], labels[1])
    }
  })

  ;(construction.entities?.solids || []).forEach((solidStr) => {
    parseSolidDefinition(solidStr, geometryData, positions, document, pointMap, polygonMap, segmentMap, usedIds, warnings)
  })

  ;(construction.facts || []).forEach((fact) => {
    const type = String(fact.type || '').toLowerCase()
    const data = fact.data || {}

    if (type === 'midpoint') {
      const { point, labels } = parseSimpleMidpointData(data)
      if (point && labels.length >= 2 && positions[point]) {
        ensurePoint(document, pointMap, usedIds, point, positions[point], 'midpoint', {
          sourcePointIds: labels.slice(0, 2).map((label) => pointMap.get(label) || '').filter(Boolean),
          dependsOn: labels.slice(0, 2).map((label) => pointMap.get(label) || '').filter(Boolean),
          segmentId: segmentMap.get(labels.slice(0, 2).sort().join('-')),
        })
      }
      return
    }

    if (type === 'projection') {
      const { point, from, onto } = parseSimpleProjectionData(data)
      if (!point || !positions[point]) return
      const targetLabels = parseEntityLabels(onto)
      const targetSegmentId = targetLabels.length >= 2 ? segmentMap.get(targetLabels.slice(0, 2).sort().join('-')) : undefined
      ensurePoint(document, pointMap, usedIds, point, positions[point], 'projection', {
        sourcePointId: pointMap.get(from) || undefined,
        targetSegmentId,
        targetPointIds: targetLabels.map((label: string) => pointMap.get(label) || '').filter(Boolean),
        dependsOn: [pointMap.get(from), targetSegmentId].filter(Boolean) as string[],
      })
      return
    }

    if (type === 'intersection') {
      const { objects, value } = parseSimpleIntersectionData(data)
      if (!value || !positions[value]) return
      const sourceSegmentIds: string[] = objects
        .flatMap((item: string) => parseEntityLabels(item))
        .slice(0, 4)
      ensurePoint(document, pointMap, usedIds, value, positions[value], 'intersection', {
        sourceSegmentIds: sourceSegmentIds.length >= 2
          ? [segmentMap.get([sourceSegmentIds[0], sourceSegmentIds[1]].sort().join('-')) || '', segmentMap.get([sourceSegmentIds[2], sourceSegmentIds[3]].sort().join('-')) || ''].filter(Boolean) as [string, string]
          : undefined,
        dependsOn: sourceSegmentIds.map((label: string) => pointMap.get(label) || '').filter(Boolean),
      })
      return
    }

    if (type === 'belongs_to') {
      const { point, target } = parseSimpleBelongsToData(data)
      if (!point || !positions[point]) return
      const targetLabels = parseEntityLabels(target)
      const targetSegmentId = targetLabels.length >= 2 ? segmentMap.get(targetLabels.slice(0, 2).sort().join('-')) : undefined
      if (targetSegmentId) {
        ensurePoint(document, pointMap, usedIds, point, positions[point], 'segment', {
          segmentId: targetSegmentId,
          dependsOn: targetLabels.slice(0, 2).map((label: string) => pointMap.get(label) || '').filter(Boolean),
          t: 0.5,
        })
      } else if (targetLabels.length >= 3) {
        ensurePoint(document, pointMap, usedIds, point, positions[point], 'facePoint', {
          targetPointIds: targetLabels.map((label: string) => pointMap.get(label) || '').filter(Boolean),
          dependsOn: targetLabels.map((label: string) => pointMap.get(label) || '').filter(Boolean),
        })
      }
      return
    }

    if (type === 'centroid') {
      const point = normalizeLabel(String(data?.point || data?.Point || data?.result || ''))
      const sourcePoints = Array.isArray(data?.points) ? data.points.map(normalizeLabel) : parseEntityLabels(String(data?.shape || data?.target || ''))
      if (point && positions[point]) {
        ensurePoint(document, pointMap, usedIds, point, positions[point], 'centroid', {
          sourcePointIds: sourcePoints.map((label: string) => pointMap.get(label) || '').filter(Boolean),
          dependsOn: sourcePoints.map((label: string) => pointMap.get(label) || '').filter(Boolean),
        })
      }
    }
  })

  ;(geometryData.circles || []).forEach((circle) => {
    ensureCircle(document, circleMap, usedIds, pointMap, circle.center, circle.radius, 'centerRadius')
  })

  ;(construction.entities?.sections || geometryData.sections || []).forEach((section) => {
    const targetSolid = section.targetSolid
    if (!targetSolid || (section.cuttingPlane || []).length < 3) return
    const solid = document.solids.find((item) => item.label === targetSolid)
    if (!solid) return
    const cut: ManualCut = {
      id: section.id,
      planePointIds: (section.cuttingPlane || []).map(normalizeLabel),
      visible: true,
    }
    solid.cuts = [...(solid.cuts || []), cut]
  })

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
