import { isStepComplete } from '../../../sdk/guided/StepEngine'
import type { BdStep } from '../content/scenes'

/** Subset of StepEngine state needed to evaluate an MC auto-advance. */
export type EngineSnapshot = {
  draggingBodyId: string | null
  lastSnapTargetId: string | null
  lastMCChoice: number | null
  readingStableSinceMs: number
  inputFocused: boolean
}

/**
 * Only `mc-selected` steps auto-advance (on the correct choice). `submitted`
 * steps — including goal steps that carry a `motionTrigger` — advance via the
 * HUD «Далі →» button, never silently. Returns `consumeMC` so the caller can
 * clear `lastMCChoice` after an MC advance.
 */
export function evaluateStepAdvance(
  step: BdStep | undefined,
  engine: EngineSnapshot,
  nowMs: number,
): { advance: boolean; consumeMC: boolean } {
  if (!step || step.complete.kind !== 'mc-selected') return { advance: false, consumeMC: false }
  const complete = isStepComplete(step.complete, {
    draggingBodyId: engine.draggingBodyId,
    lastSnapTargetId: engine.lastSnapTargetId,
    digitalScaleGrams: 0,
    dynamometerNewtons: 0,
    leverBalanceTilt: 0,
    leverLeftPanGrams: 0,
    leverRightPanGrams: 0,
    lastMCChoice: engine.lastMCChoice,
    readingStableSinceMs: engine.readingStableSinceMs,
    nowMs,
    inputFocused: engine.inputFocused,
    submittedSinceMs: 0,
  })
  return { advance: complete, consumeMC: complete }
}
