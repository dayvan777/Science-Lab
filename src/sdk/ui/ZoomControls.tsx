import { useCameraStore } from '../scene/cameraStore'

const buttonStyle: React.CSSProperties = {
  background: 'rgba(20,20,24,0.72)',
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: '#f5f5f7',
  borderRadius: 10,
  width: 44,
  height: 44,
  fontSize: 20,
  cursor: 'pointer',
  touchAction: 'manipulation',
}

/**
 * Two-button zoom control for the camera. Plus = closer, minus = farther.
 * Wheel-zoom on the canvas works in parallel.
 */
export function ZoomControls() {
  const zoomBy = useCameraStore(s => s.zoomBy)
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
