import { ReactNode, useEffect, useRef, useState } from 'react'

type Props = {
  /** Controlled-open flag. Parent owns the state. */
  open: boolean
  /** Called on backdrop tap, × click, or swipe-down past threshold. */
  onClose: () => void
  /** Header title. Defaults to 'Налаштування'. */
  title?: string
  /** Sheet content. Caller composes whatever grouping/layout it needs. */
  children: ReactNode
}

/**
 * Bottom-sheet primitive — slides up from the bottom on phone+tablet to
 * host secondary lab controls (field/coil/magnet/sound/respawn) behind a
 * single settings button. Three dismiss modes:
 *  - Tap the backdrop (the dimmed area above the sheet)
 *  - Click the × button in the header
 *  - Swipe the drag handle or header DOWN by >100 px
 *
 * Body is independently scrollable; dragging the body does NOT trigger
 * dismissal — pointer handlers are attached only to the handle+header.
 *
 * z-index: backdrop 100, sheet 101 (above HUD's 10).
 *
 * The component renders nothing when `open === false` AND the close
 * animation has finished; this avoids holding the dialog DOM during the
 * common closed state.
 */
export function BottomSheet({ open, onClose, title = 'Налаштування', children }: Props) {
  // `mounted` keeps the sheet in the DOM during the close animation,
  // toggled in lockstep with `open` but with a 250 ms unmount delay.
  const [mounted, setMounted] = useState(open)
  // `visible` controls the slide-up transform. Lags `open` by one paint
  // frame on open, so the browser sees the initial translateY(100%) and
  // animates from there. Without the lag the first appearance jumps.
  const [visible, setVisible] = useState(false)

  // Swipe-down state — pointer events on handle+header only.
  const dragStartY = useRef<number | null>(null)
  const [dragOffset, setDragOffset] = useState(0)

  // Mount/unmount + visibility flip on every `open` change.
  useEffect(() => {
    if (open) {
      setMounted(true)
      // One RAF tick so the browser commits the initial style, then animate.
      const raf = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(raf)
    } else {
      setVisible(false)
      const t = setTimeout(() => setMounted(false), 250)
      return () => clearTimeout(t)
    }
  }, [open])

  // ESC closes (desktop debugging aid; no harm on touch).
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!mounted) return null

  const dragging = dragStartY.current !== null

  function onPointerDown(e: React.PointerEvent) {
    dragStartY.current = e.clientY
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  function onPointerMove(e: React.PointerEvent) {
    if (dragStartY.current === null) return
    const delta = Math.max(0, e.clientY - dragStartY.current)
    setDragOffset(delta)
  }
  function onPointerUp() {
    if (dragStartY.current === null) return
    const finalDelta = dragOffset
    dragStartY.current = null
    setDragOffset(0)
    if (finalDelta > 100) onClose()
  }

  return (
    <>
      {/* Backdrop — fades in/out, stops click propagation so taps don't fall to the canvas. */}
      <div
        onClick={(e) => { e.stopPropagation(); onClose() }}
        role="presentation"
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(2px)',
          opacity: visible ? 1 : 0,
          transition: 'opacity 250ms cubic-bezier(0.32, 0.72, 0, 1)',
          zIndex: 100,
          pointerEvents: 'auto',
        }}
      />
      {/* Sheet container — slides up. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="bottom-sheet-title"
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          height: 'min(70vh, 600px)',
          background: 'rgba(248,248,250,0.96)',
          backdropFilter: 'blur(40px) saturate(180%)',
          borderRadius: '16px 16px 0 0',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.25)',
          zIndex: 101,
          display: 'flex',
          flexDirection: 'column',
          transform: visible ? `translateY(${dragOffset}px)` : 'translateY(100%)',
          transition: dragging ? 'none' : 'transform 250ms cubic-bezier(0.32, 0.72, 0, 1)',
          color: '#1d1d1f',
          fontFamily: '"SF Pro Display", "Inter", system-ui, sans-serif',
        }}
      >
        {/* Drag handle + header — pointer-down here triggers swipe-down dismiss. */}
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{ flexShrink: 0, touchAction: 'none', cursor: 'grab' }}
        >
          {/* Grip handle */}
          <div style={{
            width: 36,
            height: 5,
            margin: '8px auto 4px',
            borderRadius: 100,
            background: 'rgba(0,0,0,0.18)',
          }} />
          {/* Header row */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 20px 12px',
            borderBottom: '1px solid rgba(0,0,0,0.08)',
          }}>
            <div id="bottom-sheet-title" style={{ fontSize: 18, fontWeight: 600 }}>
              {title}
            </div>
            <button
              onClick={onClose}
              aria-label="Закрити"
              title="Закрити"
              style={{
                background: 'rgba(0,0,0,0.06)',
                border: 'none',
                borderRadius: 100,
                width: 44,
                height: 44,
                fontSize: 20,
                lineHeight: 1,
                cursor: 'pointer',
                color: '#1d1d1f',
              }}
            >
              ×
            </button>
          </div>
        </div>
        {/* Scrollable body — pointer events here do NOT trigger dismiss. */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 20px',
          paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 0px))',
        }}>
          {children}
        </div>
      </div>
    </>
  )
}
