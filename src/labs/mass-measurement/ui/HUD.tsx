import { useEffect } from 'react'
import { useLabState } from '../state/LabState'
import { tasks } from '../content/tasks'
import { TASK_STEPS } from '../content/steps'
import { NumberInput } from '../../../sdk/ui/NumberInput'
import { GlassPanel } from '../../../sdk/ui/GlassPanel'
import { useReadings } from '../state/InstrumentReadings'
import { useStepEngine } from '../../../sdk/guided/StepEngine'
import { useViewport } from '../../../sdk/a11y/useViewport'

const TOTAL = 9
const BASE_FONT = '"SF Pro Display", "Inter", system-ui, sans-serif'

function renderTemplate(tmpl: string, vars: Record<string, string | number>): string {
  return tmpl.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? `{${key}}`))
}

function TaskProgressBar({ currentIndex, total }: { currentIndex: number; total: number }) {
  return (
    <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
      {Array.from({ length: total }).map((_, i) => {
        const state = i < currentIndex ? 'done' : i === currentIndex ? 'active' : 'pending'
        const bg = state === 'done'   ? '#34c759'
                 : state === 'active' ? '#0a84ff'
                 :                       'rgba(0,0,0,0.12)'
        return <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: bg }} />
      })}
    </div>
  )
}

