'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import { ViewHelper } from 'three/examples/jsm/helpers/ViewHelper.js'
import { useTheme } from 'next-themes'
import { useGeometry } from './geometry-context'
import { Layers, Crosshair, Eye, RefreshCcw, Scissors, Expand, Compass } from 'lucide-react'

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
      HIGHLIGHT: 0xfdba74,
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
    HIGHLIGHT: 0xfdba74,
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
  const [showGizmo, setShowGizmo] = useState(true)
  const { resolvedTheme } = useTheme()
  const isDarkTheme = resolvedTheme === 'dark'
  const GEO_COLORS = getGeoColors(isDarkTheme)
  const {
    geometryData, highlightedEdges,
    bitmaskVisibility, setBitmaskVisibility,
    explodeAmount, setExplodeAmount,
    orderedSectionIds, setOrderedSectionIds,
    showAxes, setShowAxes,
    showGrid, setShowGrid,
    showLabels, setShowLabels,
    resetTrigger
  } = useGeometry()

  const showBasePlane = showGrid
  const setShowBasePlane = setShowGrid

  // Reset orderedSectionIds khi có dữ liệu mới (tất cả bật mặc định)
  useEffect(() => {
    const ids = geometryData?.sections?.map(s => s.id) || []
    setOrderedSectionIds(ids)
    setBitmaskVisibility({}) // Reset bitmask khi bài mới
  }, [geometryData]) // eslint-disable-line react-hooks/exhaustive-deps

  // Refs for persistent Three.js objects to ensure cleanup
  const sceneRef = useRef<THREE.Scene | null>(null)
  const renderersRef = useRef<{ webgl: THREE.WebGLRenderer, css2d: CSS2DRenderer } | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const dynamicGroupRef = useRef<THREE.Group>(new THREE.Group())

  // Navigation Gizmo (Three.js ViewHelper)
  const viewHelperRef = useRef<ViewHelper | null>(null)
  const viewHelperTimerRef = useRef<THREE.Timer | null>(null)

  const stateRefs = useRef({ showAxes, showGrid, showGizmo })
  useEffect(() => {
    stateRefs.current = { showAxes, showGrid, showGizmo }
  }, [showAxes, showGrid, showGizmo])

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
      endPos.set(target.x, target.y - 0.001, target.z + dist)
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

      cam.up.set(0, 0, 1)

      controls.update()

      if (progress < 1) {
        requestAnimationFrame(animateTransition)
      }
    }

    requestAnimationFrame(animateTransition)
  }, [])

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
    controls.minDistance = 0.1
    controls.maxDistance = 150.0
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
      const opacity = 0.75
      const lineProps = { color: colorHex, linewidth: 2, transparent: true, opacity, depthTest: false }

      if (labelStr === 'z') {
        // Positive Z
        const pPts = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, AXIS_LEN)]
        const pMat = new THREE.LineBasicMaterial(lineProps)
        axesGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pPts), pMat))

        // Negative Z
        const nPts = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -AXIS_LEN)]
        const nMat = new THREE.LineBasicMaterial(lineProps)
        axesGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(nPts), nMat))
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
      const tMat = new THREE.LineBasicMaterial({ color: colorHex, transparent: true, opacity: 0.75, depthTest: false })

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
    let lastGridShowAxes = true
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
      const showGrid = stateRefs.current.showGrid
      const showAxesState = stateRefs.current.showAxes
      const gridRadius = 40 // Total size 80x80
      const snapX = Math.round(centerX / step) * step
      const snapY = Math.round(centerY / step) * step

      const hasMoved = Math.abs(lastGridCenterX - snapX) > 0.001 || Math.abs(lastGridCenterY - snapY) > 0.001

      if (lastGridStep !== step || hasMoved || lastGridShow !== showGrid || lastGridShowAxes !== showAxesState) {
        lastGridStep = step
        lastGridCenterX = snapX
        lastGridCenterY = snapY
        lastGridShow = showGrid
        lastGridShowAxes = showAxesState

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
            if (x === 0 && showAxesState) continue
            gPts.push(new THREE.Vector3(x, snapY - gridRadius, gridZ), new THREE.Vector3(x, snapY + gridRadius, gridZ))
          }
          // Horizontal lines (Y constant)
          for (let y = snapY - gridRadius; y <= snapY + gridRadius; y += step) {
            if (y === 0 && showAxesState) continue
            gPts.push(new THREE.Vector3(snapX - gridRadius, y, gridZ), new THREE.Vector3(snapX + gridRadius, y, gridZ))
          }

          const gMat = new THREE.LineBasicMaterial({ color: GEO_COLORS.GRID, transparent: true, opacity: 0.8, depthWrite: false })
          dynamicGrid = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(gPts), gMat)
          envGroup.add(dynamicGrid)
        }
      }

      basePlane.visible = stateRefs.current.showGrid
      // Move base plane with camera focus
      basePlane.position.set(centerX, centerY, -0.002)
      basePlane.scale.set(gridRadius / 120, gridRadius / 120, 1)
      axesGroup.visible = stateRefs.current.showAxes

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

    const handleDoubleClick = (event: MouseEvent) => {
      if (!camera || !controls || !dynamicGroupRef.current) return
      
      const rect = renderer.domElement.getBoundingClientRect()
      if (!rect) return
      
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      
      const raycaster = new THREE.Raycaster()
      raycaster.params.Line = { threshold: 0.18 }
      raycaster.setFromCamera(new THREE.Vector2(x, y), camera)
      const intersects = raycaster.intersectObjects(dynamicGroupRef.current.children, true)
      
      const targetPoint = new THREE.Vector3()
      if (intersects.length > 0) {
        targetPoint.copy(intersects[0].point)
      } else {
        const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
        raycaster.ray.intersectPlane(plane, targetPoint)
      }
      
      if (targetPoint) {
        const offset = new THREE.Vector3().subVectors(targetPoint, controls.target)
        camera.position.add(offset)
        controls.target.copy(targetPoint)
        controls.update()
      }
    }
    const handlePointerUp = (event: PointerEvent) => {
      if (viewHelperRef.current && stateRefs.current.showGizmo) {
        // Handle ViewHelper clicks
        viewHelperRef.current.handleClick(event)
      }
    }
    
    renderer.domElement.addEventListener('dblclick', handleDoubleClick)
    renderer.domElement.addEventListener('pointerup', handlePointerUp)

    if (container) {
      resizeObserver.observe(container)
    }

    return () => {
      renderer.domElement.removeEventListener('dblclick', handleDoubleClick)
      renderer.domElement.removeEventListener('pointerup', handlePointerUp)
      resizeObserver.disconnect()
      cancelAnimationFrame(frameId)
      if (container) {
        if (renderer.domElement.parentNode) container.removeChild(renderer.domElement)
        if (labelRenderer.domElement.parentNode) container.removeChild(labelRenderer.domElement)
      }
      if (viewHelperRef.current) {
        viewHelperRef.current.dispose()
        viewHelperRef.current = null
      }
      if (viewHelperTimerRef.current) {
        viewHelperTimerRef.current.dispose()
        viewHelperTimerRef.current = null
      }
      renderer.dispose()
      labelRenderer.setSize(0, 0) // Force some internal cleanup
    }
  }, [isDarkTheme])

  // Reset Camera Logic
  useEffect(() => {
    if (resetTrigger > 0 && cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(25, -20, 15)
      controlsRef.current.target.set(0, 0, 0)
      controlsRef.current.update()
    }
  }, [resetTrigger])

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
    // activeSectionIndices[i] = index gốc trong geometryData.sections cho cuttingPlanes[i]
    const activeSectionIndices: number[] = []

    // Parse all sections from backend - CHỈ đưa vào nếu section đó đang ACTIVE (thông qua orderedSectionIds)
    if (geometryData.sections && geometryData.sections.length > 0) {
      orderedSectionIds.forEach(id => {
        const originalIdx = geometryData.sections!.findIndex(s => s.id === id)
        if (originalIdx === -1) return
        const sec = geometryData.sections![originalIdx]

        if (sec.isCircle && sec.normal) {
          // Mặt phẳng tròn (từ sphere): dùng normal trực tiếp
          const n = new THREE.Vector3(sec.normal[0], sec.normal[1], sec.normal[2]).normalize()
          const center = sec.circleCenter
            ? new THREE.Vector3(sec.circleCenter.x, sec.circleCenter.y, sec.circleCenter.z)
            : new THREE.Vector3(0, 0, 0)
          cuttingPlanes.push(new THREE.Plane().setFromNormalAndCoplanarPoint(n, center))
          planesNormals.push(n)
          activeSectionIndices.push(originalIdx)
        } else if (sec.cuttingPlane && sec.cuttingPlane.length >= 3) {
          const p0 = nodes[sec.cuttingPlane[0]]
          const p1 = nodes[sec.cuttingPlane[1]]
          const p2 = nodes[sec.cuttingPlane[2]]
          if (p0 && p1 && p2) {
            const v1 = new THREE.Vector3().subVectors(p1, p0)
            const v2 = new THREE.Vector3().subVectors(p2, p0)
            const normal = new THREE.Vector3().crossVectors(v1, v2).normalize()
            cuttingPlanes.push(new THREE.Plane().setFromNormalAndCoplanarPoint(normal, p0))
            planesNormals.push(normal)
            activeSectionIndices.push(originalIdx)
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
    const getClipPlanesForBitmask = (bitStr: string, excludeIndex?: number): THREE.Plane[] => {
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
        if (b === excludeIndex) continue // Bỏ qua mặt phẳng tạo ra chính nắp cắt này để chống Z-Fighting

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
    // Nếu đã có sections cắt khối: KHÔNG vẽ lại các mặt phẳng cắt vô hạn để chống rối,
    // NHƯNG VẪN VẼ các mặt của khối gốc (isSolidFace = true) để khối trông đặc hơn.
    geometryData.planes?.forEach((p, pIdx) => {
      if (hasSectionData && !p.isSolidFace) return
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
            polygonOffsetFactor: 1 + pIdx * 0.1,
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
            polygonOffsetFactor: 1 + pIdx * 0.1,
            polygonOffsetUnits: 1,
            clippingPlanes: bgClipPlanes,
          })
          bitmaskGroups[bitStr].add(new THREE.Mesh(sliceGeom.clone(), blockerMat))
        })
      })

    // === CROSS-SECTION CAPPING & OUTLINES ===
    // Chỉ vẽ cap cho các section đang ACTIVE
    if (geometryData.sections) {
      geometryData.sections.forEach((sec, originalIdx) => {
        // Bỏ qua nếu section này bị tắt
        if (!orderedSectionIds.includes(sec.id)) return
        // Index trong cuttingPlanes (để exclude khi chống Z-fighting)
        const secIdx = activeSectionIndices.indexOf(originalIdx)

        // === THIẾT DIỆN TRÒN (Mặt cầu, Mặt nón, Mặt trụ) ===
        if (sec.isCircle && sec.circleCenter && sec.circleRadius && sec.normal) {
          const center = new THREE.Vector3(sec.circleCenter.x, sec.circleCenter.y, sec.circleCenter.z)
          const radius = sec.circleRadius
          const normalVec = new THREE.Vector3(sec.normal[0], sec.normal[1], sec.normal[2]).normalize()

          // Tạo hình tròn nắp (cap)
          const circleGeom = new THREE.CircleGeometry(radius, 64)
          // Xoay CircleGeometry (mặc định nằm trên XY) theo vector pháp tuyến
          const defaultNormal = new THREE.Vector3(0, 0, 1)
          const quaternion = new THREE.Quaternion().setFromUnitVectors(defaultNormal, normalVec)

          // Tạo đường viền tròn
          const ringPoints: THREE.Vector3[] = []
          for (let i = 0; i <= 128; i++) {
            const angle = (i / 128) * Math.PI * 2
            const px = Math.cos(angle) * radius
            const py = Math.sin(angle) * radius
            const pt = new THREE.Vector3(px, py, 0).applyQuaternion(quaternion).add(center)
            ringPoints.push(pt)
          }
          const ringGeom = new THREE.BufferGeometry().setFromPoints(ringPoints)

          // Phân phối vào tất cả bitmask groups
          Object.keys(bitmaskGroups).forEach(bitStr => {
            const bgClipPlanes = getClipPlanesForBitmask(bitStr, secIdx)

            // Cap Face (mặt nắp đĩa tròn)
            const capMat = new THREE.MeshBasicMaterial({
              color: '#ff6b6b',
              transparent: true,
              opacity: 0.3,
              side: THREE.DoubleSide,
              polygonOffset: true,
              polygonOffsetFactor: -1 - originalIdx * 0.1,
              polygonOffsetUnits: -1,
              clippingPlanes: bgClipPlanes,
            })
            const capMesh = new THREE.Mesh(circleGeom.clone(), capMat)
            capMesh.position.copy(center)
            capMesh.quaternion.copy(quaternion)
            bitmaskGroups[bitStr].add(capMesh)

            // Depth blocker
            const blockerMat = new THREE.MeshBasicMaterial({
              colorWrite: false, depthWrite: true, side: THREE.DoubleSide,
              polygonOffset: true, polygonOffsetFactor: -1 - originalIdx * 0.1,
              polygonOffsetUnits: -1,
              clippingPlanes: bgClipPlanes,
            })
            const blockerMesh = new THREE.Mesh(circleGeom.clone(), blockerMat)
            blockerMesh.position.copy(center)
            blockerMesh.quaternion.copy(quaternion)
            bitmaskGroups[bitStr].add(blockerMesh)

            // Đường viền tròn
            const ringMat = new THREE.LineBasicMaterial({
              color: 0xff4444, linewidth: 2, depthTest: true,
              clippingPlanes: bgClipPlanes,
            })
            const ring = new THREE.Line(ringGeom.clone(), ringMat)
            bitmaskGroups[bitStr].add(ring)
          })
          return // Bỏ qua logic polygon bên dưới
        }

        // === THIẾT DIỆN ĐA GIÁC (Khối đa diện) ===
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

            // Distribute to all groups, using their clippers
            Object.keys(bitmaskGroups).forEach(bitStr => {
              const bgClipPlanes = getClipPlanesForBitmask(bitStr, secIdx)

              // Cap Face
              const capMat = new THREE.MeshBasicMaterial({
                color: '#ff6b6b',
                transparent: true,
                opacity: 0.3,
                side: THREE.DoubleSide,
                polygonOffset: true,
                polygonOffsetFactor: -1 - originalIdx * 0.1,
                polygonOffsetUnits: -1,
                clippingPlanes: bgClipPlanes,
              })
              bitmaskGroups[bitStr].add(new THREE.Mesh(capGeom.clone(), capMat))

              // Block depth
              const blockerMat = new THREE.MeshBasicMaterial({
                colorWrite: false, depthWrite: true, side: THREE.DoubleSide,
                polygonOffset: true, polygonOffsetFactor: -1 - originalIdx * 0.1,
                polygonOffsetUnits: -1,
                clippingPlanes: bgClipPlanes,
              })
              bitmaskGroups[bitStr].add(new THREE.Mesh(capGeom.clone(), blockerMat))

              // Outline
              const outlineMat = new THREE.LineBasicMaterial({
                color: 0xff4444, linewidth: 2, depthTest: false,
                clippingPlanes: bgClipPlanes,
              })
              const lineMesh = new THREE.LineSegments(outlineGeom.clone(), outlineMat)
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

    // Draw Cones
    geometryData.cones?.forEach(c => {
      if (!nodes[c.center] || !nodes[c.apex]) return
      const centerPos = nodes[c.center]
      const apexPos = nodes[c.apex]
      const height = centerPos.distanceTo(apexPos)
      if (height < 0.001) return

      const coneGeo = new THREE.ConeGeometry(c.radius, height, 32)
      const coneMat = new THREE.MeshBasicMaterial({
        color: c.color || '#FF8C00',
        transparent: true,
        opacity: c.opacity ?? 0.15,
        wireframe: false,
        side: THREE.DoubleSide
      })
      const coneWireMat = new THREE.MeshBasicMaterial({
        color: c.color || '#FF8C00',
        transparent: true,
        opacity: 0.4,
        wireframe: true
      })

      // Orient cone from center to apex
      const midPoint = new THREE.Vector3().addVectors(centerPos, apexPos).multiplyScalar(0.5)
      const direction = new THREE.Vector3().subVectors(apexPos, centerPos).normalize()
      const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction)

      Object.keys(bitmaskGroups).forEach(bitStr => {
        const bgClipPlanes = getClipPlanesForBitmask(bitStr)
        const mat1 = coneMat.clone()
        mat1.clippingPlanes = bgClipPlanes
        const mat2 = coneWireMat.clone()
        mat2.clippingPlanes = bgClipPlanes

        const cone = new THREE.Mesh(coneGeo, mat1)
        cone.position.copy(midPoint)
        cone.quaternion.copy(quaternion)
        bitmaskGroups[bitStr].add(cone)

        const coneWire = new THREE.Mesh(coneGeo, mat2)
        coneWire.position.copy(midPoint)
        coneWire.quaternion.copy(quaternion)
        bitmaskGroups[bitStr].add(coneWire)
      })
    })

    // Draw Cylinders
    geometryData.cylinders?.forEach(c => {
      if (!nodes[c.centerBottom] || !nodes[c.centerTop]) return
      const bottomPos = nodes[c.centerBottom]
      const topPos = nodes[c.centerTop]
      const height = bottomPos.distanceTo(topPos)
      if (height < 0.001) return

      const cylGeo = new THREE.CylinderGeometry(c.radius, c.radius, height, 32, 1, true)
      const cylMat = new THREE.MeshBasicMaterial({
        color: c.color || '#4169E1',
        transparent: true,
        opacity: c.opacity ?? 0.15,
        wireframe: false,
        side: THREE.DoubleSide
      })
      const cylWireMat = new THREE.MeshBasicMaterial({
        color: c.color || '#4169E1',
        transparent: true,
        opacity: 0.4,
        wireframe: true
      })

      // Orient cylinder from bottom to top
      const midPoint = new THREE.Vector3().addVectors(bottomPos, topPos).multiplyScalar(0.5)
      const direction = new THREE.Vector3().subVectors(topPos, bottomPos).normalize()
      const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction)

      Object.keys(bitmaskGroups).forEach(bitStr => {
        const bgClipPlanes = getClipPlanesForBitmask(bitStr)
        const mat1 = cylMat.clone()
        mat1.clippingPlanes = bgClipPlanes
        const mat2 = cylWireMat.clone()
        mat2.clippingPlanes = bgClipPlanes

        const cyl = new THREE.Mesh(cylGeo, mat1)
        cyl.position.copy(midPoint)
        cyl.quaternion.copy(quaternion)
        bitmaskGroups[bitStr].add(cyl)

        const cylWire = new THREE.Mesh(cylGeo, mat2)
        cylWire.position.copy(midPoint)
        cylWire.quaternion.copy(quaternion)
        bitmaskGroups[bitStr].add(cylWire)
      })
    })

    return () => clearGroup(group)
  }, [geometryData, showLabels, highlightedEdges, isDarkTheme, bitmaskVisibility, explodeAmount, orderedSectionIds])

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
          <button
            onClick={() => setShowGizmo(!showGizmo)}
            className={`p-2.5 rounded-xl hover:bg-muted transition-all flex items-center gap-2 ${showGizmo ? 'text-primary bg-primary/10 font-semibold' : 'text-muted-foreground'}`}
            title="Ẩn/Hiện khối điều hướng"
          >
            <Compass size={18} />
            <span className="text-xs">Điều hướng</span>
          </button>

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

      {/* Navigation Gizmo (Three.js ViewHelper - rendered inside WebGL canvas, initialized in useEffect below) */}
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
