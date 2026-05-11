import { describe, it, expect } from 'vitest'
import type { Step } from '../../src/sdk/guided/TaskSteps'
import { isStepComplete } from '../../src/sdk/guided/StepEngine'

describe('Step DSL', () => {
  it('accepts a step with hintExplanation', () => {
    const step: Step = {
      id: 'place',
      target: { kind: 'instrument', id: 'digital-scale' },
      visualHint: 'target-ring',
      hintTitle: 'Поклади на платформу',
      hintExplanation: 'Електронні ваги вимірюють силу тиску',
      complete: { kind: 'snapped', targetPrefix: 'digital-scale' },
    }
    expect(step.hintTitle).toBe('Поклади на платформу')
    expect(step.hintExplanation).toBe('Електронні ваги вимірюють силу тиску')
  })

  it('accepts a step with sound', () => {
    const step: Step = {
      id: 'place',
      target: { kind: 'instrument', id: 'digital-scale' },
      visualHint: 'target-ring',
      hintTitle: 'Поклади',
      sound: 'tick',
      complete: { kind: 'snapped', targetPrefix: 'digital-scale' },
    }
    expect(step.sound).toBe('tick')
  })

  it('accepts a step with micropause', () => {
    const step: Step = {
      id: 'place',
      target: { kind: 'instrument', id: 'digital-scale' },
      visualHint: 'target-ring',
      hintTitle: 'Поклади',
      micropause: 250,
      complete: { kind: 'snapped', targetPrefix: 'digital-scale' },
    }
    expect(step.micropause).toBe(250)
  })

  it('still accepts the legacy hintTemplate (back-compat)', () => {
    const step: Step = {
      id: 'place',
      target: { kind: 'instrument', id: 'digital-scale' },
      visualHint: 'target-ring',
      hintTemplate: 'Покладіть м\'яч',
      complete: { kind: 'snapped', targetPrefix: 'digital-scale' },
    }
    expect(step.hintTemplate).toBe('Покладіть м\'яч')
  })
})

describe('isStepComplete: mc-selected', () => {
  const rule = { kind: 'mc-selected', correctIndex: 1 } as const
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

  it('rejects when no choice has been made', () => {
    expect(isStepComplete(rule, baseCtx)).toBe(false)
  })

  it('rejects when wrong choice was made', () => {
    expect(isStepComplete(rule, { ...baseCtx, lastMCChoice: 0 })).toBe(false)
    expect(isStepComplete(rule, { ...baseCtx, lastMCChoice: 2 })).toBe(false)
  })

  it('accepts when the correct choice was made', () => {
    expect(isStepComplete(rule, { ...baseCtx, lastMCChoice: 1 })).toBe(true)
  })
})
