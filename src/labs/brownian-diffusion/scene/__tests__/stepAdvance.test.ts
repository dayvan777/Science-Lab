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

// SCENES[0].steps[0] = intro-ack (submitted); SCENES[0].steps[1] = mc-always-moving (correctIndex 0)
const ack = SCENES[0].steps[0]
const mc = SCENES[0].steps[1]

describe('evaluateStepAdvance (MC-only)', () => {
  it('advances an mc step on the correct choice', () => {
    const r = evaluateStepAdvance(mc, { ...baseEngine, lastMCChoice: 0 }, 1000)
    expect(r.advance).toBe(true)
    expect(r.consumeMC).toBe(true)
  })
  it('does NOT advance an mc step on a wrong choice', () => {
    expect(evaluateStepAdvance(mc, { ...baseEngine, lastMCChoice: 1 }, 1000).advance).toBe(false)
  })
  it('does NOT advance a submitted (ack) step — the HUD button handles it', () => {
    expect(evaluateStepAdvance(ack, baseEngine, 1000).advance).toBe(false)
  })
  it('does NOT advance when the step is undefined', () => {
    expect(evaluateStepAdvance(undefined, baseEngine, 1000).advance).toBe(false)
  })
})
