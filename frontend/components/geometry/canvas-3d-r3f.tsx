'use client'

import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import { useTheme } from 'next-themes'
import { useGeometry } from './geometry-context'
import { ZoomIn, ZoomOut, Layers, Crosshair, Eye, RefreshCcw, Scissors, Expand } from 'lucide-react'

function getGeoColors(isDarkTheme: boolean) {
  if (isDarkTheme) {
    return {
      BG: 0x111827,
      AXIS_X: 0xf87171,
      AXIS_Y: 0x4ade80,
      AXIS_Z: 0x60a5fa,
      POINT: 0x93c5fd,
      FACE: 0x818cf8,
      EDGE_SOLID: 0xe5e7eb,
      EDGE_DASHED: 0x9ca3af,
      HIGHLIGHT: 0xfbbf24,
      GRID: 0x374151,
      PLANE: 0x1f2937,
      LABEL: '#e5e7eb',
      LABEL_SHADOW: '#111827',
    }
  }

  return {
    BG: 0xffffff,
    AXIS_X: 0xd32f2f,
    AXIS_Y: 0x388e3c,
    AXIS_Z: 0x1976d2,
    POINT: 0x6671d1,
    FACE: 0x6671d1,
    EDGE_SOLID: 0x1a1a2e,
    EDGE_DASHED: 0x999999,
    HIGHLIGHT: 0xff9f43,
    GRID: 0xd0d0d0,
    PLANE: 0xcccccc,
    LABEL: '#1a1a2e',
    LABEL_SHADOW: '#ffffff',
  }
}

function parseEdgeKey(edgeKey: string): [string, string] | null {
  if (edgeKey.includes('-')) {
    const [a, b] = edgeKey.split('-')
    if (a && b) return [a, b]
  }
  if (edgeKey.length >= 2) return [edgeKey[0]!, edgeKey[1]!]
  return null
}

interface TickData {
  val: number
  mesh: THREE.Line | THREE.Mesh
  label: CSS2DObject
  axis?: string
}

