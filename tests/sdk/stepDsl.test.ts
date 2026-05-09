import { describe, it, expect } from 'vitest'
import type { Step } from '../../src/sdk/guided/TaskSteps'

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
