'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ManualView } from '@/components/geometry/manual-view'
import { GeometryProvider, useGeometry } from '@/components/geometry/geometry-context'
import { isManualProjectSnapshot } from '@/components/geometry/manual-editor'
import { useProjectStore } from '@/hooks/use-project-store'
import { clearTransferredProjectStorage, readTransferredProject } from '@/components/geometry/project-transfer'

function ManualDrawingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = searchParams.get('id')
  const { projects } = useProjectStore()
  const {
    setGeometryData,
    setManualDocument,
    setWorkspaceMode,
    setCameraControls,
    setOrderedSectionIds,
    setBitmaskVisibility,
    setExplodeAmount,
    setShowAxes,
    setShowGrid,
    setShowLabels,
  } = useGeometry()

  useEffect(() => {
    setWorkspaceMode('manual')
  }, [setWorkspaceMode])

  // Clear project ID from URL on page reload (F5)
  useEffect(() => {
    if (typeof window !== 'undefined' && projectId) {
      const navigation = window.performance?.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
      if (navigation?.type === 'reload') {
        router.replace('/chedotuve')
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
            setManualDocument(data.manualDocument)
            setGeometryData(data.previewGeometryData ?? null)
            if (data.viewState?.cameraControls) setCameraControls(data.viewState.cameraControls)
            if (Array.isArray(data.viewState?.orderedSectionIds)) setOrderedSectionIds(data.viewState.orderedSectionIds)
            if (data.viewState?.bitmaskVisibility) setBitmaskVisibility(data.viewState.bitmaskVisibility)
            if (typeof data.viewState?.explodeAmount === 'number') setExplodeAmount(data.viewState.explodeAmount)
            if (typeof data.viewState?.showAxes === 'boolean') setShowAxes(data.viewState.showAxes)
            if (typeof data.viewState?.showGrid === 'boolean') setShowGrid(data.viewState.showGrid)
            if (typeof data.viewState?.showLabels === 'boolean') setShowLabels(data.viewState.showLabels)
            return
          }
          setGeometryData(data)
        } catch (error) {
          console.error('Lỗi khi load dữ liệu bản vẽ:', error)
        }
      }
    }

    if (!projectId || projects.length === 0) return
    const project = projects.find((item) => item.id === projectId)
    if (!project) return

    try {
      const data = JSON.parse(project.geometryJson)
      if (isManualProjectSnapshot(data)) {
        setManualDocument(data.manualDocument)
        setGeometryData(data.previewGeometryData ?? null)
        if (data.viewState?.cameraControls) setCameraControls(data.viewState.cameraControls)
        if (Array.isArray(data.viewState?.orderedSectionIds)) setOrderedSectionIds(data.viewState.orderedSectionIds)
        if (data.viewState?.bitmaskVisibility) setBitmaskVisibility(data.viewState.bitmaskVisibility)
        if (typeof data.viewState?.explodeAmount === 'number') setExplodeAmount(data.viewState.explodeAmount)
        if (typeof data.viewState?.showAxes === 'boolean') setShowAxes(data.viewState.showAxes)
        if (typeof data.viewState?.showGrid === 'boolean') setShowGrid(data.viewState.showGrid)
        if (typeof data.viewState?.showLabels === 'boolean') setShowLabels(data.viewState.showLabels)
        return
      }
      setGeometryData(data)
    } catch (error) {
      console.error('Lỗi khi load dữ liệu bản vẽ:', error)
    }
  }, [
    projectId,
    projects,
    setCameraControls,
    setGeometryData,
    setManualDocument,
    setOrderedSectionIds,
    setBitmaskVisibility,
    setExplodeAmount,
    setShowAxes,
    setShowGrid,
    setShowLabels,
  ])

  const handleBack = () => {
    router.push('/')
  }

  const handleSwitchToSolver = () => {
    const targetUrl = projectId ? `/chedovethongminh?id=${projectId}` : '/chedovethongminh'
    router.push(targetUrl)
  }

  return <ManualView onBack={handleBack} onSwitchToSolver={handleSwitchToSolver} />
}

export default function ManualDrawingPage() {
  return (
    <GeometryProvider>
      <Suspense
        fallback={
          <div className="h-screen bg-background flex items-center justify-center text-muted-foreground">
            Đang tải không gian làm việc...
          </div>
        }
      >
        <ManualDrawingContent />
      </Suspense>
    </GeometryProvider>
  )
}