export function Canvas3D() {
  const mountRef = useRef<HTMLDivElement>(null)
  const { resolvedTheme } = useTheme()
  const isDarkTheme = resolvedTheme === 'dark'
  const GEO_COLORS = getGeoColors(isDarkTheme)
  const [showLabels, setShowLabels] = useState(true)
  const [showAxes, setShowAxes] = useState(true)
  const [showBasePlane, setShowBasePlane] = useState(true)
  const {
    geometryData, highlightedEdges,
    bitmaskVisibility, setBitmaskVisibility,
    explodeAmount, setExplodeAmount,
  } = useGeometry()

  // Refs for persistent Three.js objects to ensure cleanup
  const sceneRef = useRef<THREE.Scene | null>(null)
  const renderersRef = useRef<{ webgl: THREE.WebGLRenderer, css2d: CSS2DRenderer } | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const dynamicGroupRef = useRef<THREE.Group>(new THREE.Group())

  const stateRefs = useRef({ showAxes, showBasePlane })
  useEffect(() => {
    stateRefs.current = { showAxes, showBasePlane }
  }, [showAxes, showBasePlane])

  // Detect if cross-section splitting is available
  const hasSectionData = !!(geometryData?.sections?.length || geometryData?.clippingPlane)

  // Initialization (Run once)
  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    // CRITICAL: Clear any existing content to prevent duplication in Dev mode (React StrictMode)
    container.innerHTML = ''

    // Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(GEO_COLORS.BG)
    sceneRef.current = scene

    // Add persistent dynamic group
    dynamicGroupRef.current = new THREE.Group()
    dynamicGroupRef.current.name = 'dynamic-geometry'
    scene.add(dynamicGroupRef.current)

    // Camera (Z-up)
    const camera = new THREE.PerspectiveCamera(40, container.clientWidth / container.clientHeight, 0.1, 400)
    camera.up.set(0, 0, 1)
    camera.position.set(25, -20, 15)
    cameraRef.current = camera

    // WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.localClippingEnabled = true
    container.appendChild(renderer.domElement)

    // CSS2D Renderer
    const labelRenderer = new CSS2DRenderer()
    labelRenderer.setSize(container.clientWidth, container.clientHeight)
    labelRenderer.domElement.style.position = 'absolute'
    labelRenderer.domElement.style.top = '0'
    labelRenderer.domElement.style.pointerEvents = 'none'
    labelRenderer.domElement.className = 'label-renderer-surface'
    container.appendChild(labelRenderer.domElement)

    renderersRef.current = { webgl: renderer, css2d: labelRenderer }

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.minDistance = 2.0
    controls.maxDistance = 150.0
    controls.target.set(0, 0, 0)
    controlsRef.current = controls

    // Ambient Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 1.2))
    const sun = new THREE.DirectionalLight(0xffffff, 0.5)
    sun.position.set(10, 10, 20)
    scene.add(sun)

    // Environment Setup
    const envGroup = new THREE.Group()
    envGroup.name = 'static-environment'
    scene.add(envGroup)

    // 1. Faded Ground Plane (Soft Circular Edge GeoGebra Style)
    const pCanvas = document.createElement('canvas')
    pCanvas.width = 512
    pCanvas.height = 512
    const pCtx = pCanvas.getContext('2d')!
    const grad = pCtx.createRadialGradient(256, 256, 0, 256, 256, 256)
    grad.addColorStop(0, 'rgba(255,255,255,0.7)')
    grad.addColorStop(0.4, 'rgba(255,255,255,0.5)')
    grad.addColorStop(1, 'rgba(255,255,255,0)')
    pCtx.fillStyle = grad
    pCtx.fillRect(0, 0, 512, 512)
    const alphaMap = new THREE.CanvasTexture(pCanvas)

    const planeGeo = new THREE.PlaneGeometry(240, 240)
    const planeMat = new THREE.MeshBasicMaterial({
      color: GEO_COLORS.PLANE, alphaMap, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false
    })
    const basePlane = new THREE.Mesh(planeGeo, planeMat)
    envGroup.add(basePlane)

    // 2. Axes and Ticks
    const axesGroup = new THREE.Group()
    axesGroup.renderOrder = 99
    const ticksList: TickData[] = []
    const AXIS_LEN = 150

    const createAxis = (colorHex: number, dir: THREE.Vector3, labelStr: string) => {
      const opacity = 0.5
      const lineProps = { color: colorHex, linewidth: 2, transparent: true, opacity, depthTest: false }

      if (labelStr === 'z') {
        // Positive Z
        const pPts = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, AXIS_LEN)]
        const pMat = new THREE.LineBasicMaterial(lineProps)
        axesGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pPts), pMat))

        // Negative Z (Dashed)
        const nPts = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -AXIS_LEN)]
        const nMat = new THREE.LineDashedMaterial({ ...lineProps, dashSize: 0.4, gapSize: 0.2 })
        const nLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(nPts), nMat)
        nLine.computeLineDistances()
        axesGroup.add(nLine)
      } else {
        const mat = new THREE.LineBasicMaterial(lineProps)
        const pts = [dir.clone().multiplyScalar(-AXIS_LEN), dir.clone().multiplyScalar(AXIS_LEN)]
        const geo = new THREE.BufferGeometry().setFromPoints(pts)
        axesGroup.add(new THREE.Line(geo, mat))
      }

      // Arrowhead placed practically far
      const coneGeo = new THREE.ConeGeometry(0.15, 0.6, 8)
      const coneMat = new THREE.MeshBasicMaterial({ color: colorHex, depthTest: false })
      const cone = new THREE.Mesh(coneGeo, coneMat)
      const conePos = dir.clone().multiplyScalar(AXIS_LEN)
      cone.position.copy(conePos)

      const up = new THREE.Vector3(0, 1, 0)
      let axis = new THREE.Vector3().crossVectors(up, conePos).normalize()
      let radians = Math.acos(up.dot(conePos.clone().normalize()))
      if (axis.lengthSq() > 0.001) cone.quaternion.setFromAxisAngle(axis, radians)
      else if (conePos.y < 0) cone.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI)
      axesGroup.add(cone)

      // Axis main label (x, y, z)
      const axisLabelEl = document.createElement('div')
      axisLabelEl.className = 'text-[15px] italic font-bold'
      axisLabelEl.style.color = '#' + colorHex.toString(16).padStart(6, '0')
      axisLabelEl.textContent = labelStr

      const axisLabel = new CSS2DObject(axisLabelEl)
      if (labelStr === 'x') { axisLabel.center.set(-0.5, 0.5) }
      if (labelStr === 'y') { axisLabel.center.set(0.5, -0.5) }
      if (labelStr === 'z') { axisLabel.center.set(0.5, -0.5) }
      axesGroup.add(axisLabel)

      // Generate ticks
      const tickLength = 0.15
      const ticGeoPts = []
      if (labelStr === 'x') {
        ticGeoPts.push(new THREE.Vector3(0, -tickLength, 0), new THREE.Vector3(0, tickLength, 0))
      } else if (labelStr === 'y') {
        ticGeoPts.push(new THREE.Vector3(-tickLength, 0, 0), new THREE.Vector3(tickLength, 0, 0))
      } else {
        ticGeoPts.push(new THREE.Vector3(-tickLength, 0, 0), new THREE.Vector3(tickLength, 0, 0))
      }
      const tGeo = new THREE.BufferGeometry().setFromPoints(ticGeoPts)
      const tMat = new THREE.LineBasicMaterial({ color: colorHex, transparent: true, opacity: 0.5, depthTest: false })

      for (let i = -AXIS_LEN; i <= AXIS_LEN; i++) {
        if (i === 0) continue

        const ticPos = dir.clone().multiplyScalar(i)

        const ticMesh = new THREE.Line(tGeo, tMat)
        ticMesh.position.copy(ticPos)
        axesGroup.add(ticMesh)

        const tel = document.createElement('div')
        tel.className = 'text-[10px] font-sans font-semibold leading-none opacity-80'
        tel.style.color = '#' + colorHex.toString(16).padStart(6, '0')
        tel.textContent = Math.abs(i).toString() // GeoGebra typically only displays negative signs if necessary, but actually we should keep signs.
        tel.textContent = i.toString()

        const tLbl = new CSS2DObject(tel)

        // Accurately center the label relative to the 3D intersect in screen-space
        if (labelStr === 'x') {
          tLbl.center.set(0.5, 1.5) // Down
        } else if (labelStr === 'y') {
          tLbl.center.set(-0.5, 1.5) // Right and Down
        } else if (labelStr === 'z') {
          tLbl.center.set(1.5, 0.5) // Left
        }

        tLbl.position.copy(ticPos)
        axesGroup.add(tLbl)

        ticksList.push({ val: i, mesh: ticMesh, label: tLbl, axis: labelStr })
      }
    }
    createAxis(GEO_COLORS.AXIS_X, new THREE.Vector3(1, 0, 0), 'x')
    createAxis(GEO_COLORS.AXIS_Y, new THREE.Vector3(0, 1, 0), 'y')
    createAxis(GEO_COLORS.AXIS_Z, new THREE.Vector3(0, 0, 1), 'z')
    envGroup.add(axesGroup)

    const axisLabels = {
      'x': axesGroup.children.find(c => c instanceof CSS2DObject && c.element.textContent === 'x') as CSS2DObject,
      'y': axesGroup.children.find(c => c instanceof CSS2DObject && c.element.textContent === 'y') as CSS2DObject,
      'z': axesGroup.children.find(c => c instanceof CSS2DObject && c.element.textContent === 'z') as CSS2DObject,
    }

    // Dynamic Context for Grid
    let lastGridStep = -1
    let lastGridCenterX = -1
    let lastGridCenterY = -1
    let lastGridShow = true
    let dynamicGrid: THREE.LineSegments | null = null

    // Animation Loop
    let frameId: number
    const animate = () => {
      frameId = requestAnimationFrame(animate)
      controls.update()

      const dist = camera.position.distanceTo(controls.target)
      // Make grid "follow zoom": cell size increases when zooming out,
      // and decreases when zooming in. We approximate projected world size
      // from camera distance + FOV, then snap to nice step sizes.
      const fovRad = THREE.MathUtils.degToRad(camera.fov)
      const worldSpan = 2 * dist * Math.tan(fovRad / 2) // approximate visible span at target distance
      const targetCells = 18
      const stepEstimate = worldSpan / targetCells
      const stepOptions = [1, 2, 5, 10, 20, 50]
      const step = stepOptions.find(s => s >= stepEstimate) ?? stepOptions[stepOptions.length - 1]

      const center = controls.target
      const centerX = center.x
      const centerY = center.y
      const centerZ = center.z

      // Grid extent is not limited by a fixed "number of cells".
      // It extends from world origin to (camera target + 10), then mirrored.
      const edgePosX = AXIS_LEN
      const edgePosY = AXIS_LEN
      const edgePosZ = AXIS_LEN
      const edgePos = AXIS_LEN

      // Keep axis labels anchored to the world axes (origin-based),
      // otherwise they appear to "jump" when controls.target changes.
      if (axisLabels['x']) axisLabels['x'].position.set(edgePosX, 0, 0)
      if (axisLabels['y']) axisLabels['y'].position.set(0, edgePosY, 0)
      if (axisLabels['z']) axisLabels['z'].position.set(0, 0, edgePosZ)

      const labelShowRange = step * 15 // Increased by 14 total (7 each side) to show more labels per axis
      ticksList.forEach(t => {
        const axisExtent = t.axis === 'x' ? edgePosX : t.axis === 'y' ? edgePosY : edgePosZ
        const centerVal = t.axis === 'x' ? centerX : t.axis === 'y' ? centerY : centerZ

        // Only show ticks/labels that are:
        // 1. Within axis length
        // 2. Match current step increment
        // 3. Within a "window" around the camera target to improve performance (FPS)
        const isVis = Math.abs(t.val) <= axisExtent &&
          t.val % step === 0 &&
          Math.abs(t.val - centerVal) < labelShowRange

        if (t.mesh.visible !== isVis) {
          t.mesh.visible = isVis
          t.label.visible = isVis
        }
        if (isVis) {
          t.mesh.scale.setScalar(dist * 0.05)
        }
      })

      // Update Dynamic Grid if bounds or step change
      const showGrid = stateRefs.current.showBasePlane
      const gridRadius = 40 // Total size 80x80
      const snapX = Math.round(centerX / step) * step
      const snapY = Math.round(centerY / step) * step

      const hasMoved = Math.abs(lastGridCenterX - snapX) > 0.001 || Math.abs(lastGridCenterY - snapY) > 0.001

      if (lastGridStep !== step || hasMoved || lastGridShow !== showGrid) {
        lastGridStep = step
        lastGridCenterX = snapX
        lastGridCenterY = snapY
        lastGridShow = showGrid

        if (dynamicGrid) {
          envGroup.remove(dynamicGrid)
          dynamicGrid.geometry.dispose()
            ; (dynamicGrid.material as THREE.Material).dispose()
          dynamicGrid = null
        }
        if (showGrid) {
          const gPts: THREE.Vector3[] = []
          const gridZ = -0.001

          // Vertical lines (X constant)
          for (let x = snapX - gridRadius; x <= snapX + gridRadius; x += step) {
            if (x === 0 || Math.abs(x) > AXIS_LEN) continue
            gPts.push(new THREE.Vector3(x, snapY - gridRadius, gridZ), new THREE.Vector3(x, snapY + gridRadius, gridZ))
          }
          // Horizontal lines (Y constant)
          for (let y = snapY - gridRadius; y <= snapY + gridRadius; y += step) {
            if (y === 0 || Math.abs(y) > AXIS_LEN) continue
            gPts.push(new THREE.Vector3(snapX - gridRadius, y, gridZ), new THREE.Vector3(snapX + gridRadius, y, gridZ))
          }

          const gMat = new THREE.LineBasicMaterial({ color: GEO_COLORS.GRID, transparent: true, opacity: 0.8, depthWrite: false })
          dynamicGrid = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(gPts), gMat)
          envGroup.add(dynamicGrid)
        }
      }

      basePlane.visible = stateRefs.current.showBasePlane
      // Move base plane with camera focus
      basePlane.position.set(centerX, centerY, 0)
      basePlane.scale.set(gridRadius / 120, gridRadius / 120, 1)
      axesGroup.visible = stateRefs.current.showAxes

      renderer.render(scene, camera)
      labelRenderer.render(scene, camera)
    }
    animate()

    // Resize via ResizeObserver (Handles sidebar toggles smoothly!)
    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        if (entry.target === mountRef.current) {
          const w = entry.contentRect.width
          const h = entry.contentRect.height
          if (w === 0 || h === 0) continue
          camera.aspect = w / h
          camera.updateProjectionMatrix()
          renderer.setSize(w, h)
          labelRenderer.setSize(w, h)
        }
      }
    })
    if (container) {
      resizeObserver.observe(container)
    }

    return () => {
      resizeObserver.disconnect()
      cancelAnimationFrame(frameId)
      if (container) {
        if (renderer.domElement.parentNode) container.removeChild(renderer.domElement)
        if (labelRenderer.domElement.parentNode) container.removeChild(labelRenderer.domElement)
      }
      renderer.dispose()
      labelRenderer.setSize(0, 0) // Force some internal cleanup
    }
  }, [isDarkTheme])

  // Dynamic Geometry (Pyramid, Queries) — with Cross-Section Splitting
  useEffect(() => {
    const scene = sceneRef.current
    const group = dynamicGroupRef.current
    if (!scene || !group) return

    // Explicit cleanup of the persistent group
    const clearGroup = (g: THREE.Group) => {
      while (g.children.length > 0) {
        const obj = g.children[0]
        g.remove(obj)
        if (obj instanceof THREE.Group) clearGroup(obj)
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Line || obj instanceof THREE.LineSegments) {
          obj.geometry?.dispose()
          if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose())
          else obj.material?.dispose()
        }
      }
    }

    clearGroup(group)

    if (!geometryData) return

    const nodes: Record<string, THREE.Vector3> = {}
    Object.entries(geometryData.points).forEach(([name, coords]: [string, any]) => {
      const x = coords.x !== undefined ? coords.x : coords[0];
      const y = coords.y !== undefined ? coords.y : coords[1];
      const z = coords.z !== undefined ? coords.z : coords[2];
      nodes[name] = new THREE.Vector3(x, y, z)
    })

    // === MULTI-PLANE SPLITTING (CSG BITMASK) ===
    const cuttingPlanes: THREE.Plane[] = []
    const planesNormals: THREE.Vector3[] = []

    // Parse all sections from backend
    if (geometryData.sections && geometryData.sections.length > 0) {
      geometryData.sections.forEach(sec => {
        if (sec.cuttingPlane && sec.cuttingPlane.length >= 3) {
          const p0 = nodes[sec.cuttingPlane[0]]
          const p1 = nodes[sec.cuttingPlane[1]]
          const p2 = nodes[sec.cuttingPlane[2]]
          if (p0 && p1 && p2) {
            const v1 = new THREE.Vector3().subVectors(p1, p0)
            const v2 = new THREE.Vector3().subVectors(p2, p0)
            const normal = new THREE.Vector3().crossVectors(v1, v2).normalize()
            cuttingPlanes.push(new THREE.Plane().setFromNormalAndCoplanarPoint(normal, p0))
            planesNormals.push(normal)
          }
        }
      })
    }
    // Fallback to legacy clippingPlane if no sections
    else if (geometryData.clippingPlane) {
      const cpData = geometryData.clippingPlane
      const normal = new THREE.Vector3(cpData.a, cpData.b, cpData.c).normalize()
      const constant = cpData.d / new THREE.Vector3(cpData.a, cpData.b, cpData.c).length()
      cuttingPlanes.push(new THREE.Plane(normal, constant))
      planesNormals.push(normal)
    }

    const N = cuttingPlanes.length
    const numGroups = 1 << N // 2^N

    const bitmaskGroups: Record<string, THREE.Group> = {}

    // Initialize 2^N groups
    for (let i = 0; i < numGroups; i++) {
      const bitStr = i.toString(2).padStart(N || 1, '0')
      const bg = new THREE.Group()
      bg.name = `solid-${bitStr}`

      // Visibility from Context
      bg.visible = bitmaskVisibility[bitStr] !== false // Default true

      // Exploded View Offset
      const offsetVec = new THREE.Vector3()
      if (explodeAmount > 0 && N > 0) {
        const maxDist = 8
        const dist = (explodeAmount / 100) * maxDist
        for (let b = 0; b < N; b++) {
          const isPositive = bitStr[b] === '1'
          const normal = planesNormals[b]
          offsetVec.add(normal.clone().multiplyScalar(isPositive ? dist : -dist))
        }
      }
      bg.position.copy(offsetVec)

      group.add(bg)
      bitmaskGroups[bitStr] = bg
    }

    // Generate clipping planes tailored for each bitmask subgroup
    const getClipPlanesForBitmask = (bitStr: string): THREE.Plane[] => {
      const clips: THREE.Plane[] = []

      // Calculate the offset so we can translate the clipping plane
      const groupOffset = new THREE.Vector3()
      if (explodeAmount > 0 && N > 0) {
        const maxDist = 8
        const dist = (explodeAmount / 100) * maxDist
        for (let b = 0; b < N; b++) {
          const isPositive = bitStr[b] === '1'
          const normal = planesNormals[b]
          groupOffset.add(normal.clone().multiplyScalar(isPositive ? dist : -dist))
        }
      }

      for (let b = 0; b < N; b++) {
        const isPositive = bitStr[b] === '1'
        const originalPlane = cuttingPlanes[b]
        // If bit is 1 (Positive), it keeps the positive side
        const p = isPositive ? originalPlane.clone() : originalPlane.clone().negate()
        p.translate(groupOffset)
        clips.push(p)
      }
      return clips
    }

    // Reusable point geometry
    const dotGeo = new THREE.SphereGeometry(0.06, 16, 16)
    const dotMat = new THREE.MeshBasicMaterial({ color: GEO_COLORS.POINT, depthTest: true })

    // Draw Points
    Object.entries(nodes).forEach(([name, vec]) => {
      // Determine strictly which regions contain this point. 
      const belongingBits: string[] = []

      if (N === 0) {
        belongingBits.push('0')
      } else {
        // Find which bitmask regions the point is compatible with
        for (let i = 0; i < numGroups; i++) {
          let compatible = true
          const bitStr = i.toString(2).padStart(N || 1, '0')
          for (let b = 0; b < N; b++) {
            const isPositive = bitStr[b] === '1'
            const dist = cuttingPlanes[b].distanceToPoint(vec)
            // If distance is near 0, it belongs to both positive and negative
            if (Math.abs(dist) > 0.001) {
              if ((isPositive && dist < 0) || (!isPositive && dist > 0)) {
                compatible = false
                break
              }
            }
          }
          if (compatible) belongingBits.push(bitStr)
        }
      }

      belongingBits.forEach(bitStr => {
        const targetGroup = bitmaskGroups[bitStr]
        const dot = new THREE.Mesh(dotGeo, dotMat)
        dot.position.copy(vec)
        targetGroup.add(dot)

        if (showLabels) {
          const el = document.createElement('div')
          el.className = 'text-sm font-bold italic font-serif pointer-events-none select-none drop-shadow-md'
          el.style.color = GEO_COLORS.LABEL
          el.style.textShadow = `1px 1px 0 ${GEO_COLORS.LABEL_SHADOW}, -1px -1px 0 ${GEO_COLORS.LABEL_SHADOW}`
          el.textContent = name
          const lbl = new CSS2DObject(el)
          lbl.position.copy(vec).add(new THREE.Vector3(0.2, 0.2, 0.2))
          targetGroup.add(lbl)
        }
      })
    })

    // Draw Planes (faces)
    geometryData.planes?.forEach(p => {
      if (!p.points) return
      const pNodes = p.points.map(name => nodes[name]).filter(Boolean)
      if (pNodes.length < 3) return

      const color = p.color || '#6671d1'

      // Slice Polygon triangulation (fan from first vertex)
      const sliceGeom = new THREE.BufferGeometry()
      const slicePos: number[] = []
      for (let i = 1; i < pNodes.length - 1; i++) {
        slicePos.push(pNodes[0].x, pNodes[0].y, pNodes[0].z)
        slicePos.push(pNodes[i].x, pNodes[i].y, pNodes[i].z)
        slicePos.push(pNodes[i + 1].x, pNodes[i + 1].y, pNodes[i + 1].z)
      }
      sliceGeom.setAttribute('position', new THREE.Float32BufferAttribute(slicePos, 3))
      sliceGeom.computeVertexNormals()

      // Add face to ALL bitmask groups! Hardware clipping trims them.
      Object.keys(bitmaskGroups).forEach(bitStr => {
        const bgClipPlanes = getClipPlanesForBitmask(bitStr)
        const planeMaterial = new THREE.MeshBasicMaterial({
          color: color,
          transparent: true,
          opacity: p.opacity || 0.15,
          side: THREE.DoubleSide,
          polygonOffset: true,
          polygonOffsetFactor: 1,
          polygonOffsetUnits: 1,
          clippingPlanes: bgClipPlanes,
        })
        const faceMesh = new THREE.Mesh(sliceGeom.clone(), planeMaterial)
        bitmaskGroups[bitStr].add(faceMesh)

        // Depth Blocker
        const blockerMat = new THREE.MeshBasicMaterial({
          colorWrite: false,
          depthWrite: true,
          side: THREE.DoubleSide,
          polygonOffset: true,
          polygonOffsetFactor: 1,
          polygonOffsetUnits: 1,
          clippingPlanes: bgClipPlanes,
        })
        bitmaskGroups[bitStr].add(new THREE.Mesh(sliceGeom.clone(), blockerMat))
      })
    })

    // === CROSS-SECTION CAPPING & OUTLINES ===
    // For each section, draw the cap in all groups so it seals the solid
    if (geometryData.sections) {
      geometryData.sections.forEach((sec) => {
        const capNodesCoords: THREE.Vector3[] = []

        if (sec.polygon && sec.polygon.length >= 3) {
          sec.polygon.forEach(ptName => {
            if (nodes[ptName]) {
              capNodesCoords.push(nodes[ptName])
            } else if (sec.generatedPoints && sec.generatedPoints[ptName]) {
              const gp = sec.generatedPoints[ptName]
              capNodesCoords.push(new THREE.Vector3(gp.x, gp.y, gp.z))
            }
          })

          if (capNodesCoords.length >= 3) {
            // Triangulate cap
            const capGeom = new THREE.BufferGeometry()
            const capPos: number[] = []
            for (let i = 1; i < capNodesCoords.length - 1; i++) {
              capPos.push(
                capNodesCoords[0].x, capNodesCoords[0].y, capNodesCoords[0].z,
                capNodesCoords[i].x, capNodesCoords[i].y, capNodesCoords[i].z,
                capNodesCoords[i + 1].x, capNodesCoords[i + 1].y, capNodesCoords[i + 1].z
              )
            }
            capGeom.setAttribute('position', new THREE.Float32BufferAttribute(capPos, 3))
            capGeom.computeVertexNormals()

            // Outline Cap
            const outlinePos: number[] = []
            for (let i = 0; i < capNodesCoords.length; i++) {
              const curr = capNodesCoords[i]
              const next = capNodesCoords[(i + 1) % capNodesCoords.length]
              outlinePos.push(curr.x, curr.y, curr.z, next.x, next.y, next.z)
            }
            const outlineGeom = new THREE.BufferGeometry()
            outlineGeom.setAttribute('position', new THREE.Float32BufferAttribute(outlinePos, 3))
            const outlineMat = new THREE.LineBasicMaterial({
              color: 0xff4444, linewidth: 2, depthTest: false
            })

            // Distribute to all groups, using their clippers
            Object.keys(bitmaskGroups).forEach(bitStr => {
              const bgClipPlanes = getClipPlanesForBitmask(bitStr)

              // Cap Face
              const capMat = new THREE.MeshBasicMaterial({
                color: '#ff6b6b',
                transparent: true,
                opacity: 0.3,
                side: THREE.DoubleSide,
                polygonOffset: true,
                polygonOffsetFactor: -1, // Pull it slightly forward to avoid z-fighting with edges
                polygonOffsetUnits: -1,
                clippingPlanes: bgClipPlanes,
              })
              bitmaskGroups[bitStr].add(new THREE.Mesh(capGeom.clone(), capMat))

              // Block depth
              const blockerMat = new THREE.MeshBasicMaterial({
                colorWrite: false, depthWrite: true, side: THREE.DoubleSide,
                polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
                clippingPlanes: bgClipPlanes,
              })
              bitmaskGroups[bitStr].add(new THREE.Mesh(capGeom.clone(), blockerMat))

              // Outline
              const lineMesh = new THREE.LineSegments(outlineGeom.clone(), outlineMat.clone())
              // Don't clip outlines strictly so they draw everywhere
              bitmaskGroups[bitStr].add(lineMesh)
            })
          }
        }
      })
    }

    // Edges
    const edgesData = geometryData.edges || []

    // We parse and build one big BufferGeometry for all edges and another for highlighted edges
    const solidPos: number[] = []
    const highlightPos: number[] = []

    edgesData.forEach((edgeKey) => {
      const parsed = parseEdgeKey(edgeKey)
      if (!parsed) return
      const [a, b] = parsed
      if (!nodes[a] || !nodes[b]) return

      const posArr = [nodes[a].x, nodes[a].y, nodes[a].z, nodes[b].x, nodes[b].y, nodes[b].z]

      if (highlightedEdges.includes(edgeKey)) highlightPos.push(...posArr)
      else solidPos.push(...posArr)
    })

    const hGeom = new THREE.BufferGeometry()
    if (highlightPos.length > 0) hGeom.setAttribute('position', new THREE.Float32BufferAttribute(highlightPos, 3))
    const sGeom = new THREE.BufferGeometry()
    if (solidPos.length > 0) sGeom.setAttribute('position', new THREE.Float32BufferAttribute(solidPos, 3))

    Object.keys(bitmaskGroups).forEach(bitStr => {
      const bgClipPlanes = getClipPlanesForBitmask(bitStr)
      const tg = bitmaskGroups[bitStr]

      if (highlightPos.length > 0) {
        const hMat = new THREE.LineBasicMaterial({
          color: GEO_COLORS.HIGHLIGHT, linewidth: 3, depthTest: false,
          clippingPlanes: bgClipPlanes
        })
        tg.add(new THREE.LineSegments(hGeom.clone(), hMat))
      }

      if (solidPos.length > 0) {
        const matSolid = new THREE.LineBasicMaterial({
          color: GEO_COLORS.EDGE_SOLID, depthFunc: THREE.LessEqualDepth,
          clippingPlanes: bgClipPlanes,
        })
        tg.add(new THREE.LineSegments(sGeom.clone(), matSolid))

        const matDashed = new THREE.LineDashedMaterial({
          color: GEO_COLORS.EDGE_DASHED, dashSize: 0.15, gapSize: 0.1, depthFunc: THREE.GreaterDepth,
          clippingPlanes: bgClipPlanes,
        })
        const meshDashed = new THREE.LineSegments(sGeom.clone(), matDashed)
        meshDashed.computeLineDistances()
        tg.add(meshDashed)
      }
    })

    // Draw Circles
    geometryData.circles?.forEach(c => {
      if (!nodes[c.center]) return
      const circleGeo = new THREE.RingGeometry(c.radius - 0.02, c.radius + 0.02, 64)
      const circleMat = new THREE.MeshBasicMaterial({ color: c.color || '#000', side: THREE.DoubleSide, depthTest: false })

      const normVec = c.normal ? new THREE.Vector3(...c.normal).normalize() : null
      const quat = normVec ? new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normVec) : new THREE.Quaternion()

      Object.keys(bitmaskGroups).forEach(bitStr => {
        const bgClipPlanes = getClipPlanesForBitmask(bitStr)
        const mat = circleMat.clone()
        mat.clippingPlanes = bgClipPlanes

        const circle = new THREE.Mesh(circleGeo, mat)
        circle.position.copy(nodes[c.center])
        circle.quaternion.copy(quat)
        bitmaskGroups[bitStr].add(circle)
      })
    })

    // Draw Spheres
    geometryData.spheres?.forEach(s => {
      if (!nodes[s.center]) return
      const sGeo = new THREE.SphereGeometry(s.radius, 32, 32)
      const sMat = new THREE.MeshBasicMaterial({
        color: s.color || '#aaa',
        transparent: true,
        opacity: 0.1,
        wireframe: true
      })

      Object.keys(bitmaskGroups).forEach(bitStr => {
        const bgClipPlanes = getClipPlanesForBitmask(bitStr)
        const mat = sMat.clone()
        mat.clippingPlanes = bgClipPlanes

        const sphere = new THREE.Mesh(sGeo, mat)
        sphere.position.copy(nodes[s.center])
        bitmaskGroups[bitStr].add(sphere)
      })
    })

    return () => clearGroup(group)
  }, [geometryData, showLabels, highlightedEdges, isDarkTheme, bitmaskVisibility, explodeAmount])

  const handleZoom = (dir: number) => {
    if (cameraRef.current && controlsRef.current) {
      const cam = cameraRef.current
      cam.position.sub(controlsRef.current.target).multiplyScalar(dir > 0 ? 0.8 : 1.2).add(controlsRef.current.target)
      controlsRef.current.update()
    }
  }

  const handleResetCamera = () => {
    if (cameraRef.current && controlsRef.current) {
      const controls = controlsRef.current
      const camera = cameraRef.current

      // Return to Bird's-eye default
      camera.position.set(16, -16, 16)
      controls.target.set(0, 0, 2.5)
      controls.update()
    }
  }

  return (
    <div className="w-full h-full relative bg-background overflow-hidden">
      {/* 3D Scene Mount Point */}
      <div className="absolute inset-0 z-0" ref={mountRef} />

      {/* Top Center Action Toolbar */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-2 z-50">
        <div className="flex bg-card/95 backdrop-blur-md border border-border rounded-2xl shadow-2xl p-1.5 items-center gap-1">
          <button
            onClick={() => setShowAxes(!showAxes)}
            className={`p-2.5 rounded-xl hover:bg-muted transition-all flex items-center gap-2 ${showAxes ? 'text-primary bg-primary/10 font-semibold' : 'text-muted-foreground'}`}
            title="Ẩn/Hiện trục tọa độ"
          >
            <Crosshair size={18} />
            <span className="text-xs">Trục toạ độ</span>
          </button>
          <div className="w-[1px] h-4 bg-border mx-1" />
          <button
            onClick={() => setShowBasePlane(!showBasePlane)}
            className={`p-2.5 rounded-xl hover:bg-muted transition-all flex items-center gap-2 ${showBasePlane ? 'text-primary bg-primary/10 font-semibold' : 'text-muted-foreground'}`}
            title="Ẩn/Hiện lưới mặt đáy"
          >
            <Layers size={18} />
            <span className="text-xs">Lưới đáy</span>
          </button>
          <div className="w-[1px] h-4 bg-border mx-1" />
          <button
            onClick={() => setShowLabels(!showLabels)}
            className={`p-2.5 rounded-xl hover:bg-muted transition-all flex items-center gap-2 ${showLabels ? 'text-primary bg-primary/10 font-semibold' : 'text-muted-foreground'}`}
            title="Ẩn/Hiện nhãn điểm"
          >
            <Eye size={18} />
            <span className="text-xs">Nhãn</span>
          </button>
          {hasSectionData && (
            <>
              <div className="w-[1px] h-4 bg-border mx-1" />
              <div className="flex gap-1 items-center bg-background/50 rounded-lg p-0.5 border border-border/50">
                {Array.from({ length: 1 << (geometryData?.sections?.length || (geometryData?.clippingPlane ? 1 : 0)) }).map((_, i) => {
                  const N = geometryData?.sections?.length || (geometryData?.clippingPlane ? 1 : 0)
                  const bitStr = i.toString(2).padStart(N || 1, '0')
                  const isVisible = bitmaskVisibility[bitStr] !== false
                  return (
                    <button
                      key={bitStr}
                      onClick={() => setBitmaskVisibility({ ...bitmaskVisibility, [bitStr]: !isVisible })}
                      className={`px-2 py-1.5 rounded-md transition-all flex items-center gap-1 ${!isVisible ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' : 'hover:bg-muted text-muted-foreground'}`}
                      title={isVisible ? `Ẩn phần ${bitStr}` : `Hiện phần ${bitStr}`}
                    >
                      <Scissors size={14} className={!isVisible ? 'scale-x-[-1]' : ''} />
                      <span className="text-[10px] font-mono font-bold leading-none">{bitStr}</span>
                    </button>
                  )
                })}
              </div>
              <div className="w-[1px] h-4 bg-border mx-1" />
              <div className="flex items-center gap-2 px-2" title="Tách khối">
                <Expand size={16} className="text-muted-foreground" />
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={explodeAmount}
                  onChange={(e) => setExplodeAmount(Number(e.target.value))}
                  className="w-20 h-1.5 accent-primary cursor-pointer"
                />
              </div>
            </>
          )}
          <div className="w-[1px] h-6 bg-border mx-2" />
          <button
            onClick={handleResetCamera}
            className="p-2.5 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all flex items-center gap-2"
            title="Đặt lại Camera"
          >
            <RefreshCcw size={18} />
            <span className="text-xs font-medium">Đặt lại</span>
          </button>
        </div>
      </div>

      {/* Zoom Controls */}
      <div className="absolute bottom-6 right-6 flex flex-col gap-3 z-50">
        <div className="flex flex-col bg-card/95 backdrop-blur-md border border-border rounded-xl shadow-lg overflow-hidden">
          <button onClick={() => handleZoom(1)} className="p-3 hover:bg-primary hover:text-primary-foreground border-b border-border text-muted-foreground transition-colors"><ZoomIn size={20} /></button>
          <button onClick={() => handleZoom(-1)} className="p-3 hover:bg-primary hover:text-primary-foreground text-muted-foreground transition-colors"><ZoomOut size={20} /></button>
        </div>
      </div>
    </div>
  )
}

