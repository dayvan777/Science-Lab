import { useFrame } from '@react-three/fiber'
import { useStepEngine, isStepComplete } from './StepEngine'
import { TASK_STEPS } from '../../labs/mass-measurement/content/steps'
import { useLabState } from '../../labs/mass-measurement/state/LabState'
import { useReadings } from '../../labs/mass-measurement/state/InstrumentReadings'
import { GlowRing } from './primitives/GlowRing'
import { sound } from '../audio/SoundManager'

// World positions for guided-mode visual hints (Arrow3D / GlowRing).
// Derived from the actual scene layout in LabScene.tsx + each instrument's
// internal geometry constants. Whenever the table layout or an instrument's
// dimensions change, these MUST be recomputed — there's no automatic source
// of truth, so a stale entry produces a hint floating in mid-air.
//
// Current layout reference:
//   Table top  : y = 0.85
//   Tray top   : y = TABLE_TOP_Y + TRAY_H = 0.875  (Slice C — z=0.40)
//   Dynamometer at world [-0.55, 0.85, 0]   — hook hangs at local y = 0.35 − 0.13 = 0.22 (HOOK_REST_Y minus ROD_BELOW_POINTER_LEN)  → world (−0.55, 1.07, 0)
//   LeverBalance at [0.05, 0.85, 0]         — pan rim at local y = PIVOT − HANGER = 0.40 − 0.26 = 0.14
//                                              and x = ± BEAM_LEN / 2 = ±0.33
//                                              → world left (−0.28, 0.99, 0), right (0.38, 0.99, 0)
//   DigitalScale at [0.75, 0.85, 0]         — platform top at local y = HOUSING_H + PLATFORM_T = 0.06
//                                              → world (0.75, 0.91, 0)
//   Balls spawn just above the tray at z=0.40 (Slice C).
const TARGET_POSITIONS: Record<string, [number, number, number]> = {
  'tennis-ball':           [-0.30, 0.92, 0.40],
  'apple':                 [ 0.00, 0.93, 0.40],
  'baseball':              [ 0.30, 0.96, 0.40],
  'digital-scale':         [ 0.75, 0.91, 0.00],
  'lever-balance-left':    [-0.28, 0.99, 0.00],
  'lever-balance-right':   [ 0.38, 0.99, 0.00],
  'dynamometer-hook':      [-0.55, 1.07, 0.00],
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
  const leverLeftPanGrams = useReadings(s => s.leverLeftPanGrams)
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
      digitalScaleGrams, dynamometerNewtons, leverBalanceTilt, leverLeftPanGrams, leverRightPanGrams,
      lastMCChoice: useStepEngine.getState().lastMCChoice,
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
      if (step.sound) sound.play(step.sound)
      // Reset stable timer for next step
      useStepEngine.getState().setReadingStableSince(0)
      if (step.micropause) {
        setTimeout(() => advanceStep(), step.micropause)
      } else {
        advanceStep()
      }
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
      {/* 'arrow' hint intentionally NOT rendered as a 3D primitive — the
          floating triangle distracted students more than it helped (the
          objects sit visibly on a labelled tray, and the hint text in
          the HUD already names which one to grab). The hint type is kept
          in the DSL for future labs that may want it. */}
      {step.visualHint === 'target-ring' && <GlowRing position={pos} radius={0.12} />}
      {/* highlight applied by instrument's existing `active` prop already */}
    </>
  )
}
