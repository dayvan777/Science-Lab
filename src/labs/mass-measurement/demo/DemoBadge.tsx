import { useEffect, useState } from 'react'

const BASE_FONT = '"SF Pro Display", "Inter", system-ui, sans-serif'

/**
 * Small badge shown in the top-left while demo mode is active.
 * Pulses subtly so the viewer knows the lab is auto-walking, not frozen.
 */
export function DemoBadge() {
  const [pulse, setPulse] = useState(false)
  useEffect(() => {
    const t = setInterval(() => setPulse(p => !p), 1200)
    return () => clearInterval(t)
  }, [])

  return (
    <div
      style={{
        position: 'fixed',
        top: 16,
        left: 16,
        zIndex: 40,
        background: 'rgba(255, 60, 50, 0.18)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 60, 50, 0.35)',
        color: '#ff6b62',
        borderRadius: 100,
        padding: '6px 14px',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        fontFamily: BASE_FONT,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        pointerEvents: 'none',
      }}
    >
      <span style={{
        width: 8, height: 8, borderRadius: '50%',
        background: '#ff3b30',
        opacity: pulse ? 1 : 0.4,
        transition: 'opacity 600ms ease',
        boxShadow: pulse ? '0 0 8px #ff3b30' : 'none',
      }} />
      Demo режим
    </div>
  )
}
