'use client'

import type { GeometryData } from '@/components/geometry/geometry-context'

export type GeometrySetters = {
  setGeometryData: (data: GeometryData) => void
  setValidation: (validation: { isConsistent: boolean; issues: string[] }) => void
  setIsConsistent: (consistent: boolean) => void
  setErrorMessage: (message: string) => void
  setQueries: (queries: any[]) => void
  setSolveArtifact?: (artifact: any | null) => void
}

export const SOLVE_ENDPOINT_URL = process.env.NEXT_PUBLIC_API_URL 
  ? `${process.env.NEXT_PUBLIC_API_URL}/api/Geometry/process` 
  : 'http://localhost:5000/api/Geometry/process'

function toUserFacingSolveError(errorData: any, fallback = 'Chức năng AI hiện đang gặp lỗi. Vui lòng thử lại sau.') {
  if (typeof errorData === 'string' && errorData.trim()) {
    return fallback
  }

  const message = errorData?.detail?.message || errorData?.message || errorData?.detail
  if (typeof message === 'string' && message.trim()) {
    return fallback
  }

  return fallback
}

// IMPORTANT: Keep behavior identical to the mapping currently used in LeftSidebar.
export function mapBackendResultToGeometryData(result: any): GeometryData {
  // Map BE response (entities, validation, points: {A: {x,y,z}})
  const points: Record<string, [number, number, number]> = {}
  const rawPoints = result.points || {}
  Object.entries(rawPoints).forEach(([name, coords]: [string, any]) => {
    const x = coords.x ?? coords.X ?? 0
    const y = coords.y ?? coords.Y ?? 0
    const z = coords.z ?? coords.Z ?? 0
    points[name] = [x, y, z]
  })

  const rawSegments = result.edges || result.segments || result.data?.entities?.segments || []
  const pointNames = Object.keys(points).sort((a, b) => b.length - a.length)

  const mappedEdges = rawSegments
    .map((s: string) => {
      if (typeof s !== 'string') return ''
      if (s.includes('-')) return s
      for (const p of pointNames) {
        if (s.startsWith(p)) {
          const rest = s.slice(p.length)
          if (pointNames.includes(rest)) return `${p}-${rest}`
        }
      }
      if (s.length === 2) return `${s[0]}-${s[1]}`
      return s
    })
    .filter(Boolean)

  return {
    points,
    is_consistent: result.validation?.allPassed ?? true,
    error_message: result.validation?.allPassed ? '' : 'Dữ liệu không khớp',
    edges: mappedEdges,
    queries: (result.queries || result.data?.queries || []).map((q: any) => ({
      id: q.id || Math.random().toString(),
      text: q.question_text || q.raw_text || '',
      edges: [],
    })),
    circles: result.circles || result.data?.entities?.circles || [],
    planes: result.planes || result.data?.entities?.planes || [],
    spheres: result.spheres || result.data?.entities?.spheres || [],
    cones: result.cones || [],
    cylinders: result.cylinders || [],
    clippingPlane: result.clippingPlane || undefined,
    pointSides: result.pointSides || undefined,
    sections: result.sections || undefined,
  }
}

export function applyBackendResultToState(result: any, setters: GeometrySetters) {
  const mappedData = mapBackendResultToGeometryData(result)

  setters.setGeometryData(mappedData)
  setters.setSolveArtifact?.({
    problemText: result.problemText || '',
    rawResult: result,
    geometryData: mappedData,
  })
  setters.setIsConsistent(mappedData.is_consistent)
  setters.setQueries(mappedData.queries || [])
  setters.setValidation({
    isConsistent: mappedData.is_consistent,
    issues: result.validation?.failures?.map((f: any) => f.message) || [],
  })
}

export function applyRawJsonToGeometry(text: string, setters: GeometrySetters) {
  const result = JSON.parse(text)
  applyBackendResultToState(result, setters)
  setters.setErrorMessage('')
}

export async function solveProblemText(problemText: string): Promise<any> {
  try {
    const response = await fetch(SOLVE_ENDPOINT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(problemText),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(toUserFacingSolveError(errorData))
    }

    return response.json()
  } catch (error) {
    console.error('[solveProblemText] AI service request failed:', error)
    throw new Error('Chức năng AI hiện đang gặp lỗi. Vui lòng thử lại sau.')
  }
}
