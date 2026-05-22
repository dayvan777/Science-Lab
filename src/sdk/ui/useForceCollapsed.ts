import { useEffect, useState } from 'react'

/**
 * Returns true while a drag is in progress, with a grace period before
 * flipping back to false on release. Used by lab HUDs to auto-collapse
 * the task/journal panels during interaction (so the 3D scene is
 * unobstructed) without flickering when the student briefly releases and
 * re-grabs an object.
 *
 * @param draggingBodyId  non-null while a body is being dragged (from StepEngine).
 * @param graceMs         delay before re-expanding on release. Default 300.
 */
export function useForceCollapsed(draggingBodyId: string | null, graceMs = 300): boolean {
  const [forceCollapsed, setForceCollapsed] = useState(false)
  useEffect(() => {
    if (draggingBodyId !== null) {
      setForceCollapsed(true)
      return
    }
    const t = setTimeout(() => setForceCollapsed(false), graceMs)
    return () => clearTimeout(t)
  }, [draggingBodyId, graceMs])
  return forceCollapsed
}
