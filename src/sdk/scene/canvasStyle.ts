import type { CSSProperties } from 'react'

/**
 * Base style for the R3F <Canvas> DOM element. Centralised here because the
 * touch-related properties are critical: without them, drag input is unreliable
 * on phones (browsers intercept the gesture for page scroll/zoom before the
 * pointer handler fires).
 *
 * Labs spread this and add their own `background` gradient on top.
 */
export const CANVAS_BASE_STYLE: CSSProperties = {
  position: 'fixed',
  inset: 0,
  touchAction: 'none',
  userSelect: 'none',
  WebkitUserSelect: 'none',
  WebkitTouchCallout: 'none',
  WebkitTapHighlightColor: 'transparent',
}
