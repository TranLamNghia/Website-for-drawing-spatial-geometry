'use client'

import * as React from 'react'

export type ViewportTier = 'mobile' | 'tablet' | 'laptop' | 'desktop' | 'ultra'
export type GeometryLayoutMode = 'blocked' | 'single-panel' | 'dual-panel' | 'full'

export const VIEWPORT_BREAKPOINTS = {
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const

function getViewportTier(width: number): ViewportTier {
  if (width < VIEWPORT_BREAKPOINTS.md) return 'mobile'
  if (width < VIEWPORT_BREAKPOINTS.lg) return 'tablet'
  if (width < VIEWPORT_BREAKPOINTS.xl) return 'laptop'
  if (width < VIEWPORT_BREAKPOINTS['2xl']) return 'desktop'
  return 'ultra'
}

export function getGeometryLayoutMode(tier: ViewportTier): GeometryLayoutMode {
  if (tier === 'mobile') return 'blocked'
  if (tier === 'tablet') return 'single-panel'
  if (tier === 'ultra') return 'full'
  return 'dual-panel'
}

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
