import { useEffect, useState, useRef } from 'react'
import { useLabState } from '../state/LabState'
import { tasks } from '../content/tasks'
import { Button } from '../../../sdk/ui/Button'
import { sound } from '../../../sdk/audio/SoundManager'
import { lerp, easeOutCubic, clamp } from '../../../sdk/animation'

const BASE_FONT = '"SF Pro Display", "Inter", system-ui, sans-serif'
const G = 9.8

type ObjectGroup = {
  objectId: string
  displayName: string
  emoji: string
  /** Three measurements: digital scale, lever, dynamometer (already converted to grams). */
  measurements: { instrumentLabel: string; valueGrams: number; rawValue: number; unit: 'g' | 'N' }[]
  /** Average / canonical mass for bar scaling (grams). */
  massGrams: number
}

const OBJECT_EMOJI: Record<string, string> = {
  'tennis-ball': '🏓',
  apple: '⚙️',
  baseball: '⚾',
}

/** Build the per-object grouping from the journal entries. */
function buildGroups(journal: { taskId: string; userValue: number }[]): ObjectGroup[] {
  const byObject: Record<string, ObjectGroup> = {}
  for (const t of tasks) {
    const entry = journal.find(e => e.taskId === t.id)
    const userVal = entry?.userValue ?? 0
    const valueGrams = t.inputUnit === 'N' ? (userVal / G) * 1000 : userVal
    const instrumentLabel =
      t.instrumentId === 'digital-scale' ? 'Електронні ваги'
      : t.instrumentId === 'lever-balance' ? 'Важільні ваги'
      : 'Динамометр'
    if (!byObject[t.objectId]) {
      byObject[t.objectId] = {
        objectId: t.objectId,
        displayName: t.displayName,
        emoji: OBJECT_EMOJI[t.objectId] ?? '●',
        measurements: [],
        massGrams: 0,
      }
    }
    byObject[t.objectId].measurements.push({
      instrumentLabel,
      valueGrams,
      rawValue: userVal,
      unit: t.inputUnit,
    })
  }
  return Object.values(byObject).map(g => ({
    ...g,
    massGrams: g.measurements.reduce((a, m) => a + m.valueGrams, 0) / g.measurements.length,
  }))
}

type RevealPhase = 'fade-in' | 'columns' | 'numbers' | 'conclusion' | 'cta'

