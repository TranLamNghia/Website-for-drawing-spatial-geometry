export type ViewportTier = 'mobile' | 'tablet' | 'laptop' | 'desktop' | 'ultra'
export type GeometryLayoutMode = 'blocked' | 'single-panel' | 'dual-panel' | 'full'

export const VIEWPORT_BREAKPOINTS = {
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const

export const RESPONSIVE_SPACING = {
  pageX: {
    mobile: '1rem',
    tablet: '1.5rem',
    laptop: '2rem',
    desktop: '2rem',
    ultra: '3rem',
  },
  touchTarget: {
    compact: '2.75rem',
    desktop: '2rem',
  },
  contentMaxWidth: '72rem',
} as const

export function getViewportTier(width: number): ViewportTier {
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
