import { useLabState } from './LabState'
import { Button } from '../ui/Button'

export function IntroScreen() {
  const start = useLabState(s => s.start)
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'linear-gradient(135deg, #1a1a2e, #0f3460)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      color: '#fff', padding: 32,
    }}>
      <h1 style={{ fontSize: 36, marginBottom: 16 }}>
        Лабораторна робота
      </h1>
      <h2 style={{ fontSize: 28, marginBottom: 32, fontWeight: 400 }}>
        Вимірювання маси тіл
      </h2>
      <p style={{ maxWidth: 600, textAlign: 'center', fontSize: 16, lineHeight: 1.6, marginBottom: 40 }}>
        На столі є три прилади і три предмети. Виміряй масу кожного предмета
        всіма приладами. Записуй результати в лабжурнал. Успіхів!
      </p>
      <Button onClick={start}>Почати</Button>
    </div>
  )
}
