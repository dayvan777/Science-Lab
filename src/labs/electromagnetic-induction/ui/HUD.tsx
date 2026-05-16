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

export function HUD() {
  const phase = useLabState(s => s.phase)
  const sceneIdx = useLabState(s => s.currentSceneIndex)
  const recordMCAnswer = useLabState(s => s.recordMCAnswer)
  const advanceScene = useLabState(s => s.advanceScene)
  const journal = useLabState(s => s.journal)
  const stepIdx = useStepEngine(s => s.currentStepIndex)
  const setLastMCChoice = useStepEngine(s => s.setLastMCChoice)
  const resetForTask = useStepEngine(s => s.resetForTask)
  const { breakpoint } = useViewport()

  useEffect(() => {
    resetForTask(sceneIdx)
  }, [sceneIdx, resetForTask])

  const scene = SCENES[sceneIdx]
  const step = scene?.[stepIdx]
  const sceneComplete = !!scene && !step

  // If the scene's last step completed, advance to next scene
  useEffect(() => {
    if (phase !== 'in-progress') return
    if (sceneComplete) {
      const t = setTimeout(() => advanceScene(), 400)
      return () => clearTimeout(t)
    }
  }, [phase, sceneComplete, advanceScene])

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
        Сцена {Math.min(sceneIdx + 1, SCENES.length)} / {SCENES.length}
      </GlassPanel>

      {/* Task panel — collapsible */}
      <CollapsibleGlassPanel
        storageKey="em-task-panel"
        label="панель сцени"
        defaultCollapsed={breakpoint === 'phone'}
        aria-labelledby="em-task-label"
        style={{ overflow: 'auto', ...layout.taskPanel }}
        collapsedStyle={
          breakpoint === 'phone' ? { bottom: 96, left: 8 } : { top: layout.taskPanel.top ?? 64, left: 8 }
        }
      >
        <div id="em-task-label" style={{ fontSize: 11, letterSpacing: '0.15em', color: '#86868b', textTransform: 'uppercase', marginBottom: 8 }}>
          Зараз робимо
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#1d1d1f', marginBottom: 8 }}>
          {step?.hintTitle ?? '...'}
        </div>
        {step?.hintExplanation && (
          <div style={{ fontSize: 13, color: '#6e6e73', lineHeight: 1.5, marginBottom: 14 }}>
            {step.hintExplanation}
          </div>
        )}
        {/* Choices */}
        {step?.choices && step.complete.kind === 'mc-selected' && (
          <MultipleChoice
            question=""
            choices={step.choices}
            correctIndex={step.complete.correctIndex}
            onCorrect={(idx) => {
              recordMCAnswer(step.id, idx)
              setLastMCChoice(idx)
            }}
          />
        )}
        {/* Submit button for non-choice ack steps that are NOT motion-triggered.
            Motion-triggered steps are advanced automatically by SceneController. */}
        {step?.complete.kind === 'submitted' && !step.choices && !step.motionTrigger && (
          <Button
            onClick={() => useStepEngine.getState().advanceStep()}
            aria-label="Далі"
          >
            Далі →
          </Button>
        )}
      </CollapsibleGlassPanel>

      {/* Journal panel */}
      <CollapsibleGlassPanel
        storageKey="em-journal-panel"
        label="журнал"
        defaultCollapsed={breakpoint === 'phone'}
        aria-labelledby="em-journal-label"
        style={{ overflow: 'auto', ...layout.journalPanel }}
        collapsedStyle={
          breakpoint === 'phone' ? { top: safeAreaTop(56), right: 8 } : { top: layout.journalPanel.top ?? 64, right: 8 }
        }
      >
        <div id="em-journal-label" style={{ fontSize: 11, letterSpacing: '0.15em', color: '#86868b', textTransform: 'uppercase', marginBottom: 8 }}>
          Лабжурнал
        </div>
        {journal.length === 0 ? (
          <div style={{ fontSize: 13, color: '#6e6e73' }}>Поки що порожньо.</div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 13 }}>
            {journal.map((entry, i) => (
              <li key={i} style={{ padding: '6px 0', borderBottom: '1px solid rgba(0,0,0,0.06)', color: '#1d1d1f' }}>
                <span style={{ color: '#34c759', marginRight: 6 }}>✓</span>
                {entry.sceneId}
              </li>
            ))}
          </ul>
        )}
      </CollapsibleGlassPanel>
    </>
  )
}
