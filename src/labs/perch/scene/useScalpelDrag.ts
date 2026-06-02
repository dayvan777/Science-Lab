import { useEffect, useRef, useState } from 'react'
import { cutProgressFromDrag } from './cut'

/** Pixels of horizontal drag that equals a full belly cut (head → vent). */
export const DRAG_PX = 320

/**
 * Drag-to-cut lifecycle for the scalpel handle. On {@link startDrag} it captures
 * the pointer's start X and the cut progress at grab time, then maps subsequent
 * horizontal drag into `setCut` until the pointer is released. The `window`
 * listeners live in an effect keyed on the active drag, so they are torn down on
 * release *and* on unmount mid-drag — never orphaned.
 */
export function useScalpelDrag(cutProgress: number, setCut: (p: number) => void) {
  const [isDragging, setDragging] = useState(false)
  const startX = useRef(0)
  const base = useRef(0)

  useEffect(() => {
    if (!isDragging) return
    const move = (ev: PointerEvent) =>
      setCut(base.current + cutProgressFromDrag(ev.clientX - startX.current, DRAG_PX))
    const up = () => setDragging(false)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
  }, [isDragging, setCut])

  const startDrag = (clientX: number) => {
    startX.current = clientX
    base.current = cutProgress
    setDragging(true)
  }

  return { isDragging, startDrag }
}
