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

export interface GeometryData {
  points: Record<string, [number, number, number]>
  is_consistent: boolean
  error_message?: string
  queries?: Query[]
  edges?: string[]
}

export interface ValidationResult {
  isConsistent: boolean
  issues: string[]
}

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

  return (
    <GeometryContext.Provider
      value={{
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
      }}
    >
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
