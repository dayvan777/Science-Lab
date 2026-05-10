import { CSSProperties } from 'react'

/**
 * Full-bleed dark background with four radial blur-glow overlays.
 * Static (no animation) — explicit user choice during brainstorm.
 *
 * Colours match the lab's reveal-scene language:
 *   - Apple-blue, bottom-left
 *   - Soft green, bottom-right
 *   - Warm yellow, top-right
 *   - Deep blue, top-left
 *
 * Sits behind everything via `position: fixed; inset: 0; z-index: -1`.
 */
export function GlowBackground() {
  const layerStyle: CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: -1,
    background: '#08080a',
    pointerEvents: 'none',
  }

  const glowStyle: CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: -1,
    pointerEvents: 'none',
    background: `
      radial-gradient(circle at 12% 88%, rgba(10, 132, 255, 0.55) 0%, transparent 35%),
      radial-gradient(circle at 88% 18%, rgba(255, 220, 80, 0.30) 0%, transparent 30%),
      radial-gradient(circle at 75% 75%, rgba(80, 220, 130, 0.40) 0%, transparent 35%),
      radial-gradient(circle at 5% 30%, rgba(50, 80, 160, 0.30) 0%, transparent 30%)
    `,
    filter: 'blur(40px)',
  }

  return (
    <>
      <div style={layerStyle} aria-hidden="true" />
      <div style={glowStyle} aria-hidden="true" />
    </>
  )
}
