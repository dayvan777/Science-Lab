import { useEffect } from 'react'
import { useLabState } from './LabState'
import { tasks } from './tasks'
import { NumberInput } from '../ui/NumberInput'
import { GlassPanel } from '../ui/GlassPanel'
import { useReadings } from './InstrumentReadings'
import { useStepEngine } from '../guided/StepEngine'

const TOTAL = 9
const BASE_FONT = '"SF Pro Display", "Inter", system-ui, sans-serif'

export function HUD() {
  const phase = useLabState(s => s.phase)
  const idx = useLabState(s => s.currentTaskIndex)
  const journal = useLabState(s => s.journal)
  const setMeasurement = useLabState(s => s.setMeasurement)

  const digitalScaleG = useReadings(s => s.digitalScaleGrams)
  const dynamometerN = useReadings(s => s.dynamometerNewtons)
  const leverTilt = useReadings(s => s.leverBalanceTilt)
  const leverRightG = useReadings(s => s.leverRightPanGrams)

  const resetForTask = useStepEngine(s => s.resetForTask)
  useEffect(() => {
    resetForTask(idx)
  }, [idx, resetForTask])

  if (phase !== 'in-progress') return null
  const current = tasks[idx]

  let liveLabel = ''
  let liveValue = ''
  let stepHint = ''
  if (current.instrumentId === 'digital-scale') {
    liveLabel = 'Прилад показує'
    liveValue = `${digitalScaleG} г`
    stepHint = digitalScaleG === 0
      ? '→ Поклади предмет на платформу'
      : '✓ Прочитай значення і впиши'
  } else if (current.instrumentId === 'dynamometer') {
    liveLabel = 'Сила натягу'
    liveValue = `${dynamometerN.toFixed(2)} N`
    stepHint = dynamometerN === 0
      ? '→ Підвісь предмет на гачок'
      : '✓ Прочитай Ньютони і впиши'
  } else {
    liveLabel = 'Стан балансу'
    const balanced = Math.abs(leverTilt) < 0.05
    liveValue = balanced ? '⚖️ урівноважено' : (leverTilt < 0 ? '↘ ліва важче' : '↙ права важче')
    if (leverRightG === 0) stepHint = '→ Поклади предмет ліворуч, гирьки праворуч'
    else if (!balanced) stepHint = `→ На правій ${leverRightG} г — додай/прибери гирьки`
    else stepHint = `✓ Балка вирівняна! Маса = ${leverRightG} г`
  }

  return (
    <div style={{ fontFamily: BASE_FONT }}>
      {/* Top floating pill */}
      <GlassPanel
        variant="strong"
        style={{
          position: 'fixed', top: 16, left: '50%',
          transform: 'translateX(-50%)',
          padding: '8px 20px', borderRadius: 100,
          fontSize: 13, fontWeight: 500,
          zIndex: 10,
          color: '#1d1d1f',
        }}
      >
        Лабораторна · {idx + 1} з {TOTAL}
      </GlassPanel>

      {/* Left: current step + live reading */}
      <GlassPanel
        variant="strong"
        style={{
          position: 'fixed', top: 80, left: 16, width: 360,
          padding: 20, zIndex: 10,
          color: '#1d1d1f',
        }}
      >
        <div style={{ fontSize: 11, opacity: 0.5, textTransform: 'uppercase', letterSpacing: 1 }}>
          Зараз робимо
        </div>
        <div style={{ fontSize: 18, fontWeight: 500, margin: '8px 0 12px', lineHeight: 1.4 }}>
          {current.prompt}
        </div>
        <div style={{
          fontSize: 13, color: '#6e6e73', lineHeight: 1.5,
          padding: '12px 0', borderTop: '1px solid rgba(0,0,0,0.08)', borderBottom: '1px solid rgba(0,0,0,0.08)',
        }}>
          💡 {current.hint}
        </div>
        <div style={{ paddingTop: 16 }}>
          <div style={{ fontSize: 11, opacity: 0.5, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
            {liveLabel}
          </div>
          <div style={{
            fontSize: 36, fontWeight: 700, color: '#0071e3',
            fontVariantNumeric: 'tabular-nums', lineHeight: 1, marginBottom: 12,
          }}>
            {liveValue}
          </div>
          <div style={{ fontSize: 14, color: '#1d1d1f', lineHeight: 1.4, fontWeight: 500 }}>
            {stepHint}
          </div>
        </div>
      </GlassPanel>

      {/* Right: journal */}
      <GlassPanel
        variant="strong"
        style={{
          position: 'fixed', top: 80, right: 16, width: 320,
          padding: 16, zIndex: 10, maxHeight: '70vh', overflow: 'auto',
          color: '#1d1d1f',
        }}
      >
        <div style={{ fontSize: 11, opacity: 0.5, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
          Лабжурнал
        </div>
        {tasks.map((t, i) => {
          const entry = journal.find(e => e.taskId === t.id)
          const opacity = i < idx ? 1 : i === idx ? 0.6 : 0.35
          const valueText = entry
            ? t.inputUnit === 'N'
              ? `${entry.userValue.toFixed(2)} N`
              : `${entry.userValue} г`
            : '— —'
          return (
            <div key={t.id} style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '8px 0',
              borderBottom: '1px dashed rgba(0,0,0,0.08)',
              fontSize: 13, opacity,
            }}>
              <span>{i < idx ? '✓ ' : i === idx ? '→ ' : '  '}{t.objectId}</span>
              <span style={{ fontWeight: 600, color: entry ? '#0071e3' : '#999' }}>{valueText}</span>
            </div>
          )
        })}
      </GlassPanel>

      {/* Bottom center: input bar */}
      <GlassPanel
        variant="strong"
        style={{
          position: 'fixed', bottom: 16, left: '50%',
          transform: 'translateX(-50%)',
          padding: '14px 24px', zIndex: 10,
          color: '#1d1d1f',
        }}
      >
        <NumberInput
          unit={current.inputUnit}
          onSubmit={(value) => setMeasurement(current.id, value)}
        />
      </GlassPanel>
    </div>
  )
}
