import { useRef, useState, useEffect } from 'react'
import { toPng } from 'html-to-image'
import { useLabState } from '../state/LabState'
import { tasks } from '../content/tasks'
import { withinTolerance } from '../../../utils/units'
import { Button } from '../../../sdk/ui/Button'
import { GlassPanel } from '../../../sdk/ui/GlassPanel'

export function SummaryScreen() {
  const journal = useLabState(s => s.journal)
  const reset = useLabState(s => s.reset)
  const reportRef = useRef<HTMLDivElement>(null)
  const [revealedRows, setRevealedRows] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setRevealedRows(r => {
        if (r >= 9) { clearInterval(interval); return r }
        return r + 1
      })
    }, 100)
    return () => clearInterval(interval)
  }, [])

  let exact = 0, close = 0, off = 0
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
    const dataUrl = await toPng(reportRef.current, { backgroundColor: '#fafafa' })
    const link = document.createElement('a')
    link.download = 'mass-lab-report.png'
    link.href = dataUrl
    link.click()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'linear-gradient(180deg, #fafafa 0%, #cdcdd2 100%)',
      color: '#1d1d1f',
      overflow: 'auto', padding: 32,
      fontFamily: '"SF Pro Display", "Inter", system-ui, sans-serif',
    }}>
      <div ref={reportRef} style={{ maxWidth: 700, margin: '0 auto' }}>
        <GlassPanel variant="strong" style={{ padding: 32 }}>
          <h1 style={{ fontSize: 40, fontWeight: 600, letterSpacing: -1, margin: '0 0 8px' }}>
            Лабораторну виконано
          </h1>
          <p style={{ fontSize: 18, color: '#6e6e73', margin: '0 0 24px' }}>
            <span style={{ color: '#34c759', fontWeight: 600 }}>🟢 {exact}</span>{' '}
            <span style={{ color: '#ff9500', fontWeight: 600 }}>🟡 {close}</span>{' '}
            <span style={{ color: '#ff3b30', fontWeight: 600 }}>🔴 {off}</span>
          </p>
          {rows.map(({ task, entry, status }, i) => {
            const dot = status === 'exact' ? '🟢' : status === 'close' ? '🟡' : '🔴'
            const expected = task.inputUnit === 'N'
              ? `${task.expectedValue.toFixed(2)} N`
              : `${task.expectedValue} г`
            const userText = entry
              ? (task.inputUnit === 'N' ? `${entry.userValue.toFixed(2)} N` : `${entry.userValue} г`)
              : '—'
            return (
              <div
                key={task.id}
                style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '14px 0',
                  borderBottom: i < 8 ? '1px solid rgba(0,0,0,0.08)' : 'none',
                  fontSize: 15,
                  opacity: i < revealedRows ? 1 : 0,
                  transform: i < revealedRows ? 'translateX(0)' : 'translateX(-12px)',
                  transition: 'opacity 300ms ease, transform 300ms ease',
                }}
              >
                <span>{dot} {task.objectId} · {task.instrumentId}</span>
                <span>
                  <span style={{ color: '#6e6e73' }}>еталон {expected} · </span>
                  <span style={{ fontWeight: 600 }}>ти: {userText}</span>
                </span>
              </div>
            )
          })}
        </GlassPanel>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 32 }}>
        <Button variant="secondary" onClick={downloadScreenshot}>📷 Скачати звіт</Button>
        <Button onClick={reset}>Почати знову</Button>
      </div>
    </div>
  )
}
