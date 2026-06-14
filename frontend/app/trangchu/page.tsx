'use client'

import { useRouter } from 'next/navigation'
import { DashboardView } from '@/components/geometry/dashboard-view'
import type { SavedProject } from '@/components/geometry/dashboard-view'

export default function DashboardPage() {
  const router = useRouter()

  const handleNewProject = () => {
    router.push('/chedotuve')
  }

  const handleOpenProject = (project: SavedProject) => {
    router.push(`/chedotuve?id=${project.id}`)
  }

  return <DashboardView onNewProject={handleNewProject} onOpenProject={handleOpenProject} />
}

