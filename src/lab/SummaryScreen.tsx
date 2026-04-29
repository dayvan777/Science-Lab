import { useRef } from 'react'
import { toPng } from 'html-to-image'
import { useLabState } from './LabState'
import { tasks } from './tasks'
import { withinTolerance } from '../utils/units'
import { Button } from '../ui/Button'

export function SummaryScreen() {
  const journal = useLabState(s => s.journal)
  const reset = useLabState(s => s.reset)
  const reportRef = useRef<HTMLDivElement>(null)

  let exact = 0
  let close = 0
  let off = 0
  const rows = tasks.map(t => {
    const entry = journal.find(e => e.taskId === t.id)
    if (!entry) return { task: t, entry: null, status: 'missing' as const }
    const inTol = withinTolerance(entry.userValue, t.expectedValue, t.tolerance)
    const inLooseTol = withinTolerance(entry.userValue, t.expectedValue, t.tolerance * 1.5)
    const status = inTol ? 'exact' : inLooseTol ? 'close' : 'off'
    if (status === 'exact') exact++
    else if (status === 'close') close++
    else off++
    return { task: t, entry, status }
  })

  const downloadScreenshot = async () => {
    if (!reportRef.current) return
    const dataUrl = await toPng(reportRef.current, { backgroundColor: '#1a1a2e' })
    const link = document.createElement('a')
    link.download = 'mass-lab-report.png'
    link.href = dataUrl
    link.click()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'linear-gradient(135deg, #1a1a2e, #0f3460)',
      color: '#fff',
      overflow: 'auto', padding: 32,
    }}>
      <div ref={reportRef} style={{ maxWidth: 700, margin: '0 auto', padding: 32 }}>
        <h1 style={{ fontSize: 32, marginBottom: 8 }}>Лабораторну виконано!</h1>
        <p style={{ fontSize: 18, opacity: 0.8, marginBottom: 24 }}>
          Точно: {exact} · Близько: {close} · Помилка: {off}
        </p>
        {rows.map(({ task, entry, status }) => {
          const dot = status === 'exact' ? '🟢' : status === 'close' ? '🟡' : '🔴'
          const expectedDisplay = task.inputUnit === 'N'
            ? `${task.expectedValue.toFixed(2)} N`
            : `${task.expectedValue} г`
          const userDisplay = entry
            ? task.inputUnit === 'N'
              ? `${entry.userValue.toFixed(2)} N`
              : `${entry.userValue} г`
            : '—'
          return (
            <div key={task.id} style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '12px 0',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              fontSize: 15,
            }}>
              <span>{dot} {task.objectId} · {task.instrumentId}</span>
              <span>
                <span style={{ opacity: 0.6 }}>еталон {expectedDisplay} · </span>
                <span style={{ fontWeight: 600 }}>ти: {userDisplay}</span>
              </span>
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 32 }}>
        <Button variant="secondary" onClick={downloadScreenshot}>📷 Скачати звіт</Button>
        <Button onClick={reset}>Почати знову</Button>
      </div>
    </div>
  )
}
