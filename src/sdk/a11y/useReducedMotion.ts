import { useEffect, useState } from 'react'

/**
 * Returns true when the OS-level "reduce motion" preference is set.
 * Listens to changes — toggling the setting at runtime updates the value
 * without a page reload.
 *
 * Components that drive non-essential motion (camera dollies, intro title
 * fade-in, milestone slide-in) should check this and replace transitions
 * with instant cuts when true.
 *
 * The 3D rendering itself (object physics, instrument animations) is
 * essential to the lab and is NOT gated by this preference.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return reduced
}
