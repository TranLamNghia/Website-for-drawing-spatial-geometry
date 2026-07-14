'use client'

import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { DashboardView } from '@/components/geometry/dashboard-view'
import type { SavedProject } from '@/components/geometry/dashboard-view'
import { storeAuthCallbackUrl } from '@/lib/auth-callback'

export default function DashboardPage() {
  const router = useRouter()
  const { data: session, status } = useSession()

  const handleNewProject = () => {
    router.push('/chedotuve')
  }

  const handleNewAIProject = () => {
    if (status === 'loading') return
    if (!session?.user) {
      storeAuthCallbackUrl('/chedovethongminh')
      router.push('/dangnhap')
      return
    }
    router.push('/chedovethongminh')
  }

  const handleOpenProject = (project: SavedProject) => {
    router.push(`/chedotuve?id=${project.id}`)
  }

  return (
    <DashboardView
      onNewProject={handleNewProject}
      onNewAIProject={handleNewAIProject}
      onOpenProject={handleOpenProject}
    />
  )
}
