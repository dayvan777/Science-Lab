import { useEffect, useState } from 'react'

const BASE_FONT = '"SF Pro Display", "Inter", system-ui, sans-serif'

type Props = {
  /** Called when the title's display window has closed. */
  onComplete: () => void
}

/**
 * Cinematic title overlay shown for ~3 seconds at the very start of the lab.
 * Fades in, holds, fades out. Click-through so it never blocks interaction.
 */
export function IntroTitle({ onComplete }: Props) {
  const [phase, setPhase] = useState<'fade-in' | 'hold' | 'fade-out' | 'done'>('fade-in')

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('hold'), 600)
    const t2 = setTimeout(() => setPhase('fade-out'), 2200)
    const t3 = setTimeout(() => { setPhase('done'); onComplete() }, 3000)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [onComplete])

  if (phase === 'done') return null

  const opacity = phase === 'fade-in' || phase === 'hold' ? 1 : 0
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        zIndex: 25,
        opacity,
        transition: 'opacity 600ms ease',
        fontFamily: BASE_FONT,
        color: '#f5f5f7',
        textShadow: '0 2px 24px rgba(0,0,0,0.7)',
      }}
    >
      <div style={{
        fontSize: 11,
        letterSpacing: 3,
        textTransform: 'uppercase',
        color: '#a8a8b0',
        marginBottom: 12,
      }}>
        Лабораторна робота 1
      </div>
      <div style={{ fontSize: 42, fontWeight: 700, letterSpacing: '-0.02em', textAlign: 'center', maxWidth: 720 }}>
        Вимірювання маси тіл
      </div>
    </div>
  )
}