export function RevealScene() {
  const journal = useLabState(s => s.journal)
  const reset = useLabState(s => s.reset)
  const groups = buildGroups(journal)
  const maxMass = Math.max(...groups.map(g => g.massGrams), 1)

  const [phase, setPhase] = useState<RevealPhase>('fade-in')

  // Tick-up progress per measurement (0 to 1). Drives both the displayed
  // number and the bar width.
  const tickProgressRef = useRef(0)
  const [tickProgress, setTickProgress] = useState(0)

  useEffect(() => {
    sound.play('whoosh')
    const t1 = setTimeout(() => setPhase('columns'), 1200)
    const t2 = setTimeout(() => setPhase('numbers'), 2200)
    const t3 = setTimeout(() => setPhase('conclusion'), 4500)
    const t4 = setTimeout(() => { setPhase('cta'); sound.play('success') }, 6000)
    return () => { [t1, t2, t3, t4].forEach(clearTimeout) }
  }, [])

  // Drive the tick-up animation while phase === 'numbers' or later.
  useEffect(() => {
    if (phase !== 'numbers' && phase !== 'conclusion' && phase !== 'cta') return
    const start = performance.now()
    const DURATION = 1500
    let raf = 0
    const step = () => {
      const elapsed = performance.now() - start
      const t = clamp(elapsed / DURATION, 0, 1)
      const u = easeOutCubic(t)
      tickProgressRef.current = u
      setTickProgress(u)
      if (t < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [phase])

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'radial-gradient(ellipse at center, #1a1a20 0%, #0a0a0c 100%)',
      color: '#f5f5f7',
      fontFamily: BASE_FONT,
      overflow: 'auto',
      padding: 32,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
    }}>
      {/* Title */}
      <div style={{
        textAlign: 'center',
        marginTop: 40,
        opacity: phase === 'fade-in' ? 0 : 1,
        transform: phase === 'fade-in' ? 'translateY(20px)' : 'translateY(0)',
        transition: 'opacity 800ms ease, transform 800ms ease',
      }}>
        <div style={{
          fontSize: 12, letterSpacing: 3, textTransform: 'uppercase',
          color: '#a8a8b0', marginBottom: 10,
        }}>
          Що ти відкрив
        </div>
        <div style={{ fontSize: 38, fontWeight: 700, letterSpacing: '-0.02em' }}>
          Три прилади. Один результат.
        </div>
      </div>

      {/* Three columns */}
      <div style={{
        display: 'flex',
        gap: 20,
        marginTop: 48,
        maxWidth: 1100,
        width: '100%',
      }}>
        {groups.map((g, i) => {
          const colVisible = phase !== 'fade-in'
          // Columns rise in a staggered wave
          const stagger = i * 150
          return (
            <div
              key={g.objectId}
              style={{
                flex: 1,
                background: 'rgba(20, 20, 26, 0.6)',
                backdropFilter: 'blur(24px)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 16,
                padding: 24,
                opacity: colVisible ? 1 : 0,
                transform: colVisible ? 'translateY(0)' : 'translateY(40px)',
                transition: `opacity 600ms ease ${stagger}ms, transform 600ms cubic-bezier(.2,.9,.3,1.05) ${stagger}ms`,
              }}
            >
              <div style={{
                fontSize: 13, color: '#a8a8b0',
                marginBottom: 16, textAlign: 'center',
                fontWeight: 500,
              }}>
                {g.emoji} {g.displayName}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {g.measurements.map((m, j) => {
                  const displayedGrams = lerp(0, m.valueGrams, tickProgress)
                  const barFrac = clamp((m.valueGrams / maxMass) * tickProgress, 0, 1)
                  const formula = m.unit === 'N'
                    ? <span style={{ color: '#666', fontSize: 10, marginLeft: 6 }}>
                        ({m.rawValue.toFixed(2)} N ÷ 9.8)
                      </span>
                    : null
                  return (
                    <div key={j}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: 12,
                        color: '#a8a8b0',
                        marginBottom: 5,
                      }}>
                        <span>{m.instrumentLabel}</span>
                        <span style={{
                          color: '#7fff60',
                          fontFamily: '"JetBrains Mono", monospace',
                          fontWeight: 600,
                          fontVariantNumeric: 'tabular-nums',
                        }}>
                          {Math.round(displayedGrams)} г
                          {formula}
                        </span>
                      </div>
                      <div style={{
                        height: 6,
                        background: '#1a1a1c',
                        borderRadius: 3,
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          width: `${barFrac * 100}%`,
                          height: '100%',
                          background: 'linear-gradient(90deg, #0a84ff, #7fff60)',
                          transition: 'width 30ms linear',
                        }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Conclusion */}
      <div style={{
        textAlign: 'center',
        marginTop: 56,
        maxWidth: 720,
        opacity: phase === 'conclusion' || phase === 'cta' ? 1 : 0,
        transform: phase === 'conclusion' || phase === 'cta' ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 1000ms ease, transform 1000ms ease',
      }}>
        <div style={{ fontSize: 24, fontWeight: 600, marginBottom: 12, lineHeight: 1.3 }}>
          Маса не залежить від методу вимірювання.
        </div>
        <div style={{ fontSize: 16, color: '#a8a8b0', lineHeight: 1.5 }}>
          Це фундаментальна властивість матерії — інваріантність маси.
        </div>
      </div>

      {/* CTAs */}
      <div style={{
        display: 'flex',
        gap: 12,
        marginTop: 36,
        opacity: phase === 'cta' ? 1 : 0,
        transform: phase === 'cta' ? 'translateY(0)' : 'translateY(12px)',
        transition: 'opacity 600ms ease, transform 600ms ease',
        pointerEvents: phase === 'cta' ? 'auto' : 'none',
      }}>
        <Button onClick={reset}>Спробувати знову</Button>
        <Button variant="secondary" onClick={() => alert('Наступна лабораторна — скоро!')}>
          Наступна лабораторна (скоро)
        </Button>
      </div>
    </div>
  )
}
