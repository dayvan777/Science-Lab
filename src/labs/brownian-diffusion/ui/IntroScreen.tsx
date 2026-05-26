import { useLabState } from '../state/LabState'
import { Button } from '../../../sdk/ui/Button'

export function IntroScreen() {
  const start = useLabState(s => s.start)
  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 24, color: '#fff',
      background: 'radial-gradient(ellipse at center, #2a2a30 0%, #0a0a0c 70%)',
      fontFamily: '"Inter", system-ui, sans-serif',
    }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, textAlign: 'center', maxWidth: 600 }}>
        Броунівський рух та дифузія
      </h1>
      <p style={{ fontSize: 16, opacity: 0.7, maxWidth: 480, textAlign: 'center' }}>
        Дізнаймось, як молекули рухаються і змішуються в газах, рідинах і твердих тілах.
      </p>
      <Button variant="primary" onClick={() => start()}>Почати</Button>
    </div>
  )
}
