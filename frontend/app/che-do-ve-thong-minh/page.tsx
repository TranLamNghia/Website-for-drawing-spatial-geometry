'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { SolverView } from '@/components/geometry/solver-view'
import { GeometryProvider, useGeometry } from '@/components/geometry/geometry-context'
import { useProjectStore } from '@/hooks/use-project-store'

function SmartSolverContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = searchParams.get('id')
  const { projects } = useProjectStore()
  const { setGeometryData } = useGeometry()

  useEffect(() => {
    if (projectId && projects.length > 0) {
      const project = projects.find(p => p.id === projectId)
      if (project) {
        try {
          const data = JSON.parse(project.geometryJson)
          setGeometryData(data)
        } catch (e) {
          console.error("Lỗi khi load dữ liệu bản vẽ:", e)
        }
      }
    }
  }, [projectId, projects, setGeometryData])

  const handleBack = () => {
    router.push('/')
  }

  return (
    <SolverView onBack={handleBack} />
  )
}

export default function SmartSolverPage() {
  return (
    <GeometryProvider>
      <Suspense fallback={<div className="h-screen bg-background flex items-center justify-center text-muted-foreground">Đang tải trợ lý AI...</div>}>
        <SmartSolverContent />
      </Suspense>
    </GeometryProvider>
  )
}
