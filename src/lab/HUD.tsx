import { useLabState } from './LabState'
import { tasks } from './tasks'
import { NumberInput } from '../ui/NumberInput'
import { newtonsToGrams } from '../utils/units'

const PANEL_BG = 'rgba(20, 20, 30, 0.92)'
const TOTAL = 9

export function HUD() {
  const phase = useLabState(s => s.phase)
  const idx = useLabState(s => s.currentTaskIndex)
  const journal = useLabState(s => s.journal)
  const setMeasurement = useLabState(s => s.setMeasurement)

  if (phase !== 'in-progress') return null
  const current = tasks[idx]

  return (
    <>
      {/* Header */}
      <div style={{
        position: 'fixed', top: 16, left: 16, right: 16,
        background: PANEL_BG, color: '#fff',
        padding: '12px 24px', borderRadius: 8,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        backdropFilter: 'blur(8px)',
        zIndex: 10,
      }}>
        <div style={{ fontWeight: 600, fontSize: 16 }}>
          Лабораторна: Вимірювання маси тіл
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {Array.from({ length: TOTAL }).map((_, i) => (
            <div key={i} style={{
              width: 36, height: 8, borderRadius: 4,
              background: i < idx ? '#2ecc71' : i === idx ? '#5DADE2' : 'rgba(255,255,255,0.2)',
            }}/>
          ))}
        </div>
        <div style={{ fontSize: 14, opacity: 0.7 }}>{idx + 1} / {TOTAL}</div>
      </div>

      {/* Task panel (left) */}
      <div style={{
        position: 'fixed', top: 80, left: 16, width: 320,
        background: PANEL_BG, color: '#fff',
        padding: 16, borderRadius: 8, backdropFilter: 'blur(8px)',
        zIndex: 10,
      }}>
        <div style={{ fontSize: 11, opacity: 0.6, textTransform: 'uppercase' }}>
          Завдання {idx + 1}
        </div>
        <div style={{ fontSize: 14, fontWeight: 500, margin: '8px 0', lineHeight: 1.4 }}>
          {current.prompt}
        </div>
        <div style={{
          fontSize: 12, opacity: 0.7, lineHeight: 1.4,
          paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.1)',
        }}>
          💡 {current.hint}
        </div>
      </div>

      {/* Journal (right) */}
      <div style={{
        position: 'fixed', top: 80, right: 16, width: 320,
        background: PANEL_BG, color: '#fff',
        padding: 16, borderRadius: 8, backdropFilter: 'blur(8px)',
        maxHeight: '70vh', overflow: 'auto',
        zIndex: 10,
      }}>
        <div style={{ fontSize: 11, opacity: 0.7, textTransform: 'uppercase', marginBottom: 8 }}>
          Лабжурнал
        </div>
        {tasks.map((t, i) => {
          const entry = journal.find(e => e.taskId === t.id)
          const opacity = i < idx ? 1 : i === idx ? 0.7 : 0.4
          const valueText = entry
            ? t.inputUnit === 'N'
              ? `${entry.userValue.toFixed(2)} N (≈${Math.round(newtonsToGrams(entry.userValue))} г)`
              : `${entry.userValue} г`
            : '— —'
          return (
            <div key={t.id} style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '6px 0',
              borderBottom: '1px dashed rgba(255,255,255,0.1)',
              fontSize: 12, opacity,
            }}>
              <span>{t.objectId} ({t.instrumentId})</span>
              <span style={{ fontWeight: 600, color: entry ? '#5DADE2' : '#888' }}>{valueText}</span>
            </div>
          )
        })}
      </div>

      {/* Input bar (bottom center) */}
      <div style={{
        position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)',
        background: PANEL_BG, color: '#fff',
        padding: '12px 24px', borderRadius: 8, backdropFilter: 'blur(8px)',
        zIndex: 10,
      }}>
        <NumberInput
          unit={current.inputUnit}
          onSubmit={(value) => setMeasurement(current.id, value)}
        />
      </div>
    </>
  )
}
