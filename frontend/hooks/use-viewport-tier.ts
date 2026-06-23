'use client'

import * as React from 'react'
import {
  getGeometryLayoutMode,
  getViewportTier,
  type GeometryLayoutMode,
  type ViewportTier,
  VIEWPORT_BREAKPOINTS,
} from '@/lib/breakpoints'

export { getGeometryLayoutMode, VIEWPORT_BREAKPOINTS }
export type { GeometryLayoutMode, ViewportTier }

export function useViewportTier() {
  const [tier, setTier] = React.useState<ViewportTier | null>(null)

  React.useEffect(() => {
    const updateTier = () => setTier(getViewportTier(window.innerWidth))

    updateTier()
    window.addEventListener('resize', updateTier)
    return () => window.removeEventListener('resize', updateTier)
  }, [])

  return tier
}

export function useGeometryLayoutMode() {
  const tier = useViewportTier()

  return React.useMemo(() => (tier ? getGeometryLayoutMode(tier) : null), [tier])
}
