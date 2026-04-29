'use client'

import React, { createContext, useContext, useState } from 'react'

export interface Point3D {
  x: number
  y: number
  z: number
}

export interface Query {
  id: string
  text: string
  edges?: string[]
}

export interface CircleData {
  center: string
  radius: number
  normal?: [number, number, number]
  name?: string
  color?: string
}

export interface PlaneData {
  points: string[]
  color?: string
  opacity?: number
  density?: number
}

export interface SphereData {
  center: string
  radius: number
  color?: string
  opacity?: number
}

export interface ClippingPlaneData {
  a: number
  b: number
  c: number
  d: number
  crossSectionVertices?: string[]
}

export interface SectionData {
  id: string
  cuttingPlane: string[]   // 3 points defining the cutting plane (e.g. ["D", "M", "N"])
  polygon: string[]        // ordered vertices of the cross-section polygon
  generatedPoints?: Record<string, { x: number, y: number, z: number }>
}

export interface GeometryData {
  points: Record<string, [number, number, number]>
  is_consistent: boolean
  error_message?: string
  queries?: Query[]
  edges?: string[]
  circles?: CircleData[]
  planes?: PlaneData[]
  spheres?: SphereData[]
  clippingPlane?: ClippingPlaneData
  pointSides?: Record<string, 'above' | 'below' | 'onplane'>
  sections?: SectionData[]
}

export interface ValidationResult {
  isConsistent: boolean
  issues: string[]
}

// Visibility state for each bitmask group (e.g. "00" -> true)
export type BitmaskVisibility = Record<string, boolean>

interface GeometryContextType {
  geometryData: GeometryData | null
  setGeometryData: (data: GeometryData) => void
  selectedEntity: string | null
  setSelectedEntity: (entity: string | null) => void
  validation: ValidationResult
  setValidation: (validation: ValidationResult) => void
  cameraControls: {
    rotateX: number
    rotateY: number
    zoom: number
    /** Dịch chuyển màn hình (px), dùng kết hợp zoom tại con trỏ */
    panX: number
    panY: number
  }
  setCameraControls: (controls: any) => void
  highlightedEdges: string[]
  setHighlightedEdges: (edges: string[]) => void
  isConsistent: boolean
  setIsConsistent: (consistent: boolean) => void
  errorMessage: string
  setErrorMessage: (message: string) => void
  queries: Query[]
  setQueries: (queries: Query[]) => void
  selectedQueryId: string | null
  setSelectedQueryId: (id: string | null) => void
  // Cross-section splitting state (Bitmask)
  bitmaskVisibility: BitmaskVisibility
  setBitmaskVisibility: (vis: BitmaskVisibility) => void
  explodeAmount: number
  setExplodeAmount: (amount: number) => void
}

const GeometryContext = createContext<GeometryContextType | undefined>(undefined)

export function GeometryProvider({ children }: { children: React.ReactNode }) {
  const [geometryData, setGeometryData] = useState<GeometryData | null>(null)
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null)
  const [validation, setValidation] = useState<ValidationResult>({
    isConsistent: true,
    issues: [],
  })
  const [cameraControls, setCameraControls] = useState({
    rotateX: 0.75, // Nhìn từ trên xuống (~43 độ)
    rotateY: 0.5,  // Góc quay chéo
    zoom: 1,
    panX: 0,
    panY: 0,
  })
  const [highlightedEdges, setHighlightedEdges] = useState<string[]>([])
  const [isConsistent, setIsConsistent] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [queries, setQueries] = useState<Query[]>([])
  const [selectedQueryId, setSelectedQueryId] = useState<string | null>(null)
  const [bitmaskVisibility, setBitmaskVisibility] = useState<BitmaskVisibility>({})
  const [explodeAmount, setExplodeAmount] = useState(0)

  const contextValue = React.useMemo(() => ({
    geometryData,
    setGeometryData,
    selectedEntity,
    setSelectedEntity,
    validation,
    setValidation,
    cameraControls,
    setCameraControls,
    highlightedEdges,
    setHighlightedEdges,
    isConsistent,
    setIsConsistent,
    errorMessage,
    setErrorMessage,
    queries,
    setQueries,
    selectedQueryId,
    setSelectedQueryId,
    bitmaskVisibility,
    setBitmaskVisibility,
    explodeAmount,
    setExplodeAmount,
  }), [
    geometryData,
    selectedEntity,
    validation,
    cameraControls,
    highlightedEdges,
    isConsistent,
    errorMessage,
    queries,
    selectedQueryId,
    bitmaskVisibility,
    explodeAmount,
  ])

  return (
    <GeometryContext.Provider value={contextValue}>
      {children}
    </GeometryContext.Provider>
  )
}

export function useGeometry() {
  const context = useContext(GeometryContext)
  if (context === undefined) {
    throw new Error('useGeometry must be used within GeometryProvider')
  }
  return context
}
