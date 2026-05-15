'use client'

import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import { useTheme } from 'next-themes'
import { Crosshair, Eye, Layers, RefreshCcw, ZoomIn, ZoomOut } from 'lucide-react'
import { useGeometry } from './geometry-context'
import { ManualDisplayPolygon, ManualDisplaySegment, ManualSnapTarget, Vec3 } from './manual-editor'

type InteractiveHit = {
  kind: 'point' | 'segment' | 'polygon' | 'solid'
  id: string
}

function getColors(isDark: boolean) {
  if (isDark) {
    return {
      background: 0x101826,
      grid: 0x334155,
      point: 0x93c5fd,
      pointSelected: 0xf97316,
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
    pointSelected: 0xf97316,
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

function lineClosestPoint(point: Vec3, start: Vec3, end: Vec3) {
  const dx = end[0] - start[0]
  const dy = end[1] - start[1]
  const lengthSquared = dx * dx + dy * dy
  if (lengthSquared === 0) return { t: 0, position: start }
  const t = Math.min(
    1,
    Math.max(0, ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / lengthSquared),
  )
  return {
    t,
    position: [
      start[0] + dx * t,
      start[1] + (end[1] - start[1]) * t,
      start[2] + (end[2] - start[2]) * t,
    ] as Vec3,
  }
}

function polygonCenter(points: Vec3[]) {
  if (!points.length) return [0, 0, 0] as Vec3
  const total = points.reduce<Vec3>(
    (acc, point) => [acc[0] + point[0], acc[1] + point[1], acc[2] + point[2]],
    [0, 0, 0],
  )
  return [total[0] / points.length, total[1] / points.length, total[2] / points.length] as Vec3
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

export function ManualCanvas3D() {
  const mountRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const labelRendererRef = useRef<CSS2DRenderer | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const dynamicGroupRef = useRef<THREE.Group>(new THREE.Group())
  const pointMeshesRef = useRef<Array<{ id: string; mesh: THREE.Mesh }>>([])
  const interactionRef = useRef<{
    draggingPointId: string | null
    dragOffset: Vec3 | null
  }>({ draggingPointId: null, dragOffset: null })

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
    hoveredSnapTarget,
    setHoveredSnapTarget,
    snapEnabled,
    snapThreshold,
    createPointFromTarget,
    updatePointPosition,
    createSegment,
    createPolygon,
    createBox,
    createPyramid,
    createPrism,
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
  } = useGeometry()

  const raycasterRef = useRef(new THREE.Raycaster())
  raycasterRef.current.params.Line = { threshold: 0.18 }

  const projectToScreen = (world: Vec3) => {
    const camera = cameraRef.current
    const container = mountRef.current
    if (!camera || !container) return null
    const vector = new THREE.Vector3(world[0], world[1], world[2]).project(camera)
    const rect = container.getBoundingClientRect()
    return {
      x: ((vector.x + 1) / 2) * rect.width,
      y: ((-vector.y + 1) / 2) * rect.height,
    }
  }

  const getPlaneIntersection = (event: PointerEvent | MouseEvent) => {
    const camera = cameraRef.current
    const container = mountRef.current
    if (!camera || !container) return null
    const rect = container.getBoundingClientRect()
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    )
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
    raycasterRef.current.setFromCamera(mouse, camera)
    const target = new THREE.Vector3()
    if (!raycasterRef.current.ray.intersectPlane(plane, target)) return null
    return [target.x, target.y, 0] as Vec3
  }

  const getSnapTarget = (event: PointerEvent | MouseEvent, planePoint: Vec3 | null) => {
    if (!planePoint) return null

    const pointCandidates = manualDocument.points
      .filter((point) => point.visible)
      .map((point) => {
        const position = manualDerived.pointPositions[point.id]
        return position ? { pointId: point.id, label: point.label, position } : null
      })
      .filter(Boolean) as Array<{ pointId: string; label: string; position: Vec3 }>

    const segmentCandidates = manualDocument.segments
      .filter((segment) => segment.visible)
      .map((segment) => {
        const displaySegment = manualDerived.displaySegments.find(
          (candidate) => candidate.id === segment.id,
        )
        return displaySegment
          ? { segmentId: segment.id, label: segment.label, start: displaySegment.start, end: displaySegment.end }
          : null
      })
      .filter(Boolean) as Array<{ segmentId: string; label: string; start: Vec3; end: Vec3 }>

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
        return {
          distance: evaluateTarget(midpoint),
          target: {
            kind: 'midpoint' as const,
            label: `Trung điểm ${candidate.label}`,
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

    const bestSegment = segmentCandidates
      .map((candidate) => {
        const projection = lineClosestPoint(planePoint, candidate.start, candidate.end)
        return {
          distance: evaluateTarget(projection.position),
          target: {
            kind: 'segment' as const,
            label: `Điểm thuộc ${candidate.label}`,
            segmentId: candidate.segmentId,
            position: projection.position,
            t: projection.t,
          },
        }
      })
      .sort((left, right) => left.distance - right.distance)[0]

    if (snapEnabled && bestSegment && bestSegment.distance <= snapThreshold) {
      return bestSegment.target
    }

    return {
      kind: 'workplane' as const,
      label: 'Mặt phẳng đáy z = 0',
      position: planePoint,
    }
  }

  const findIntersectionEntity = (event: PointerEvent | MouseEvent): InteractiveHit | null => {
    const camera = cameraRef.current
    const container = mountRef.current
    const scene = sceneRef.current
    if (!camera || !container || !scene) return null
    const rect = container.getBoundingClientRect()
    const pointer = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    )
    raycasterRef.current.setFromCamera(pointer, camera)
    const intersections = raycasterRef.current.intersectObjects(dynamicGroupRef.current.children, true)
    for (const intersection of intersections) {
      const data = intersection.object.userData?.entity as InteractiveHit | undefined
      if (data) return data
    }
    return null
  }

  useEffect(() => {
    const container = mountRef.current
    if (!container) return
    container.innerHTML = ''

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(colors.background)
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
    container.appendChild(labelRenderer.domElement)
    labelRendererRef.current = labelRenderer

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.minDistance = 4
    controls.maxDistance = 120
    controls.target.set(0, 0, 0)
    controlsRef.current = controls

    scene.add(new THREE.AmbientLight(0xffffff, 1.15))
    const sun = new THREE.DirectionalLight(0xffffff, 0.7)
    sun.position.set(20, -10, 24)
    scene.add(sun)

    const environment = new THREE.Group()
    environment.name = 'manual-environment'
    scene.add(environment)

    const grid = new THREE.GridHelper(120, 60, colors.grid, colors.grid)
    grid.rotation.x = Math.PI / 2
    grid.position.z = -0.001
    grid.name = 'grid'
    environment.add(grid)

    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(160, 160),
      new THREE.MeshBasicMaterial({
        color: colors.background,
        transparent: true,
        opacity: resolvedTheme === 'dark' ? 0.03 : 0.02,
        side: THREE.DoubleSide,
      }),
    )
    plane.name = 'workplane'
    environment.add(plane)

    const axes = new THREE.AxesHelper(8)
    axes.name = 'axes'
    environment.add(axes)

    ;([
      { text: 'x', position: [8.5, 0, 0], color: colors.axes.x },
      { text: 'y', position: [0, 8.5, 0], color: colors.axes.y },
      { text: 'z', position: [0, 0, 8.5], color: colors.axes.z },
    ] as Array<{ text: string; position: Vec3; color: number }>).forEach((axis) => {
      const element = document.createElement('div')
      element.className = 'text-sm font-bold'
      element.textContent = axis.text
      element.style.color = `#${axis.color.toString(16).padStart(6, '0')}`
      const label = new CSS2DObject(element)
      label.position.set(axis.position[0], axis.position[1], axis.position[2])
      environment.add(label)
    })

    const dynamicGroup = new THREE.Group()
    dynamicGroup.name = 'manual-dynamic'
    scene.add(dynamicGroup)
    dynamicGroupRef.current = dynamicGroup

    let frameId = 0
    const animate = () => {
      frameId = requestAnimationFrame(animate)
      controls.update()
      axes.visible = showAxes
      grid.visible = showGrid
      plane.visible = showGrid
      renderer.render(scene, camera)
      labelRenderer.render(scene, camera)
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
      controls.dispose()
      renderer.dispose()
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement)
      if (labelRenderer.domElement.parentNode) labelRenderer.domElement.parentNode.removeChild(labelRenderer.domElement)
    }
  }, [colors, resolvedTheme, showAxes, showGrid])

  useEffect(() => {
    const group = dynamicGroupRef.current
    if (!group) return
    pointMeshesRef.current = []

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
      .forEach((polygon) => {
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
        })
        const mesh = new THREE.Mesh(faceGeometry, material)
        mesh.userData.entity = {
          kind: polygon.sourceKind === 'solid' ? 'solid' : 'polygon',
          id: polygon.sourceId,
        } satisfies InteractiveHit
        group.add(mesh)
      })

    manualDerived.displaySegments
      .filter((segment) => segment.visible)
      .forEach((segment) => {
        const geometry = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(...segment.start),
          new THREE.Vector3(...segment.end),
        ])
        const isSelected =
          manualSelection &&
          ((manualSelection.kind === 'segment' && manualSelection.id === segment.sourceId) ||
            (manualSelection.kind === 'polygon' && segment.sourceKind === 'polygon' && manualSelection.id === segment.sourceId) ||
            (manualSelection.kind === 'solid' && segment.sourceKind === 'solid' && manualSelection.id === segment.sourceId))
        const material = new THREE.LineBasicMaterial({
          color: isSelected ? colors.pointSelected : segment.sourceKind === 'solid' ? colors.solid : colors.segment,
        })
        const line = new THREE.Line(geometry, material)
        line.userData.entity = {
          kind: segment.sourceKind === 'solid' ? 'solid' : segment.sourceKind === 'polygon' ? 'polygon' : 'segment',
          id: segment.sourceId,
        } satisfies InteractiveHit
        group.add(line)
      })

    manualDerived.displayPoints
      .filter((point) => point.visible)
      .forEach((point) => {
        const isSelected =
          manualSelection?.kind === 'point' && manualSelection.id === point.sourceId && !point.generated
        const material = new THREE.MeshBasicMaterial({
          color: isSelected ? colors.pointSelected : point.generated ? colors.solid : colors.point,
        })
        const mesh = new THREE.Mesh(pointGeometry, material)
        mesh.position.set(point.position[0], point.position[1], point.position[2])
        if (!point.generated && point.selectable) {
          mesh.userData.entity = { kind: 'point', id: point.sourceId } satisfies InteractiveHit
        }
        group.add(mesh)
        if (!point.generated) {
          pointMeshesRef.current.push({ id: point.sourceId, mesh })
        }

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

    if (hoveredSnapTarget) {
      const snapGeometry = new THREE.SphereGeometry(0.15, 18, 18)
      const snapMaterial = new THREE.MeshBasicMaterial({ color: colors.snap })
      const snapMesh = new THREE.Mesh(snapGeometry, snapMaterial)
      snapMesh.position.set(
        hoveredSnapTarget.position[0],
        hoveredSnapTarget.position[1],
        hoveredSnapTarget.position[2],
      )
      group.add(snapMesh)
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

    if ((preview?.tool === 'pyramid' || preview?.tool === 'prism') && preview.basePolygonId && preview.height && preview.height > 0) {
      const basePolygon = manualDerived.displayPolygons.find(
        (polygon) => polygon.sourceKind === 'polygon' && polygon.sourceId === preview.basePolygonId,
      )
      if (basePolygon) {
        if (preview.tool === 'pyramid') {
          const top = polygonCenter(basePolygon.points)
          const apex: Vec3 = [top[0], top[1], preview.height]
          basePolygon.points.forEach((point, index) => {
            const next = basePolygon.points[(index + 1) % basePolygon.points.length]
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
          const topPoints = basePolygon.points.map<Vec3>((point) => [point[0], point[1], point[2] + preview.height!])
          basePolygon.points.forEach((point, index) => {
            const nextBase = basePolygon.points[(index + 1) % basePolygon.points.length]
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
    hoveredSnapTarget,
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

    const handlePointerMove = (event: PointerEvent) => {
      const planePoint = getPlaneIntersection(event)
      const snapTarget = getSnapTarget(event, planePoint)

      if (interactionRef.current.draggingPointId) {
        updatePointPosition(
          interactionRef.current.draggingPointId,
          snapTarget?.position ?? planePoint ?? [0, 0, 0],
          snapTarget,
        )
        setHoveredSnapTarget(snapTarget)
        return
      }

      setHoveredSnapTarget(snapTarget)
      if (!draftOperation) return
      if (draftOperation.tool === 'segment' || draftOperation.tool === 'polygon') {
        setDraftOperation({
          ...draftOperation,
          previewPosition: snapTarget?.position ?? planePoint ?? null,
          snapTarget,
        })
      }
    }

    const handlePointerUp = () => {
      interactionRef.current.draggingPointId = null
      controls.enabled = true
    }

    const handlePointerDown = (event: PointerEvent) => {
      const hit = findIntersectionEntity(event)
      const planePoint = getPlaneIntersection(event)
      const snapTarget = getSnapTarget(event, planePoint)
      const pointId =
        snapTarget?.kind === 'point'
          ? snapTarget.pointId ?? null
          : null

      if (activeTool === 'select') {
        if (hit) {
          setManualSelection(hit)
          if (hit.kind === 'point') {
            const point = manualDocument.points.find((candidate) => candidate.id === hit.id)
            if (point && !point.locked) {
              interactionRef.current.draggingPointId = point.id
              controls.enabled = false
            }
          }
        } else {
          setManualSelection(null)
        }
        return
      }

      if (activeTool === 'point' && planePoint) {
        const createdPointId = createPointFromTarget(snapTarget, planePoint)
        if (createdPointId) setManualSelection({ kind: 'point', id: createdPointId })
        return
      }

      if (activeTool === 'segment' && planePoint) {
        const materializedPointId = createPointFromTarget(snapTarget, planePoint)
        if (!materializedPointId) return
        const currentIds = draftOperation?.tool === 'segment' ? draftOperation.pointIds ?? [] : []
        if (currentIds.length === 0) {
          setDraftOperation({ tool: 'segment', pointIds: [materializedPointId] })
          return
        }
        if (currentIds[0] !== materializedPointId) {
          createSegment(currentIds[0], materializedPointId)
        }
        setDraftOperation({ tool: 'segment', pointIds: [] })
        return
      }

      if (activeTool === 'polygon' && planePoint) {
        const materializedPointId = createPointFromTarget(snapTarget, planePoint)
        if (!materializedPointId) return
        const currentIds = draftOperation?.tool === 'polygon' ? [...(draftOperation.pointIds ?? [])] : []
        if (currentIds.length >= 3 && currentIds[0] === materializedPointId) {
          createPolygon(currentIds)
          setDraftOperation({ tool: 'polygon', pointIds: [] })
          return
        }
        if (currentIds[currentIds.length - 1] !== materializedPointId) {
          currentIds.push(materializedPointId)
        }
        setDraftOperation({ tool: 'polygon', pointIds: currentIds })
        return
      }

      if (activeTool === 'box' && planePoint) {
        const materializedPointId = createPointFromTarget(snapTarget, planePoint)
        if (!materializedPointId) return
        const currentIds = draftOperation?.tool === 'box' ? [...(draftOperation.pointIds ?? [])] : []
        if (currentIds.length < 2) currentIds.push(materializedPointId)
        setDraftOperation({
          tool: 'box',
          pointIds: currentIds.slice(0, 2),
          height: draftOperation?.tool === 'box' ? draftOperation.height ?? 4 : 4,
        })
        return
      }

      if ((activeTool === 'pyramid' || activeTool === 'prism') && hit?.kind === 'polygon') {
        setManualSelection(hit)
        setDraftOperation({
          tool: activeTool,
          basePolygonId: hit.id,
          height:
            draftOperation?.tool === activeTool
              ? draftOperation.height ?? 4
              : 4,
        })
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) redoManual()
        else undoManual()
        return
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
        event.preventDefault()
        redoManual()
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
        setDraftOperation({ tool: 'polygon', pointIds: [] })
      }
      if (draftOperation?.tool === 'box' && (draftOperation.pointIds?.length ?? 0) === 2 && draftOperation.height && draftOperation.height > 0) {
        createBox([draftOperation.pointIds![0], draftOperation.pointIds![1]], draftOperation.height)
        setDraftOperation({ tool: 'box', pointIds: [], height: draftOperation.height })
      }
      if ((draftOperation?.tool === 'pyramid' || draftOperation?.tool === 'prism') && draftOperation.basePolygonId && draftOperation.height && draftOperation.height > 0) {
        if (draftOperation.tool === 'pyramid') createPyramid(draftOperation.basePolygonId, draftOperation.height)
        if (draftOperation.tool === 'prism') createPrism(draftOperation.basePolygonId, draftOperation.height)
      }
    }

    renderer.domElement.addEventListener('pointerdown', handlePointerDown)
    renderer.domElement.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown)
      renderer.domElement.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [
    activeTool,
    cancelManualDraft,
    canRedo,
    canUndo,
    createBox,
    createPointFromTarget,
    createPolygon,
    createPrism,
    createPyramid,
    createSegment,
    draftOperation,
    manualDerived,
    manualDocument,
    redoManual,
    setActiveTool,
    setDraftOperation,
    setHoveredSnapTarget,
    setManualSelection,
    snapEnabled,
    snapThreshold,
    undoManual,
    updatePointPosition,
  ])

  const handleZoom = (factor: number) => {
    const camera = cameraRef.current
    const controls = controlsRef.current
    if (!camera || !controls) return
    camera.position.sub(controls.target).multiplyScalar(factor).add(controls.target)
    controls.update()
  }

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

      <div className="absolute top-5 left-1/2 -translate-x-1/2 z-30">
        <div className="flex bg-card/95 backdrop-blur-md border border-border rounded-2xl shadow-xl p-1.5 items-center gap-1">
          <button
            onClick={() => setShowAxes(!showAxes)}
            className={`p-2.5 rounded-xl hover:bg-muted transition-all flex items-center gap-2 ${showAxes ? 'text-primary bg-primary/10 font-semibold' : 'text-muted-foreground'}`}
            title="Ẩn/Hiện trục tọa độ"
          >
            <Crosshair size={18} />
            <span className="text-xs">Trục tọa độ</span>
          </button>
          <div className="w-px h-4 bg-border mx-1" />
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`p-2.5 rounded-xl hover:bg-muted transition-all flex items-center gap-2 ${showGrid ? 'text-primary bg-primary/10 font-semibold' : 'text-muted-foreground'}`}
            title="Ẩn/Hiện lưới đáy"
          >
            <Layers size={18} />
            <span className="text-xs">Lưới đáy</span>
          </button>
          <div className="w-px h-4 bg-border mx-1" />
          <button
            onClick={() => setShowLabels(!showLabels)}
            className={`p-2.5 rounded-xl hover:bg-muted transition-all flex items-center gap-2 ${showLabels ? 'text-primary bg-primary/10 font-semibold' : 'text-muted-foreground'}`}
            title="Ẩn/Hiện nhãn điểm"
          >
            <Eye size={18} />
            <span className="text-xs">Nhãn</span>
          </button>
          <div className="w-px h-6 bg-border mx-2" />
          <button
            onClick={handleResetCamera}
            className="p-2.5 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all flex items-center gap-2"
            title="Đặt lại góc nhìn"
          >
            <RefreshCcw size={18} />
            <span className="text-xs font-medium">Đặt lại</span>
          </button>
        </div>
      </div>

      <div className="absolute bottom-6 left-6 z-30 rounded-xl border border-border bg-card/95 backdrop-blur-md px-3 py-2 shadow-lg">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="font-semibold text-foreground">Tool:</span>
          <span>
            {activeTool === 'select'
              ? 'Chọn'
              : activeTool === 'point'
                ? 'Điểm'
                : activeTool === 'segment'
                  ? 'Đoạn'
                  : activeTool === 'polygon'
                    ? 'Đa giác'
                    : activeTool === 'box'
                      ? 'Hình hộp'
                      : activeTool === 'pyramid'
                        ? 'Hình chóp'
                        : 'Lăng trụ'}
          </span>
          <span className="text-border">•</span>
          <span>{hoveredSnapTarget?.label ?? 'Không bám'}</span>
        </div>
      </div>

      <div className="absolute bottom-6 right-6 z-30 flex flex-col gap-3">
        <div className="flex flex-col bg-card/95 backdrop-blur-md border border-border rounded-xl shadow-lg overflow-hidden">
          <button onClick={() => handleZoom(0.82)} className="p-3 hover:bg-primary hover:text-primary-foreground border-b border-border text-muted-foreground transition-colors">
            <ZoomIn size={20} />
          </button>
          <button onClick={() => handleZoom(1.18)} className="p-3 hover:bg-primary hover:text-primary-foreground text-muted-foreground transition-colors">
            <ZoomOut size={20} />
          </button>
        </div>
      </div>
    </div>
  )
}

