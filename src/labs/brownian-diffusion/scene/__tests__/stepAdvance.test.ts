import { describe, it, expect } from 'vitest'
import { evaluateStepAdvance } from '../stepAdvance'
import { SCENES } from '../../content/scenes'

const baseEngine = {
  draggingBodyId: null as string | null,
  lastSnapTargetId: null as string | null,
  lastMCChoice: null as number | null,
  readingStableSinceMs: 0,
  inputFocused: false,
}

// Real scene steps (avoids hand-constructing BdStep objects):
//   SCENES[0].steps[0] = intro-ack            → submitted (no motionTrigger)
//   SCENES[0].steps[1] = mc-always-moving     → mc-selected, correctIndex 0
//   SCENES[1].steps[0] = pickup-pollen        → dragging 'pollen'
//   SCENES[1].steps[1] = place-pollen-in-box  → submitted + motionTrigger 'pollen-observed'
const submitted = SCENES[0].steps[0]
const mc = SCENES[0].steps[1]
const drag = SCENES[1].steps[0]
const motion = SCENES[1].steps[1]

describe('evaluateStepAdvance', () => {
  it('advances an mc-selected step when lastMCChoice matches correctIndex', () => {
    const r = evaluateStepAdvance(mc, { ...baseEngine, lastMCChoice: 0 }, 1000)
    expect(r.advance).toBe(true)
    expect(r.consumeMC).toBe(true)
  })

  it('does NOT advance an mc-selected step on a wrong choice', () => {
    expect(evaluateStepAdvance(mc, { ...baseEngine, lastMCChoice: 1 }, 1000).advance).toBe(false)
  })

  it('advances a dragging step when the dragged body matches the pattern', () => {
    const r = evaluateStepAdvance(drag, { ...baseEngine, draggingBodyId: 'pollen' }, 1000)
    expect(r.advance).toBe(true)
    expect(r.consumeMC).toBe(false)
  })

  it('does NOT advance a dragging step when nothing is being dragged', () => {
    expect(evaluateStepAdvance(drag, baseEngine, 1000).advance).toBe(false)
  })

  it('does NOT advance a submitted step (HUD "Далі" button handles it)', () => {
    expect(evaluateStepAdvance(submitted, baseEngine, 1000).advance).toBe(false)
  })

  it('does NOT advance a motion-trigger step (per-scene onTick handles it)', () => {
    expect(evaluateStepAdvance(motion, { ...baseEngine, draggingBodyId: 'pollen' }, 1000).advance).toBe(false)
  })

  it('does NOT advance when the step is undefined (scene already complete)', () => {
    expect(evaluateStepAdvance(undefined, baseEngine, 1000).advance).toBe(false)
  })
})
