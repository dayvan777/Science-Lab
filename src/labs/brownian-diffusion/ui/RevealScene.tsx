import { useNavigate } from 'react-router-dom'
import { useLabState } from '../state/LabState'
import { Button } from '../../../sdk/ui/Button'

export function RevealScene() {
  const reset = useLabState(s => s.reset)
  const journal = useLabState(s => s.journal)
  const navigate = useNavigate()
  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 18, color: '#fff', padding: 24,
      background: 'radial-gradient(ellipse at center, #2a2a30 0%, #0a0a0c 70%)',
      fontFamily: '"Inter", system-ui, sans-serif',
    }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Дослідження завершено</h1>
      <div style={{ fontSize: 14, opacity: 0.7 }}>
        Відповіді: {journal.length} / 6
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <Button variant="primary" onClick={() => reset()}>Спробувати знову</Button>
        <Button variant="secondary" onClick={() => navigate('/')}>На головну</Button>
      </div>
    </div>
  )
}
