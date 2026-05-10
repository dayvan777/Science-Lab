import type { CSSProperties } from 'react'

/**
 * Full-bleed dark background with three diagonal blur-glow streaks that
 * fade in on page load. Visual reference: studio-glow aesthetic with a
 * warm yellow streak top-right, a soft green core in the middle, and a
 * cool blue streak bottom-left, all heavily blurred against a near-black
 * base (#08080a).
 *
 * Animation is a one-time entrance: opacity 0→1 with a tiny scale settle
 * over 1.5 seconds. Not a loop — explicit user choice. The
 * `prefers-reduced-motion` media query disables the animation entirely.
 */
export function GlowBackground() {
  const baseStyle: CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: -2,
    background: '#08080a',
    pointerEvents: 'none',
  }

  const glowStyle: CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: -1,
    pointerEvents: 'none',
    background: `
      radial-gradient(ellipse 60% 35% at 90% 12%, rgba(255, 200, 70, 0.65) 0%, transparent 75%),
      radial-gradient(ellipse 55% 55% at 70% 60%, rgba(80, 220, 130, 0.55) 0%, transparent 80%),
      radial-gradient(ellipse 55% 70% at 5% 85%, rgba(10, 132, 255, 0.55) 0%, transparent 75%)
    `,
    filter: 'blur(80px)',
    animation: 'nova-evrika-glow-in 1500ms ease-out both',
  }

  // Inline keyframes keep the component self-contained — no external CSS
  // file needed for this one effect. The `both` fill mode means the start
  // state (opacity 0) applies before the animation runs, preventing a
  // one-frame flash of the fully-opaque background on slow first paints.
  return (
    <>
      <style>{`
        @keyframes nova-evrika-glow-in {
          from { opacity: 0; transform: scale(1.05); }
          to   { opacity: 1; transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .nova-evrika-glow-bg { animation: none !important; opacity: 1 !important; transform: none !important; }
        }
      `}</style>
      <div style={baseStyle} aria-hidden="true" />
      <div style={glowStyle} className="nova-evrika-glow-bg" aria-hidden="true" />
    </>
  )
}