function getBasePlaneExtent(points: Record<string, [number, number, number]>) {
  const vals = Object.values(points)
  if (!vals.length) return { minOx: -5, maxOx: 5, minOy: -5, maxOy: 5 }
  const x = vals.map(v => v[0]), y = vals.map(v => v[1])
  const minX = Math.min(...x), maxX = Math.max(...x)
  const minY = Math.min(...y), maxY = Math.max(...y)
  const m = Math.max(maxX - minX, maxY - minY, 5) * 0.5
  return { minOx: minX - m, maxOx: maxX + m, minOy: minY - m, maxOy: maxY + m }
}

function drawGroundPlane(ctx: CanvasRenderingContext2D, project: any, ext: any) {
  const pts = [
    project(ext.minOx, ext.minOy, 0), project(ext.maxOx, ext.minOy, 0),
    project(ext.maxOx, ext.maxOy, 0), project(ext.minOx, ext.maxOy, 0)
  ]
  ctx.fillStyle = 'rgba(230, 230, 230, 0.2)'
  ctx.beginPath(); ctx.moveTo(pts[0].screenX, pts[0].screenY)
  pts.slice(1).forEach(p => ctx.lineTo(p.screenX, p.screenY))
  ctx.closePath(); ctx.fill()

  ctx.strokeStyle = 'rgba(0,0,0,0.05)'
  ctx.stroke()
}
