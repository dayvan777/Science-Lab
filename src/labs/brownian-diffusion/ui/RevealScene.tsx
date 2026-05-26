import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLabState } from '../state/LabState'
import { useViewport } from '../../../sdk/a11y/useViewport'
import { SCENES } from '../content/scenes'

/** Look up the choice label for a given scene index and chosen answer index. */
function choiceLabel(sceneIndex: number, chosenIndex: number): string {
  const scene = SCENES[sceneIndex]
  if (!scene) return '—'
  const mcStep = scene.steps.find(s => s.choices != null)
  if (!mcStep || !mcStep.choices) return '—'
  return mcStep.choices[chosenIndex]?.label ?? '—'
}

export function RevealScene() {
  const [stage, setStage] = useState(0)
  const reset = useLabState(s => s.reset)
  const journal = useLabState(s => s.journal)
  const { breakpoint } = useViewport()
  const isPhone = breakpoint === 'phone'

  useEffect(() => {
    // Stages: 1=title, 2-7=journal entries, 8=nav buttons.
    const timers = [400, 1500, 2600, 3700, 4800, 5900, 7000, 7900].map((ms, i) =>
      setTimeout(() => setStage(i + 1), ms),
    )
    return () => timers.forEach(clearTimeout)
  }, [])

  const navWrapStyle: React.CSSProperties = {
    display: 'flex',
    gap: 16,
    marginTop: isPhone ? 32 : 56,
    opacity: stage >= 8 ? 1 : 0,
    transform: stage >= 8 ? 'translateY(0)' : 'translateY(20px)',
    transition: 'opacity 600ms ease, transform 600ms ease',
  }

  const primaryPillStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '14px 28px',
    borderRadius: 100,
    background: 'rgba(255, 255, 255, 0.96)',
    color: '#1d1d1f',
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: '0.10em',
    textTransform: 'uppercase',
    textDecoration: 'none',
    fontFamily: '"Inter", system-ui, sans-serif',
    boxShadow: '0 8px 28px rgba(0, 0, 0, 0.4)',
  }

  const ghostPillStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '14px 28px',
    borderRadius: 100,
    background: 'transparent',
    color: '#fff',
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: '0.10em',
    textTransform: 'uppercase',
    fontFamily: '"Inter", system-ui, sans-serif',
    border: '1px solid rgba(255, 255, 255, 0.30)',
    cursor: 'pointer',
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#08080a',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'safe center',
      overflowY: 'auto',
      color: '#fff', padding: isPhone ? 20 : 32,
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
        fontSize: isPhone ? 26 : 36, fontWeight: 800, letterSpacing: -0.02,
        marginBottom: isPhone ? 24 : 40, textTransform: 'uppercase', textAlign: 'center',
      }}>
        Дослідження завершено
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: isPhone ? 14 : 22, maxWidth: 760, textAlign: 'center' }}>
        {journal.map((entry, i) => (
          <div key={i} style={{
            opacity: stage >= i + 2 ? 1 : 0,
            transform: stage >= i + 2 ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 600ms ease, transform 600ms ease',
            fontSize: isPhone ? 16 : 22, fontWeight: 500, color: 'rgba(255,255,255,0.9)',
            lineHeight: 1.5,
          }}>
            <span style={{ color: '#0a84ff', fontWeight: 700, marginRight: 8 }}>{i + 1}.</span>
            <span style={{ color: 'rgba(255,255,255,0.55)', marginRight: 8 }}>{entry.sceneTitle}:</span>
            {choiceLabel(i, entry.chosenIndex)}
          </div>
        ))}
      </div>

      {/* Navigation — fade in at stage 8 (after all 6 journal entries). */}
      <div style={navWrapStyle}>
        <Link to="/" style={primaryPillStyle} aria-label="Назад на головну">
          ← На головну
        </Link>
        <button
          type="button"
          onClick={() => reset()}
          style={ghostPillStyle}
          aria-label="Знову пройти лабораторну"
        >
          ↻ Знову
        </button>
      </div>
    </div>
  )
}
