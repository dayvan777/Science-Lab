import { useEffect } from 'react'
import { GlassPanel } from '../../../sdk/ui/GlassPanel'
import { CollapsibleGlassPanel } from '../../../sdk/ui/CollapsibleGlassPanel'
import { Button } from '../../../sdk/ui/Button'
import { MultipleChoice } from '../../../sdk/ui/MultipleChoice'
import { useViewport } from '../../../sdk/a11y/useViewport'
import { safeAreaTop } from '../../../sdk/a11y/safeArea'
import { useLabState } from '../state/LabState'
import { useStepEngine } from '../../../sdk/guided/StepEngine'
import { SCENES } from '../content/scenes'
import { useForceCollapsed } from '../../../sdk/ui/useForceCollapsed'

export function HUD() {
  const phase = useLabState(s => s.phase)
  const sceneIdx = useLabState(s => s.currentSceneIndex)
  const recordMCAnswer = useLabState(s => s.recordMCAnswer)
  const advanceScene = useLabState(s => s.advanceScene)
  const journal = useLabState(s => s.journal)
  const goalReached = useLabState(s => s.goalReached)
  const setGoalReached = useLabState(s => s.setGoalReached)
  const stepIdx = useStepEngine(s => s.currentStepIndex)
  const lastMCChoice = useStepEngine(s => s.lastMCChoice)
  const setLastMCChoice = useStepEngine(s => s.setLastMCChoice)
  const resetForTask = useStepEngine(s => s.resetForTask)
  const draggingBodyId = useStepEngine(s => s.draggingBodyId)
  const { breakpoint } = useViewport()

  // Auto-collapse HUD panels while the student is actively dragging an
  // object (300 ms grace on release to avoid flicker).
  const forceCollapsed = useForceCollapsed(draggingBodyId)

  useEffect(() => {
    resetForTask(sceneIdx)
  }, [sceneIdx, resetForTask])

  useEffect(() => {
    setGoalReached(false)
  }, [sceneIdx, stepIdx, setGoalReached])

  const scene = SCENES[sceneIdx]
  const step = scene?.steps[stepIdx]

  if (phase !== 'in-progress') return null
  if (!scene) return null

  const layout = (() => {
    if (breakpoint === 'phone') {
      return {
        topPill: { top: safeAreaTop(8), padding: '6px 14px', fontSize: 12 } as const,
        taskPanel: { left: 8, right: 8, bottom: 96, top: undefined, width: 'auto', maxHeight: '40vh', padding: 14 } as const,
        journalPanel: { left: 8, right: 8, bottom: undefined, top: safeAreaTop(56), width: 'auto', maxHeight: 120, padding: 10, fontSize: 12 } as const,
      }
    }
    if (breakpoint === 'tablet') {
      return {
        topPill: { top: 12, padding: '8px 18px', fontSize: 13 } as const,
        taskPanel: { top: 64, left: 12, width: 340, padding: 16, bottom: undefined, right: undefined, maxHeight: undefined } as const,
        journalPanel: { top: 64, right: 12, width: 280, padding: 14, bottom: undefined, left: undefined, maxHeight: '60vh' } as const,
      }
    }
    return {
      topPill: { top: 16, padding: '8px 20px', fontSize: 13 } as const,
      taskPanel: { top: 80, left: 16, width: 380, padding: 20, bottom: undefined, right: undefined, maxHeight: undefined } as const,
      journalPanel: { top: 80, right: 16, width: 320, padding: 16, bottom: undefined, left: undefined, maxHeight: '70vh' } as const,
    }
  })()

  // Unified «Далі» button logic. A step is "pending" when its goal/answer
  // isn't met yet; otherwise «Далі» is enabled.
  const isLast = stepIdx >= (scene.steps.length - 1)
  const isMotionPending = !!step && step.complete.kind === 'submitted' && !!step.motionTrigger && !goalReached
  const isMcWrong = !!step && step.complete.kind === 'mc-selected' && lastMCChoice !== step.complete.correctIndex
  const satisfied =
    !!step &&
    !isMotionPending &&
    !isMcWrong &&
    (step.complete.kind === 'submitted' || step.complete.kind === 'mc-selected')
  const label = isMotionPending
    ? 'Виконай завдання…'
    : isMcWrong
      ? 'Обери правильну відповідь…'
      : 'Далі →'

  return (
    <>
      {/* Top pill */}
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
        Місія {Math.min(sceneIdx + 1, SCENES.length)} / {SCENES.length}
      </GlassPanel>

      {/* Task panel — collapsible */}
      <CollapsibleGlassPanel
        storageKey="bd-task-panel"
        label="панель сцени"
        defaultCollapsed={breakpoint === 'phone'}
        forceCollapsed={forceCollapsed}
        aria-labelledby="bd-task-label"
        style={{ overflow: 'auto', ...layout.taskPanel }}
        collapsedStyle={
          breakpoint === 'phone' ? { bottom: 96, left: 8 } : { top: layout.taskPanel.top ?? 64, left: 8 }
        }
      >
        <div id="bd-task-label" style={{ fontSize: 11, letterSpacing: '0.15em', color: '#86868b', textTransform: 'uppercase', marginBottom: 8 }}>
          Зараз робимо
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#1d1d1f', marginBottom: 8 }}>
          {step?.hintTitle ?? '...'}
        </div>
        {step?.hintExplanation && (
          <div style={{ fontSize: breakpoint === 'phone' ? 14 : 13, color: '#6e6e73', lineHeight: 1.5, marginBottom: 14 }}>
            {step.hintExplanation}
          </div>
        )}
        {/* Choices */}
        {step?.choices && step.complete.kind === 'mc-selected' && (
          <MultipleChoice
            question=""
            choices={step.choices}
            correctIndex={step.complete.correctIndex}
            compact={breakpoint === 'phone'}
            onCorrect={(idx) => {
              recordMCAnswer(idx)
              setLastMCChoice(idx)
            }}
          />
        )}
        {/* Goal reached indicator */}
        {step?.complete.kind === 'submitted' && step.motionTrigger && goalReached && (
          <div style={{ marginTop: 8, fontSize: 13, color: '#34c759' }}>✓ Ціль досягнута</div>
        )}
        {/* Unified «Далі» button for every step — full width to line up under the MC pills */}
        {step && (
          <div style={{ marginTop: 12 }}>
            <Button
              fullWidth
              disabled={!satisfied}
              aria-label="Далі"
              onClick={() => {
                setGoalReached(false)
                useStepEngine.getState().setLastMCChoice(null)
                if (isLast) advanceScene()
                else useStepEngine.getState().advanceStep()
              }}
            >
              {label}
            </Button>
          </div>
        )}
      </CollapsibleGlassPanel>

      {/* Journal panel */}
      <CollapsibleGlassPanel
        storageKey="bd-journal-panel"
        label="журнал"
        defaultCollapsed={breakpoint === 'phone'}
        forceCollapsed={forceCollapsed}
        aria-labelledby="bd-journal-label"
        style={{ overflow: 'auto', ...layout.journalPanel }}
        collapsedStyle={
          breakpoint === 'phone' ? { top: safeAreaTop(56), right: 8 } : { top: layout.journalPanel.top ?? 64, right: 8 }
        }
      >
        <div id="bd-journal-label" style={{ fontSize: 11, letterSpacing: '0.15em', color: '#86868b', textTransform: 'uppercase', marginBottom: 8 }}>
          Лабжурнал
        </div>
        {journal.length === 0 ? (
          <div style={{ fontSize: 13, color: '#6e6e73' }}>Поки що порожньо.</div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 13 }}>
            {journal.map((entry, i) => (
              <li key={i} style={{ padding: '6px 0', borderBottom: '1px solid rgba(0,0,0,0.06)', color: '#1d1d1f' }}>
                <span style={{ color: '#34c759', marginRight: 6 }}>✓</span>
                {entry.sceneTitle}
              </li>
            ))}
          </ul>
        )}
      </CollapsibleGlassPanel>
    </>
  )
}