export function HUD() {
  const phase = useLabState(s => s.phase)
  const idx = useLabState(s => s.currentTaskIndex)
  const journal = useLabState(s => s.journal)
  const setMeasurement = useLabState(s => s.setMeasurement)

  const digitalScaleG = useReadings(s => s.digitalScaleGrams)
  const dynamometerN = useReadings(s => s.dynamometerNewtons)
  const leverTilt = useReadings(s => s.leverBalanceTilt)
  const leverRightG = useReadings(s => s.leverRightPanGrams)

  const currentStepIndex = useStepEngine(s => s.currentStepIndex)
  const resetForTask = useStepEngine(s => s.resetForTask)
  useEffect(() => {
    resetForTask(idx)
  }, [idx, resetForTask])

  const { breakpoint } = useViewport()

  if (phase !== 'in-progress') return null
  const current = tasks[idx]

  const taskSteps = TASK_STEPS[current.id] ?? []
  const currentStep = taskSteps[currentStepIndex] ?? null

  const readings: Record<string, string | number> = {
    digitalScaleGrams: digitalScaleG,
    dynamometerNewtons: dynamometerN.toFixed(2),
    leverRightPanGrams: leverRightG,
    leverBalanceTilt: leverTilt,
  }

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
    // tilt > 0 means left pan is DOWN (left heavier); tilt < 0 means right is DOWN (right heavier).
    liveValue = balanced ? '⚖️ урівноважено' : (leverTilt > 0 ? '↙ ліва важче' : '↘ права важче')
    if (leverRightG === 0) stepHint = '→ Поклади предмет ліворуч, гирьки праворуч'
    else if (!balanced) stepHint = `→ На правій ${leverRightG} г — додай/прибери гирьки`
    else stepHint = `✓ Балка вирівняна! Маса = ${leverRightG} г`
  }

  // Layout per breakpoint — only the outer position/sizing differs.
  const layout = (() => {
    if (breakpoint === 'phone') {
      return {
        // Top pill stays small at top-centre.
        topPill: { top: 8, padding: '6px 14px', fontSize: 12 } as const,
        // Task panel becomes a bottom drawer (above the input bar).
        taskPanel: {
          left: 8, right: 8, bottom: 96, top: undefined,
          width: 'auto', maxHeight: '40vh', padding: 14,
        } as const,
        // Journal moves above the task panel as a compact strip — only the group headers visible.
        journalPanel: {
          left: 8, right: 8, bottom: undefined, top: 56,
          width: 'auto', maxHeight: 120, padding: 10, fontSize: 12,
        } as const,
        // Input bar pinned to the bottom edge.
        inputBar: { left: 8, right: 8, bottom: 8, padding: '10px 14px' } as const,
      }
    }
    if (breakpoint === 'tablet') {
      return {
        topPill: { top: 12, padding: '8px 18px', fontSize: 13 } as const,
        taskPanel: {
          top: 64, left: 12, width: 320, padding: 16, bottom: undefined, right: undefined, maxHeight: undefined,
        } as const,
        journalPanel: {
          top: 64, right: 12, width: 280, padding: 14, bottom: undefined, left: undefined, maxHeight: '60vh',
        } as const,
        inputBar: { left: '50%', right: undefined, bottom: 12, padding: '12px 20px' } as const,
      }
    }
    // desktop (default)
    return {
      topPill: { top: 16, padding: '8px 20px', fontSize: 13 } as const,
      taskPanel: {
        top: 80, left: 16, width: 360, padding: 20, bottom: undefined, right: undefined, maxHeight: undefined,
      } as const,
      journalPanel: {
        top: 80, right: 16, width: 320, padding: 16, bottom: undefined, left: undefined, maxHeight: '70vh',
      } as const,
      inputBar: { left: '50%', right: undefined, bottom: 16, padding: '14px 24px' } as const,
    }
  })()

  return (
    <div style={{ fontFamily: BASE_FONT }}>
      {/* Top floating pill */}
      <GlassPanel
        variant="strong"
        style={{
          position: 'fixed', left: '50%',
          transform: 'translateX(-50%)',
          borderRadius: 100,
          fontWeight: 500,
          zIndex: 10,
          color: '#1d1d1f',
          ...layout.topPill,
        }}
      >
        Лабораторна · {idx + 1} з {TOTAL}
      </GlassPanel>

      {/* Left: current step + live reading */}
      <GlassPanel
        variant="strong"
        role="region"
        aria-labelledby="hud-current-task-label"
        style={{
          position: 'fixed', zIndex: 10, color: '#1d1d1f',
          overflow: 'auto',
          ...layout.taskPanel,
        }}
      >
        <div id="hud-current-task-label" style={{ fontSize: 11, opacity: 0.5, textTransform: 'uppercase', letterSpacing: 1 }}>
          Зараз робимо
        </div>
        <TaskProgressBar currentIndex={idx} total={tasks.length} />
        <div style={{ fontSize: 18, fontWeight: 500, margin: '8px 0 12px', lineHeight: 1.4 }}>
          {current.prompt}
        </div>
        <div style={{
          fontSize: 13, color: '#6e6e73', lineHeight: 1.5,
          padding: '12px 0', borderTop: '1px solid rgba(0,0,0,0.08)', borderBottom: '1px solid rgba(0,0,0,0.08)',
        }}>
          💡 {current.hint}
        </div>
        {currentStep && (
          <div style={{ paddingTop: 12, paddingBottom: 4 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#0a84ff', marginBottom: 4 }}>
              {renderTemplate(currentStep.hintTitle ?? currentStep.hintTemplate ?? '', readings)}
            </div>
            {currentStep.hintExplanation && (
              <div style={{ fontSize: 13, color: '#6e6e73', lineHeight: 1.5 }}>
                {currentStep.hintExplanation}
              </div>
            )}
          </div>
        )}
        <div style={{ paddingTop: 16 }}>
          <div style={{ fontSize: 11, opacity: 0.5, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
            {liveLabel}
          </div>
          <div
            aria-live="polite"
            aria-atomic="true"
            style={{
              fontSize: 36, fontWeight: 700, color: '#0071e3',
              fontVariantNumeric: 'tabular-nums', lineHeight: 1, marginBottom: 12,
            }}
          >
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
        role="region"
        aria-labelledby="hud-journal-label"
        style={{
          position: 'fixed', zIndex: 10, color: '#1d1d1f', overflow: 'auto',
          ...layout.journalPanel,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
          <div id="hud-journal-label" style={{ fontSize: 11, opacity: 0.5, textTransform: 'uppercase', letterSpacing: 1 }}>
            Лабжурнал
          </div>
          <div style={{ fontSize: 12, opacity: 0.55, fontVariantNumeric: 'tabular-nums' }}>
            {Math.min(idx, TOTAL)} / {TOTAL}
          </div>
        </div>
        {/* Group tasks by objectId so the journal is a "rope": one block per
            object showing all three measurement slots, with completed values
            populated and pending slots as placeholders. */}
        {Array.from(new Set(tasks.map(t => t.objectId))).map(objId => {
          const objTasks = tasks.filter(t => t.objectId === objId)
          const allDone = objTasks.every((_, _i) => {
            const tIdx = tasks.findIndex(x => x.id === objTasks[_i].id)
            return tIdx < idx
          })
          const groupName = objTasks[0]?.displayName ?? objId
          return (
            <div key={objId} style={{ marginBottom: 14 }}>
              <div style={{
                fontSize: 11, fontWeight: 600, letterSpacing: 0.5,
                color: allDone ? '#34c759' : '#1d1d1f',
                marginBottom: 6, opacity: 0.85,
              }}>
                {allDone ? '✓ ' : ''}{groupName}
              </div>
              {objTasks.map(t => {
                const tIdx = tasks.findIndex(x => x.id === t.id)
                const isCurrent = tIdx === idx
                const isDone = tIdx < idx
                const entry = journal.find(e => e.taskId === t.id)
                const valueText = entry
                  ? t.inputUnit === 'N'
                    ? `${entry.userValue.toFixed(2)} N`
                    : `${entry.userValue} г`
                  : '·····'
                const marker = isDone ? '✓' : isCurrent ? '→' : '○'
                const markerColor = isDone ? '#34c759' : isCurrent ? '#0a84ff' : '#bbb'
                const instrLabel = t.instrumentId === 'digital-scale'
                  ? 'Електронні'
                  : t.instrumentId === 'lever-balance'
                  ? 'Важільні'
                  : 'Динамометр'
                return (
                  <div key={t.id} style={{
                    display: 'flex', justifyContent: 'space-between',
                    padding: '4px 0 4px 6px',
                    fontSize: 12,
                    opacity: isDone || isCurrent ? 1 : 0.6,
                  }}>
                    <span>
                      <span style={{ color: markerColor, marginRight: 6, fontWeight: 600 }}>{marker}</span>
                      {instrLabel}
                    </span>
                    <span style={{
                      fontWeight: 600,
                      color: entry ? '#0071e3' : '#999',
                      fontVariantNumeric: 'tabular-nums',
                    }}>{valueText}</span>
                  </div>
                )
              })}
            </div>
          )
        })}
      </GlassPanel>

      {/* Bottom center: input bar */}
      <GlassPanel
        variant="strong"
        style={{
          position: 'fixed',
          transform: layout.inputBar.left === '50%' ? 'translateX(-50%)' : undefined,
          zIndex: 10, color: '#1d1d1f',
          ...layout.inputBar,
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
