
'use client'

import { useEffect, useMemo, useRef, useCallback, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import { ViewHelper } from 'three/examples/jsm/helpers/ViewHelper.js'
import { useTheme } from 'next-themes'
import { Crosshair, Eye, Layers, RefreshCcw, Sparkles, Compass } from 'lucide-react'
import { useGeometry } from './geometry-context'
import { ManualDisplayPolygon, ManualDisplaySegment, ManualSnapTarget, Vec3 } from './manual-editor'

type InteractiveHit = {
  kind: 'point' | 'segment' | 'polygon' | 'solid' | 'circle'
  id: string
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
  const smartGuideMeshRef = useRef<THREE.Line | null>(null)
  const pointMeshesRef = useRef<Array<{ id: string; mesh: THREE.Mesh }>>([])
  const segmentMeshesRef = useRef<Array<{ id: string; mesh: THREE.Line }>>([])
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
  } = useGeometry()

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
        return intersect.object.userData.entity as InteractiveHit
      }
    }
    return null
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
      .filter((segment) => segment.visible)
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
        const bestSegment = segmentSnaps.sort((left, right) => left.distance - right.distance)[0]
        if (bestSegment && bestSegment.distance <= snapThreshold) {
          return bestSegment.target
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

  const applyHoverPresentation = (target: ManualSnapTarget | null) => {
    const hud = hoverHudRef.current
    const status = hoverStatusRef.current
    if (!hud || !status) return
    if (!target) {
      hud.style.display = 'none'
      if (hoverMarkerRef.current) hoverMarkerRef.current.visible = false
      return
    }
    hud.style.display = 'block'
    status.textContent = `${target.label} ${formatHoverCoords(target.position)}`
    const screen = projectToScreen(target.position)
    hud.style.left = `${screen.x + 12}px`
    hud.style.top = `${screen.y + 12}px`
    if (hoverMarkerRef.current) {
      hoverMarkerRef.current.position.set(...target.position)
      hoverMarkerRef.current.visible = true
    }
  }

  const scheduleHoverPresentation = (target: ManualSnapTarget | null) => {
    pendingHoverTargetRef.current = target
    if (hoverRafRef.current !== null) return
    hoverRafRef.current = requestAnimationFrame(() => {
      hoverRafRef.current = null
      applyHoverPresentation(pendingHoverTargetRef.current)
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
        const negativeMat = new THREE.LineDashedMaterial({ ...lineProps, dashSize: 0.4, gapSize: 0.2 })
        const negativeLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(negativePts), negativeMat)
        negativeLine.computeLineDistances()
        axesGroup.add(negativeLine)
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

    while (group.children.length > 0) {
      const child = group.children[0]
      group.remove(child)
      if (child instanceof THREE.Mesh || child instanceof THREE.Line || child instanceof THREE.LineSegments) {
        child.geometry.dispose()
        if (Array.isArray(child.material)) child.material.forEach((material) => material.dispose())
        else child.material.dispose()
      }
    }

    const pointGeometry = new THREE.SphereGeometry(0.12, 18, 18)
    const lineMaterial = new THREE.LineBasicMaterial({ color: colors.segment })
    const previewMaterial = new THREE.LineDashedMaterial({
      color: colors.preview,
      dashSize: 0.22,
      gapSize: 0.12,
    })

    manualDerived.displayPolygons
      .filter((polygon) => polygon.visible)
      .forEach((polygon, pIdx) => {
        if (polygon.points.length < 3) return
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
          id: polygon.sourceId,
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
        group.add(blockerMesh)
      })

    manualDerived.displaySegments
      .filter((segment) => segment.visible)
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
        dashedMesh.computeLineDistances()
        group.add(dashedMesh)
      })

    manualDerived.displayPoints
      .filter((point) => point.visible)
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

    // Render derived circles
    if (manualDerived.displayCircles) {
      manualDerived.displayCircles
        .filter((c) => c.visible)
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
          const isSelected = manualSelection?.kind === 'circle' && manualSelection.id === circle.sourceId
          const material = new THREE.LineBasicMaterial({
            color: isSelected ? colors.pointSelected : colors.polygon,
            linewidth: isSelected ? 2.5 : 1.5,
          })
          const line = new THREE.Line(geometry, material)
          line.userData.entity = { kind: 'circle', id: circle.sourceId } as any
          group.add(line)
        })
    }

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

    if ((preview?.tool === 'pyramid' || preview?.tool === 'prism') && preview.basePolygonId) {
      const basePolygon = manualDerived.displayPolygons.find(
        (polygon) => polygon.sourceKind === 'polygon' && polygon.sourceId === preview.basePolygonId,
      )
      if (basePolygon && basePolygon.points.length >= 3) {
        const basePoints = basePolygon.points
        const center = polygonCenter(basePoints)

        if (preview.tool === 'pyramid') {
          const hasApex = !!(preview.apexPointId && manualDerived.pointPositions[preview.apexPointId])
          const normal = getPolygonNormal(basePoints)
          const apex: Vec3 = hasApex
            ? manualDerived.pointPositions[preview.apexPointId!]
            : addVec3(center, scaleVec3(normal, preview.height ?? 4))

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
  ])

  useEffect(() => {
    const renderer = rendererRef.current
    const controls = controlsRef.current
    if (!renderer || !controls) return

    const dragThreshold = 5

    const handleCanvasClick = (event: PointerEvent) => {
      const hit = findIntersectionEntity(event)
      const planePoint = getPlaneIntersection(event)
      const snappedPlanePoint = planePoint ? snapPosition(planePoint) : null
      const snapTarget = getSnapTarget(event, snappedPlanePoint)
      const fallbackPosition = snappedPlanePoint ?? snapTarget?.position ?? null

      if (activeTool === 'select') {
        setManualSelection(hit ?? null)
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

      // Click 2 for Pyramid / Prism / RegularPyramid
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

      // Click 1 for Pyramid / Prism / RegularPyramid
      if ((activeTool === 'pyramid' || activeTool === 'prism' || activeTool === 'regularPyramid') && hit?.kind === 'polygon') {
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
        })
        return
      }

      // Click 2 for Cone / Cylinder
      if ((activeTool === 'cone' || activeTool === 'cylinder') && draftOperation?.baseCircleId) {
        const heightToUse = draftOperation.height ?? 5;
        const radiusToUse = draftOperation.radius ?? 3;
        if (activeTool === 'cone') createCone('', radiusToUse, heightToUse, draftOperation.baseCircleId);
        if (activeTool === 'cylinder') createCylinder('', radiusToUse, heightToUse, draftOperation.baseCircleId);
        autoRevertToSelect ? setActiveTool('select') : setDraftOperation(null);
        return;
      }

      // Click 1 for Cone / Cylinder
      if ((activeTool === 'cone' || activeTool === 'cylinder') && hit?.kind === 'circle') {
        setManualSelection(hit)
        setDraftOperation({
          tool: activeTool,
          baseCircleId: hit.id,
          radius: draftOperation?.tool === activeTool ? draftOperation.radius ?? 3 : 3,
          height: draftOperation?.tool === activeTool ? draftOperation.height ?? 5 : 5,
        })
        return
      }

      // Sphere / Cone / Cylinder: click to select center point
      if ((activeTool === 'sphere' || ((activeTool === 'cone' || activeTool === 'cylinder') && !draftOperation?.baseCircleId)) && fallbackPosition) {
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
          const clickedPointId = hit?.kind === 'point' ? hit.id : (snapTarget?.kind === 'point' ? snapTarget.pointId : null)
          if (clickedPointId) {
            setDraftOperation({ tool: 'projection', pointIds: [clickedPointId] })
          }
          return
        }
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
        const clickedPointId = hit?.kind === 'point' ? hit.id : (snapTarget?.kind === 'point' ? snapTarget.pointId : null)
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
        const isSelected = manualSelection && 
          ((manualSelection.kind === 'segment' && manualSelection.id === id) ||
           (manualSelection.kind === 'polygon' && segment?.sourceKind === 'polygon' && manualSelection.id === id) ||
           (manualSelection.kind === 'solid' && segment?.sourceKind === 'solid' && manualSelection.id === id))
        const isHovered = id === hoveredId || segment?.sourceId === hoveredId
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
            mat.color.set(segment?.sourceKind === 'solid' ? colors.solid : colors.segment)
          }
        }
      })
    }

    const handlePointerMove = (event: PointerEvent) => {
      const planePoint = getPlaneIntersection(event)
      const snappedPlanePoint = planePoint ? snapPosition(planePoint) : null
      const snapTarget = getSnapTarget(event, snappedPlanePoint)
      const ray = getCameraRay(event)

      // Hover point highlight
      const hit = findIntersectionEntity(event)
      let hoveredId: string | null = (snapTarget?.kind === 'point' ? snapTarget.pointId : snapTarget?.kind === 'segment' ? snapTarget.segmentId : hit?.id) ?? null
      
      if (interactionRef.current.creatingPointId && interactionRef.current.pointerDown?.didDrag) {
        hoveredId = null
      }
      
      hoveredEntityIdRef.current = hoveredId
      updateEntityHighlight(hoveredId)

      let activePosition = snappedPlanePoint ?? snapTarget?.position ?? null
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

      scheduleHoverPresentation(activeSnapTarget)
      if (!draftOperation) return
      if (draftOperation.tool === 'segment' || draftOperation.tool === 'polygon') {
        setDraftOperation({
          ...draftOperation,
          previewPosition: activePosition,
          snapTarget: activeSnapTarget,
        })
      }

      if (draftOperation && !interactionRef.current.creatingPointId && ray) {
        if ((draftOperation.tool === 'pyramid' || draftOperation.tool === 'prism') && draftOperation.basePolygonId) {
           const isSkew = draftOperation.tool === 'pyramid' ? !!draftOperation.apexPointId : !!draftOperation.topPointId;
           if (!isSkew) {
             const basePolygon = manualDerived.displayPolygons.find((p) => p.sourceId === draftOperation.basePolygonId)
             if (basePolygon && basePolygon.points.length >= 3) {
               const normal = getPolygonNormal(basePolygon.points)
               const center = polygonCenter(basePolygon.points)
               let h = closestHeightFromRay(ray.origin, ray.direction, center, normal)
               h = snapCoordinate(h)
               if (h < 0.1) h = 0.1
               if (draftOperation.height !== undefined && draftOperation.height !== h) {
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
               if (draftOperation.height !== h) {
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

      const drawingTools = ['select', 'point', 'segment', 'polygon', 'box', 'sphere', 'cone', 'cylinder', 'pyramid', 'prism']

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
      const isPolygonClick = (activeTool === 'pyramid' || activeTool === 'prism' || activeTool === 'regularPyramid') && hitEntity?.kind === 'polygon'

      const isSkewMode = (activeTool === 'pyramid') ||
                         (activeTool === 'prism' && draftOperation?.topPointId);
      
      const isCreatingSkewApex = (activeTool === 'pyramid' || activeTool === 'prism') && 
                                 draftOperation?.basePolygonId && isSkewMode;

      const shouldCreateAndDragPoint =
        activeTool !== 'select' &&
        (['point', 'segment', 'polygon', 'box', 'cube', 'sphere', 'cone', 'cylinder'].includes(activeTool) || isCreatingSkewApex) &&
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
          if (draftOperation.tool === 'cone') id = createCone(draftOperation.baseCircleId, circle.radius, draftOperation.height, draftOperation.baseCircleId)
          if (draftOperation.tool === 'cylinder') id = createCylinder(draftOperation.baseCircleId, circle.radius, draftOperation.height, draftOperation.baseCircleId)
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
      <div
        ref={hoverHudRef}
        className="pointer-events-none absolute top-0 left-0 z-40 rounded-md border border-border bg-card/95 px-2 py-1 text-[11px] font-medium text-foreground shadow-lg backdrop-blur-md opacity-0 transition-opacity"
      />

      <div className="absolute top-5 left-1/2 -translate-x-1/2 z-50">
        <div className="flex bg-card/95 backdrop-blur-md border border-border rounded-2xl shadow-xl p-1.5 items-center gap-1">
          <button
            onClick={() => setShowAxes(!showAxes)}
            className={`p-2.5 rounded-xl hover:bg-muted transition-all flex items-center gap-2 ${showAxes ? 'text-primary bg-primary/10 font-semibold' : 'text-muted-foreground'}`}
            title={'\u1ea8n/Hi\u1ec7n tr\u1ee5c t\u1ecda \u0111\u1ed9'}
          >
            <Crosshair size={18} />
            <span className="text-xs">{'Tr\u1ee5c t\u1ecda \u0111\u1ed9'}</span>
          </button>
          <div className="w-px h-4 bg-border mx-1" />
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`p-2.5 rounded-xl hover:bg-muted transition-all flex items-center gap-2 ${showGrid ? 'text-primary bg-primary/10 font-semibold' : 'text-muted-foreground'}`}
            title={'\u1ea8n/Hi\u1ec7n l\u01b0\u1edbi \u0111\u00e1y'}
          >
            <Layers size={18} />
            <span className="text-xs">{'L\u01b0\u1edbi \u0111\u00e1y'}</span>
          </button>
          <div className="w-px h-4 bg-border mx-1" />
          <button
            onClick={() => setShowLabels(!showLabels)}
            className={`p-2.5 rounded-xl hover:bg-muted transition-all flex items-center gap-2 ${showLabels ? 'text-primary bg-primary/10 font-semibold' : 'text-muted-foreground'}`}
            title={'\u1ea8n/Hi\u1ec7n nh\u00e3n \u0111i\u1ec3m'}
          >
            <Eye size={18} />
            <span className="text-xs">{'Nh\u00e3n'}</span>
          </button>
          <button
            onClick={() => setShowGizmo(!showGizmo)}
            className={`p-2.5 rounded-xl hover:bg-muted transition-all flex items-center gap-2 ${showGizmo ? 'text-primary bg-primary/10 font-semibold' : 'text-muted-foreground'}`}
            title="Ẩn/Hiện khối điều hướng"
          >
            <Compass size={18} />
            <span className="text-xs">Điều hướng</span>
          </button>

          <div className="w-px h-6 bg-border mx-2" />
          <button
            onClick={handleResetCamera}
            className="p-2.5 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all flex items-center gap-2"
            title={'\u0110\u1eb7t l\u1ea1i g\u00f3c nh\u00ecn'}
          >
            <RefreshCcw size={18} />
            <span className="text-xs font-medium">{'\u0110\u1eb7t l\u1ea1i'}</span>
          </button>
        </div>
      </div>

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
          <span className="text-border">{'\u2022'}</span>
          <span ref={hoverStatusRef}>Không bám</span>
        </div>
      </div>
      {/* Navigation Gizmo (Three.js ViewHelper - rendered inside WebGL canvas, initialized in useEffect below) with circular background offset */}
    </div>
  )
}
