'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ManualView } from '@/components/geometry/manual-view'
import { GeometryProvider, useGeometry } from '@/components/geometry/geometry-context'
import { isManualProjectSnapshot } from '@/components/geometry/manual-editor'
import { useProjectStore } from '@/hooks/use-project-store'

function ManualDrawingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = searchParams.get('id')
  const { projects } = useProjectStore()
  const {
    setGeometryData,
    setManualDocument,
    setWorkspaceMode,
    setShowAxes,
    setShowGrid,
    setShowLabels,
  } = useGeometry()

  useEffect(() => {
    setWorkspaceMode('manual')
  }, [setWorkspaceMode])

  useEffect(() => {
    if (!projectId || projects.length === 0) return
    const project = projects.find((item) => item.id === projectId)
    if (!project) return

    try {
      const data = JSON.parse(project.geometryJson)
      if (isManualProjectSnapshot(data)) {
        setManualDocument(data.manualDocument)
        setGeometryData(null)
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
    setGeometryData,
    setManualDocument,
    setShowAxes,
    setShowGrid,
    setShowLabels,
  ])

  const handleBack = () => {
    router.push('/')
  }

  const handleSwitchToSolver = () => {
    const targetUrl = projectId ? `/che-do-ve-thong-minh?id=${projectId}` : '/che-do-ve-thong-minh'
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

