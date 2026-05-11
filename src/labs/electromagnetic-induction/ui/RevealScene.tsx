import { useEffect, useState } from 'react'

const CONCLUSIONS = [
  'Струм виникає лише при ЗМІНІ магнітного потоку.',
  'Швидше рух → більший струм (закон Фарадея).',
  'Зміна напрямку руху → зміна напрямку струму (закон Ленца).',
]

export function RevealScene() {
  const [stage, setStage] = useState(0)

  useEffect(() => {
    const timers = [400, 1500, 2600, 3700].map((ms, i) =>
      setTimeout(() => setStage(i + 1), ms),
    )
    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#08080a',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      color: '#fff', padding: 32,
      fontFamily: '"Inter", system-ui, sans-serif',
    }}>
      {/* Glow backdrop */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `
          radial-gradient(ellipse 60% 35% at 90% 12%, rgba(255, 200, 70, 0.45) 0%, transparent 75%),
          radial-gradient(ellipse 55% 55% at 70% 60%, rgba(80, 220, 130, 0.40) 0%, transparent 80%),
          radial-gradient(ellipse 55% 70% at 5% 85%, rgba(10, 132, 255, 0.45) 0%, transparent 75%)
        `,
        filter: 'blur(60px)',
        pointerEvents: 'none',
      }} />

      <div style={{
        opacity: stage >= 1 ? 1 : 0,
        transform: stage >= 1 ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 600ms ease, transform 600ms ease',
        fontFamily: '"Saira", "Inter", sans-serif',
        fontSize: 36, fontWeight: 800, letterSpacing: -0.02,
        marginBottom: 40, textTransform: 'uppercase', textAlign: 'center',
      }}>
        Висновки
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 760, textAlign: 'center' }}>
        {CONCLUSIONS.map((text, i) => (
          <div key={i} style={{
            opacity: stage >= i + 2 ? 1 : 0,
            transform: stage >= i + 2 ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 600ms ease, transform 600ms ease',
            fontSize: 22, fontWeight: 500, color: 'rgba(255,255,255,0.9)',
            lineHeight: 1.5,
          }}>
            <span style={{ color: '#0a84ff', fontWeight: 700, marginRight: 8 }}>{i + 1}.</span>
            {text}
          </div>
        ))}
      </div>
    </div>
  )
}
