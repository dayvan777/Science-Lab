import { useEffect, useState } from 'react'
import { useLabState } from '../state/LabState'
import { Button } from '../../../sdk/ui/Button'
import { useViewport } from '../../../sdk/a11y/useViewport'

export function IntroScreen() {
  const start = useLabState(s => s.start)
  const [stage, setStage] = useState(0)
  const { breakpoint } = useViewport()
  const isPhone = breakpoint === 'phone'

  useEffect(() => {
    const t1 = setTimeout(() => setStage(1), 100)
    const t2 = setTimeout(() => setStage(2), 600)
    const t3 = setTimeout(() => setStage(3), 1100)
    const t4 = setTimeout(() => setStage(4), 1700)
    return () => [t1, t2, t3, t4].forEach(clearTimeout)
  }, [])

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'linear-gradient(180deg, #fafafa 0%, #cdcdd2 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      color: '#1d1d1f', padding: 32,
      fontFamily: '"SF Pro Display", "Inter", system-ui, sans-serif',
    }}>
      <div style={{
        opacity: stage >= 1 ? 1 : 0,
        transform: stage >= 1 ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 600ms ease, transform 600ms ease',
        fontSize: isPhone ? 34 : 56, fontWeight: 200, letterSpacing: -1.5,
        marginBottom: 8, textAlign: 'center',
      }}>
        Практична робота
      </div>
      <div style={{
        opacity: stage >= 2 ? 1 : 0,
        transform: stage >= 2 ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 600ms ease, transform 600ms ease',
        fontSize: isPhone ? 22 : 32, fontWeight: 400, color: '#0071e3',
        marginBottom: 40, textAlign: 'center',
      }}>
        Броунівський рух та дифузія
      </div>
      <div style={{
        opacity: stage >= 3 ? 1 : 0,
        transform: stage >= 3 ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 800ms ease, transform 800ms ease',
        fontSize: 17, color: '#6e6e73', maxWidth: 620,
        textAlign: 'center', lineHeight: 1.55, marginBottom: 48,
      }}>
        Молекули · Дифузія · Температура
        <br />
        <span style={{ display: 'block', marginTop: 12 }}>
          Уся матерія складається з молекул, які ніколи не зупиняються.
          Ми пройдемо 6 сцен і побачимо, як молекулярний хаос спричиняє броунівський рух,
          дифузію в газах, рідинах і твердих тілах та як усе це залежить від температури.
        </span>
      </div>
      <div style={{
        opacity: stage >= 4 ? 1 : 0,
        transform: stage >= 4 ? 'scale(1)' : 'scale(0.9)',
        transition: 'opacity 400ms ease, transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}>
        <Button onClick={start}>Почати дослідження</Button>
      </div>
    </div>
  )
}
