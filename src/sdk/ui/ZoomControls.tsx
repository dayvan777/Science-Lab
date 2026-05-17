import { useCameraStore } from '../scene/cameraStore'
import { useViewport } from '../a11y/useViewport'

/**
 * Two-button zoom control for the camera. Plus = closer, minus = farther.
 * Wheel-zoom on the canvas works in parallel.
 *
 * Buttons are 48×48 on phone (Apple HIG ≥44 pt for touch targets) and
 * 40×40 on tablet/desktop where pointer accuracy is higher.
 */
export function ZoomControls() {
  const zoomBy = useCameraStore(s => s.zoomBy)
  const { breakpoint } = useViewport()
  const isPhone = breakpoint === 'phone'

  const buttonStyle: React.CSSProperties = {
    background: 'rgba(20,20,24,0.72)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: '#f5f5f7',
    borderRadius: 8,
    width: isPhone ? 48 : 40,
    height: isPhone ? 48 : 40,
    fontSize: isPhone ? 22 : 18,
    cursor: 'pointer',
  }

  return (
    <>
      <button
        onClick={() => zoomBy(0.85)}
        title="Наблизити"
        aria-label="Наблизити камеру"
        style={buttonStyle}
      >+</button>
      <button
        onClick={() => zoomBy(1.18)}
        title="Віддалити"
        aria-label="Віддалити камеру"
        style={buttonStyle}
      >−</button>
    </>
  )
}
