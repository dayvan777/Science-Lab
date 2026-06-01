import { useEffect, useState } from 'react'
import { useParameciumState } from '../state/ParameciumState'
import { Button } from '../../../sdk/ui/Button'
import { useViewport } from '../../../sdk/a11y/useViewport'

export function IntroScreen() {
  const start = useParameciumState(s => s.start)
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
      background: 'linear-gradient(180deg, #eafaf7 0%, #bcd9d3 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      color: '#10302c', padding: 32,
      fontFamily: '"SF Pro Display", "Inter", system-ui, sans-serif',
    }}>
      <div style={{
        opacity: stage >= 1 ? 1 : 0, transform: stage >= 1 ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 600ms ease, transform 600ms ease',
        fontSize: isPhone ? 34 : 56, fontWeight: 200, letterSpacing: -1.5, marginBottom: 8, textAlign: 'center',
      }}>Біологія</div>
      <div style={{
        opacity: stage >= 2 ? 1 : 0, transform: stage >= 2 ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 600ms ease, transform 600ms ease',
        fontSize: isPhone ? 22 : 32, fontWeight: 400, color: '#0e9c87', marginBottom: 40, textAlign: 'center',
      }}>Інфузорія-туфелька</div>
      <div style={{
        opacity: stage >= 3 ? 1 : 0, transform: stage >= 3 ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 800ms ease, transform 800ms ease',
        fontSize: 17, color: '#3c5a54', maxWidth: 620, textAlign: 'center', lineHeight: 1.55, marginBottom: 48,
      }}>
        {"У краплині ставкової води живе одноклітинна істота. Натисни на неї, щоб зазирнути всередину, і дізнайся, з яких частин складається ця крихітна клітина."}
      </div>
      <div style={{
        opacity: stage >= 4 ? 1 : 0, transform: stage >= 4 ? 'scale(1)' : 'scale(0.9)',
        transition: 'opacity 400ms ease, transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}>
        <Button onClick={start}>Зануритись у краплину</Button>
      </div>
    </div>
  )
}
