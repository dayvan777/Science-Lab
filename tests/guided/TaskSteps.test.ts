import { describe, it, expect } from 'vitest'
import { TASK_STEPS } from '../../src/guided/TaskSteps'

describe('TASK_STEPS', () => {
  it('has step trees for all 9 tasks', () => {
    expect(Object.keys(TASK_STEPS)).toHaveLength(9)
    expect(TASK_STEPS).toHaveProperty('t1')
    expect(TASK_STEPS).toHaveProperty('t9')
  })
  it('each task has at least 4 steps', () => {
    for (const taskId of Object.keys(TASK_STEPS)) {
      expect(TASK_STEPS[taskId].length).toBeGreaterThanOrEqual(4)
    }
  })
  it('each step has unique id within its task', () => {
    for (const taskId of Object.keys(TASK_STEPS)) {
      const ids = TASK_STEPS[taskId].map(s => s.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })
  it('lever-balance tasks have a balance-loop step', () => {
    const leverTasks = ['t2', 't5', 't8']
    for (const tid of leverTasks) {
      const stepIds = TASK_STEPS[tid].map(s => s.id)
      expect(stepIds).toContain('balance-loop')
    }
  })
})
