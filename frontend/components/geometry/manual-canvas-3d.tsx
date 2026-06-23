
'use client'

import { useEffect, useMemo, useRef, useCallback, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import { ViewHelper } from 'three/examples/jsm/helpers/ViewHelper.js'
import { useTheme } from 'next-themes'
import { useGeometry } from './geometry-context'
import { CanvasToolbar } from './canvas-toolbar'
import { ManualDisplayPolygon, ManualDisplaySegment, ManualSolid, ManualCircle, serializeManualProject, computeSolidPlaneIntersection, ManualSnapTarget, Vec3, resolveCircleProps } from './manual-editor'

type InteractiveHit = {
  kind: 'point' | 'segment' | 'polygon' | 'solid' | 'circle'
  id: string
  solidId?: string
  bitmaskKey?: string
  facePointIds?: string[]
  isVirtual?: boolean
}

function getColors(isDark: boolean) {
  if (isDark) {
    return {
      background: 0x101826,
      grid: 0x334155,
      point: 0x93c5fd,
      pointSelected: 0x86efac,
      pointHovered: 0xfdba74,
      segment: 0xe5e7eb,
      polygon: 0x14b8a6,
      solid: 0x3b82f6,
      preview: 0xf59e0b,
      snap: 0x22c55e,
      axes: { x: 0xf87171, y: 0x4ade80, z: 0x60a5fa },
      label: '#e5e7eb',
      labelShadow: '#0f172a',
    }
  }

  return {
    background: 0xf8fafc,
    grid: 0xcbd5e1,
    point: 0x2563eb,
    pointSelected: 0x86efac,
    pointHovered: 0xfdba74,
    segment: 0x0f172a,
    polygon: 0x0f766e,
    solid: 0x1d4ed8,
    preview: 0xea580c,
    snap: 0x16a34a,
    axes: { x: 0xef4444, y: 0x22c55e, z: 0x2563eb },
    label: '#0f172a',
    labelShadow: '#ffffff',
  }
}

function snapCoordinate(v: number): number {
  if (isNaN(v)) return v
  return Math.round(v * 10) / 10
}

function snapPosition(pos: Vec3): Vec3 {
  return [snapCoordinate(pos[0]), snapCoordinate(pos[1]), snapCoordinate(pos[2])]
}

function buildBoxFromCorners(a: Vec3, c: Vec3, height: number) {
  const baseA: Vec3 = [a[0], a[1], 0]
  const baseB: Vec3 = [c[0], a[1], 0]
  const baseC: Vec3 = [c[0], c[1], 0]
  const baseD: Vec3 = [a[0], c[1], 0]
  const topA: Vec3 = [baseA[0], baseA[1], height]
  const topB: Vec3 = [baseB[0], baseB[1], height]
  const topC: Vec3 = [baseC[0], baseC[1], height]
  const topD: Vec3 = [baseD[0], baseD[1], height]
  return [baseA, baseB, baseC, baseD, topA, topB, topC, topD]
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

function closestPointOnSegmentToRay(
  rayOrigin: THREE.Vector3,
  rayDir: THREE.Vector3,
  start: Vec3,
  end: Vec3
) {
  const v: Vec3 = [end[0] - start[0], end[1] - start[1], end[2] - start[2]]
  const w: Vec3 = [start[0] - rayOrigin.x, start[1] - rayOrigin.y, start[2] - rayOrigin.z]
  const d: Vec3 = [rayDir.x, rayDir.y, rayDir.z]
  
  const a = v[0] * v[0] + v[1] * v[1] + v[2] * v[2] // ||v||^2
  const b = v[0] * d[0] + v[1] * d[1] + v[2] * d[2] // v . d
  const c = w[0] * v[0] + w[1] * v[1] + w[2] * v[2] // w . v
  const dVal = w[0] * d[0] + w[1] * d[1] + w[2] * d[2] // w . d
  
  const denom = a - b * b
  let t = 0
  if (Math.abs(denom) > 1e-9) {
    t = (b * dVal - c) / denom
  }
  t = Math.max(0, Math.min(1, t))
  
  const pos: Vec3 = [
    start[0] + t * v[0],
    start[1] + t * v[1],
    start[2] + t * v[2]
  ]
  return { position: pos, t }
}

function closestPointOnCircleToRay(
  rayOrigin: THREE.Vector3,
  rayDir: THREE.Vector3,
  center: Vec3,
  radius: number,
  normal: Vec3
): Vec3 {
  const d_dot_n = rayDir.x * normal[0] + rayDir.y * normal[1] + rayDir.z * normal[2];
  if (Math.abs(d_dot_n) < 1e-6) {
    return [center[0] + radius, center[1], center[2]];
  }
  const t = ((center[0] - rayOrigin.x) * normal[0] + (center[1] - rayOrigin.y) * normal[1] + (center[2] - rayOrigin.z) * normal[2]) / d_dot_n;
  const pPlane: Vec3 = [
    rayOrigin.x + t * rayDir.x,
    rayOrigin.y + t * rayDir.y,
    rayOrigin.z + t * rayDir.z,
  ];
  
  const vx = pPlane[0] - center[0];
  const vy = pPlane[1] - center[1];
  const vz = pPlane[2] - center[2];
  const dist = Math.hypot(vx, vy, vz);
  if (dist < 1e-9) {
    return [center[0] + radius, center[1], center[2]];
  }
  return [
    center[0] + (vx / dist) * radius,
    center[1] + (vy / dist) * radius,
    center[2] + (vz / dist) * radius,
  ];
}

function closestHeightFromRay(
  rayOrigin: THREE.Vector3,
  rayDir: THREE.Vector3,
  center: Vec3,
  normal: Vec3
): number {
  const w: Vec3 = [center[0] - rayOrigin.x, center[1] - rayOrigin.y, center[2] - rayOrigin.z]
  const d: Vec3 = [rayDir.x, rayDir.y, rayDir.z]
  
  const b = normal[0] * d[0] + normal[1] * d[1] + normal[2] * d[2] // normal . d
  const c = w[0] * normal[0] + w[1] * normal[1] + w[2] * normal[2] // w . normal
  const dVal = w[0] * d[0] + w[1] * d[1] + w[2] * d[2] // w . d
  
  const denom = 1 - b * b
  if (Math.abs(denom) < 1e-9) return 4 // fallback if ray is parallel to normal
  
  return (b * dVal - c) / denom
}

function polygonCenter(points: Vec3[]) {
  if (!points.length) return [0, 0, 0] as Vec3
  const total = points.reduce<Vec3>(
    (acc, point) => [acc[0] + point[0], acc[1] + point[1], acc[2] + point[2]],
    [0, 0, 0],
  )
  return [total[0] / points.length, total[1] / points.length, total[2] / points.length] as Vec3
}

function crossVec3(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ]
}

function getPolygonNormal(pts: Vec3[]): Vec3 {
  if (pts.length < 3) return [0, 0, 1]
  const v1 = subVec3(pts[1], pts[0])
  const v2 = subVec3(pts[2], pts[0])
  const normal = crossVec3(v1, v2)
  const len = Math.hypot(normal[0], normal[1], normal[2])
  return len > 1e-9 ? scaleVec3(normal, 1 / len) : [0, 0, 1]
}

function applyBitmaskGroupPreview(
  groups: Map<string, THREE.Group>,
  previewKeys: string[],
) {
  const previewSet = new Set(previewKeys)
  const hasPreview = previewSet.size > 0

  groups.forEach((group, key) => {
    const isTarget = previewSet.has(key)
    const baseVisible = group.userData.baseVisible !== false
    group.visible = hasPreview ? (baseVisible || isTarget) : baseVisible

    group.traverse((object) => {
      if (
        !(object instanceof THREE.Mesh) &&
        !(object instanceof THREE.Line) &&
        !(object instanceof THREE.LineSegments) &&
        !(object instanceof THREE.Points)
      ) return

      const materials = Array.isArray(object.material) ? object.material : [object.material]
      materials.forEach((material) => {
        if (material.userData.skipChunkPreview) return

        if (material.userData.chunkOriginalOpacity === undefined) {
          material.userData.chunkOriginalOpacity = material.opacity
          material.userData.chunkOriginalTransparent = material.transparent
          material.userData.chunkOriginalDepthWrite = material.depthWrite
        }

        const originalOpacity = material.userData.chunkOriginalOpacity as number
        const originalTransparent = material.userData.chunkOriginalTransparent as boolean
        const originalDepthWrite = material.userData.chunkOriginalDepthWrite as boolean

        if (!hasPreview) {
          material.opacity = originalOpacity
          material.transparent = originalTransparent
          material.depthWrite = originalDepthWrite
        } else if (isTarget) {
          material.opacity = originalOpacity < 0.9
            ? Math.max(originalOpacity, baseVisible ? 0.42 : 0.28)
            : originalOpacity
          material.transparent = material.opacity < 1
          material.depthWrite = originalDepthWrite
        } else {
          material.opacity = Math.min(originalOpacity * 0.18, 0.08)
          material.transparent = true
          material.depthWrite = false
        }
        material.needsUpdate = true
      })
    })
  })
}

export function ManualCanvas3D() {
  const mountRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const labelRendererRef = useRef<CSS2DRenderer | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const dynamicGroupRef = useRef<THREE.Group>(new THREE.Group())
  const hoverMarkerRef = useRef<THREE.Group | null>(null)
  const hoverHudRef = useRef<HTMLDivElement>(null)
  const hoverStatusRef = useRef<HTMLSpanElement>(null)
  const hoverRafRef = useRef<number | null>(null)
  const pendingHoverTargetRef = useRef<ManualSnapTarget | null>(null)
  const pendingHoverPositionRef = useRef<Vec3 | null>(null)
  const smartGuideMeshRef = useRef<THREE.Line | null>(null)
  const pointMeshesRef = useRef<Array<{ id: string; mesh: THREE.Mesh }>>([])
  const segmentMeshesRef = useRef<Array<{ id: string; mesh: THREE.Line }>>([])
  const bitmaskGroupsRef = useRef<Map<string, THREE.Group>>(new Map())
  const previewBitmaskKeysRef = useRef<string[]>([])
  const hoveredEntityIdRef = useRef<string | null>(null)
  const [showGizmo, setShowGizmo] = useState(true)

  // Navigation Gizmo (Three.js ViewHelper)
  const viewHelperRef = useRef<ViewHelper | null>(null)
  const viewHelperTimerRef = useRef<THREE.Timer | null>(null)
  const interactionRef = useRef<{
    creatingPointId: string | null
    createPointStartY: number | null
    createPointBasePosition: Vec3 | null
    wasCtrlPressed?: boolean
    wasShiftPressed?: boolean
    pointerDown:
    | {
      x: number
      y: number
      didDrag: boolean
      hit: InteractiveHit | null
    }
    | null
  }>({
    creatingPointId: null,
    createPointStartY: null,
    createPointBasePosition: null,
    wasCtrlPressed: false,
    wasShiftPressed: false,
    pointerDown: null,
  })

  const { resolvedTheme } = useTheme()
  const colors = useMemo(() => getColors(resolvedTheme === 'dark'), [resolvedTheme])
  const {
    manualDocument,
    manualDerived,
    activeTool,
    setActiveTool,
    manualSelection,
    setManualSelection,
    draftOperation,
    setDraftOperation,
    createPointFromTarget,
    updatePointPosition,
    updatePointT,
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
    createCircle,
    createRegularPolygon,
    createSpecialTriangle,
    createSpecialQuadrilateral,
    cancelManualDraft,
    canUndo,
    canRedo,
    undoManual,
    redoManual,
    showAxes,
    setShowAxes,
    showGrid,
    setShowGrid,
    showLabels,
    setShowLabels,
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
    removeManualEntity,
    resetTrigger,
    showSmartGuides,
    setShowSmartGuides,
    autoRevertToSelect,
    bitmaskVisibility,
    previewBitmaskKeys,
    setSelectedBitmaskKey,
    explodeAmount,
  } = useGeometry()
  previewBitmaskKeysRef.current = previewBitmaskKeys

  const snapEnabled = true
  const snapThreshold = 10

  const formatHoverCoords = (position: Vec3) =>
    `(${position.map((value) => Number(value.toFixed(2)).toString()).join(', ')})`

  const stateRefs = useRef({ showAxes, showGrid, showSmartGuides, autoRevertToSelect, showGizmo })
  useEffect(() => {
    stateRefs.current = { showAxes, showGrid, showSmartGuides, autoRevertToSelect, showGizmo }
  }, [showAxes, showGrid, showSmartGuides, autoRevertToSelect, showGizmo])

  const raycasterRef = useRef(new THREE.Raycaster())
  useEffect(() => {
    raycasterRef.current.params.Line = { threshold: 0.18 }
  }, [])

  // Tab cycle selection refs
  const cycleIntersectsRef = useRef<InteractiveHit[]>([])
  const cycleIndexRef = useRef(0)
  const lastCycleEventRef = useRef<{ x: number; y: number } | null>(null)

  // Smoothly aligns camera to specific axes (X, Y, Z) with animation transition
  const handleAlignView = useCallback((axis: 'x' | 'y' | 'z') => {
    const cam = cameraRef.current
    const controls = controlsRef.current
    if (!cam || !controls) return

    const target = controls.target
    const dist = cam.position.distanceTo(target)

    const duration = 400 // Animation duration in ms
    const startTime = performance.now()

    const startPos = cam.position.clone()
    const endPos = new THREE.Vector3()

    if (axis === 'z') {
      endPos.set(target.x, target.y, target.z + dist)
    } else if (axis === 'y') {
      endPos.set(target.x, target.y - dist, target.z)
    } else {
      endPos.set(target.x + dist, target.y, target.z)
    }

    const animateTransition = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)

      // easeInOutCubic easing
      const t = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2

      cam.position.lerpVectors(startPos, endPos, t)
      cam.lookAt(target)
      cam.up.set(0, 0, 1)
      controls.update()
      if (progress < 1) {
        requestAnimationFrame(animateTransition)
      }
    }

    requestAnimationFrame(animateTransition)
  }, [])

  const getCameraRay = (event: PointerEvent | MouseEvent) => {
    const camera = cameraRef.current
    const renderer = rendererRef.current
    if (!camera || !renderer) return null
    const rect = renderer.domElement.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    raycasterRef.current.setFromCamera(new THREE.Vector2(x, y), camera)
    return raycasterRef.current.ray
  }

  const projectToScreen = (world: Vec3) => {
    const camera = cameraRef.current
    const container = mountRef.current
    if (!camera || !container) return { x: 0, y: 0 }

    const temp = new THREE.Vector3(...world).project(camera)
    const x = (temp.x * 0.5 + 0.5) * container.clientWidth
    const y = (-temp.y * 0.5 + 0.5) * container.clientHeight
    return { x, y }
  }

  const getPlaneIntersection = (
    event: PointerEvent | MouseEvent,
    plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0),
  ) => {
    const camera = cameraRef.current
    const renderer = rendererRef.current
    if (!camera || !renderer) return null

    const rect = renderer.domElement.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    raycasterRef.current.setFromCamera(new THREE.Vector2(x, y), camera)
    const target = new THREE.Vector3()
    if (raycasterRef.current.ray.intersectPlane(plane, target)) {
      return [target.x, target.y, target.z] as Vec3
    }
    return null
  }

  const findIntersectionEntity = (event: PointerEvent | MouseEvent): InteractiveHit | null => {
    const camera = cameraRef.current
    const renderer = rendererRef.current
    if (!camera || !renderer) return null

    const rect = renderer.domElement.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    raycasterRef.current.setFromCamera(new THREE.Vector2(x, y), camera)
    const intersects = raycasterRef.current.intersectObjects(dynamicGroupRef.current.children, true)
    for (const intersect of intersects) {
      if (intersect.object.userData && intersect.object.userData.entity) {
        const entity = intersect.object.userData.entity as InteractiveHit
        if (entity.isVirtual && activeTool !== 'projection') {
          continue
        }
        return entity
      }
    }
    return null
  }

  const findAllIntersectionEntities = (event: PointerEvent | MouseEvent | { clientX: number; clientY: number }): InteractiveHit[] => {
    const camera = cameraRef.current
    const renderer = rendererRef.current
    if (!camera || !renderer) return []

    const rect = renderer.domElement.getBoundingClientRect()
    const x = (((event as MouseEvent).clientX - rect.left) / rect.width) * 2 - 1
    const y = -(((event as MouseEvent).clientY - rect.top) / rect.height) * 2 + 1

    raycasterRef.current.setFromCamera(new THREE.Vector2(x, y), camera)
    const intersects = raycasterRef.current.intersectObjects(dynamicGroupRef.current.children, true)
    const results: InteractiveHit[] = []
    const seenIds = new Set<string>()
    for (const intersect of intersects) {
      if (intersect.object.userData?.entity) {
        const entity = intersect.object.userData.entity as InteractiveHit
        if (entity.isVirtual && activeTool !== 'projection') {
          continue
        }
        const key = `${entity.kind}_${entity.id}_${entity.bitmaskKey ?? ''}`
        if (!seenIds.has(key)) {
          seenIds.add(key)
          results.push(entity)
        }
      }
    }
    return results
  }

  const getSnapTarget = (event: PointerEvent | MouseEvent, planePoint: Vec3 | null): ManualSnapTarget | null => {
    const pointCandidates = manualDerived.displayPoints
      .filter((point) => point.visible && point.selectable)
      .map((point) => ({
        pointId: point.id,
        label: point.label,
        position: point.position,
      }))

    const segmentCandidates = manualDerived.displaySegments
      .filter((segment) => {
        if (!segment.visible) return false
        if (segment.id.includes('_base_circle_') || 
            segment.id.includes('_bottom_') || 
            segment.id.includes('_top_')) {
          return false
        }
        return true
      })
      .map((displaySegment) => ({
        segmentId: displaySegment.id,
        label: '',
        start: displaySegment.start,
        end: displaySegment.end,
      }))

    const evaluateTarget = (position: Vec3) => {
      const screen = projectToScreen(position)
      const container = mountRef.current
      if (!screen || !container) return Number.POSITIVE_INFINITY
      const rect = container.getBoundingClientRect()
      return Math.sqrt((screen.x - (event.clientX - rect.left)) ** 2 + (screen.y - (event.clientY - rect.top)) ** 2)
    }

    const bestPoint = pointCandidates
      .map((candidate) => ({
        distance: evaluateTarget(candidate.position),
        target: {
          kind: 'point' as const,
          label: `Điểm ${candidate.label}`,
          pointId: candidate.pointId,
          position: candidate.position,
        },
      }))
      .sort((left, right) => left.distance - right.distance)[0]

    if (snapEnabled && bestPoint && bestPoint.distance <= snapThreshold) {
      return bestPoint.target
    }

    const bestMidpoint = segmentCandidates
      .map((candidate) => {
        const midpoint: Vec3 = [
          (candidate.start[0] + candidate.end[0]) / 2,
          (candidate.start[1] + candidate.end[1]) / 2,
          (candidate.start[2] + candidate.end[2]) / 2,
        ]
        const startLabel = manualDerived.displayPoints.find((p) => p.id === candidate.segmentId.split('_')[0] || p.sourceId === candidate.segmentId.split('_')[0])?.label ?? ''
        const endLabel = manualDerived.displayPoints.find((p) => p.id === candidate.segmentId.split('_')[1] || p.sourceId === candidate.segmentId.split('_')[1])?.label ?? ''
        const label = startLabel && endLabel ? `Trung điểm ${startLabel}${endLabel}` : 'Trung điểm'
        return {
          distance: evaluateTarget(midpoint),
          target: {
            kind: 'midpoint' as const,
            label,
            segmentId: candidate.segmentId,
            position: midpoint,
            t: 0.5,
          },
        }
      })
      .sort((left, right) => left.distance - right.distance)[0]

    if (snapEnabled && bestMidpoint && bestMidpoint.distance <= snapThreshold) {
      return bestMidpoint.target
    }

    const camera = cameraRef.current
    if (camera && snapEnabled) {
      const ray = getCameraRay(event)
      if (ray) {
        const segmentSnaps = segmentCandidates.map((candidate) => {
          const { position, t } = closestPointOnSegmentToRay(ray.origin, ray.direction, candidate.start, candidate.end)
          const distance = evaluateTarget(position)
          const startLabel = manualDerived.displayPoints.find((p) => p.id === candidate.segmentId.split('_')[0] || p.sourceId === candidate.segmentId.split('_')[0])?.label ?? ''
          const endLabel = manualDerived.displayPoints.find((p) => p.id === candidate.segmentId.split('_')[1] || p.sourceId === candidate.segmentId.split('_')[1])?.label ?? ''
          const label = startLabel && endLabel ? `Thuộc ${startLabel}${endLabel}` : 'Thuộc đoạn thẳng'
          return {
            distance,
            target: {
              kind: 'segment' as const,
              label,
              segmentId: candidate.segmentId,
              position,
              t,
            },
          }
        })

        const circleSnaps = (manualDerived.displayCircles || []).map((circle) => {
          const position = closestPointOnCircleToRay(
            ray.origin,
            ray.direction,
            circle.center,
            circle.radius,
            circle.normal
          )
          const distance = evaluateTarget(position)
          const label = circle.label ? `Thuộc ${circle.label}` : 'Thuộc đường tròn'
          return {
            distance,
            target: {
              kind: 'circle' as const,
              label,
              circleId: circle.id,
              position,
            },
          }
        })

        const allSnaps = [...segmentSnaps, ...circleSnaps].sort((left, right) => left.distance - right.distance)
        const bestSnap = allSnaps[0]
        if (bestSnap && bestSnap.distance <= snapThreshold) {
          return bestSnap.target
        }
      }
    }

    // Check surface snap (sphere solid, cone/cylinder solids, polygon faces)
    const hit = findIntersectionEntity(event)
    if (hit) {
      const camera = cameraRef.current
      if (camera) {
        const intersects = raycasterRef.current.intersectObjects(dynamicGroupRef.current.children, true)
        const intersect = intersects.find(i => 
          (hit.kind === 'solid' && i.object.userData?.entity?.solidId === hit.id) ||
          (hit.kind === 'polygon' && i.object.userData?.entity?.polygonId === hit.id)
        )
        if (intersect) {
          const position: Vec3 = [intersect.point.x, intersect.point.y, intersect.point.z]
          if (hit.kind === 'solid') {
            const solid = manualDocument.solids.find(s => s.id === hit.id)
            if (solid) {
              if (solid.solidType === 'sphere') {
                return {
                  kind: 'sphere' as const,
                  label: `Thuộc ${solid.label}`,
                  solidId: solid.id,
                  position,
                }
              } else if (solid.solidType === 'cone' || solid.solidType === 'cylinder') {
                return {
                  kind: 'solid' as const,
                  label: `Thuộc ${solid.label}`,
                  solidId: solid.id,
                  position,
                }
              } else {
                return {
                  kind: 'workplane' as const,
                  label: `Thuộc ${solid.label}`,
                  position,
                }
              }
            }
          } else if (hit.kind === 'polygon') {
            const polygon = manualDocument.polygons.find(p => p.id === hit.id)
            if (hit.facePointIds && hit.facePointIds.length >= 3) {
              return {
                kind: 'solid' as const,
                label: polygon?.label ? `Thuộc ${polygon.label}` : 'Thuộc mặt phẳng',
                position,
                facePointIds: hit.facePointIds,
              }
            }
            return {
              kind: 'workplane' as const,
              label: polygon?.label ? `Thuộc ${polygon.label}` : 'Thuộc mặt phẳng',
              position,
            }
          }
        }
      }
    }

    if (planePoint) {
      return {
        kind: 'workplane' as const,
        label: `Mặt phẳng đáy`,
        position: planePoint,
      }
    }

    return null
  }

  const applyHoverPresentation = (target: ManualSnapTarget | null, pos: Vec3 | null) => {
    const status = hoverStatusRef.current
    if (!status) return

    const finalPos = target ? target.position : pos

    if (finalPos) {
      status.textContent = `V\u1ecb tr\u00ed: ${formatHoverCoords(finalPos)}`
    } else {
      status.textContent = 'Tr\u1ed1ng'
    }

    if (hoverMarkerRef.current) {
      if (target) {
        hoverMarkerRef.current.position.set(...target.position)
        hoverMarkerRef.current.visible = true
      } else {
        hoverMarkerRef.current.visible = false
      }
    }
  }

  const scheduleHoverPresentation = (target: ManualSnapTarget | null, pos: Vec3 | null = null) => {
    pendingHoverTargetRef.current = target
    pendingHoverPositionRef.current = pos
    if (hoverRafRef.current !== null) return
    hoverRafRef.current = requestAnimationFrame(() => {
      hoverRafRef.current = null
      applyHoverPresentation(pendingHoverTargetRef.current, pendingHoverPositionRef.current)
    })
  }

  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(resolvedTheme === 'dark' ? 0x111827 : 0xffffff)
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(42, container.clientWidth / container.clientHeight, 0.1, 800)
    camera.up.set(0, 0, 1)
    camera.position.set(18, -18, 14)
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.localClippingEnabled = true
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(container.clientWidth, container.clientHeight)
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    const labelRenderer = new CSS2DRenderer()
    labelRenderer.setSize(container.clientWidth, container.clientHeight)
    labelRenderer.domElement.style.position = 'absolute'
    labelRenderer.domElement.style.top = '0'
    labelRenderer.domElement.style.pointerEvents = 'none'
    labelRenderer.domElement.style.zIndex = '10'
    container.appendChild(labelRenderer.domElement)
    labelRendererRef.current = labelRenderer

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.minDistance = 0.1
    controls.maxDistance = 120
    controls.target.set(0, 0, 0)
    controlsRef.current = controls

    const viewHelper = new ViewHelper(camera, renderer.domElement)
    // Position at the bottom right where zoom controls used to be
    viewHelper.location = { top: null, right: 24, bottom: 24, left: null } as any
    viewHelper.setLabels('x', 'y', 'z')
    viewHelper.setLabelStyle('bold 24px sans-serif', '#ffffff')
    
    // Scale the entire gizmo up by 1.3x
    viewHelper.scale.set(1.3, 1.3, 1.3)
    
    // Hide the black dots (negative axes sprites)
    viewHelper.children.forEach((child) => {
      if (child.userData.type && child.userData.type.startsWith('neg')) {
        child.visible = false
      }
    })

    // Create a perfectly circular background texture using Canvas API
    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 128
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.beginPath()
      ctx.arc(64, 64, 64, 0, 2 * Math.PI)
      ctx.fillStyle = 'rgba(0,0,0,1)'
      ctx.fill()
    }
    const bgTexture = new THREE.CanvasTexture(canvas)
    const bgMat = new THREE.SpriteMaterial({ map: bgTexture, color: 0x000000, transparent: true, opacity: 0.35, depthTest: false })
    const bgSprite = new THREE.Sprite(bgMat)
    // Scale background to 2.6.
    // World scale = 1.3 * 2.6 = 3.38 (radius 1.69).
    // Radius 1.69 > 1.3 (label distance), so it encapsulates labels without clipping the [-2, 2] frustum!
    bgSprite.scale.set(2.6, 2.6, 1)
    bgSprite.center.set(0.5, 0.5) // Center the origin
    bgSprite.renderOrder = -1 // Render behind the axes
    viewHelper.add(bgSprite)

    viewHelperRef.current = viewHelper
    viewHelperTimerRef.current = new THREE.Timer()
    viewHelperTimerRef.current.connect(document)

    scene.add(new THREE.AmbientLight(0xffffff, 1.15))
    const sun = new THREE.DirectionalLight(0xffffff, 0.7)
    sun.position.set(20, -10, 24)
    scene.add(sun)

    const environment = new THREE.Group()
    environment.name = 'manual-environment'
    scene.add(environment)

    const planeCanvas = document.createElement('canvas')
    planeCanvas.width = 512
    planeCanvas.height = 512
    const planeContext = planeCanvas.getContext('2d')!
    const gradient = planeContext.createRadialGradient(256, 256, 0, 256, 256, 256)
    gradient.addColorStop(0, 'rgba(255,255,255,0.7)')
    gradient.addColorStop(0.4, 'rgba(255,255,255,0.5)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    planeContext.fillStyle = gradient
    planeContext.fillRect(0, 0, 512, 512)
    const alphaMap = new THREE.CanvasTexture(planeCanvas)

    const basePlane = new THREE.Mesh(
      new THREE.PlaneGeometry(240, 240),
      new THREE.MeshBasicMaterial({
        color: resolvedTheme === 'dark' ? 0x1f2937 : 0xcccccc,
        alphaMap,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    )
    environment.add(basePlane)

    const axesGroup = new THREE.Group()
    axesGroup.renderOrder = 99
    const ticksList: Array<{ val: number; mesh: THREE.Line | THREE.Mesh; label: CSS2DObject; axis?: string }> = []
    const axisLength = 35

    const createAxis = (colorHex: number, dir: THREE.Vector3, labelStr: string) => {
      const opacity = 0.75
      const lineProps = { color: colorHex, linewidth: 2, transparent: true, opacity, depthTest: false }

      if (labelStr === 'z') {
        const positivePts = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, axisLength)]
        const positiveMat = new THREE.LineBasicMaterial(lineProps)
        axesGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(positivePts), positiveMat))

        const negativePts = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -axisLength)]
        const negativeMat = new THREE.LineBasicMaterial(lineProps)
        axesGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(negativePts), negativeMat))
      } else {
        const mat = new THREE.LineBasicMaterial(lineProps)
        const pts = [dir.clone().multiplyScalar(-axisLength), dir.clone().multiplyScalar(axisLength)]
        axesGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat))
      }

      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(0.15, 0.6, 8),
        new THREE.MeshBasicMaterial({ color: colorHex, depthTest: false }),
      )
      const conePos = dir.clone().multiplyScalar(axisLength)
      cone.position.copy(conePos)
      const up = new THREE.Vector3(0, 1, 0)
      const axis = new THREE.Vector3().crossVectors(up, conePos).normalize()
      const radians = Math.acos(up.dot(conePos.clone().normalize()))
      if (axis.lengthSq() > 0.001) cone.quaternion.setFromAxisAngle(axis, radians)
      else if (conePos.y < 0) cone.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI)
      axesGroup.add(cone)

      const axisLabelEl = document.createElement('div')
      axisLabelEl.className = 'text-[15px] italic font-bold'
      axisLabelEl.style.color = `#${colorHex.toString(16).padStart(6, '0')}`
      axisLabelEl.textContent = labelStr
      const axisLabel = new CSS2DObject(axisLabelEl)
      if (labelStr === 'x') axisLabel.center.set(-0.5, 0.5)
      if (labelStr === 'y') axisLabel.center.set(0.5, -0.5)
      if (labelStr === 'z') axisLabel.center.set(0.5, -0.5)
      axesGroup.add(axisLabel)

      const tickLength = 0.15
      const tickGeoPts: THREE.Vector3[] = []
      if (labelStr === 'x') tickGeoPts.push(new THREE.Vector3(0, -tickLength, 0), new THREE.Vector3(0, tickLength, 0))
      else tickGeoPts.push(new THREE.Vector3(-tickLength, 0, 0), new THREE.Vector3(tickLength, 0, 0))
      const tickGeometry = new THREE.BufferGeometry().setFromPoints(tickGeoPts)
      const tickMaterial = new THREE.LineBasicMaterial({ color: colorHex, transparent: true, opacity: 0.75, depthTest: false })

      for (let index = -axisLength; index <= axisLength; index += 1) {
        if (index === 0) continue
        const tickPos = dir.clone().multiplyScalar(index)
        const tickMesh = new THREE.Line(tickGeometry, tickMaterial)
        tickMesh.position.copy(tickPos)
        axesGroup.add(tickMesh)

        const tickLabelEl = document.createElement('div')
        tickLabelEl.className = 'text-[10px] font-sans font-semibold leading-none opacity-80'
        tickLabelEl.style.color = `#${colorHex.toString(16).padStart(6, '0')}`
        tickLabelEl.textContent = index.toString()
        const tickLabel = new CSS2DObject(tickLabelEl)
        if (labelStr === 'x') tickLabel.center.set(0.5, 1.5)
        else if (labelStr === 'y') tickLabel.center.set(-0.5, 1.5)
        else tickLabel.center.set(1.5, 0.5)
        tickLabel.position.copy(tickPos)
        axesGroup.add(tickLabel)
        ticksList.push({ val: index, mesh: tickMesh, label: tickLabel, axis: labelStr })
      }
    }

    createAxis(colors.axes.x, new THREE.Vector3(1, 0, 0), 'x')
    createAxis(colors.axes.y, new THREE.Vector3(0, 1, 0), 'y')
    createAxis(colors.axes.z, new THREE.Vector3(0, 0, 1), 'z')
    environment.add(axesGroup)

    const axisLabels = {
      x: axesGroup.children.find((child) => child instanceof CSS2DObject && child.element.textContent === 'x') as CSS2DObject,
      y: axesGroup.children.find((child) => child instanceof CSS2DObject && child.element.textContent === 'y') as CSS2DObject,
      z: axesGroup.children.find((child) => child instanceof CSS2DObject && child.element.textContent === 'z') as CSS2DObject,
    }

    let lastGridStep = -1
    let lastGridCenterX = -1
    let lastGridCenterY = -1
    let lastGridShow = true
    let lastGridShowAxes = true
    let dynamicGrid: THREE.LineSegments | null = null

    const dynamicGroup = new THREE.Group()
    dynamicGroup.name = 'manual-dynamic'
    scene.add(dynamicGroup)
    dynamicGroupRef.current = dynamicGroup

    const hoverGroup = new THREE.Group()
    hoverGroup.visible = false
    hoverGroup.renderOrder = 120
    const hoverMaterial = new THREE.LineBasicMaterial({
      color: colors.snap,
      transparent: true,
      opacity: 0.95,
      depthTest: false,
    })
    const hoverSize = 0.18
    const hoverHorizontal = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-hoverSize, 0, 0),
      new THREE.Vector3(hoverSize, 0, 0),
    ])
    const hoverVertical = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, -hoverSize, 0),
      new THREE.Vector3(0, hoverSize, 0),
    ])
    hoverGroup.add(new THREE.Line(hoverHorizontal, hoverMaterial))
    hoverGroup.add(new THREE.Line(hoverVertical, hoverMaterial))
    hoverGroup.rotation.z = THREE.MathUtils.degToRad(-15)
    scene.add(hoverGroup)
    hoverMarkerRef.current = hoverGroup

    // Smart Guides line mesh initialization
    const smartGuideMat = new THREE.LineDashedMaterial({
      color: 0x9333ea, // Modern violet color for guide lines
      dashSize: 0.3,
      gapSize: 0.15,
      linewidth: 1.5,
      transparent: true,
      opacity: 0.7,
      depthTest: false,
    })
    const smartGuideGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 0),
    ])
    const smartGuideLine = new THREE.Line(smartGuideGeo, smartGuideMat)
    smartGuideLine.computeLineDistances()
    smartGuideLine.visible = false
    smartGuideLine.renderOrder = 100
    scene.add(smartGuideLine)
    smartGuideMeshRef.current = smartGuideLine

    let frameId = 0
    const animate = () => {
      frameId = requestAnimationFrame(animate)
      controls.update()
      const dist = camera.position.distanceTo(controls.target)
      const fovRad = THREE.MathUtils.degToRad(camera.fov)
      const worldSpan = 2 * dist * Math.tan(fovRad / 2)
      const targetCells = 18
      const stepEstimate = worldSpan / targetCells
      const stepOptions = [1, 2, 5, 10, 20, 50]
      const step = stepOptions.find((candidate) => candidate >= stepEstimate) ?? stepOptions[stepOptions.length - 1]

      const center = controls.target
      const centerX = center.x
      const centerY = center.y
      const centerZ = center.z
      const edgePos = axisLength

      if (axisLabels.x) axisLabels.x.position.set(edgePos, 0, 0)
      if (axisLabels.y) axisLabels.y.position.set(0, edgePos, 0)
      if (axisLabels.z) axisLabels.z.position.set(0, 0, edgePos)

      const labelShowRange = step * 15
      ticksList.forEach((tick) => {
        const axisExtent = edgePos
        const centerVal = tick.axis === 'x' ? centerX : tick.axis === 'y' ? centerY : centerZ
        const isVisible =
          Math.abs(tick.val) <= axisExtent &&
          tick.val % step === 0 &&
          Math.abs(tick.val - centerVal) < labelShowRange

        if (tick.mesh.visible !== isVisible) {
          tick.mesh.visible = isVisible
          tick.label.visible = isVisible
        }
        if (isVisible) tick.mesh.scale.setScalar(dist * 0.05)
      })

      const showGridState = stateRefs.current.showGrid
      const showAxesState = stateRefs.current.showAxes
      const gridRadius = 40
      const snapX = Math.round(centerX / step) * step
      const snapY = Math.round(centerY / step) * step
      const hasMoved = Math.abs(lastGridCenterX - snapX) > 0.001 || Math.abs(lastGridCenterY - snapY) > 0.001

      if (lastGridStep !== step || hasMoved || lastGridShow !== showGridState || lastGridShowAxes !== showAxesState) {
        lastGridStep = step
        lastGridCenterX = snapX
        lastGridCenterY = snapY
        lastGridShow = showGridState
        lastGridShowAxes = showAxesState

        if (dynamicGrid) {
          environment.remove(dynamicGrid)
          dynamicGrid.geometry.dispose()
            ; (dynamicGrid.material as THREE.Material).dispose()
          dynamicGrid = null
        }

        if (showGridState) {
          const gridPoints: THREE.Vector3[] = []
          const gridZ = -0.001

          for (let x = snapX - gridRadius; x <= snapX + gridRadius; x += step) {
            if (x === 0 && showAxesState) continue
            gridPoints.push(new THREE.Vector3(x, snapY - gridRadius, gridZ), new THREE.Vector3(x, snapY + gridRadius, gridZ))
          }

          for (let y = snapY - gridRadius; y <= snapY + gridRadius; y += step) {
            if (y === 0 && showAxesState) continue
            gridPoints.push(new THREE.Vector3(snapX - gridRadius, y, gridZ), new THREE.Vector3(snapX + gridRadius, y, gridZ))
          }

          dynamicGrid = new THREE.LineSegments(
            new THREE.BufferGeometry().setFromPoints(gridPoints),
            new THREE.LineBasicMaterial({ color: colors.grid, transparent: true, opacity: 0.8, depthWrite: false }),
          )
          environment.add(dynamicGrid)
        }
      }

      axesGroup.visible = stateRefs.current.showAxes
      basePlane.visible = stateRefs.current.showGrid
      basePlane.position.set(centerX, centerY, -0.002)
      basePlane.scale.set(gridRadius / 120, gridRadius / 120, 1)

      renderer.render(scene, camera)
      labelRenderer.render(scene, camera)

      // ViewHelper animates camera on click and renders gizmo overlay
      if (viewHelperRef.current && viewHelperTimerRef.current) {
        viewHelperTimerRef.current.update()
        const delta = viewHelperTimerRef.current.getDelta()
        viewHelperRef.current.center.copy(controls.target)
        if (viewHelperRef.current.animating) {
          viewHelperRef.current.update(delta)
        }
        if (stateRefs.current.showGizmo) {
          const autoClear = renderer.autoClear
          renderer.autoClear = false
          viewHelperRef.current.render(renderer)
          renderer.autoClear = autoClear
        }
      }
    }
    animate()

    const resizeObserver = new ResizeObserver(() => {
      if (!mountRef.current || !cameraRef.current || !rendererRef.current || !labelRendererRef.current) return
      const width = mountRef.current.clientWidth
      const height = mountRef.current.clientHeight
      cameraRef.current.aspect = width / height
      cameraRef.current.updateProjectionMatrix()
      rendererRef.current.setSize(width, height)
      labelRendererRef.current.setSize(width, height)
    })
    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
      cancelAnimationFrame(frameId)
      if (hoverRafRef.current != null) {
        cancelAnimationFrame(hoverRafRef.current)
        hoverRafRef.current = null
      }
      controls.dispose()
      if (viewHelperRef.current) {
        viewHelperRef.current.dispose()
        viewHelperRef.current = null
      }
      if (viewHelperTimerRef.current) {
        viewHelperTimerRef.current.dispose()
        viewHelperTimerRef.current = null
      }
      hoverHorizontal.dispose()
      hoverVertical.dispose()
      hoverMaterial.dispose()
      smartGuideLine.geometry.dispose()
        ; (smartGuideLine.material as THREE.Material).dispose()
      renderer.dispose()
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement)
      if (labelRenderer.domElement.parentNode) labelRenderer.domElement.parentNode.removeChild(labelRenderer.domElement)
    }
  }, [colors, resolvedTheme])

  useEffect(() => {
    const group = dynamicGroupRef.current
    if (!group) return
    pointMeshesRef.current = []
    segmentMeshesRef.current = []
    bitmaskGroupsRef.current.clear()

    while (group.children.length > 0) {
      const child = group.children[0]
      group.remove(child)
      if (child instanceof THREE.Mesh || child instanceof THREE.Line || child instanceof THREE.LineSegments) {
        child.geometry.dispose()
        if (Array.isArray(child.material)) child.material.forEach((material) => material.dispose())
        else child.material.dispose()
      }
    }

    const isSolidIdSliced = (id?: string) => {
      if (!id) return false
      const s = manualDocument.solids.find(x => x.id === id)
      return !!(s && s.cuts && s.cuts.some(c => c.visible))
    }

    const pointGeometry = new THREE.SphereGeometry(0.12, 18, 18)
    const lineMaterial = new THREE.LineBasicMaterial({ color: colors.segment })
    const previewMaterial = new THREE.LineDashedMaterial({
      color: colors.preview,
      dashSize: 0.22,
      gapSize: 0.12,
    })

    manualDerived.displayPolygons
      .filter((polygon) => polygon.visible && !(polygon.sourceKind === 'solid' && isSolidIdSliced(polygon.sourceId)))
      .forEach((polygon, pIdx) => {
        if (polygon.points.length < 3) return

        // Virtual planes: only create raycast targets when projection tool is active
        if (polygon.isVirtual) {
          const faceGeometry = new THREE.BufferGeometry()
          const positions: number[] = []
          for (let index = 1; index < polygon.points.length - 1; index += 1) {
            positions.push(...polygon.points[0], ...polygon.points[index], ...polygon.points[index + 1])
          }
          faceGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
          faceGeometry.computeVertexNormals()
          const virtualMaterial = new THREE.MeshBasicMaterial({
            color: '#f59e0b',
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide,
            depthWrite: false,
            polygonOffset: true,
            polygonOffsetFactor: -1,
            polygonOffsetUnits: -1,
          })
          const virtualMesh = new THREE.Mesh(faceGeometry, virtualMaterial)
          virtualMesh.userData.entity = {
            kind: 'solid',
            id: polygon.id,
            solidId: polygon.sourceId,
            facePointIds: polygon.pointIds,
            isVirtual: true,
          } satisfies InteractiveHit
          virtualMesh.userData.isVirtualPlane = true
          virtualMesh.userData.virtualLabel = polygon.label
          group.add(virtualMesh)
          return
        }

        const faceGeometry = new THREE.BufferGeometry()
        const positions: number[] = []
        for (let index = 1; index < polygon.points.length - 1; index += 1) {
          positions.push(...polygon.points[0], ...polygon.points[index], ...polygon.points[index + 1])
        }
        faceGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
        faceGeometry.computeVertexNormals()
        const material = new THREE.MeshBasicMaterial({
          color: polygon.sourceKind === 'solid' ? colors.solid : colors.polygon,
          transparent: true,
          opacity: polygon.opacity,
          side: THREE.DoubleSide,
          polygonOffset: true,
          polygonOffsetFactor: 1 + pIdx * 0.1,
          polygonOffsetUnits: 1,
        })
        const mesh = new THREE.Mesh(faceGeometry, material)
        mesh.userData.entity = {
          kind: polygon.sourceKind === 'solid' ? 'solid' : 'polygon',
          id: polygon.sourceKind === 'solid' ? polygon.id : polygon.sourceId,
          solidId: polygon.sourceKind === 'solid' ? polygon.sourceId : undefined,
          ...(polygon.pointIds ? { facePointIds: polygon.pointIds } : {}),
        } satisfies InteractiveHit
        group.add(mesh)
        const blockerMaterial = new THREE.MeshBasicMaterial({
          colorWrite: false,
          depthWrite: true,
          side: THREE.DoubleSide,
          polygonOffset: true,
          polygonOffsetFactor: 1 + pIdx * 0.1,
          polygonOffsetUnits: 1,
        })
        const blockerMesh = new THREE.Mesh(faceGeometry, blockerMaterial)
        blockerMesh.renderOrder = 1
        group.add(blockerMesh)
      })

    manualDerived.displaySegments
      .filter((segment) => segment.visible && !(segment.sourceKind === 'solid' && isSolidIdSliced(segment.sourceId)))
      .forEach((segment) => {
        const geometry = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(...segment.start),
          new THREE.Vector3(...segment.end),
        ])
        const isDraftSelected =
          draftOperation &&
          (draftOperation.segmentIds?.includes(segment.sourceId) ||
            draftOperation.centerPointId === segment.sourceId ||
            draftOperation.basePolygonId === segment.sourceId)
        const isSelected =
          (manualSelection &&
            ((manualSelection.kind === 'segment' && manualSelection.id === segment.sourceId) ||
              (manualSelection.kind === 'polygon' && segment.sourceKind === 'polygon' && manualSelection.id === segment.sourceId) ||
              (manualSelection.kind === 'solid' && segment.sourceKind === 'solid' && manualSelection.id === segment.sourceId))) ||
          !!isDraftSelected
        const material = new THREE.LineBasicMaterial({
          color: isSelected ? colors.pointSelected : segment.sourceKind === 'solid' ? colors.solid : colors.segment,
        })
        const line = new THREE.Line(geometry, material)
        line.renderOrder = 10
        line.userData.entity = {
          kind: segment.sourceKind === 'solid' ? 'solid' : segment.sourceKind === 'polygon' ? 'polygon' : 'segment',
          id: segment.sourceId,
        } satisfies InteractiveHit
        group.add(line)
        segmentMeshesRef.current.push({ id: segment.sourceId, mesh: line })
        
        const dashedMaterial = new THREE.LineDashedMaterial({
          color: isSelected ? colors.pointSelected : (segment.sourceKind === 'solid' ? colors.solid : colors.segment),
          dashSize: 0.15,
          gapSize: 0.1,
          depthFunc: THREE.GreaterDepth,
          transparent: true,
          opacity: 0.5,
        })
        const dashedMesh = new THREE.Line(geometry, dashedMaterial)
        dashedMesh.renderOrder = 11
        dashedMesh.computeLineDistances()
        group.add(dashedMesh)
      })

    manualDerived.displayPoints
      .filter((point) => point.visible && !(point.sourceKind === 'solid' && isSolidIdSliced(point.sourceId)))
      .forEach((point) => {
        const isDraftSelected =
          draftOperation &&
          (draftOperation.pointIds?.includes(point.id) ||
            draftOperation.pointIds?.includes(point.sourceId) ||
            draftOperation.centerPointId === point.id ||
            draftOperation.centerPointId === point.sourceId ||
            draftOperation.apexPointId === point.id ||
            draftOperation.apexPointId === point.sourceId ||
            draftOperation.topPointId === point.id ||
            draftOperation.topPointId === point.sourceId)
        const isHovered = point.id === hoveredEntityIdRef.current || point.sourceId === hoveredEntityIdRef.current
        const isSelected =
          (manualSelection?.kind === 'point' && (manualSelection.id === point.id || manualSelection.id === point.sourceId))

        let pointColor = point.generated ? colors.solid : colors.point
        if (isSelected) {
          pointColor = colors.pointSelected
        } else if (isHovered || isDraftSelected) {
          pointColor = colors.pointHovered
        }

        const material = new THREE.MeshBasicMaterial({
          color: pointColor,
        })
        const mesh = new THREE.Mesh(pointGeometry, material)
        mesh.position.set(point.position[0], point.position[1], point.position[2])
        if (point.selectable) {
          mesh.userData.entity = { kind: 'point', id: point.id } satisfies InteractiveHit
        }
        group.add(mesh)
        pointMeshesRef.current.push({ id: point.id, mesh })

        const fadedMaterial = new THREE.MeshBasicMaterial({
          color: pointColor,
          depthFunc: THREE.GreaterDepth,
          transparent: true,
          opacity: 0.25,
        })
        const fadedMesh = new THREE.Mesh(pointGeometry, fadedMaterial)
        fadedMesh.position.set(point.position[0], point.position[1], point.position[2])
        group.add(fadedMesh)
        pointMeshesRef.current.push({ id: point.id, mesh: fadedMesh })

        if (showLabels) {
          const element = document.createElement('div')
          element.className = 'text-[12px] italic font-semibold'
          element.textContent = point.label
          element.style.color = colors.label
          element.style.textShadow = `1px 1px 0 ${colors.labelShadow}, -1px -1px 0 ${colors.labelShadow}`
          const label = new CSS2DObject(element)
          label.position.set(point.position[0] + 0.18, point.position[1] + 0.18, point.position[2] + 0.12)
          group.add(label)
        }
      })

    // Add depth blocker spheres and semi-transparent solid meshes for spheres
    if (manualDerived.displayCircles) {
      const processedSpheres = new Set<string>()
      manualDerived.displayCircles
        .filter((c) => c.visible && c.sourceKind === 'solid' && !isSolidIdSliced(c.sourceId))
        .forEach((c) => {
          if (processedSpheres.has(c.sourceId)) return
          processedSpheres.add(c.sourceId)

          // Create invisible depth blocker sphere slightly smaller to prevent Z-fighting
          const blockerGeometry = new THREE.SphereGeometry(c.radius * 0.993, 32, 32)
          const blockerMaterial = new THREE.MeshBasicMaterial({
            colorWrite: false,
            depthWrite: true,
            side: THREE.DoubleSide,
          })
          const blockerMesh = new THREE.Mesh(blockerGeometry, blockerMaterial)
          blockerMesh.position.set(c.center[0], c.center[1], c.center[2])
          blockerMesh.renderOrder = 1
          group.add(blockerMesh)

          // Create semi-transparent solid mesh for raycasting and visual background
          const sphereGeometry = new THREE.SphereGeometry(c.radius, 32, 32)
          const sphereMaterial = new THREE.MeshBasicMaterial({
            color: colors.solid,
            transparent: true,
            opacity: 0.12,
            side: THREE.DoubleSide,
            depthWrite: false,
          })
          const sphereMesh = new THREE.Mesh(sphereGeometry, sphereMaterial)
          sphereMesh.position.set(c.center[0], c.center[1], c.center[2])
          sphereMesh.userData.entity = {
            kind: 'solid',
            id: c.sourceId,
            solidId: c.sourceId,
          } satisfies InteractiveHit
          group.add(sphereMesh)
        })
    }

    // Add depth blocker and semi-transparent solid meshes for cones and cylinders
    manualDocument.solids
      .filter((solid) => solid.visible && (solid.solidType === 'cone' || solid.solidType === 'cylinder') && !isSolidIdSliced(solid.id))
      .forEach((solid) => {
        const hasBaseCircle = !!solid.baseCircleId
        let center: Vec3 = [0, 0, 0]
        let r = solid.radius ?? 3
        let normal: Vec3 = [0, 0, 1]

        if (hasBaseCircle) {
          const circle = manualDocument.circles.find((c) => c.id === solid.baseCircleId)
          if (circle) {
            const props = resolveCircleProps(circle, manualDerived.pointPositions)
            if (props) {
              center = props.center
              r = props.radius
              normal = props.normal
            }
          }
        } else if (solid.centerPointId) {
          const cPos = manualDerived.pointPositions[solid.centerPointId]
          if (cPos) center = cPos
        }

        let h = solid.height ?? 5
        if ((solid.solidType === 'cone' || solid.solidType === 'cylinder') && solid.apexPointId && manualDerived.pointPositions[solid.apexPointId]) {
          const apex = manualDerived.pointPositions[solid.apexPointId]
          h = dotVec3(subVec3(apex, center), normal)
        }

        if (Math.abs(h) < 1e-3) return

        const normalVec = new THREE.Vector3(...normal).normalize()
        const defaultY = new THREE.Vector3(0, 1, 0)
        const quaternion = new THREE.Quaternion().setFromUnitVectors(defaultY, normalVec)
        const meshCenter = addVec3(center, scaleVec3(normal, h / 2))

        let geom: THREE.BufferGeometry
        let blockerGeom: THREE.BufferGeometry

        if (solid.solidType === 'cone') {
          geom = new THREE.ConeGeometry(r, Math.abs(h), 32)
          blockerGeom = new THREE.ConeGeometry(r * 0.993, Math.abs(h) * 0.993, 32)
          if (h < 0) {
            geom.scale(1, -1, 1)
            blockerGeom.scale(1, -1, 1)
          }
        } else {
          geom = new THREE.CylinderGeometry(r, r, Math.abs(h), 32)
          blockerGeom = new THREE.CylinderGeometry(r * 0.993, r * 0.993, Math.abs(h) * 0.993, 32)
          if (h < 0) {
            geom.scale(1, -1, 1)
            blockerGeom.scale(1, -1, 1)
          }
        }

        // Create invisible depth blocker mesh
        const blockerMaterial = new THREE.MeshBasicMaterial({
          colorWrite: false,
          depthWrite: true,
          side: THREE.DoubleSide,
        })
        const blockerMesh = new THREE.Mesh(blockerGeom, blockerMaterial)
        blockerMesh.position.set(meshCenter[0], meshCenter[1], meshCenter[2])
        blockerMesh.quaternion.copy(quaternion)
        blockerMesh.renderOrder = 1
        group.add(blockerMesh)

        // Create semi-transparent solid mesh for raycasting and visual background
        const material = new THREE.MeshBasicMaterial({
          color: colors.solid,
          transparent: true,
          opacity: 0.12,
          side: THREE.DoubleSide,
          depthWrite: false,
        })
        const mesh = new THREE.Mesh(geom, material)
        mesh.position.set(meshCenter[0], meshCenter[1], meshCenter[2])
        mesh.quaternion.copy(quaternion)
        mesh.userData.entity = {
          kind: 'solid',
          id: solid.id,
          solidId: solid.id,
        } satisfies InteractiveHit
        group.add(mesh)
      })

    // Render derived circles (including sphere wireframe rings)
    if (manualDerived.displayCircles) {
      manualDerived.displayCircles
        .filter((c) => c.visible && !(c.sourceKind === 'solid' && isSolidIdSliced(c.sourceId)))
        .forEach((circle) => {
          const circlePts: THREE.Vector3[] = []
          const segments = 64
          const R = circle.radius
          const center = new THREE.Vector3(...circle.center)
          const normal = new THREE.Vector3(...circle.normal).normalize()

          // Find two orthogonal vectors to the normal
          let u = new THREE.Vector3(1, 0, 0)
          if (Math.abs(normal.dot(u)) > 0.9) {
            u.set(0, 1, 0)
          }
          const w = new THREE.Vector3().crossVectors(normal, u).normalize()
          u.crossVectors(w, normal).normalize()

          for (let i = 0; i <= segments; i++) {
            const theta = (i / segments) * Math.PI * 2
            const cos = Math.cos(theta) * R
            const sin = Math.sin(theta) * R
            const pt = center.clone().addScaledVector(u, cos).addScaledVector(w, sin)
            circlePts.push(pt)
          }

          const geometry = new THREE.BufferGeometry().setFromPoints(circlePts)
          
          const isSelected =
            (manualSelection?.kind === 'circle' && manualSelection.id === circle.sourceId) ||
            (manualSelection?.kind === 'solid' && circle.sourceKind === 'solid' && manualSelection.id === circle.sourceId)
          
          const isHovered =
            circle.sourceId === hoveredEntityIdRef.current ||
            (circle.sourceKind === 'solid' && circle.sourceId === hoveredEntityIdRef.current)

          let lineColor = circle.sourceKind === 'solid' ? colors.solid : colors.polygon
          if (isSelected) {
            lineColor = colors.pointSelected
          } else if (isHovered) {
            lineColor = colors.pointHovered
          }

          // 1. Solid line (front / LessEqualDepth)
          const material = new THREE.LineBasicMaterial({
            color: lineColor,
            linewidth: isSelected ? 2.5 : 1.5,
            depthFunc: THREE.LessEqualDepth,
          })
          const line = new THREE.Line(geometry, material)
          line.renderOrder = 10
          line.userData.entity = {
            kind: circle.sourceKind === 'solid' ? 'solid' : 'circle',
            id: circle.sourceId,
          } satisfies InteractiveHit
          group.add(line)
          segmentMeshesRef.current.push({ id: circle.sourceId, mesh: line })

          // 2. Dashed line (back / GreaterDepth) - only for sphere rings!
          if (circle.sourceKind === 'solid') {
            const dashedMaterial = new THREE.LineDashedMaterial({
              color: lineColor,
              dashSize: 0.15,
              gapSize: 0.1,
              depthFunc: THREE.GreaterDepth,
              transparent: true,
              opacity: 0.5,
            })
            const dashedLine = new THREE.Line(geometry, dashedMaterial)
            dashedLine.renderOrder = 11
            dashedLine.computeLineDistances()
            group.add(dashedLine)
            segmentMeshesRef.current.push({ id: circle.sourceId, mesh: dashedLine })
          }
        })
    }

    // Render Sliced Solids (each solid with visible cuts gets rendered in 2^N bitmask groups)
    manualDocument.solids
      .filter((solid) => solid.visible && solid.cuts && solid.cuts.some(c => c.visible))
      .forEach((solid) => {
        const activeCuts = solid.cuts!.filter(c => c.visible)
        const N = activeCuts.length

        // Retrieve plane normal and coplanar point for each cut
        const cutsPlanesData = activeCuts.map(cut => {
          const pts = cut.planePointIds.map(id => {
            const pObj = manualDocument.points.find(p => p.label === id)
            return pObj ? manualDerived.pointPositions[pObj.id] : null
          }).filter(Boolean) as Vec3[]
          if (pts.length < 3) return null

          const p0 = new THREE.Vector3(...pts[0])
          const p1 = new THREE.Vector3(...pts[1])
          const p2 = new THREE.Vector3(...pts[2])
          const u = new THREE.Vector3().subVectors(p1, p0)
          const v = new THREE.Vector3().subVectors(p2, p0)
          const normal = new THREE.Vector3().crossVectors(u, v).normalize()
          return {
            id: cut.id,
            plane: new THREE.Plane().setFromNormalAndCoplanarPoint(normal, p0),
            normal,
            p0,
            planePoints: pts
          }
        }).filter((x): x is NonNullable<typeof x> => !!x)

        const actualN = cutsPlanesData.length
        if (actualN === 0) return

        const cutIntersections = cutsPlanesData.map(({ planePoints }) =>
          computeSolidPlaneIntersection(
            solid,
            planePoints,
            manualDerived.pointPositions,
            manualDocument,
          ),
        )

        // For each of the 2^N bitmask groups
        for (let i = 0; i < (1 << actualN); i++) {
          const bitStr = i.toString(2).padStart(actualN, '0')
          const bitmaskKey = `${solid.id}_${bitStr}`
          const isVisible = bitmaskVisibility[bitmaskKey] !== false

          const bitmaskGroup = new THREE.Group()
          bitmaskGroup.visible = isVisible
          bitmaskGroup.userData.baseVisible = isVisible
          bitmaskGroup.userData.bitmaskKey = bitmaskKey
          bitmaskGroupsRef.current.set(bitmaskKey, bitmaskGroup)

          // Calculate translation offset based on explodeAmount
          const offsetVec = new THREE.Vector3()
          const dist = (explodeAmount / 100) * 8
          for (let b = 0; b < actualN; b++) {
            const isPositive = bitStr[b] === '1'
            offsetVec.add(cutsPlanesData[b].normal.clone().multiplyScalar(isPositive ? dist : -dist))
          }
          bitmaskGroup.position.copy(offsetVec)

          // Set up clipping planes for this group
          const clips: THREE.Plane[] = []
          for (let b = 0; b < actualN; b++) {
            const isPositive = bitStr[b] === '1'
            const originalPlane = cutsPlanesData[b].plane
            const p = isPositive ? originalPlane.clone() : originalPlane.clone().negate()
            p.translate(offsetVec)
            clips.push(p)
          }

          // 1. Polygons
          manualDerived.displayPolygons
            .filter((poly) => poly.visible && poly.sourceKind === 'solid' && poly.sourceId === solid.id)
            .forEach((polygon, pIdx) => {
              if (polygon.points.length < 3) return
              const faceGeometry = new THREE.BufferGeometry()
              const positions: number[] = []
              for (let idx = 1; idx < polygon.points.length - 1; idx += 1) {
                positions.push(...polygon.points[0], ...polygon.points[idx], ...polygon.points[idx + 1])
              }
              faceGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
              faceGeometry.computeVertexNormals()

              if (polygon.isVirtual) {
                const virtualMaterial = new THREE.MeshBasicMaterial({
                  colorWrite: false,
                  depthWrite: false,
                  transparent: true,
                  opacity: 0,
                  side: THREE.DoubleSide,
                  clippingPlanes: clips,
                })
                virtualMaterial.userData.skipChunkPreview = true

                const virtualMesh = new THREE.Mesh(faceGeometry, virtualMaterial)
                virtualMesh.userData.entity = {
                  kind: 'solid',
                  id: polygon.id,
                  solidId: solid.id,
                  facePointIds: polygon.pointIds,
                  isVirtual: true,
                  bitmaskKey,
                } satisfies InteractiveHit
                virtualMesh.userData.isVirtualPlane = true
                virtualMesh.userData.virtualLabel = polygon.label
                bitmaskGroup.add(virtualMesh)
                return
              }

              const isSelected = manualSelection?.kind === 'solid' && manualSelection.id === solid.id
              const material = new THREE.MeshBasicMaterial({
                color: isSelected ? colors.pointSelected : colors.solid,
                transparent: true,
                opacity: polygon.opacity,
                side: THREE.DoubleSide,
                clippingPlanes: clips,
                polygonOffset: true,
                polygonOffsetFactor: 1 + pIdx * 0.1,
                polygonOffsetUnits: 1,
              })
              const mesh = new THREE.Mesh(faceGeometry, material)
              mesh.userData.entity = {
                kind: 'solid',
                id: solid.id,
                solidId: solid.id,
              } satisfies InteractiveHit
              bitmaskGroup.add(mesh)

              const blockerMaterial = new THREE.MeshBasicMaterial({
                colorWrite: false,
                depthWrite: true,
                side: THREE.DoubleSide,
                clippingPlanes: clips,
                polygonOffset: true,
                polygonOffsetFactor: 1 + pIdx * 0.1,
                polygonOffsetUnits: 1,
              })
              const blockerMesh = new THREE.Mesh(faceGeometry, blockerMaterial)
              blockerMesh.renderOrder = 1
              bitmaskGroup.add(blockerMesh)
            })

          // 2. Segments
          manualDerived.displaySegments
            .filter((seg) => seg.visible && seg.sourceKind === 'solid' && seg.sourceId === solid.id)
            .forEach((segment) => {
              const geometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(...segment.start),
                new THREE.Vector3(...segment.end),
              ])
              const isSelected = manualSelection?.kind === 'solid' && manualSelection.id === solid.id
              const material = new THREE.LineBasicMaterial({
                color: isSelected ? colors.pointSelected : colors.solid,
                clippingPlanes: clips,
              })
              const line = new THREE.Line(geometry, material)
              line.renderOrder = 10
              line.userData.entity = {
                kind: 'solid',
                id: solid.id,
              } satisfies InteractiveHit
              bitmaskGroup.add(line)

              const dashedMaterial = new THREE.LineDashedMaterial({
                color: isSelected ? colors.pointSelected : colors.solid,
                dashSize: 0.15,
                gapSize: 0.1,
                depthFunc: THREE.GreaterDepth,
                transparent: true,
                opacity: 0.5,
                clippingPlanes: clips,
              })
              const dashedLine = new THREE.Line(geometry, dashedMaterial)
              dashedLine.renderOrder = 11
              dashedLine.computeLineDistances()
              bitmaskGroup.add(dashedLine)
            })

          // 3. Sphere, Cone, Cylinder meshes
          if (solid.solidType === 'cone' || solid.solidType === 'cylinder') {
            const hasBaseCircle = !!solid.baseCircleId
            let center: Vec3 = [0, 0, 0]
            let r = solid.radius ?? 3
            let normal: Vec3 = [0, 0, 1]

            if (hasBaseCircle) {
              const circle = manualDocument.circles.find((c) => c.id === solid.baseCircleId)
              if (circle) {
                const props = resolveCircleProps(circle, manualDerived.pointPositions)
                if (props) {
                  center = props.center
                  r = props.radius
                  normal = props.normal
                }
              }
            } else if (solid.centerPointId) {
              const cPos = manualDerived.pointPositions[solid.centerPointId]
              if (cPos) center = cPos
            }

            let h = solid.height ?? 5
            if (solid.apexPointId && manualDerived.pointPositions[solid.apexPointId]) {
              const apex = manualDerived.pointPositions[solid.apexPointId]
              h = dotVec3(subVec3(apex, center), normal)
            }

            if (Math.abs(h) >= 1e-3) {
              const normalVec = new THREE.Vector3(...normal).normalize()
              const defaultY = new THREE.Vector3(0, 1, 0)
              const quaternion = new THREE.Quaternion().setFromUnitVectors(defaultY, normalVec)
              const meshCenter = addVec3(center, scaleVec3(normal, h / 2))

              let geom: THREE.BufferGeometry
              let blockerGeom: THREE.BufferGeometry

              if (solid.solidType === 'cone') {
                geom = new THREE.ConeGeometry(r, Math.abs(h), 32)
                blockerGeom = new THREE.ConeGeometry(r * 0.993, Math.abs(h) * 0.993, 32)
                if (h < 0) {
                  geom.scale(1, -1, 1)
                  blockerGeom.scale(1, -1, 1)
                }
              } else {
                geom = new THREE.CylinderGeometry(r, r, Math.abs(h), 32)
                blockerGeom = new THREE.CylinderGeometry(r * 0.993, r * 0.993, Math.abs(h) * 0.993, 32)
                if (h < 0) {
                  geom.scale(1, -1, 1)
                  blockerGeom.scale(1, -1, 1)
                }
              }

              const blockerMaterial = new THREE.MeshBasicMaterial({
                colorWrite: false,
                depthWrite: true,
                side: THREE.DoubleSide,
                clippingPlanes: clips,
              })
              const blockerMesh = new THREE.Mesh(blockerGeom, blockerMaterial)
              blockerMesh.position.set(meshCenter[0], meshCenter[1], meshCenter[2])
              blockerMesh.quaternion.copy(quaternion)
              blockerMesh.renderOrder = 1
              bitmaskGroup.add(blockerMesh)

              const isSelected = manualSelection?.kind === 'solid' && manualSelection.id === solid.id
              const material = new THREE.MeshBasicMaterial({
                color: isSelected ? colors.pointSelected : colors.solid,
                transparent: true,
                opacity: 0.12,
                side: THREE.DoubleSide,
                depthWrite: false,
                clippingPlanes: clips,
              })
              const mesh = new THREE.Mesh(geom, material)
              mesh.position.set(meshCenter[0], meshCenter[1], meshCenter[2])
              mesh.quaternion.copy(quaternion)
              mesh.userData.entity = {
                kind: 'solid',
                id: solid.id,
                solidId: solid.id,
              } satisfies InteractiveHit
              bitmaskGroup.add(mesh)
            }
          } else if (solid.solidType === 'sphere') {
            const sphereRing = manualDerived.displayCircles?.find(c => c.visible && c.sourceKind === 'solid' && c.sourceId === solid.id)
            if (sphereRing) {
              const blockerGeometry = new THREE.SphereGeometry(sphereRing.radius * 0.993, 32, 32)
              const blockerMaterial = new THREE.MeshBasicMaterial({
                colorWrite: false,
                depthWrite: true,
                side: THREE.DoubleSide,
                clippingPlanes: clips,
              })
              const blockerMesh = new THREE.Mesh(blockerGeometry, blockerMaterial)
              blockerMesh.position.set(sphereRing.center[0], sphereRing.center[1], sphereRing.center[2])
              blockerMesh.renderOrder = 1
              bitmaskGroup.add(blockerMesh)

              const isSelected = manualSelection?.kind === 'solid' && manualSelection.id === solid.id
              const sphereGeometry = new THREE.SphereGeometry(sphereRing.radius, 32, 32)
              const sphereMaterial = new THREE.MeshBasicMaterial({
                color: isSelected ? colors.pointSelected : colors.solid,
                transparent: true,
                opacity: 0.12,
                side: THREE.DoubleSide,
                depthWrite: false,
                clippingPlanes: clips,
              })
              const sphereMesh = new THREE.Mesh(sphereGeometry, sphereMaterial)
              sphereMesh.position.set(sphereRing.center[0], sphereRing.center[1], sphereRing.center[2])
              sphereMesh.userData.entity = {
                kind: 'solid',
                id: solid.id,
                solidId: solid.id,
              } satisfies InteractiveHit
              bitmaskGroup.add(sphereMesh)
            }
          }

          // 4. Points (Vertices of this solid)
          manualDerived.displayPoints
            .filter((p) => p.visible && p.sourceKind === 'solid' && p.sourceId === solid.id)
            .forEach((point) => {
              const isSelected = manualSelection?.kind === 'point' && (manualSelection.id === point.id || manualSelection.id === point.sourceId)
              const material = new THREE.MeshBasicMaterial({
                color: isSelected ? colors.pointSelected : colors.solid,
                clippingPlanes: clips,
              })
              const mesh = new THREE.Mesh(pointGeometry, material)
              mesh.position.set(...point.position)
              mesh.userData.entity = {
                kind: 'point',
                id: point.id,
              } satisfies InteractiveHit
              bitmaskGroup.add(mesh)
            })

          // 5. Finite section caps, matching the smart-draw renderer.
          for (let b = 0; b < actualN; b++) {
            const intersection = cutIntersections[b]
            if (!intersection) continue

            const capClips: THREE.Plane[] = []
            for (let otherB = 0; otherB < actualN; otherB++) {
              if (otherB === b) continue
              const isPositive = bitStr[otherB] === '1'
              const originalPlane = cutsPlanesData[otherB].plane
              const p = isPositive ? originalPlane.clone() : originalPlane.clone().negate()
              p.translate(offsetVec)
              capClips.push(p)
            }

            const capMat = new THREE.MeshBasicMaterial({
              color: '#ff6b6b',
              side: THREE.DoubleSide,
              transparent: true,
              opacity: 0.3,
              clippingPlanes: capClips,
              polygonOffset: true,
              polygonOffsetFactor: -1 - b * 0.1,
              polygonOffsetUnits: -1,
            })
            const blockerMat = new THREE.MeshBasicMaterial({
              colorWrite: false,
              depthWrite: true,
              side: THREE.DoubleSide,
              clippingPlanes: capClips,
              polygonOffset: true,
              polygonOffsetFactor: -1 - b * 0.1,
              polygonOffsetUnits: -1,
            })
            const outlineMat = new THREE.LineBasicMaterial({
              color: 0xff4444,
              depthTest: false,
              clippingPlanes: capClips,
            })

            if (
              intersection.isCircle &&
              intersection.circleCenter &&
              intersection.circleRadius &&
              intersection.normal
            ) {
              const center = new THREE.Vector3(...intersection.circleCenter)
              const normal = new THREE.Vector3(...intersection.normal).normalize()
              const quaternion = new THREE.Quaternion().setFromUnitVectors(
                new THREE.Vector3(0, 0, 1),
                normal,
              )
              const capGeometry = new THREE.CircleGeometry(intersection.circleRadius, 64)

              const capMesh = new THREE.Mesh(capGeometry, capMat)
              capMesh.userData.entity = {
                kind: 'solid',
                id: solid.id,
                solidId: solid.id,
                bitmaskKey,
              } satisfies InteractiveHit
              capMesh.position.copy(center)
              capMesh.quaternion.copy(quaternion)
              bitmaskGroup.add(capMesh)

              const blockerMesh = new THREE.Mesh(capGeometry.clone(), blockerMat)
              blockerMesh.position.copy(center)
              blockerMesh.quaternion.copy(quaternion)
              bitmaskGroup.add(blockerMesh)

              const ringPoints: THREE.Vector3[] = []
              for (let ringIndex = 0; ringIndex <= 128; ringIndex++) {
                const angle = (ringIndex / 128) * Math.PI * 2
                ringPoints.push(
                  new THREE.Vector3(
                    Math.cos(angle) * intersection.circleRadius,
                    Math.sin(angle) * intersection.circleRadius,
                    0,
                  )
                    .applyQuaternion(quaternion)
                    .add(center),
                )
              }
              const outlineGeometry = new THREE.BufferGeometry().setFromPoints(ringPoints)
              const outline = new THREE.Line(outlineGeometry, outlineMat)
              outline.userData.entity = {
                kind: 'solid',
                id: solid.id,
                solidId: solid.id,
                bitmaskKey,
              } satisfies InteractiveHit
              bitmaskGroup.add(outline)
              continue
            }

            if (!intersection.polygon || intersection.polygon.length < 3) continue

            const capPositions: number[] = []
            for (let polygonIndex = 1; polygonIndex < intersection.polygon.length - 1; polygonIndex++) {
              capPositions.push(
                ...intersection.polygon[0],
                ...intersection.polygon[polygonIndex],
                ...intersection.polygon[polygonIndex + 1],
              )
            }
            const capGeometry = new THREE.BufferGeometry()
            capGeometry.setAttribute('position', new THREE.Float32BufferAttribute(capPositions, 3))
            capGeometry.computeVertexNormals()
            const capMesh = new THREE.Mesh(capGeometry, capMat)
            capMesh.userData.entity = {
              kind: 'solid',
              id: solid.id,
              solidId: solid.id,
              bitmaskKey,
            } satisfies InteractiveHit
            bitmaskGroup.add(capMesh)
            bitmaskGroup.add(new THREE.Mesh(capGeometry.clone(), blockerMat))

            const outlinePositions: number[] = []
            for (let polygonIndex = 0; polygonIndex < intersection.polygon.length; polygonIndex++) {
              const current = intersection.polygon[polygonIndex]
              const next = intersection.polygon[(polygonIndex + 1) % intersection.polygon.length]
              outlinePositions.push(...current, ...next)
            }
            const outlineGeometry = new THREE.BufferGeometry()
            outlineGeometry.setAttribute(
              'position',
              new THREE.Float32BufferAttribute(outlinePositions, 3),
            )
            const outline = new THREE.LineSegments(outlineGeometry, outlineMat)
            outline.userData.entity = {
              kind: 'solid',
              id: solid.id,
              solidId: solid.id,
              bitmaskKey,
            } satisfies InteractiveHit
            bitmaskGroup.add(outline)
          }

          bitmaskGroup.traverse((object) => {
            const entity = object.userData.entity as InteractiveHit | undefined
            if (entity) entity.bitmaskKey = bitmaskKey
          })
          group.add(bitmaskGroup)
        }
      })

    applyBitmaskGroupPreview(bitmaskGroupsRef.current, previewBitmaskKeysRef.current)

    const preview = draftOperation
    if (preview?.tool === 'segment' && preview.pointIds?.length === 1 && preview.previewPosition) {
      const start = manualDerived.pointPositions[preview.pointIds[0]]
      if (start) {
        const geometry = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(...start),
          new THREE.Vector3(...preview.previewPosition),
        ])
        const line = new THREE.Line(geometry, previewMaterial)
        line.computeLineDistances()
        group.add(line)
      }
    }

    if (preview?.tool === 'polygon' && preview.pointIds?.length) {
    }

    if (preview?.tool === 'polygon' && preview.pointIds?.length) {
      const points = preview.pointIds
        .map((pointId) => manualDerived.pointPositions[pointId])
        .filter(Boolean) as Vec3[]
      if (preview.previewPosition) points.push(preview.previewPosition)
      if (points.length >= 2) {
        const geometry = new THREE.BufferGeometry().setFromPoints(points.map((point) => new THREE.Vector3(...point)))
        const line = new THREE.Line(geometry, previewMaterial)
        line.computeLineDistances()
        group.add(line)
      }
    }

    if (preview?.tool === 'box' && preview.pointIds?.length === 2 && preview.height && preview.height > 0) {
      const first = manualDerived.pointPositions[preview.pointIds[0]]
      const third = manualDerived.pointPositions[preview.pointIds[1]]
      if (first && third) {
        const points = buildBoxFromCorners(first, third, preview.height)
        const edges = [
          [0, 1], [1, 2], [2, 3], [3, 0],
          [4, 5], [5, 6], [6, 7], [7, 4],
          [0, 4], [1, 5], [2, 6], [3, 7],
        ]
        edges.forEach(([startIndex, endIndex]) => {
          const geometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(...points[startIndex]),
            new THREE.Vector3(...points[endIndex]),
          ])
          const line = new THREE.Line(geometry, previewMaterial)
          line.computeLineDistances()
          group.add(line)
        })
      }
    }

    if ((preview?.tool === 'pyramid' || preview?.tool === 'prism' || preview?.tool === 'rightPyramid') && preview.basePolygonId) {
      const basePolygon = manualDerived.displayPolygons.find(
        (polygon) => polygon.sourceKind === 'polygon' && polygon.sourceId === preview.basePolygonId,
      )
      if (basePolygon && basePolygon.points.length >= 3) {
        const basePoints = basePolygon.points
        const center = polygonCenter(basePoints)

        if (preview.tool === 'pyramid' || preview.tool === 'rightPyramid') {
          const hasApex = !!(preview.apexPointId && manualDerived.pointPositions[preview.apexPointId])
          const normal = getPolygonNormal(basePoints)
          
          let anchorPos = center
          if (preview.tool === 'rightPyramid' && preview.apexAnchorPointId && manualDerived.pointPositions[preview.apexAnchorPointId]) {
            anchorPos = manualDerived.pointPositions[preview.apexAnchorPointId]
          }

          const apex: Vec3 = hasApex
            ? manualDerived.pointPositions[preview.apexPointId!]
            : addVec3(anchorPos, scaleVec3(normal, preview.height ?? 4))

          basePoints.forEach((point, index) => {
            const next = basePoints[(index + 1) % basePoints.length]
              ;[
                [point, next],
                [point, apex],
              ].forEach(([start, end]) => {
                const geometry = new THREE.BufferGeometry().setFromPoints([
                  new THREE.Vector3(...start),
                  new THREE.Vector3(...end),
                ])
                const line = new THREE.Line(geometry, previewMaterial)
                line.computeLineDistances()
                group.add(line)
              })
          })
        } else {
          const hasTopPoint = !!(preview.topPointId && manualDerived.pointPositions[preview.topPointId])
          const normal = getPolygonNormal(basePoints)
          const sideLen = Math.hypot(
            basePoints[1][0] - basePoints[0][0],
            basePoints[1][1] - basePoints[0][1],
            basePoints[1][2] - basePoints[0][2]
          )
          const translation = hasTopPoint
            ? subVec3(manualDerived.pointPositions[preview.topPointId!], basePoints[0])
            : scaleVec3(normal, preview.height ?? sideLen)

          const topPoints = basePoints.map<Vec3>((pt) => addVec3(pt, translation))

          basePoints.forEach((point, index) => {
            const nextBase = basePoints[(index + 1) % basePoints.length]
            const nextTop = topPoints[(index + 1) % topPoints.length]
              ;[
                [point, nextBase],
                [topPoints[index], nextTop],
                [point, topPoints[index]],
              ].forEach(([start, end]) => {
                const geometry = new THREE.BufferGeometry().setFromPoints([
                  new THREE.Vector3(...start),
                  new THREE.Vector3(...end),
                ])
                const line = new THREE.Line(geometry, previewMaterial)
                line.computeLineDistances()
                group.add(line)
              })
          })
        }
      }
    }
  }, [
    colors,
    draftOperation,
    manualDerived,
    manualDocument.points,
    manualDocument.segments,
    manualSelection,
    showLabels,
    bitmaskVisibility,
    explodeAmount,
  ])

  useEffect(() => {
    applyBitmaskGroupPreview(bitmaskGroupsRef.current, previewBitmaskKeys)
  }, [previewBitmaskKeys])

  useEffect(() => {
    const renderer = rendererRef.current
    const controls = controlsRef.current
    if (!renderer || !controls) return

    const dragThreshold = 5

    const handleCanvasClick = (event: PointerEvent) => {
      let hit = findIntersectionEntity(event)
      if (cycleIntersectsRef.current.length > 0) {
        hit = cycleIntersectsRef.current[cycleIndexRef.current % cycleIntersectsRef.current.length]
      }

      // Reset cycle selection
      cycleIntersectsRef.current = []
      cycleIndexRef.current = 0

      const planePoint = getPlaneIntersection(event)
      const snappedPlanePoint = planePoint ? snapPosition(planePoint) : null
      const snapTarget = getSnapTarget(event, snappedPlanePoint)
      const fallbackPosition = snapTarget?.position ?? snappedPlanePoint ?? null

      if (activeTool === 'select') {
        setSelectedBitmaskKey(hit?.bitmaskKey ?? null)
        if (hit?.kind === 'solid' && hit.solidId) {
          setManualSelection({ kind: 'solid', id: hit.solidId })
        } else {
          setManualSelection(hit ?? null)
        }
        return
      }

      if (activeTool === 'segment' && fallbackPosition) {
        const materializedPointId = createPointFromTarget(snapTarget, fallbackPosition)
        if (!materializedPointId) return
        const currentIds = draftOperation?.tool === 'segment' ? draftOperation.pointIds ?? [] : []
        if (currentIds.length === 0) {
          setDraftOperation({ tool: 'segment', pointIds: [materializedPointId] })
          return
        }
        if (currentIds[0] !== materializedPointId) {
          createSegment(currentIds[0], materializedPointId)
        }
        autoRevertToSelect ? setActiveTool('select') : setDraftOperation({ tool: 'segment', pointIds: [] })
        return
      }

      if (activeTool === 'polygon' && fallbackPosition) {
        const materializedPointId = createPointFromTarget(snapTarget, fallbackPosition)
        if (!materializedPointId) return
        const currentIds = draftOperation?.tool === 'polygon' ? [...(draftOperation.pointIds ?? [])] : []
        if (currentIds.length >= 3 && currentIds[0] === materializedPointId) {
          createPolygon(currentIds)
          autoRevertToSelect ? setActiveTool('select') : setDraftOperation({ tool: 'polygon', pointIds: [] })
          return
        }
        if (currentIds[currentIds.length - 1] !== materializedPointId) {
          currentIds.push(materializedPointId)
        }
        setDraftOperation({ tool: 'polygon', pointIds: currentIds })
        return
      }

      if (activeTool === 'box' && fallbackPosition) {
        const materializedPointId = createPointFromTarget(snapTarget, fallbackPosition)
        if (!materializedPointId) return
        const currentIds = draftOperation?.tool === 'box' ? [...(draftOperation.pointIds ?? [])] : []
        if (currentIds.length < 3) currentIds.push(materializedPointId)
        if (currentIds.length === 3) {
          const height = draftOperation?.tool === 'box' ? draftOperation.height ?? 4 : 4
          createBox([currentIds[0], currentIds[1], currentIds[2]], height)
          autoRevertToSelect ? setActiveTool('select') : setDraftOperation({ tool: 'box', pointIds: [], height })
        } else {
          setDraftOperation({
            tool: 'box',
            pointIds: currentIds.slice(0, 3),
            height: draftOperation?.tool === 'box' ? draftOperation.height ?? 4 : 4,
          })
        }
        return
      }

      if (activeTool === 'cube' && fallbackPosition) {
        const materializedPointId = createPointFromTarget(snapTarget, fallbackPosition)
        if (!materializedPointId) return
        const currentIds = draftOperation?.tool === 'cube' ? [...(draftOperation.pointIds ?? [])] : []
        if (currentIds.length < 2) currentIds.push(materializedPointId)
        if (currentIds.length === 2) {
          createCube(currentIds[0], currentIds[1])
          autoRevertToSelect ? setActiveTool('select') : setDraftOperation({ tool: 'cube', pointIds: [] })
        } else {
          setDraftOperation({
            tool: 'cube',
            pointIds: currentIds.slice(0, 2)
          })
        }
        return
      }

      // Click 2 for Pyramid / Prism / RegularPyramid / RightPyramid
      if (activeTool === 'rightPyramid' && draftOperation?.basePolygonId) {
        if (snapTarget?.kind === 'point' && snapTarget.pointId) {
          const basePoly = manualDocument.polygons.find(p => p.id === draftOperation.basePolygonId)
          if (basePoly && basePoly.pointIds.includes(snapTarget.pointId)) {
            setDraftOperation({
              ...draftOperation,
              apexAnchorPointId: snapTarget.pointId,
            })
            setManualSelection({ kind: 'point', id: snapTarget.pointId })
          }
          return
        }
      }

      if ((activeTool === 'pyramid' || activeTool === 'prism' || activeTool === 'regularPyramid') && draftOperation?.basePolygonId) {
        const isSkew = activeTool === 'pyramid' ? !!draftOperation.apexPointId : !!draftOperation.topPointId;
        
        if (isSkew) {
          if (snapTarget?.kind === 'point' && snapTarget.pointId) {
            const id = activeTool === 'pyramid'
              ? createPyramid(draftOperation.basePolygonId, 0, snapTarget.pointId)
              : createPrism(draftOperation.basePolygonId, 0, snapTarget.pointId);
            if (id) {
              autoRevertToSelect ? setActiveTool('select') : setDraftOperation(null);
            }
            return;
          }
        } else {
          let heightToUse = draftOperation.height ?? 4;
          if (activeTool === 'prism' && draftOperation.height === undefined) {
            const basePolygon = manualDerived.displayPolygons.find((p) => p.sourceId === draftOperation.basePolygonId)
            if (basePolygon && basePolygon.points.length > 1) {
              heightToUse = Math.hypot(
                basePolygon.points[1][0] - basePolygon.points[0][0],
                basePolygon.points[1][1] - basePolygon.points[0][1],
                basePolygon.points[1][2] - basePolygon.points[0][2]
              )
            }
          }
          const id = activeTool === 'pyramid'
            ? createPyramid(draftOperation.basePolygonId, heightToUse)
            : createPrism(draftOperation.basePolygonId, heightToUse);
          if (id) {
            autoRevertToSelect ? setActiveTool('select') : setDraftOperation(null);
          }
          return;
        }
      }

      // Click 1 for Pyramid / Prism / RegularPyramid / RightPyramid
      if ((activeTool === 'pyramid' || activeTool === 'prism' || activeTool === 'regularPyramid' || activeTool === 'rightPyramid') && hit?.kind === 'polygon') {
        if (activeTool === 'regularPyramid') {
          const id = createRegularPyramid(hit.id)
          if (id) autoRevertToSelect ? setActiveTool('select') : setDraftOperation(null)
          return
        }
        setManualSelection(hit)
        setDraftOperation({
          tool: activeTool,
          basePolygonId: hit.id,
          height: draftOperation?.tool === activeTool ? draftOperation.height : 4,
          apexPointId: draftOperation?.tool === activeTool ? draftOperation.apexPointId : undefined,
          topPointId: draftOperation?.tool === activeTool ? draftOperation.topPointId : undefined,
          apexAnchorPointId: draftOperation?.tool === activeTool && draftOperation.basePolygonId === hit.id ? draftOperation.apexAnchorPointId : undefined,
        })
        return
      }

      // Click for Cone / Cylinder (Circle select)
      if ((activeTool === 'cone' || activeTool === 'cylinder') && hit?.kind === 'circle') {
        setManualSelection(hit)
        setDraftOperation({
          tool: activeTool,
          baseCircleId: hit.id,
          height: draftOperation?.tool === activeTool ? draftOperation.height ?? 5 : 5,
        })
        return
      }

      // Sphere: click to select center point
      if (activeTool === 'sphere' && fallbackPosition) {
        // If user clicks on an existing point, use it as center
        if (snapTarget?.kind === 'point' && snapTarget.pointId) {
          setDraftOperation({
            ...draftOperation,
            tool: activeTool,
            centerPointId: snapTarget.pointId,
          })
          return
        }
        // Otherwise create a new point and use it as center
        const materializedPointId = createPointFromTarget(snapTarget, fallbackPosition)
        if (!materializedPointId) return
        setDraftOperation({
          ...draftOperation,
          tool: activeTool,
          centerPointId: materializedPointId,
        })
        return
      }

      if (activeTool === 'midpoint') {
        if (hit?.kind === 'segment') {
          const seg = manualDocument.segments.find((s) => s.id === hit.id)
          if (seg) {
            createMidpoint(seg.startPointId, seg.endPointId)
            autoRevertToSelect ? setActiveTool('select') : setDraftOperation({ tool: 'midpoint', pointIds: [] })
          }
          return
        }
        const clickedPointId = hit?.kind === 'point' ? hit.id : (snapTarget?.kind === 'point' ? snapTarget.pointId : null)
        if (clickedPointId) {
          const currentIds = draftOperation?.tool === 'midpoint' ? [...(draftOperation.pointIds ?? [])] : []
          if (currentIds.length === 0) {
            setDraftOperation({ tool: 'midpoint', pointIds: [clickedPointId] })
          } else if (currentIds[0] !== clickedPointId) {
            createMidpoint(currentIds[0], clickedPointId)
            autoRevertToSelect ? setActiveTool('select') : setDraftOperation({ tool: 'midpoint', pointIds: [] })
          }
        }
        return
      }

      if (activeTool === 'intersection') {
        if (hit?.kind === 'segment') {
          const currentIds = draftOperation?.tool === 'intersection' ? [...(draftOperation.segmentIds ?? [])] : []
          if (currentIds.length === 0) {
            setDraftOperation({ tool: 'intersection', segmentIds: [hit.id] })
          } else if (currentIds[0] !== hit.id) {
            createIntersection(currentIds[0], hit.id)
            setDraftOperation({ tool: 'intersection', segmentIds: [] })
          }
        }
        return
      }

      if (activeTool === 'projection') {
        const currentPointIds = draftOperation?.tool === 'projection' ? draftOperation.pointIds ?? [] : []
        if (currentPointIds.length === 0) {
          // Step 1: Select source point
          const clickedPointId = (snapTarget?.kind === 'point' ? snapTarget.pointId : null) ?? (hit?.kind === 'point' ? hit.id : null)
          if (clickedPointId) {
            setDraftOperation({ tool: 'projection', pointIds: [clickedPointId] })
          }
          return
        }
        // Step 2: Select target (segment, polygon, solid face, virtual plane, or pick points)
        if (hit?.kind === 'segment') {
          createProjection(currentPointIds[0], hit.id, 'segment')
          autoRevertToSelect ? setActiveTool('select') : setDraftOperation({ tool: 'projection', pointIds: [] })
          return
        }
        if (hit?.kind === 'polygon') {
          createProjection(currentPointIds[0], hit.id, 'polygon')
          autoRevertToSelect ? setActiveTool('select') : setDraftOperation({ tool: 'projection', pointIds: [] })
          return
        }
        // Solid face or virtual plane with facePointIds → project by points
        if (hit?.kind === 'solid' && hit.facePointIds && hit.facePointIds.length >= 2) {
          createProjectionByPoints(currentPointIds[0], hit.facePointIds)
          autoRevertToSelect ? setActiveTool('select') : setDraftOperation({ tool: 'projection', pointIds: [] })
          return
        }
        // Pick-3-points mode: accumulate clicked points for custom plane definition
        if (currentPointIds.length >= 1 && currentPointIds.length < 4) {
          const clickedPointId = (snapTarget?.kind === 'point' ? snapTarget.pointId : null) ?? (hit?.kind === 'point' ? hit.id : null)
          if (clickedPointId && !currentPointIds.includes(clickedPointId)) {
            const newPointIds = [...currentPointIds, clickedPointId]
            if (newPointIds.length === 4) {
              // sourcePoint + 3 target points → project
              const [sourceId, ...targetIds] = newPointIds
              createProjectionByPoints(sourceId, targetIds)
              autoRevertToSelect ? setActiveTool('select') : setDraftOperation({ tool: 'projection', pointIds: [] })
            } else {
              setDraftOperation({ ...draftOperation, tool: 'projection', pointIds: newPointIds })
            }
            return
          }
        }
        return
      }

      if (activeTool === 'regularPolygon' && fallbackPosition) {
        const clickedPointId = snapTarget?.kind === 'point' && snapTarget.pointId
          ? snapTarget.pointId
          : createPointFromTarget(snapTarget, fallbackPosition)
        if (!clickedPointId) return
        const currentIds = draftOperation?.tool === 'regularPolygon' ? [...(draftOperation.pointIds ?? [])] : []
        if (currentIds.length === 0) {
          setDraftOperation({ tool: 'regularPolygon', pointIds: [clickedPointId], radius: draftOperation?.radius ?? 5 })
        } else if (currentIds[0] !== clickedPointId) {
          const sides = draftOperation?.radius ?? 5
          createRegularPolygon(currentIds[0], clickedPointId, sides)
          autoRevertToSelect ? setActiveTool('select') : setDraftOperation({ tool: 'regularPolygon', pointIds: [], radius: sides })
        }
        return
      }

      if (activeTool === 'specialTriangle' && fallbackPosition) {
        const clickedPointId = snapTarget?.kind === 'point' && snapTarget.pointId
          ? snapTarget.pointId
          : createPointFromTarget(snapTarget, fallbackPosition)
        if (!clickedPointId) return
        const currentIds = draftOperation?.tool === 'specialTriangle' ? [...(draftOperation.pointIds ?? [])] : []
        const typeCode = draftOperation?.height ?? 1
        const type = typeCode === 1 ? 'vuong' : typeCode === 2 ? 'can' : typeCode === 3 ? 'vuong_can' : typeCode === 4 ? 'deu' : 'thuong'

        if (type === 'thuong') {
          if (currentIds.length < 2) {
            if (!currentIds.includes(clickedPointId)) {
              setDraftOperation({
                tool: 'specialTriangle',
                pointIds: [...currentIds, clickedPointId],
                height: typeCode,
              })
            }
          } else if (currentIds.length === 2 && !currentIds.includes(clickedPointId)) {
            const allPts = [...currentIds, clickedPointId]
            createSegment(allPts[0], allPts[1])
            createSegment(allPts[1], allPts[2])
            createSegment(allPts[2], allPts[0])
            createPolygon(allPts)
            autoRevertToSelect ? setActiveTool('select') : setDraftOperation({ tool: 'specialTriangle', pointIds: [], height: typeCode })
          }
          return
        }

        if (currentIds.length === 0) {
          setDraftOperation({ tool: 'specialTriangle', pointIds: [clickedPointId], height: typeCode, centerPointId: clickedPointId })
        } else if (currentIds[0] !== clickedPointId) {
          const anchor = draftOperation?.centerPointId ?? currentIds[0]
          createSpecialTriangle(type as any, currentIds[0], clickedPointId, anchor)
          autoRevertToSelect ? setActiveTool('select') : setDraftOperation({ tool: 'specialTriangle', pointIds: [], height: typeCode, centerPointId: clickedPointId })
        }
        return
      }

      if (activeTool === 'specialQuadrilateral' && fallbackPosition) {
        const clickedPointId = snapTarget?.kind === 'point' && snapTarget.pointId
          ? snapTarget.pointId
          : createPointFromTarget(snapTarget, fallbackPosition)
        if (!clickedPointId) return
        const currentIds = draftOperation?.tool === 'specialQuadrilateral' ? [...(draftOperation.pointIds ?? [])] : []
        const typeCode = draftOperation?.height ?? 1
        const type = typeCode === 1 ? 'binh_huanh' : typeCode === 2 ? 'chu_nhat' : typeCode === 3 ? 'thoi' : 'vuong'

        if (type === 'thoi' || type === 'vuong') {
          if (currentIds.length === 0) {
            setDraftOperation({ tool: 'specialQuadrilateral', pointIds: [clickedPointId], height: typeCode })
          } else if (currentIds[0] !== clickedPointId) {
            createSpecialQuadrilateral(type, [currentIds[0], clickedPointId])
            autoRevertToSelect ? setActiveTool('select') : setDraftOperation({ tool: 'specialQuadrilateral', pointIds: [], height: typeCode })
          }
        } else {
          if (currentIds.length < 2) {
            if (!currentIds.includes(clickedPointId)) {
              setDraftOperation({ tool: 'specialQuadrilateral', pointIds: [...currentIds, clickedPointId], height: typeCode })
            }
          } else if (currentIds.length === 2 && !currentIds.includes(clickedPointId)) {
            createSpecialQuadrilateral(type, [...currentIds, clickedPointId])
            autoRevertToSelect ? setActiveTool('select') : setDraftOperation({ tool: 'specialQuadrilateral', pointIds: [], height: typeCode })
          }
        }
        return
      }

      if (activeTool === 'circle' && fallbackPosition) {
        const clickedPointId = snapTarget?.kind === 'point' && snapTarget.pointId
          ? snapTarget.pointId
          : createPointFromTarget(snapTarget, fallbackPosition)
        if (!clickedPointId) return
        const currentIds = draftOperation?.tool === 'circle' ? [...(draftOperation.pointIds ?? [])] : []
        const kindCode = draftOperation?.height ?? 1
        const kind = kindCode === 1 ? 'threePoints' : kindCode === 2 ? 'centerRadius' : 'centerPoint'

        if (kind === 'threePoints') {
          if (currentIds.length < 2) {
            if (!currentIds.includes(clickedPointId)) {
              setDraftOperation({ tool: 'circle', pointIds: [...currentIds, clickedPointId], height: kindCode, radius: draftOperation?.radius ?? 3 })
            }
          } else if (currentIds.length === 2 && !currentIds.includes(clickedPointId)) {
            createCircle('threePoints', { sourcePointIds: [...currentIds, clickedPointId] })
            autoRevertToSelect ? setActiveTool('select') : setDraftOperation({ tool: 'circle', pointIds: [], height: kindCode, radius: draftOperation?.radius ?? 3 })
          }
        } else if (kind === 'centerRadius') {
          createCircle('centerRadius', { centerPointId: clickedPointId, radius: draftOperation?.radius ?? 3 })
          autoRevertToSelect ? setActiveTool('select') : setDraftOperation({ tool: 'circle', pointIds: [], height: kindCode, radius: draftOperation?.radius ?? 3 })
        } else if (kind === 'centerPoint') {
          if (currentIds.length === 0) {
            setDraftOperation({ tool: 'circle', pointIds: [clickedPointId], height: kindCode, radius: draftOperation?.radius ?? 3 })
          } else if (currentIds[0] !== clickedPointId) {
            createCircle('centerPoint', { centerPointId: currentIds[0], radiusPointId: clickedPointId })
            autoRevertToSelect ? setActiveTool('select') : setDraftOperation({ tool: 'circle', pointIds: [], height: kindCode, radius: draftOperation?.radius ?? 3 })
          }
        }
        return
      }

      if (activeTool === 'centroid') {
        if (hit?.kind === 'polygon') {
          createCentroid(hit.id)
          autoRevertToSelect ? setActiveTool('select') : setDraftOperation({ tool: 'centroid', pointIds: [] })
          return
        }
        if (hit?.kind === 'solid' && hit.facePointIds && hit.facePointIds.length >= 3) {
          createCentroid(undefined, hit.facePointIds)
          autoRevertToSelect ? setActiveTool('select') : setDraftOperation({ tool: 'centroid', pointIds: [] })
          return
        }
        const clickedPointId = (snapTarget?.kind === 'point' ? snapTarget.pointId : null) ?? (hit?.kind === 'point' ? hit.id : null)
        if (clickedPointId) {
          const currentIds = draftOperation?.tool === 'centroid' ? [...(draftOperation.pointIds ?? [])] : []
          if (!currentIds.includes(clickedPointId)) {
            const nextIds = [...currentIds, clickedPointId]
            setDraftOperation({ tool: 'centroid', pointIds: nextIds })
          }
        }
        return
      }

      if (activeTool === 'perpendicularBisector') {
        if (hit?.kind === 'segment') {
          createPerpendicularBisector(hit.id)
          autoRevertToSelect ? setActiveTool('select') : setDraftOperation({ tool: 'perpendicularBisector', pointIds: [], segmentIds: [] })
          return
        }
        const clickedPointId = hit?.kind === 'point' ? hit.id : (snapTarget?.kind === 'point' ? snapTarget.pointId : null)
        if (clickedPointId) {
          const currentIds = draftOperation?.tool === 'perpendicularBisector' ? [...(draftOperation.pointIds ?? [])] : []
          if (!currentIds.includes(clickedPointId)) {
            const nextIds = [...currentIds, clickedPointId]
            if (nextIds.length === 2) {
              createPerpendicularBisector(undefined, nextIds[0], nextIds[1])
              autoRevertToSelect ? setActiveTool('select') : setDraftOperation({ tool: 'perpendicularBisector', pointIds: [], segmentIds: [] })
            } else {
              setDraftOperation({ tool: 'perpendicularBisector', pointIds: nextIds, segmentIds: [] })
            }
          }
        }
        return
      }

      if (activeTool === 'angleBisector') {
        const clickedPointId = hit?.kind === 'point' ? hit.id : (snapTarget?.kind === 'point' ? snapTarget.pointId : null)
        if (clickedPointId) {
          const currentIds = draftOperation?.tool === 'angleBisector' ? [...(draftOperation.pointIds ?? [])] : []
          if (!currentIds.includes(clickedPointId)) {
            const nextIds = [...currentIds, clickedPointId]
            if (nextIds.length === 3) {
              createAngleBisector(nextIds[0], nextIds[1], nextIds[2])
              autoRevertToSelect ? setActiveTool('select') : setDraftOperation({ tool: 'angleBisector', pointIds: [] })
            } else {
              setDraftOperation({ tool: 'angleBisector', pointIds: nextIds })
            }
          }
        }
        return
      }

      if (activeTool === 'parallelLine') {
        const currentPointIds = draftOperation?.tool === 'parallelLine' ? draftOperation.pointIds ?? [] : []
        if (currentPointIds.length === 0) {
          const clickedPointId = hit?.kind === 'point' ? hit.id : (snapTarget?.kind === 'point' ? snapTarget.pointId : null)
          if (clickedPointId) {
            setDraftOperation({ tool: 'parallelLine', pointIds: [clickedPointId], segmentIds: [] })
          }
          return
        }
        if (hit?.kind === 'segment') {
          createParallelLine(currentPointIds[0], hit.id)
          autoRevertToSelect ? setActiveTool('select') : setDraftOperation({ tool: 'parallelLine', pointIds: [], segmentIds: [] })
        }
        return
      }

      if (activeTool === 'perpendicularLine') {
        const currentPointIds = draftOperation?.tool === 'perpendicularLine' ? draftOperation.pointIds ?? [] : []
        if (currentPointIds.length === 0) {
          const clickedPointId = hit?.kind === 'point' ? hit.id : (snapTarget?.kind === 'point' ? snapTarget.pointId : null)
          if (clickedPointId) {
            setDraftOperation({ tool: 'perpendicularLine', pointIds: [clickedPointId], segmentIds: [] })
          }
          return
        }
        if (hit?.kind === 'segment') {
          createPerpendicularLine(currentPointIds[0], hit.id)
          autoRevertToSelect ? setActiveTool('select') : setDraftOperation({ tool: 'perpendicularLine', pointIds: [], segmentIds: [] })
        }
        return
      }
    }

    const computeSmartGuide = (rawPos: Vec3): { snapped: Vec3; guide: { start: Vec3; end: Vec3; label: string } | null } => {
      if (!stateRefs.current.showSmartGuides) {
        return { snapped: rawPos, guide: null }
      }

      const getScreenDist = (p1: Vec3, p2: Vec3): number => {
        const s1 = projectToScreen(p1)
        const s2 = projectToScreen(p2)
        if (!s1 || !s2) return Number.POSITIVE_INFINITY
        return Math.hypot(s1.x - s2.x, s1.y - s2.y)
      }

      const smartGuidePixelThreshold = 12
      const smartGuideFallbackThreshold = 0.08

      // 1. Check Parallelism & Perpendicularity first if drawing a segment
      if (draftOperation && (draftOperation.tool === 'segment' || draftOperation.tool === 'polygon')) {
        const pointIds = draftOperation.pointIds ?? []
        if (pointIds.length > 0) {
          const startId = pointIds[pointIds.length - 1]
          const posA = manualDerived.pointPositions[startId]
          if (posA) {
            const v = [rawPos[0] - posA[0], rawPos[1] - posA[1], rawPos[2] - posA[2]] as Vec3
            const vLen = Math.hypot(v[0], v[1], v[2])
            if (vLen > 0.1) {
              const vNorm = [v[0] / vLen, v[1] / vLen, v[2] / vLen] as Vec3

              // Check parallel/perpendicular to existing segments
              for (const seg of manualDocument.segments) {
                const segDisp = manualDerived.displaySegments.find((s) => s.id === seg.id)
                if (!segDisp) continue
                const u = [segDisp.end[0] - segDisp.start[0], segDisp.end[1] - segDisp.start[1], segDisp.end[2] - segDisp.start[2]] as Vec3
                const uLen = Math.hypot(u[0], u[1], u[2])
                if (uLen < 0.05) continue
                const uNorm = [u[0] / uLen, u[1] / uLen, u[2] / uLen] as Vec3

                const dotVal = vNorm[0] * uNorm[0] + vNorm[1] * uNorm[1] + vNorm[2] * uNorm[2]
                const absDot = Math.abs(dotVal)

                // Parallel: dot product close to 1 or -1 (angle close to 0 or 180)
                if (absDot > 0.975) {
                  // Project rawPos onto the line posA + t * uNorm
                  const t = (rawPos[0] - posA[0]) * uNorm[0] + (rawPos[1] - posA[1]) * uNorm[1] + (rawPos[2] - posA[2]) * uNorm[2]
                  const snapped: Vec3 = [
                    posA[0] + t * uNorm[0],
                    posA[1] + t * uNorm[1],
                    posA[2] + t * uNorm[2],
                  ]
                  const screenDist = getScreenDist(rawPos, snapped)
                  const isClose = screenDist < smartGuidePixelThreshold ||
                    (screenDist === Number.POSITIVE_INFINITY && Math.hypot(rawPos[0] - snapped[0], rawPos[1] - snapped[1], rawPos[2] - snapped[2]) < smartGuideFallbackThreshold * 1.5)

                  if (isClose) {
                    const extent = 60
                    const start: Vec3 = [posA[0] - uNorm[0] * extent, posA[1] - uNorm[1] * extent, posA[2] - uNorm[2] * extent]
                    const end: Vec3 = [posA[0] + uNorm[0] * extent, posA[1] + uNorm[1] * extent, posA[2] + uNorm[2] * extent]
                    return {
                      snapped,
                      guide: { start, end, label: `Song song ${seg.label}` }
                    }
                  }
                }

                // Perpendicular: dot product close to 0 (angle close to 90)
                if (absDot < 0.08) {
                  // We project rawPos onto the plane passing through posA with normal uNorm
                  const distToPlane = (rawPos[0] - posA[0]) * uNorm[0] + (rawPos[1] - posA[1]) * uNorm[1] + (rawPos[2] - posA[2]) * uNorm[2]
                  const snapped: Vec3 = [
                    rawPos[0] - distToPlane * uNorm[0],
                    rawPos[1] - distToPlane * uNorm[1],
                    rawPos[2] - distToPlane * uNorm[2],
                  ]
                  const screenDist = getScreenDist(rawPos, snapped)
                  const isClose = screenDist < smartGuidePixelThreshold ||
                    (screenDist === Number.POSITIVE_INFINITY && Math.hypot(rawPos[0] - snapped[0], rawPos[1] - snapped[1], rawPos[2] - snapped[2]) < smartGuideFallbackThreshold * 1.5)

                  if (isClose) {
                    // Find a good line direction in the plane for representation
                    const projV = [snapped[0] - posA[0], snapped[1] - posA[1], snapped[2] - posA[2]] as Vec3
                    const projVLen = Math.hypot(projV[0], projV[1], projV[2])
                    if (projVLen > 0.05) {
                      const dir: Vec3 = [projV[0] / projVLen, projV[1] / projVLen, projV[2] / projVLen]
                      const extent = 60
                      const start: Vec3 = [posA[0] - dir[0] * extent, posA[1] - dir[1] * extent, posA[2] - dir[2] * extent]
                      const end: Vec3 = [posA[0] + dir[0] * extent, posA[1] + dir[1] * extent, posA[2] + dir[2] * extent]
                      return {
                        snapped,
                        guide: { start, end, label: `Vu\u00f4ng g\u00f3c ${seg.label}` }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }

      // 2. Point coordinate alignment (axis alignment)
      // Check if rawPos is close to some point P's coordinate along X, Y, or Z axis
      for (const point of manualDocument.points) {
        if (!point.visible) continue
        if (point.id === interactionRef.current.creatingPointId) continue
        const posP = manualDerived.pointPositions[point.id]
        if (!posP) continue

        // Alignment X (same y and z or similar)
        const snappedX: Vec3 = [posP[0], rawPos[1], rawPos[2]]
        const screenDistX = getScreenDist(rawPos, snappedX)
        if (screenDistX < smartGuidePixelThreshold || (screenDistX === Number.POSITIVE_INFINITY && Math.abs(rawPos[0] - posP[0]) < smartGuideFallbackThreshold)) {
          const extent = 60
          return {
            snapped: snappedX,
            guide: {
              start: [posP[0], rawPos[1] - extent, rawPos[2]],
              end: [posP[0], rawPos[1] + extent, rawPos[2]],
              label: `Th\u1eb3ng h\u00e0ng X v\u1edbi ${point.label}`
            }
          }
        }

        // Alignment Y
        const snappedY: Vec3 = [rawPos[0], posP[1], rawPos[2]]
        const screenDistY = getScreenDist(rawPos, snappedY)
        if (screenDistY < smartGuidePixelThreshold || (screenDistY === Number.POSITIVE_INFINITY && Math.abs(rawPos[1] - posP[1]) < smartGuideFallbackThreshold)) {
          const extent = 60
          return {
            snapped: snappedY,
            guide: {
              start: [rawPos[0] - extent, posP[1], rawPos[2]],
              end: [rawPos[0] + extent, posP[1], rawPos[2]],
              label: `Th\u1eb3ng h\u00e0ng Y v\u1edbi ${point.label}`
            }
          }
        }

        // Alignment Z
        const snappedZ: Vec3 = [rawPos[0], rawPos[1], posP[2]]
        const screenDistZ = getScreenDist(rawPos, snappedZ)
        if (screenDistZ < smartGuidePixelThreshold || (screenDistZ === Number.POSITIVE_INFINITY && Math.abs(rawPos[2] - posP[2]) < smartGuideFallbackThreshold)) {
          const extent = 60
          return {
            snapped: snappedZ,
            guide: {
              start: [rawPos[0], rawPos[1], posP[2] - extent],
              end: [rawPos[0], rawPos[1], posP[2] + extent],
              label: `Th\u1eb3ng h\u00e0ng Z v\u1edbi ${point.label}`
            }
          }
        }
      }

      return { snapped: rawPos, guide: null }
    }

    const updateEntityHighlight = (hoveredId?: string | null) => {
      pointMeshesRef.current.forEach(({ id, mesh }) => {
        const point = manualDerived.displayPoints.find((p) => p.id === id || p.sourceId === id)
        const isSelected = manualSelection?.kind === 'point' && (manualSelection.id === id || point?.sourceId === manualSelection.id)
        const isHovered = id === hoveredId || point?.sourceId === hoveredId
        const isDraftSelected =
          draftOperation &&
          (draftOperation.pointIds?.includes(id) ||
            draftOperation.pointIds?.includes(point?.sourceId ?? '') ||
            draftOperation.centerPointId === id ||
            draftOperation.centerPointId === point?.sourceId ||
            draftOperation.apexPointId === id ||
            draftOperation.apexPointId === point?.sourceId ||
            draftOperation.topPointId === id ||
            draftOperation.topPointId === point?.sourceId)
        const mat = mesh.material as THREE.MeshBasicMaterial
        if (mat) {
          if (isSelected) {
            mat.color.set(colors.pointSelected)
          } else if (isHovered || isDraftSelected) {
            mat.color.set(colors.pointHovered)
          } else {
            mat.color.set(point?.generated ? colors.solid : colors.point)
          }
        }
      })

      segmentMeshesRef.current.forEach(({ id, mesh }) => {
        const segment = manualDerived.displaySegments.find((s) => s.id === id || s.sourceId === id)
        const entity = mesh.userData.entity as InteractiveHit | undefined
        
        const isSelected = manualSelection && 
          ((manualSelection.kind === 'segment' && manualSelection.id === id) ||
           (manualSelection.kind === 'polygon' && (segment?.sourceKind === 'polygon' || entity?.kind === 'polygon') && manualSelection.id === id) ||
           (manualSelection.kind === 'solid' && (segment?.sourceKind === 'solid' || entity?.kind === 'solid') && manualSelection.id === id) ||
           (manualSelection.kind === 'circle' && entity?.kind === 'circle' && manualSelection.id === id))
           
        const isHovered = id === hoveredId || segment?.sourceId === hoveredId || (entity?.kind === 'solid' && entity.id === hoveredId)
        
        const isDraftSelected =
          draftOperation &&
          (draftOperation.segmentIds?.includes(id) ||
           draftOperation.segmentIds?.includes(segment?.sourceId ?? '') ||
           draftOperation.basePolygonId === id ||
           draftOperation.basePolygonId === segment?.sourceId)
           
        const mat = mesh.material as THREE.LineBasicMaterial
        if (mat) {
          if (isSelected) {
            mat.color.set(colors.pointSelected)
          } else if (isHovered || isDraftSelected) {
            mat.color.set(colors.pointHovered)
          } else {
            const isSolid = segment?.sourceKind === 'solid' || entity?.kind === 'solid'
            const isCircle = entity?.kind === 'circle'
            mat.color.set(isSolid ? colors.solid : (isCircle ? colors.polygon : colors.segment))
          }
        }
      })

      // Highlight polygon and solid faces (including virtual ones)
      dynamicGroupRef.current.children.forEach((obj) => {
        if (obj instanceof THREE.Mesh && obj.userData?.entity) {
          const entity = obj.userData.entity as InteractiveHit
          const isVirtualPlane = !!obj.userData.isVirtualPlane
          const isSelected = manualSelection && 
            ((manualSelection.kind === entity.kind && manualSelection.id === entity.id) ||
             (manualSelection.kind === 'solid' && entity.kind === 'solid' && entity.solidId === manualSelection.id))
          
          const isHovered = entity.id === hoveredId
          
          const mat = obj.material as THREE.MeshBasicMaterial
          if (mat) {
            const newDepthTest = !isHovered
            if (mat.depthTest !== newDepthTest) {
              mat.depthTest = newDepthTest
              mat.needsUpdate = true
            }
            obj.renderOrder = isHovered ? 100 : 0

            if (isVirtualPlane) {
              if (isHovered) {
                mat.opacity = 0.45
                mat.color.set(colors.preview)
              } else {
                mat.opacity = 0
              }
            } else {
              if (isSelected) {
                mat.color.set(colors.pointSelected)
                mat.opacity = 0.35
              } else if (isHovered) {
                mat.color.set(colors.pointHovered)
                mat.opacity = 0.35
              } else {
                mat.color.set(entity.kind === 'solid' ? colors.solid : colors.polygon)
                mat.opacity = entity.kind === 'solid' ? 0.14 : 0.18
              }
            }
          }
        }
      })
    }

    const handlePointerMove = (event: PointerEvent) => {
      cycleIntersectsRef.current = []
      cycleIndexRef.current = 0
      lastCycleEventRef.current = { x: event.clientX, y: event.clientY }

      const planePoint = getPlaneIntersection(event)
      const snappedPlanePoint = planePoint ? snapPosition(planePoint) : null
      const snapTarget = getSnapTarget(event, snappedPlanePoint)
      const ray = getCameraRay(event)

      // Hover point highlight
      let hoveredId: string | null = null
      if (!interactionRef.current.creatingPointId) {
        const hit = findIntersectionEntity(event)
        hoveredId = (snapTarget?.kind === 'point' ? snapTarget.pointId : snapTarget?.kind === 'segment' ? snapTarget.segmentId : hit?.id) ?? null
      }
      
      hoveredEntityIdRef.current = hoveredId
      updateEntityHighlight(hoveredId)

      let activePosition = snapTarget?.position ?? snappedPlanePoint ?? null
      let currentGuide: { start: Vec3; end: Vec3; label: string } | null = null

      if (activePosition && snapTarget?.kind !== 'point') {
        const guideRes = computeSmartGuide(activePosition)
        activePosition = guideRes.snapped
        currentGuide = guideRes.guide
      }

      // Update smart guide mesh visibility and coordinates (disabled drawing as requested: 'còn không hãy xóa nó đi')
      const smartGuideMesh = smartGuideMeshRef.current
      if (smartGuideMesh) {
        if (currentGuide && stateRefs.current.showSmartGuides) {
          const pts = [
            new THREE.Vector3(...currentGuide.start),
            new THREE.Vector3(...currentGuide.end),
          ]
          smartGuideMesh.geometry.setFromPoints(pts)
          smartGuideMesh.computeLineDistances()
          smartGuideMesh.visible = false
        } else {
          smartGuideMesh.visible = false
        }
      }

      if (interactionRef.current.creatingPointId && interactionRef.current.createPointBasePosition) {
        const camera = cameraRef.current
        const container = mountRef.current
        if (!camera || !container || interactionRef.current.createPointStartY == null) return
        const pointId = interactionRef.current.creatingPointId
        const point = manualDocument.points.find(p => p.id === pointId)
        if (!point) return

        // --- Segment-point drag: constrain motion along the 3D segment ---
        const _segDragPointId = interactionRef.current.creatingPointId
        const _segDragPoint = manualDocument.points.find(p => p.id === _segDragPointId)
        if (_segDragPoint && (_segDragPoint.pointKind === 'segment' || _segDragPoint.pointKind === 'midpoint') && _segDragPoint.segmentId) {
          controls.enabled = false
          const _segRay = getCameraRay(event)
          if (_segRay) {
            // Resolve segment endpoints from displaySegments (already computed)
            const _segDisplay = manualDerived.displaySegments.find(s => s.id === _segDragPoint.segmentId)
            if (_segDisplay) {
              // Closest-point-on-segment to camera ray
              // Ray: R(s) = O + s*D
              // Seg: S(t) = P1 + t*V
              const O = _segRay.origin
              const D = _segRay.direction
              const P1x = _segDisplay.start[0], P1y = _segDisplay.start[1], P1z = _segDisplay.start[2]
              const Vx = _segDisplay.end[0] - P1x, Vy = _segDisplay.end[1] - P1y, Vz = _segDisplay.end[2] - P1z
              const Ux = P1x - O.x, Uy = P1y - O.y, Uz = P1z - O.z
              const VdotV = Vx*Vx + Vy*Vy + Vz*Vz
              const DdotV = D.x*Vx + D.y*Vy + D.z*Vz
              const UdotV = Ux*Vx + Uy*Vy + Uz*Vz
              const UdotD = Ux*D.x + Uy*D.y + Uz*D.z
              const denom = VdotV - DdotV * DdotV
              let nextT: number
              if (Math.abs(denom) < 1e-10) {
                nextT = _segDragPoint.t ?? 0.5
              } else {
                // Correct closest-approach formula: t = (U·D × D·V − U·V) / (V·V − (D·V)²)
                nextT = (UdotD * DdotV - UdotV) / denom
              }
              // Snap near endpoints / midpoint for convenience (narrow zone to avoid unintended snap)
              if (Math.abs(nextT) < 0.025) nextT = 0
              else if (Math.abs(nextT - 0.5) < 0.025) nextT = 0.5
              else if (Math.abs(nextT - 1) < 0.025) nextT = 1
              nextT = Math.max(0, Math.min(1, nextT))
              updatePointT(_segDragPointId, nextT)
              const newPos: Vec3 = [
                P1x + nextT * Vx,
                P1y + nextT * Vy,
                P1z + nextT * Vz,
              ]
              scheduleHoverPresentation({
                kind: 'workplane',
                label: `t = ${Number(nextT.toFixed(3))}`,
                position: newPos,
              })
            }
          }
          return
        }
        // --- Surface/Face direct drag: slide along sphere, cone, cylinder, or polygon face ---
        if (point.pointKind === 'spherePoint' && point.solidId) {
          const solid = manualDocument.solids.find(s => s.id === point.solidId)
          if (solid && solid.centerPointId && solid.radius) {
            const center = manualDerived.pointPositions[solid.centerPointId]
            if (center) {
              const ray = getCameraRay(event)
              if (ray) {
                const x_local = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion).normalize()
                const y_local = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion).normalize()
                const z_local = new THREE.Vector3(0, 0, 1).applyQuaternion(camera.quaternion).normalize()
                
                const plane = new THREE.Plane()
                plane.setFromNormalAndCoplanarPoint(z_local, new THREE.Vector3(...center))
                
                const targetVec = new THREE.Vector3()
                if (ray.intersectPlane(plane, targetVec)) {
                  controls.enabled = false
                  const disp = new THREE.Vector3().subVectors(targetVec, new THREE.Vector3(...center))
                  const x = disp.dot(x_local)
                  const y = disp.dot(y_local)
                  const d = Math.hypot(x, y)
                  
                  const r = solid.radius
                  const phi = r > 1e-9 ? (d / r) * (Math.PI / 2) : 0
                  const theta = Math.atan2(y, x)
                  
                  const targetPosVec = new THREE.Vector3(...center)
                    .addScaledVector(x_local, r * Math.sin(phi) * Math.cos(theta))
                    .addScaledVector(y_local, r * Math.sin(phi) * Math.sin(theta))
                    .addScaledVector(z_local, r * Math.cos(phi))
                    
                  const newPos: Vec3 = [targetPosVec.x, targetPosVec.y, targetPosVec.z]
                  updatePointPosition(pointId, newPos, null)
                  
                  if (draftOperation && (draftOperation.tool === 'segment' || draftOperation.tool === 'polygon')) {
                    setDraftOperation({
                      ...draftOperation,
                      previewPosition: newPos,
                    })
                  }
                  
                  scheduleHoverPresentation({
                    kind: 'workplane',
                    label: `Thuộc ${solid.label}`,
                    position: newPos,
                  })
                  return
                }
              }
            }
          }
        }
        
        if (point.pointKind === 'facePoint' && point.sourcePointIds && point.sourcePointIds.length >= 3) {
          const v0 = manualDerived.pointPositions[point.sourcePointIds[0]]
          const v1 = manualDerived.pointPositions[point.sourcePointIds[1]]
          const v2 = manualDerived.pointPositions[point.sourcePointIds[2]]
          if (v0 && v1 && v2) {
            const ray = getCameraRay(event)
            if (ray) {
              const plane = new THREE.Plane()
              plane.setFromCoplanarPoints(
                new THREE.Vector3(...v0),
                new THREE.Vector3(...v1),
                new THREE.Vector3(...v2)
              )
              const targetVec = new THREE.Vector3()
              if (ray.intersectPlane(plane, targetVec)) {
                controls.enabled = false
                const newPos: Vec3 = [targetVec.x, targetVec.y, targetVec.z]
                updatePointPosition(pointId, newPos, null)
                
                if (draftOperation && (draftOperation.tool === 'segment' || draftOperation.tool === 'polygon')) {
                  setDraftOperation({
                    ...draftOperation,
                    previewPosition: newPos,
                  })
                }
                
                scheduleHoverPresentation({
                  kind: 'workplane',
                  label: 'Trên mặt phẳng',
                  position: newPos,
                })
                return
              }
            }
          }
        }
        
        if (point.pointKind === 'conePoint' || point.pointKind === 'cylinderPoint') {
          const ray = getCameraRay(event)
          if (ray) {
            const currentPos = manualDerived.pointPositions[pointId]
            if (currentPos) {
              const normal = new THREE.Vector3()
              camera.getWorldDirection(normal)
              normal.negate()
              const plane = new THREE.Plane()
              plane.setFromNormalAndCoplanarPoint(normal, new THREE.Vector3(...currentPos))
              const targetVec = new THREE.Vector3()
              if (ray.intersectPlane(plane, targetVec)) {
                controls.enabled = false
                const newPos: Vec3 = [targetVec.x, targetVec.y, targetVec.z]
                updatePointPosition(pointId, newPos, null)
                
                if (draftOperation && (draftOperation.tool === 'segment' || draftOperation.tool === 'polygon')) {
                  setDraftOperation({
                    ...draftOperation,
                    previewPosition: newPos,
                  })
                }
                
                const solid = manualDocument.solids.find(s => s.id === point.solidId)
                scheduleHoverPresentation({
                  kind: 'workplane',
                  label: solid?.label ? `Thuộc ${solid.label}` : 'Trên bề mặt',
                  position: newPos,
                })
                return
              }
            }
          }
        }

        // -------------------------------------------------------------------

        if (event.ctrlKey) {
          controls.enabled = true
          interactionRef.current.wasCtrlPressed = true
          return
        } else {
          if (interactionRef.current.wasCtrlPressed) {
            interactionRef.current.wasCtrlPressed = false
            interactionRef.current.createPointStartY = event.clientY
            const pointId = interactionRef.current.creatingPointId
            const currentPos = manualDerived.pointPositions[pointId]
            if (currentPos) {
              interactionRef.current.createPointBasePosition = [currentPos[0], currentPos[1], currentPos[2]]
            }
          }
          controls.enabled = false
        }

        // Shift key transition tracking to prevent jumps
        const isShiftPressed = event.shiftKey
        if (interactionRef.current.wasShiftPressed !== isShiftPressed) {
          interactionRef.current.wasShiftPressed = isShiftPressed
          interactionRef.current.createPointStartY = event.clientY
          const pointId = interactionRef.current.creatingPointId
          const currentPos = manualDerived.pointPositions[pointId]
          if (currentPos) {
            interactionRef.current.createPointBasePosition = [currentPos[0], currentPos[1], currentPos[2]]
          }
        }

        const distance = camera.position.distanceTo(controls.target)
        const worldPerPixel =
          (2 * distance * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) /
          container.clientHeight

        if (isShiftPressed) {
          // Vertical dragging along Z axis
          const deltaY = interactionRef.current.createPointStartY - event.clientY
          const [baseX, baseY, baseZ = 0] = interactionRef.current.createPointBasePosition
          const nextZ = baseZ + deltaY * worldPerPixel * 1.35
          let snappedZ = snapCoordinate(nextZ)

          let candidatePos: Vec3 = [baseX, baseY, snappedZ]
          const guideRes = computeSmartGuide(candidatePos)
          candidatePos = guideRes.snapped
          snappedZ = candidatePos[2]
          currentGuide = guideRes.guide

          // Update mesh again
          if (smartGuideMesh) {
            if (currentGuide && stateRefs.current.showSmartGuides) {
              const pts = [
                new THREE.Vector3(...currentGuide.start),
                new THREE.Vector3(...currentGuide.end),
              ]
              smartGuideMesh.geometry.setFromPoints(pts)
              smartGuideMesh.computeLineDistances()
              smartGuideMesh.visible = false
            } else {
              smartGuideMesh.visible = false
            }
          }

          updatePointPosition(
            interactionRef.current.creatingPointId,
            [baseX, baseY, snappedZ],
            null,
          )

          if (draftOperation && (draftOperation.tool === 'segment' || draftOperation.tool === 'polygon')) {
            setDraftOperation({
              ...draftOperation,
              previewPosition: [baseX, baseY, snappedZ],
            })
          }

          scheduleHoverPresentation({
            kind: 'workplane',
            label: currentGuide ? currentGuide.label : 'Điểm đang di chuyển',
            position: [baseX, baseY, snappedZ],
          })
        } else {
          // Horizontal dragging along Oxy plane
          const [, , baseZ = 0] = interactionRef.current.createPointBasePosition
          const horizontalPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -baseZ)
          const planeIntersection = getPlaneIntersection(event, horizontalPlane)

          if (planeIntersection) {
            let snappedIntersection = snapPosition(planeIntersection)

            const guideRes = computeSmartGuide([snappedIntersection[0], snappedIntersection[1], baseZ])
            snappedIntersection = guideRes.snapped
            currentGuide = guideRes.guide

            // Update mesh again
            if (smartGuideMesh) {
              if (currentGuide && stateRefs.current.showSmartGuides) {
                const pts = [
                  new THREE.Vector3(...currentGuide.start),
                  new THREE.Vector3(...currentGuide.end),
                ]
                smartGuideMesh.geometry.setFromPoints(pts)
                smartGuideMesh.computeLineDistances()
                smartGuideMesh.visible = false
              } else {
                smartGuideMesh.visible = false
              }
            }

            updatePointPosition(
              interactionRef.current.creatingPointId,
              [snappedIntersection[0], snappedIntersection[1], baseZ],
              null,
            )

            if (draftOperation && (draftOperation.tool === 'segment' || draftOperation.tool === 'polygon')) {
              setDraftOperation({
                ...draftOperation,
                previewPosition: [snappedIntersection[0], snappedIntersection[1], baseZ],
              })
            }

            scheduleHoverPresentation({
              kind: 'workplane',
              label: currentGuide ? currentGuide.label : 'Điểm đang di chuyển',
              position: [snappedIntersection[0], snappedIntersection[1], baseZ],
            })
          }
        }
        return
      }

      if (interactionRef.current.pointerDown && !interactionRef.current.pointerDown.didDrag) {
        const dx = event.clientX - interactionRef.current.pointerDown.x
        const dy = event.clientY - interactionRef.current.pointerDown.y
        if (Math.hypot(dx, dy) > dragThreshold) {
          interactionRef.current.pointerDown.didDrag = true
        }
      }

      let activeSnapTarget = snapTarget
      if (currentGuide && stateRefs.current.showSmartGuides && activePosition) {
        activeSnapTarget = {
          kind: 'workplane',
          label: currentGuide.label,
          position: activePosition,
        }
      }

      scheduleHoverPresentation(activeSnapTarget, activePosition)
      if (!draftOperation) return
      if (draftOperation.tool === 'segment' || draftOperation.tool === 'polygon') {
        setDraftOperation({
          ...draftOperation,
          previewPosition: activePosition,
          snapTarget: activeSnapTarget,
        })
      }

      if (!interactionRef.current.creatingPointId && ray) {
        if ((draftOperation.tool === 'pyramid' || draftOperation.tool === 'prism' || draftOperation.tool === 'rightPyramid') && draftOperation.basePolygonId) {
            const isSkew = draftOperation.tool === 'pyramid' ? !!draftOperation.apexPointId : 
                           draftOperation.tool === 'prism' ? !!draftOperation.topPointId : false;
            if (!isSkew) {
              const basePolygon = manualDerived.displayPolygons.find((p) => p.sourceId === draftOperation.basePolygonId)
              if (basePolygon && basePolygon.points.length >= 3) {
                const normal = getPolygonNormal(basePolygon.points)
                
                let anchorPos = polygonCenter(basePolygon.points)
                if (draftOperation.tool === 'rightPyramid' && draftOperation.apexAnchorPointId && manualDerived.pointPositions[draftOperation.apexAnchorPointId]) {
                  anchorPos = manualDerived.pointPositions[draftOperation.apexAnchorPointId]
                }

                let h = closestHeightFromRay(ray.origin, ray.direction, anchorPos, normal)
                h = snapCoordinate(h)
                if (h < 0.1) h = 0.1
                if (!draftOperation.heightManuallySet && draftOperation.height !== undefined && draftOperation.height !== h) {
                   setDraftOperation({ ...draftOperation, height: h })
                }
              }
            }
        }
        if ((draftOperation.tool === 'cone' || draftOperation.tool === 'cylinder') && draftOperation.baseCircleId) {
             const baseCircle = manualDerived.displayCircles.find((c) => c.sourceId === draftOperation.baseCircleId)
             if (baseCircle) {
               const normal = baseCircle.normal
               const center = baseCircle.center
               let h = closestHeightFromRay(ray.origin, ray.direction, center, normal)
               h = snapCoordinate(h)
               if (h < 0.1) h = 0.1
               if (!draftOperation.heightManuallySet && draftOperation.height !== h) {
                  setDraftOperation({ ...draftOperation, height: h })
               }
             }
        }
      }
    }

    const handlePointerUp = (event: PointerEvent) => {
      if (viewHelperRef.current && stateRefs.current.showGizmo) {
        const ptrDown = interactionRef.current.pointerDown
        const dx = event.clientX - (ptrDown ? ptrDown.x : event.clientX)
        const dy = event.clientY - (ptrDown ? ptrDown.y : event.clientY)
        if (Math.hypot(dx, dy) <= 3) {
           viewHelperRef.current.handleClick(event)
        }
      }

      const pointerDown = interactionRef.current.pointerDown
      const creatingPointId = interactionRef.current.creatingPointId

      interactionRef.current.creatingPointId = null
      interactionRef.current.createPointStartY = null
      interactionRef.current.createPointBasePosition = null
      interactionRef.current.pointerDown = null
      controls.enabled = true
      scheduleHoverPresentation(null)
      hoveredEntityIdRef.current = null
      updateEntityHighlight(null)
      if (smartGuideMeshRef.current) {
        smartGuideMeshRef.current.visible = false
      }

      if (creatingPointId) {
        saveManualState()
        if (activeTool === 'segment') {
          const currentIds = draftOperation?.tool === 'segment' ? draftOperation.pointIds ?? [] : []
          if (currentIds.length === 0) {
            setDraftOperation({ tool: 'segment', pointIds: [creatingPointId] })
          } else {
            if (currentIds[0] !== creatingPointId) {
              createSegment(currentIds[0], creatingPointId)
            }
            autoRevertToSelect ? setActiveTool('select') : setDraftOperation({ tool: 'segment', pointIds: [] })
          }
        } else if (activeTool === 'polygon') {
          const currentIds = draftOperation?.tool === 'polygon' ? [...(draftOperation.pointIds ?? [])] : []
          if (currentIds.length >= 3 && currentIds[0] === creatingPointId) {
            createPolygon(currentIds)
            autoRevertToSelect ? setActiveTool('select') : setDraftOperation({ tool: 'polygon', pointIds: [] })
          } else {
            if (currentIds[currentIds.length - 1] !== creatingPointId) {
              currentIds.push(creatingPointId)
            }
            setDraftOperation({ tool: 'polygon', pointIds: currentIds })
          }
        } else if (activeTool === 'box') {
          const currentIds = draftOperation?.tool === 'box' ? [...(draftOperation.pointIds ?? [])] : []
          if (currentIds.length < 3) currentIds.push(creatingPointId)
          if (currentIds.length === 3) {
            const height = draftOperation?.tool === 'box' ? draftOperation.height ?? 4 : 4
            createBox([currentIds[0], currentIds[1], currentIds[2]], height)
            autoRevertToSelect ? setActiveTool('select') : setDraftOperation({ tool: 'box', pointIds: [], height })
          } else {
            setDraftOperation({
              tool: 'box',
              pointIds: currentIds.slice(0, 3),
              height: draftOperation?.tool === 'box' ? draftOperation.height ?? 4 : 4,
            })
          }
        } else if (activeTool === 'cube') {
          const currentIds = draftOperation?.tool === 'cube' ? [...(draftOperation.pointIds ?? [])] : []
          if (currentIds.length < 2) currentIds.push(creatingPointId)
          if (currentIds.length === 2) {
            createCube(currentIds[0], currentIds[1])
            autoRevertToSelect ? setActiveTool('select') : setDraftOperation({ tool: 'cube', pointIds: [] })
          } else {
            setDraftOperation({
              tool: 'cube',
              pointIds: currentIds.slice(0, 2)
            })
          }
        } else if (['sphere', 'cone', 'cylinder'].includes(activeTool)) {
          setDraftOperation({
            ...draftOperation,
            tool: activeTool,
            centerPointId: creatingPointId,
          })
        } else if (activeTool === 'pyramid') {
          if (draftOperation?.tool === 'pyramid' && draftOperation.basePolygonId) {
            const id = createPyramid(draftOperation.basePolygonId, 0, creatingPointId)
            if (id) {
              autoRevertToSelect ? setActiveTool('select') : setDraftOperation(null)
            }
          }
        } else if (activeTool === 'prism') {
          if (draftOperation?.tool === 'prism' && draftOperation.basePolygonId) {
            const id = createPrism(draftOperation.basePolygonId, 0, creatingPointId)
            if (id) {
              autoRevertToSelect ? setActiveTool('select') : setDraftOperation(null)
            }
          }
        } else if (activeTool === 'point') {
          if (autoRevertToSelect) setActiveTool('select')
        }
        return
      }
      if (!pointerDown) return
      if (pointerDown.didDrag) return

      const dx = event.clientX - pointerDown.x
      const dy = event.clientY - pointerDown.y
      if (Math.hypot(dx, dy) > dragThreshold) return

      handleCanvasClick(event)
    }

    const handlePointerDown = (event: PointerEvent) => {
      scheduleHoverPresentation(null)

      const planePoint = getPlaneIntersection(event)
      const snappedPlanePoint = planePoint ? snapPosition(planePoint) : null
      const snapTarget = getSnapTarget(event, snappedPlanePoint)

      const drawingTools = ['select', 'point', 'segment', 'polygon', 'box', 'sphere', 'cone', 'cylinder', 'pyramid', 'prism', 'regularPyramid', 'rightPyramid']

      if (drawingTools.includes(activeTool) && snapTarget?.kind === 'point' && snapTarget.pointId) {
        const pos = snapTarget.position
        interactionRef.current.creatingPointId = snapTarget.pointId
        interactionRef.current.createPointStartY = event.clientY
        interactionRef.current.createPointBasePosition = [pos[0], pos[1], pos[2]]
        interactionRef.current.wasCtrlPressed = false
        controls.enabled = false
        setManualSelection({ kind: 'point', id: snapTarget.pointId })
        return
      }

      const hitEntity = findIntersectionEntity(event)
      const isCircleClick = (activeTool === 'cone' || activeTool === 'cylinder') && hitEntity?.kind === 'circle'
      const isPolygonClick = (activeTool === 'pyramid' || activeTool === 'prism' || activeTool === 'regularPyramid' || activeTool === 'rightPyramid') && hitEntity?.kind === 'polygon'

      const isSkewMode = (activeTool === 'pyramid') ||
                         (activeTool === 'prism' && draftOperation?.topPointId);
      
      const isCreatingSkewApex = (activeTool === 'pyramid' || activeTool === 'prism') && 
                                 draftOperation?.basePolygonId && isSkewMode;

      const shouldCreateAndDragPoint =
        activeTool !== 'select' &&
        (['point', 'segment', 'polygon', 'box', 'cube', 'sphere'].includes(activeTool) || isCreatingSkewApex) &&
        (!snapTarget || snapTarget.kind !== 'point') &&
        !isCircleClick &&
        !isPolygonClick

      if (shouldCreateAndDragPoint) {
        const fallback = snappedPlanePoint ?? [0, 0, 0]
        const createdPointId = createPointFromTarget(snapTarget, fallback)
        if (createdPointId) {
          const initialPosition = snapTarget?.position ?? fallback
          interactionRef.current.creatingPointId = createdPointId
          interactionRef.current.createPointStartY = event.clientY
          interactionRef.current.createPointBasePosition = [initialPosition[0], initialPosition[1], initialPosition[2]]
          interactionRef.current.wasCtrlPressed = false
          controls.enabled = false
          setManualSelection({ kind: 'point', id: createdPointId })
          return
        }
      }

      interactionRef.current.pointerDown = {
        x: event.clientX,
        y: event.clientY,
        didDrag: false,
        hit: findIntersectionEntity(event),
      }
    }

    const handlePointerLeave = () => {
      scheduleHoverPresentation(null)
      hoveredEntityIdRef.current = null
      updateEntityHighlight(null)
      if (smartGuideMeshRef.current) {
        smartGuideMeshRef.current.visible = false
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        event.preventDefault()
        if (lastCycleEventRef.current) {
          if (cycleIntersectsRef.current.length === 0) {
            cycleIntersectsRef.current = findAllIntersectionEntities({
              clientX: lastCycleEventRef.current.x,
              clientY: lastCycleEventRef.current.y,
            })
            cycleIndexRef.current = 0
          } else {
            cycleIndexRef.current += 1
          }

          if (cycleIntersectsRef.current.length > 0) {
            const cycled = cycleIntersectsRef.current[cycleIndexRef.current % cycleIntersectsRef.current.length]
            hoveredEntityIdRef.current = cycled.id
            updateEntityHighlight(cycled.id)
          }
        }
        return
      }

      if (event.key === 'Delete' && manualSelection) {
        event.preventDefault()
        removeManualEntity(manualSelection.kind, manualSelection.id)
        setManualSelection(null)
        return
      }

      if (event.key === 'Escape') {
        cancelManualDraft()
        setActiveTool('select')
        return
      }

      if (event.key !== 'Enter') return
      if (draftOperation?.tool === 'polygon' && (draftOperation.pointIds?.length ?? 0) >= 3) {
        createPolygon(draftOperation.pointIds ?? [])
        autoRevertToSelect ? setActiveTool('select') : setDraftOperation({ tool: 'polygon', pointIds: [] })
      }
      if (draftOperation?.tool === 'box' && (draftOperation.pointIds?.length ?? 0) === 3 && draftOperation.height && draftOperation.height > 0) {
        createBox([draftOperation.pointIds![0], draftOperation.pointIds![1], draftOperation.pointIds![2]], draftOperation.height)
        autoRevertToSelect ? setActiveTool('select') : setDraftOperation({ tool: 'box', pointIds: [], height: draftOperation.height })
      }
      if ((draftOperation?.tool === 'pyramid' || draftOperation?.tool === 'prism') && draftOperation.basePolygonId && draftOperation.height && draftOperation.height > 0) {
        let id = null
        if (draftOperation.tool === 'pyramid') id = createPyramid(draftOperation.basePolygonId, draftOperation.height)
        if (draftOperation.tool === 'prism') id = createPrism(draftOperation.basePolygonId, draftOperation.height)
        if (id) autoRevertToSelect ? setActiveTool('select') : setDraftOperation(null)
      }
      if (draftOperation?.tool === 'regularPyramid' && draftOperation.basePolygonId) {
        const id = createRegularPyramid(draftOperation.basePolygonId)
        if (id) autoRevertToSelect ? setActiveTool('select') : setDraftOperation(null)
      }
      if (draftOperation?.tool === 'sphere' && draftOperation.centerPointId && draftOperation.radius && draftOperation.radius > 0) {
        const id = createSphere(draftOperation.centerPointId, draftOperation.radius)
        if (id) autoRevertToSelect ? setActiveTool('select') : setDraftOperation(null)
      }
      if ((draftOperation?.tool === 'cone' || draftOperation?.tool === 'cylinder') && draftOperation.baseCircleId && draftOperation.height && draftOperation.height > 0) {
        const circle = manualDerived.displayCircles.find(c => c.sourceId === draftOperation.baseCircleId)
        if (circle) {
          let id = null
          if (draftOperation.tool === 'cone') id = createCone('', circle.radius, draftOperation.height, draftOperation.baseCircleId)
          if (draftOperation.tool === 'cylinder') id = createCylinder('', circle.radius, draftOperation.height, draftOperation.baseCircleId)
          if (id) autoRevertToSelect ? setActiveTool('select') : setDraftOperation(null)
        }
      }
    }

    const handleDoubleClick = (event: MouseEvent) => {
      const camera = cameraRef.current
      const controls = controlsRef.current
      if (!camera || !controls || !dynamicGroupRef.current) return
      
      const rect = renderer.domElement.getBoundingClientRect()
      if (!rect) return
      
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      
      raycasterRef.current.setFromCamera(new THREE.Vector2(x, y), camera)
      const intersects = raycasterRef.current.intersectObjects(dynamicGroupRef.current.children, true)
      
      const targetPoint = new THREE.Vector3()
      if (intersects.length > 0) {
        targetPoint.copy(intersects[0].point)
      } else {
        const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
        raycasterRef.current.ray.intersectPlane(plane, targetPoint)
      }
      
      if (targetPoint) {
        const offset = new THREE.Vector3().subVectors(targetPoint, controls.target)
        camera.position.add(offset)
        controls.target.copy(targetPoint)
        controls.update()
      }
    }

    renderer.domElement.addEventListener('pointerdown', handlePointerDown)
    renderer.domElement.addEventListener('dblclick', handleDoubleClick)
    renderer.domElement.addEventListener('pointermove', handlePointerMove)
    renderer.domElement.addEventListener('pointerleave', handlePointerLeave)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown)
      renderer.domElement.removeEventListener('dblclick', handleDoubleClick)
      renderer.domElement.removeEventListener('pointermove', handlePointerMove)
      renderer.domElement.removeEventListener('pointerleave', handlePointerLeave)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [
    activeTool,
    cancelManualDraft,
    canRedo,
    canUndo,
    createBox,
    createCube,
    createPointFromTarget,
    createPolygon,
    createPrism,
    createPyramid,
    createRegularPyramid,
    createSegment,
    draftOperation,
    manualDerived,
    manualDocument,
    redoManual,
    setActiveTool,
    setDraftOperation,
    setManualSelection,
    undoManual,
    updatePointPosition,
    createMidpoint,
    createIntersection,
    createProjection,
    createCircle,
    createRegularPolygon,
    createSpecialTriangle,
    createSpecialQuadrilateral,
    removeManualEntity,
    manualSelection,
    colors,
    saveManualState,
  ])

  useEffect(() => {
    if (!resetTrigger || !cameraRef.current || !controlsRef.current) return
    cameraRef.current.position.set(25, -20, 15)
    controlsRef.current.target.set(0, 0, 0)
    controlsRef.current.update()
  }, [resetTrigger])

  const handleResetCamera = () => {
    const camera = cameraRef.current
    const controls = controlsRef.current
    if (!camera || !controls) return
    camera.position.set(18, -18, 14)
    controls.target.set(0, 0, 0)
    controls.update()
  }

  return (
    <div className="w-full h-full relative bg-background overflow-hidden">
      <div ref={mountRef} className="absolute inset-0" />

      <CanvasToolbar
        showAxes={showAxes}
        onToggleAxes={() => setShowAxes(!showAxes)}
        showGrid={showGrid}
        onToggleGrid={() => setShowGrid(!showGrid)}
        showLabels={showLabels}
        onToggleLabels={() => setShowLabels(!showLabels)}
        showGizmo={showGizmo}
        onToggleGizmo={() => setShowGizmo(!showGizmo)}
        onResetCamera={handleResetCamera}
      />

      <div className="absolute bottom-6 left-6 z-50 rounded-xl border border-border bg-card/95 backdrop-blur-md px-3 py-2 shadow-lg">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="font-semibold text-foreground">{'C\u00f4ng c\u1ee5:'}</span>
          <span>
            {activeTool === 'select'
              ? 'Ch\u1ecdn'
              : activeTool === 'point'
                ? '\u0110i\u1ec3m'
                : activeTool === 'segment'
                  ? '\u0110o\u1ea1n'
                  : activeTool === 'polygon'
                    ? '\u0110a gi\u00e1c'
                    : activeTool === 'box'
                      ? 'Hình hộp'
                    : activeTool === 'cube'
                      ? 'Lập phương'
                    : activeTool === 'pyramid'
                      ? 'Hình chóp'
                    : activeTool === 'regularPyramid'
                      ? 'Chóp đều'
                    : activeTool === 'rightPyramid'
                      ? 'Chóp vuông'
                    : activeTool === 'prism'
                      ? 'Lăng trụ'
                    : activeTool === 'sphere'
                      ? 'Hình cầu'
                    : activeTool === 'cone'
                      ? 'Hình nón'
                    : activeTool === 'cylinder'
                      ? 'Hình trụ'
                      : 'Chọn'}
          </span>
        </div>
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
        <div className="rounded-xl border border-border bg-card/95 backdrop-blur-md px-3 py-1.5 shadow-lg flex items-center justify-center min-w-[200px]">
          <span ref={hoverStatusRef} className="text-[12px] font-medium text-foreground font-mono tracking-tight">
            Trống
          </span>
        </div>
      </div>
      {/* Navigation Gizmo (Three.js ViewHelper - rendered inside WebGL canvas, initialized in useEffect below) with circular background offset */}
    </div>
  )
}
