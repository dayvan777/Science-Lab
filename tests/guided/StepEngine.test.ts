import { describe, it, expect, beforeEach } from 'vitest'
import { useStepEngine } from '../../src/sdk/guided/StepEngine'

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
