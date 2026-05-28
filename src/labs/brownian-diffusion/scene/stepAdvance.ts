import { isStepComplete } from '../../../sdk/guided/StepEngine'
import type { BdStep } from '../content/scenes'

/** The subset of StepEngine state the brownian-diffusion rule-advance needs. */
export type EngineSnapshot = {
  draggingBodyId: string | null
  lastSnapTargetId: string | null
  lastMCChoice: number | null
  readingStableSinceMs: number
  inputFocused: boolean
}

/**
 * Decide whether a step WITHOUT a motionTrigger is complete and the engine
 * should advance to the next step. This mirrors the "SDK rule advance" block
 * in EM-induction's SceneController — the piece that was missing in
 * brownian-diffusion and left the lab stuck at every scene's MC question and
 * every drag step.
 *
 * Covered here: `dragging` (pickup-pollen / lift-divider / pick-dropper) and
 * `mc-selected` (every scene's final question).
 *
 * NOT covered (deliberately):
 *  - `submitted` steps — advanced by the HUD "Далі →" button, so
 *    `submittedSinceMs` is hard-zeroed (isStepComplete returns false).
 *  - motion-trigger steps — advanced by the per-scene logic in LabScene's
 *    onTick; this returns `{ advance: false }` for them.
 *
 * Returns `consumeMC` so the caller can clear `lastMCChoice` after an MC
 * advance, preventing the next MC step from inheriting a stale selection.
 */
export function evaluateStepAdvance(
  step: BdStep | undefined,
  engine: EngineSnapshot,
  nowMs: number,
): { advance: boolean; consumeMC: boolean } {
  if (!step || step.motionTrigger) return { advance: false, consumeMC: false }

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
    submittedSinceMs: 0, // 'submitted' steps advance via the HUD button, not here
  })

  return { advance: complete, consumeMC: complete && step.complete.kind === 'mc-selected' }
}
