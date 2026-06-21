'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { SolverView } from '@/components/geometry/solver-view'
import { GeometryProvider, useGeometry } from '@/components/geometry/geometry-context'
import { isManualProjectSnapshot } from '@/components/geometry/manual-editor'
import { useProjectStore } from '@/hooks/use-project-store'
import { clearTransferredProjectStorage, readTransferredProject } from '@/components/geometry/project-transfer'

function SmartSolverContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = searchParams.get('id')
  const { projects } = useProjectStore()
  const {
    setGeometryData,
    setSolveArtifact,
    setCameraControls,
    setShowAxes,
    setShowGrid,
    setShowLabels,
    setOrderedSectionIds,
    setBitmaskVisibility,
    setExplodeAmount,
  } = useGeometry()

  // Clear project ID from URL on page reload (F5)
  useEffect(() => {
    if (typeof window !== 'undefined' && projectId) {
      const navigation = window.performance?.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
      if (navigation?.type === 'reload') {
        router.replace('/chedovethongminh')
      }
    }
  }, [projectId, router])

  useEffect(() => {
    const transferredProject = readTransferredProject()
    if (transferredProject) {
      clearTransferredProjectStorage()
      if (!projectId || transferredProject.id === projectId) {
        try {
          const data = JSON.parse(transferredProject.geometryJson)
          if (isManualProjectSnapshot(data)) {
            setGeometryData(data.previewGeometryData ?? null)
            setSolveArtifact(data.previewGeometryData
              ? {
                  problemText: data.source?.problemText || '',
                  rawResult: {
                    manualDocument: data.manualDocument,
                    construction: data.source?.construction,
                    problemText: data.source?.problemText || '',
                  },
                  geometryData: data.previewGeometryData,
                }
              : null)
            if (data.viewState?.cameraControls) setCameraControls(data.viewState.cameraControls)
            if (typeof data.viewState?.showAxes === 'boolean') setShowAxes(data.viewState.showAxes)
            if (typeof data.viewState?.showGrid === 'boolean') setShowGrid(data.viewState.showGrid)
            if (typeof data.viewState?.showLabels === 'boolean') setShowLabels(data.viewState.showLabels)
            if (Array.isArray(data.viewState?.orderedSectionIds)) setOrderedSectionIds(data.viewState.orderedSectionIds)
            if (data.viewState?.bitmaskVisibility) setBitmaskVisibility(data.viewState.bitmaskVisibility)
            if (typeof data.viewState?.explodeAmount === 'number') setExplodeAmount(data.viewState.explodeAmount)
            return
          }
          setGeometryData(data)
          return
        } catch (e) {
          console.error('Loi khi load du lieu ban ve:', e)
        }
      }
    }

    if (projectId && projects.length > 0) {
      const project = projects.find((p) => p.id === projectId)
      if (project) {
        try {
          const data = JSON.parse(project.geometryJson)
          if (isManualProjectSnapshot(data)) {
            setGeometryData(data.previewGeometryData ?? null)
            setSolveArtifact(data.previewGeometryData
              ? {
                  problemText: data.source?.problemText || '',
                  rawResult: {
                    manualDocument: data.manualDocument,
                    construction: data.source?.construction,
                    problemText: data.source?.problemText || '',
                  },
                  geometryData: data.previewGeometryData,
                }
              : null)
            if (data.viewState?.cameraControls) setCameraControls(data.viewState.cameraControls)
            if (typeof data.viewState?.showAxes === 'boolean') setShowAxes(data.viewState.showAxes)
            if (typeof data.viewState?.showGrid === 'boolean') setShowGrid(data.viewState.showGrid)
            if (typeof data.viewState?.showLabels === 'boolean') setShowLabels(data.viewState.showLabels)
            if (Array.isArray(data.viewState?.orderedSectionIds)) setOrderedSectionIds(data.viewState.orderedSectionIds)
            if (data.viewState?.bitmaskVisibility) setBitmaskVisibility(data.viewState.bitmaskVisibility)
            if (typeof data.viewState?.explodeAmount === 'number') setExplodeAmount(data.viewState.explodeAmount)
            return
          }
          setGeometryData(data)
        } catch (e) {
          console.error('Loi khi load du lieu ban ve:', e)
        }
      }
    }
  }, [
    projectId,
    projects,
    setGeometryData,
    setSolveArtifact,
    setCameraControls,
    setShowAxes,
    setShowGrid,
    setShowLabels,
    setOrderedSectionIds,
    setBitmaskVisibility,
    setExplodeAmount,
  ])

  const handleBack = () => {
    router.push('/')
  }

  return <SolverView onBack={handleBack} />
}

export default function SmartSolverPage() {
  return (
    <GeometryProvider>
      <Suspense fallback={<div className="h-screen bg-background flex items-center justify-center text-muted-foreground">Dang tai tro ly AI...</div>}>
        <SmartSolverContent />
      </Suspense>
    </GeometryProvider>
  )
}
