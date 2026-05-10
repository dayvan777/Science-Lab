import { useEffect, useState } from 'react'

export type Breakpoint = 'desktop' | 'tablet' | 'phone'

/**
 * Reactive viewport size + named breakpoint.
 *
 *   desktop : ≥ 900 px wide
 *   tablet  : 600..899 px (also matches phones in landscape)
 *   phone   : < 600 px (phones in portrait)
 *
 * Listens to window resize. Server-safe (returns sane defaults when
 * window is undefined, e.g. during SSR/test rendering).
 */
export function useViewport(): { width: number; height: number; breakpoint: Breakpoint } {
  const [size, setSize] = useState(() => readViewport())

  useEffect(() => {
    if (typeof window === 'undefined') return
    const onResize = () => setSize(readViewport())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return size
}

function readViewport(): { width: number; height: number; breakpoint: Breakpoint } {
  if (typeof window === 'undefined') {
    return { width: 1280, height: 800, breakpoint: 'desktop' }
  }
  const width = window.innerWidth
  const height = window.innerHeight
  const breakpoint: Breakpoint =
    width >= 900 ? 'desktop' :
    width >= 600 ? 'tablet'  :
    'phone'
  return { width, height, breakpoint }
}
