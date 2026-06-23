'use client'

import * as React from 'react'

export function useMinWidth(width: number) {
  const [matches, setMatches] = React.useState<boolean | null>(null)

  React.useEffect(() => {
    const query = window.matchMedia(`(min-width: ${width}px)`)
    const update = () => setMatches(query.matches)

    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [width])

  return matches
}
