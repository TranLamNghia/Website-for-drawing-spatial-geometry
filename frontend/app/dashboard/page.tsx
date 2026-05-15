'use client'

import { useRouter } from 'next/navigation'
import { DashboardView } from '@/components/geometry/dashboard-view'
import type { SavedProject } from '@/components/geometry/dashboard-view'

export default function DashboardPage() {
  const router = useRouter()

  const handleNewProject = () => {
    router.push('/che-do-tu-ve')
  }

  const handleOpenProject = (project: SavedProject) => {
    router.push(`/che-do-tu-ve?id=${project.id}`)
  }

  return <DashboardView onNewProject={handleNewProject} onOpenProject={handleOpenProject} />
}

