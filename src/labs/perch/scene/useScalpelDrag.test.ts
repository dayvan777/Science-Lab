import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useScalpelDrag, DRAG_PX } from './useScalpelDrag'

/** jsdom MouseEvent carries clientX and can take any type string. */
function pointer(type: string, clientX: number) {
  return new MouseEvent(type, { clientX, bubbles: true })
}

describe('useScalpelDrag', () => {
  it('starts not dragging and ignores pointermove before a drag begins', () => {
    const setCut = vi.fn()
    const { result } = renderHook(() => useScalpelDrag(0, setCut))
    expect(result.current.isDragging).toBe(false)
    window.dispatchEvent(pointer('pointermove', 200))
    expect(setCut).not.toHaveBeenCalled()
  })

  it('maps horizontal drag to setCut(base + cutProgressFromDrag(dx, DRAG_PX))', () => {
    const setCut = vi.fn()
    const { result } = renderHook(() => useScalpelDrag(0.2, setCut))
    act(() => result.current.startDrag(100))
    expect(result.current.isDragging).toBe(true)
    // drag half the full span → +0.5 on top of base 0.2
    window.dispatchEvent(pointer('pointermove', 100 + DRAG_PX * 0.5))
    expect(setCut).toHaveBeenCalledTimes(1)
    expect(setCut.mock.calls[0][0]).toBeCloseTo(0.7, 6)
  })

  it('captures base cutProgress at grab time (zero drag → setCut(base))', () => {
    const setCut = vi.fn()
    const { result } = renderHook(() => useScalpelDrag(0.4, setCut))
    act(() => result.current.startDrag(50))
    window.dispatchEvent(pointer('pointermove', 50)) // dx = 0
    expect(setCut).toHaveBeenLastCalledWith(0.4)
  })

  it('pointerup ends the drag and removes the window listeners', () => {
    const setCut = vi.fn()
    const { result } = renderHook(() => useScalpelDrag(0, setCut))
    act(() => result.current.startDrag(0))
    act(() => {
      window.dispatchEvent(pointer('pointerup', 0))
    })
    expect(result.current.isDragging).toBe(false)
    setCut.mockClear()
    window.dispatchEvent(pointer('pointermove', 300))
    expect(setCut).not.toHaveBeenCalled()
  })

  it('removes the window listeners on unmount mid-drag', () => {
    const setCut = vi.fn()
    const { result, unmount } = renderHook(() => useScalpelDrag(0, setCut))
    act(() => result.current.startDrag(0))
    window.dispatchEvent(pointer('pointermove', DRAG_PX * 0.25))
    expect(setCut).toHaveBeenCalledTimes(1) // listener is live during the drag
    unmount()
    setCut.mockClear()
    window.dispatchEvent(pointer('pointermove', DRAG_PX * 0.5))
    expect(setCut).not.toHaveBeenCalled() // cleaned up on unmount, not orphaned
  })
})
