import { describe, it, expect, beforeEach } from 'vitest'
import { useStepEngine, isStepComplete } from '../../src/sdk/guided/StepEngine'

const baseCtx = {
  draggingBodyId: null,
  lastSnapTargetId: null,
  digitalScaleGrams: 0,
  dynamometerNewtons: 0,
  leverBalanceTilt: 0,
  leverLeftPanGrams: 0,
  leverRightPanGrams: 0,
  lastMCChoice: null as number | null,
  readingStableSinceMs: 0,
  nowMs: 0,
  inputFocused: false,
  submittedSinceMs: 0,
}

describe('StepEngine', () => {
  beforeEach(() => {
    useStepEngine.getState().resetForTask(0)
  })

  it('starts at step 0 of task 0', () => {
    const s = useStepEngine.getState()
    expect(s.currentStepIndex).toBe(0)
    expect(s.currentTaskIndex).toBe(0)
  })

  it('resetForTask sets task and resets step', () => {
    const { resetForTask } = useStepEngine.getState()
    resetForTask(3)
    const s = useStepEngine.getState()
    expect(s.currentTaskIndex).toBe(3)
    expect(s.currentStepIndex).toBe(0)
  })

  it('setDragging stores body id', () => {
    const { setDragging } = useStepEngine.getState()
    setDragging('tennis-ball-0')
    expect(useStepEngine.getState().draggingBodyId).toBe('tennis-ball-0')
    setDragging(null)
    expect(useStepEngine.getState().draggingBodyId).toBe(null)
  })

  it('advanceStep increments index', () => {
    const { advanceStep } = useStepEngine.getState()
    advanceStep()
    expect(useStepEngine.getState().currentStepIndex).toBe(1)
  })
})

describe('isStepComplete: lever-balanced', () => {
  const rule = { kind: 'lever-balanced', toleranceGrams: 0.5 } as const

  it('rejects empty pans', () => {
    expect(isStepComplete(rule, baseCtx)).toBe(false)
  })

  it('rejects when only the right pan has weights', () => {
    expect(isStepComplete(rule, { ...baseCtx, leverRightPanGrams: 5 })).toBe(false)
  })

  it('rejects when only the left pan has the object', () => {
    expect(isStepComplete(rule, { ...baseCtx, leverLeftPanGrams: 5 })).toBe(false)
  })

  it('rejects 5 g object vs 12 g of weights (real-world bug report)', () => {
    expect(
      isStepComplete(rule, { ...baseCtx, leverLeftPanGrams: 5, leverRightPanGrams: 12 }),
    ).toBe(false)
  })

  it('rejects 5 g vs 6 g (off by 1 g, exceeds 0.5 g tolerance)', () => {
    expect(
      isStepComplete(rule, { ...baseCtx, leverLeftPanGrams: 5, leverRightPanGrams: 6 }),
    ).toBe(false)
  })

  it('accepts exactly equal masses (5 g vs 5 g)', () => {
    expect(
      isStepComplete(rule, { ...baseCtx, leverLeftPanGrams: 5, leverRightPanGrams: 5 }),
    ).toBe(true)
  })

  it('accepts 145 g vs 145 g (baseball)', () => {
    expect(
      isStepComplete(rule, { ...baseCtx, leverLeftPanGrams: 145, leverRightPanGrams: 145 }),
    ).toBe(true)
  })

  it('accepts within tolerance (250 g vs 250.4 g — float drift OK)', () => {
    expect(
      isStepComplete(rule, { ...baseCtx, leverLeftPanGrams: 250, leverRightPanGrams: 250.4 }),
    ).toBe(true)
  })

  it('does not consult tilt — even at full tilt, balanced if masses match', () => {
    expect(
      isStepComplete(rule, {
        ...baseCtx,
        leverLeftPanGrams: 5,
        leverRightPanGrams: 5,
        leverBalanceTilt: 0.25,  // physically nonsensical but rule must ignore
      }),
    ).toBe(true)
  })
})
