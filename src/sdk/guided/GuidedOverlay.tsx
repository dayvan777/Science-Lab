import { useFrame } from '@react-three/fiber'
import { useStepEngine, isStepComplete } from './StepEngine'
import { TASK_STEPS } from '../../labs/mass-measurement/content/steps'
import { useLabState } from '../../lab/LabState'
import { useReadings } from '../../lab/InstrumentReadings'
import { Arrow3D } from './primitives/Arrow3D'
import { GlowRing } from './primitives/GlowRing'

// World positions adjusted for v1 layout with table (objects at y=0.95+, instruments at y=0.85+)
const TARGET_POSITIONS: Record<string, [number, number, number]> = {
  'tennis-ball':           [-1.05, 1.0, 0],
  'apple':                 [-1.05, 1.0, 0.18],
  'baseball':              [-1.05, 1.0, -0.18],
  'digital-scale':         [0.75, 0.95, 0],
  'lever-balance-left':    [-0.17, 1.20, 0],
  'lever-balance-right':   [0.27, 1.20, 0],
  'dynamometer-hook':      [-0.50, 1.10, 0],
}

export function GuidedOverlay() {
  const taskIndex = useLabState(s => s.currentTaskIndex)
  const phase = useLabState(s => s.phase)
  const stepIdx = useStepEngine(s => s.currentStepIndex)
  const draggingBodyId = useStepEngine(s => s.draggingBodyId)
  const lastSnapTargetId = useStepEngine(s => s.lastSnapTargetId)
  const inputFocused = useStepEngine(s => s.inputFocused)
  const advanceStep = useStepEngine(s => s.advanceStep)

  const digitalScaleGrams = useReadings(s => s.digitalScaleGrams)
  const dynamometerNewtons = useReadings(s => s.dynamometerNewtons)
  const leverBalanceTilt = useReadings(s => s.leverBalanceTilt)
  const leverRightPanGrams = useReadings(s => s.leverRightPanGrams)

  // Auto-detect step completion
  useFrame(({ clock }) => {
    if (phase !== 'in-progress') return
    const taskId = `t${taskIndex + 1}`
    const steps = TASK_STEPS[taskId]
    if (!steps || stepIdx >= steps.length) return
    const step = steps[stepIdx]
    const nowMs = clock.getElapsedTime() * 1000

    const ctx = {
      draggingBodyId, lastSnapTargetId,
      digitalScaleGrams, dynamometerNewtons, leverBalanceTilt, leverRightPanGrams,
      readingStableSinceMs: useStepEngine.getState().readingStableSinceMs,
      nowMs, inputFocused,
      submittedSinceMs: 0,  // submission tracked via journal length change
    }

    // Update reading-stable timestamp if reading just became valid
    if (step.complete.kind === 'reading-stable') {
      const v = step.complete.instrument === 'digital-scale' ? digitalScaleGrams : dynamometerNewtons
      if (v >= step.complete.minValue && useStepEngine.getState().readingStableSinceMs === 0) {
        useStepEngine.getState().setReadingStableSince(nowMs)
      } else if (v < step.complete.minValue) {
        useStepEngine.getState().setReadingStableSince(0)
      }
    }

    if (isStepComplete(step.complete, ctx)) {
      advanceStep()
      // Reset stable timer for next step
      useStepEngine.getState().setReadingStableSince(0)
    }
  })

  // Determine current step's visual hint and target position
  if (phase !== 'in-progress') return null
  const taskId = `t${taskIndex + 1}`
  const steps = TASK_STEPS[taskId]
  if (!steps || stepIdx >= steps.length) return null
  const step = steps[stepIdx]
  if (step.target.kind === 'ui') return null  // UI steps handled in HTML overlay

  const targetKey = step.target.id
  const pos = TARGET_POSITIONS[targetKey]
  if (!pos) return null

  return (
    <>
      {step.visualHint === 'arrow' && <Arrow3D position={pos} />}
      {step.visualHint === 'target-ring' && <GlowRing position={pos} radius={0.12} />}
      {/* highlight applied by instrument's existing `active` prop already */}
    </>
  )
}
