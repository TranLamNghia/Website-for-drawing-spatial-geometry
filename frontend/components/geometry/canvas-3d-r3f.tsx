'use client'

import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import { useGeometry } from './geometry-context'
import { ZoomIn, ZoomOut, Layers, Crosshair, Eye, RefreshCcw } from 'lucide-react'

// GeoGebra Light Palette
const GEO_COLORS = {
  BG: 0xffffff,
  AXIS_X: 0xd32f2f,
  AXIS_Y: 0x388e3c,
  AXIS_Z: 0x1976d2,
  POINT: 0x6671d1,
  FACE: 0x6671d1,
  EDGE_SOLID: 0x1a1a2e,
  EDGE_DASHED: 0x999999,
  HIGHLIGHT: 0xff9f43,
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
  const [showLabels, setShowLabels] = useState(true)
  const [showAxes, setShowAxes] = useState(true)
  const [showBasePlane, setShowBasePlane] = useState(true)
  const { geometryData, highlightedEdges } = useGeometry()

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
      color: 0xcccccc, alphaMap, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false
    })
    const basePlane = new THREE.Mesh(planeGeo, planeMat)
    envGroup.add(basePlane)

    // 2. Axes and Ticks
    const axesGroup = new THREE.Group()
    axesGroup.renderOrder = 99
    const ticksList: TickData[] = []
    const AXIS_LEN = 200

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
    let lastGridEdge = -1
    let lastGridShow = true
    let dynamicGrid: THREE.LineSegments | null = null

    // Animation Loop
    let frameId: number
    const animate = () => {
      frameId = requestAnimationFrame(animate)
      controls.update()

      const dist = camera.position.distanceTo(controls.target)
      let step = 1
      if (dist > 45) step = 10
      else if (dist > 25) step = 5
      else if (dist > 12) step = 2

      const maxVis = Math.floor(dist * 1.1)
      const edgePos = maxVis - (maxVis % step) + step

      if (axisLabels['x']) axisLabels['x'].position.set(edgePos, 0, 0)
      if (axisLabels['y']) axisLabels['y'].position.set(0, edgePos, 0)
      if (axisLabels['z']) axisLabels['z'].position.set(0, 0, edgePos)

      ticksList.forEach(t => {
        const isVis = Math.abs(t.val) <= maxVis && t.val % step === 0

        if (t.mesh.visible !== isVis) {
          t.mesh.visible = isVis
          t.label.visible = isVis
        }
        if (isVis) {
          t.mesh.scale.setScalar(dist * 0.05)
        }
      })

      // Update Dynamic Grid if bounds change
      const showGrid = stateRefs.current.showBasePlane
      if (lastGridStep !== step || lastGridEdge !== edgePos || lastGridShow !== showGrid) {
        lastGridStep = step
        lastGridEdge = edgePos
        lastGridShow = showGrid

        if (dynamicGrid) {
          envGroup.remove(dynamicGrid)
          dynamicGrid.geometry.dispose()
            ; (dynamicGrid.material as THREE.Material).dispose()
          dynamicGrid = null
        }
        if (showGrid) {
          const gPts: THREE.Vector3[] = []
          for (let i = -edgePos; i <= edgePos; i += step) {
            if (i === 0) continue
            gPts.push(new THREE.Vector3(i, -edgePos, -0.01), new THREE.Vector3(i, edgePos, -0.01))
            gPts.push(new THREE.Vector3(-edgePos, i, -0.01), new THREE.Vector3(edgePos, i, -0.01))
          }
          const gMat = new THREE.LineBasicMaterial({ color: 0xd0d0d0, transparent: true, opacity: 0.8, depthWrite: false })
          dynamicGrid = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(gPts), gMat)
          envGroup.add(dynamicGrid)
        }
      }

      basePlane.visible = stateRefs.current.showBasePlane
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
  }, []) // Empty dependency array ensures it only binds once

  // Dynamic Geometry (Pyramid, Queries)
  useEffect(() => {
    const scene = sceneRef.current
    const group = dynamicGroupRef.current
    if (!scene || !group) return

    // Explicit cleanup of the persistent group
    const clearGroup = (g: THREE.Group) => {
      while (g.children.length > 0) {
        const obj = g.children[0]
        g.remove(obj)
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
    Object.entries(geometryData.points).forEach(([name, coords]) => {
      nodes[name] = new THREE.Vector3(coords[0], coords[1], coords[2])
    })

    // Reusable point geometry
    const dotGeo = new THREE.SphereGeometry(0.06, 16, 16)
    const dotMat = new THREE.MeshBasicMaterial({ color: '#000000', depthTest: false })

    // Draw Points
    Object.entries(nodes).forEach(([name, vec]) => {
      const dot = new THREE.Mesh(dotGeo, dotMat)
      dot.position.copy(vec)
      group.add(dot)

      if (showLabels) {
        const el = document.createElement('div')
        el.className = 'text-sm font-bold italic font-serif text-[#1a1a2e] pointer-events-none select-none drop-shadow-md'
        el.style.textShadow = '1px 1px 0 #fff, -1px -1px 0 #fff'
        el.textContent = name
        const lbl = new CSS2DObject(el)
        lbl.position.copy(vec).add(new THREE.Vector3(0.2, 0.2, 0.2))
        group.add(lbl)
      }
    })

    // Advance Depth HLR: Define generic faces
    const facePoints: [string, string, string][] = []
    const pts = Object.keys(nodes)
    if (pts.includes('S')) {
      ['A', 'B', 'C', 'D'].forEach((p, i, arr) => {
        const next = arr[(i + 1) % arr.length]
        if (nodes[p] && nodes[next]) facePoints.push(['S', p, next])
      })
      if (nodes['A'] && nodes['B'] && nodes['C']) facePoints.push(['A', 'B', 'C'])
      if (nodes['A'] && nodes['C'] && nodes['D']) facePoints.push(['A', 'C', 'D'])
    } else if (pts.length >= 3) {
      const sorted = pts.sort()
      for (let i = 1; i < sorted.length - 1; i++) {
        facePoints.push([sorted[0], sorted[i], sorted[i + 1]])
      }
    }

    if (facePoints.length > 0) {
      const positions: number[] = []
      facePoints.forEach(([a, b, c]) => {
        if (nodes[a] && nodes[b] && nodes[c]) {
          positions.push(nodes[a].x, nodes[a].y, nodes[a].z)
          positions.push(nodes[b].x, nodes[b].y, nodes[b].z)
          positions.push(nodes[c].x, nodes[c].y, nodes[c].z)
        }
      })

      if (positions.length > 0) {
        const geom = new THREE.BufferGeometry()
        geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
        geom.computeVertexNormals()

        const matVisual = new THREE.MeshBasicMaterial({
          color: GEO_COLORS.FACE, opacity: 0.1, transparent: true, side: THREE.DoubleSide, depthWrite: false
        })
        group.add(new THREE.Mesh(geom, matVisual))

        const matDepthBlocker = new THREE.MeshBasicMaterial({
          color: 0x000000, colorWrite: false, side: THREE.DoubleSide, depthWrite: true,
          polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1
        })
        group.add(new THREE.Mesh(geom, matDepthBlocker))
      }
    }

    // Edges
    const solidEdgesPos: number[] = []
    const highlightEdgesPos: number[] = []
    const edges = geometryData.edges || []

    edges.forEach((edgeKey) => {
      const parsed = parseEdgeKey(edgeKey)
      if (!parsed) return
      const [a, b] = parsed
      if (!nodes[a] || !nodes[b]) return

      if (highlightedEdges.includes(edgeKey)) {
        highlightEdgesPos.push(nodes[a].x, nodes[a].y, nodes[a].z, nodes[b].x, nodes[b].y, nodes[b].z)
      } else {
        solidEdgesPos.push(nodes[a].x, nodes[a].y, nodes[a].z, nodes[b].x, nodes[b].y, nodes[b].z)
      }
    })

    if (highlightEdgesPos.length > 0) {
      const hGeom = new THREE.BufferGeometry()
      hGeom.setAttribute('position', new THREE.Float32BufferAttribute(highlightEdgesPos, 3))
      const hMat = new THREE.LineBasicMaterial({ color: GEO_COLORS.HIGHLIGHT, linewidth: 3, depthTest: false })
      group.add(new THREE.LineSegments(hGeom, hMat))
    }

    if (solidEdgesPos.length > 0) {
      const linesGeom = new THREE.BufferGeometry()
      linesGeom.setAttribute('position', new THREE.Float32BufferAttribute(solidEdgesPos, 3))

      const matSolid = new THREE.LineBasicMaterial({ color: GEO_COLORS.EDGE_SOLID, depthFunc: THREE.LessEqualDepth })
      group.add(new THREE.LineSegments(linesGeom, matSolid))

      const matDashed = new THREE.LineDashedMaterial({
        color: GEO_COLORS.EDGE_DASHED, dashSize: 0.15, gapSize: 0.1, depthFunc: THREE.GreaterDepth
      })
      const meshDashed = new THREE.LineSegments(linesGeom, matDashed)
      meshDashed.computeLineDistances()
      group.add(meshDashed)
    }

    // Draw Circles
    geometryData.circles?.forEach(c => {
      if (!nodes[c.center]) return
      const circleGeo = new THREE.RingGeometry(c.radius - 0.02, c.radius + 0.02, 64)
      const circleMat = new THREE.MeshBasicMaterial({ color: c.color || '#000', side: THREE.DoubleSide, depthTest: false })
      const circle = new THREE.Mesh(circleGeo, circleMat)
      circle.position.copy(nodes[c.center])
      if (c.normal) {
        const norm = new THREE.Vector3(...c.normal).normalize()
        circle.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), norm)
      }
      group.add(circle)
    })

    // Draw Planes
    geometryData.planes?.forEach(p => {
      const pNodes = p.points.map(name => nodes[name]).filter(Boolean)
      if (pNodes.length < 3) return

      const color = p.color || '#6671d1'

      // 1. Calculate Plane Normal & Basis
      const v1 = new THREE.Vector3().subVectors(pNodes[1], pNodes[0]).normalize()
      const norm = new THREE.Vector3().crossVectors(v1, new THREE.Vector3().subVectors(pNodes[2], pNodes[0])).normalize()
      const v2 = new THREE.Vector3().crossVectors(norm, v1).normalize()

      // 2. Large Context Plane (20x20)
      const largePlaneGeo = new THREE.PlaneGeometry(20, 20)
      const largePlaneMat = new THREE.MeshBasicMaterial({ 
        color, transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false 
      })
      const largePlane = new THREE.Mesh(largePlaneGeo, largePlaneMat)
      largePlane.position.copy(pNodes[0])
      largePlane.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), norm)
      group.add(largePlane)

      // 3. Slice Polygon (The points defined in JSON)
      const sliceGeom = new THREE.BufferGeometry()
      const slicePos: number[] = []
      for (let i = 1; i < pNodes.length - 1; i++) {
        slicePos.push(pNodes[0].x, pNodes[0].y, pNodes[0].z)
        slicePos.push(pNodes[i].x, pNodes[i].y, pNodes[i].z)
        slicePos.push(pNodes[i + 1].x, pNodes[i + 1].y, pNodes[i + 1].z)
      }
      sliceGeom.setAttribute('position', new THREE.Float32BufferAttribute(slicePos, 3))
      group.add(new THREE.Mesh(sliceGeom, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.15, side: THREE.DoubleSide })))

      // 4. Hatching (Diagonal Lines)
      const pts2d = pNodes.map(p => {
        const rel = new THREE.Vector3().subVectors(p, pNodes[0])
        return new THREE.Vector2(rel.dot(v1), rel.dot(v2))
      })
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
      pts2d.forEach(pt => {
        minX = Math.min(minX, pt.x); maxX = Math.max(maxX, pt.x)
        minY = Math.min(minY, pt.y); maxY = Math.max(maxY, pt.y)
      })

      const hatchLines: THREE.Vector3[] = []
      const density = p.density || 12 // Default increased for more detail
      const step = (maxX - minX + maxY - minY) / density
      for (let d = minX + minY - step; d <= maxX + maxY + step; d += step) {
         const intercepts: THREE.Vector2[] = []
         for (let i = 0; i < pts2d.length; i++) {
            const pa = pts2d[i], pb = pts2d[(i+1)%pts2d.length]
            const denom = (pb.x - pa.x) + (pb.y - pa.y)
            if (Math.abs(denom) > 1e-6) {
               const t = (d - pa.x - pa.y) / denom
               if (t >= 0 && t <= 1) intercepts.push(new THREE.Vector2(pa.x + t*(pb.x - pa.x), pa.y + t*(pb.y - pa.y)))
            }
         }
         intercepts.sort((a,b) => a.x - b.x)
         for(let i=0; i < intercepts.length - 1; i += 2) {
            hatchLines.push(
               pNodes[0].clone().addScaledVector(v1, intercepts[i].x).addScaledVector(v2, intercepts[i].y),
               pNodes[0].clone().addScaledVector(v1, intercepts[i+1].x).addScaledVector(v2, intercepts[i+1].y)
            )
         }
      }
      if (hatchLines.length > 0) {
        const hGeom = new THREE.BufferGeometry().setFromPoints(hatchLines)
        group.add(new THREE.LineSegments(hGeom, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.5, depthTest: false })))
      }

      // 5. Intersection Outline (Perimeter)
      const periPts: THREE.Vector3[] = []
      for(let i=0; i < pNodes.length; i++) periPts.push(pNodes[i], pNodes[(i+1)%pNodes.length])
      const periGeom = new THREE.BufferGeometry().setFromPoints(periPts)
      group.add(new THREE.LineSegments(periGeom, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.7, linewidth: 2, depthTest: false })))
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
      const sphere = new THREE.Mesh(sGeo, sMat)
      sphere.position.copy(nodes[s.center])
      group.add(sphere)
    })

    return () => clearGroup(group)
  }, [geometryData, showLabels, highlightedEdges])


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
    <div className="w-full h-full relative bg-white overflow-hidden">
      {/* 3D Scene Mount Point */}
      <div className="absolute inset-0 z-0" ref={mountRef} />
      
      {/* Top Center Action Toolbar */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-2 z-50">
        <div className="flex bg-white/95 backdrop-blur-md border border-[#ddd] rounded-2xl shadow-2xl p-1.5 items-center gap-1">
            <button 
                onClick={() => setShowAxes(!showAxes)} 
                className={`p-2.5 rounded-xl hover:bg-gray-100 transition-all flex items-center gap-2 ${showAxes ? 'text-[#6671d1] bg-[#6671d1]/5 font-semibold' : 'text-gray-400'}`}
                title="Ẩn/Hiện trục tọa độ"
            >
                <Crosshair size={18} />
                <span className="text-xs">Trục toạ độ</span>
            </button>
            <div className="w-[1px] h-4 bg-gray-200 mx-1" />
            <button 
                onClick={() => setShowBasePlane(!showBasePlane)} 
                className={`p-2.5 rounded-xl hover:bg-gray-100 transition-all flex items-center gap-2 ${showBasePlane ? 'text-[#6671d1] bg-[#6671d1]/5 font-semibold' : 'text-gray-400'}`}
                title="Ẩn/Hiện lưới mặt đáy"
            >
                <Layers size={18} />
                <span className="text-xs">Lưới đáy</span>
            </button>
            <div className="w-[1px] h-4 bg-gray-200 mx-1" />
            <button 
                onClick={() => setShowLabels(!showLabels)} 
                className={`p-2.5 rounded-xl hover:bg-gray-100 transition-all flex items-center gap-2 ${showLabels ? 'text-[#6671d1] bg-[#6671d1]/5 font-semibold' : 'text-gray-400'}`}
                title="Ẩn/Hiện nhãn điểm"
            >
                <Eye size={18} />
                <span className="text-xs">Nhãn</span>
            </button>
            <div className="w-[1px] h-6 bg-gray-200 mx-2" />
            <button 
                onClick={handleResetCamera}
                className="p-2.5 rounded-xl hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all flex items-center gap-2"
                title="Đặt lại Camera"
            >
                <RefreshCcw size={18} />
                <span className="text-xs font-medium">Đặt lại</span>
            </button>
        </div>
      </div>

      {/* Zoom Controls */}
      <div className="absolute bottom-6 right-6 flex flex-col gap-3 z-50">
        <div className="flex flex-col bg-white/95 backdrop-blur-md border border-[#ddd] rounded-xl shadow-lg overflow-hidden">
          <button onClick={() => handleZoom(1)} className="p-3 hover:bg-[#6671d1] hover:text-white border-b border-[#eee] text-gray-600 transition-colors"><ZoomIn size={20} /></button>
          <button onClick={() => handleZoom(-1)} className="p-3 hover:bg-[#6671d1] hover:text-white text-gray-600 transition-colors"><ZoomOut size={20} /></button>
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
