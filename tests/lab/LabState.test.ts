import { describe, it, expect, beforeEach } from 'vitest'
import { useLabState } from '../../src/labs/mass-measurement/state/LabState'

describe('LabState', () => {
  beforeEach(() => {
    useLabState.getState().reset()
  })

  it('starts in intro phase with no journal entries', () => {
    const s = useLabState.getState()
    expect(s.phase).toBe('intro')
    expect(s.currentTaskIndex).toBe(0)
    expect(s.journal).toHaveLength(0)
  })

  it('start() moves to in-progress', () => {
    useLabState.getState().start()
    expect(useLabState.getState().phase).toBe('in-progress')
  })

  it('setMeasurement adds entry and advances index', () => {
    const s = useLabState.getState()
    s.start()
    s.setMeasurement('t1', 58)
    const next = useLabState.getState()
    expect(next.journal).toHaveLength(1)
    expect(next.journal[0]).toMatchObject({ taskId: 't1', userValue: 58 })
    expect(next.currentTaskIndex).toBe(1)
  })

  it('finishes after 9th measurement', () => {
    const s = useLabState.getState()
    s.start()
    for (let i = 0; i < 9; i++) {
      useLabState.getState().setMeasurement(`t${i + 1}`, 100)
    }
    expect(useLabState.getState().phase).toBe('finished')
  })

  it('reset returns to initial state', () => {
    const s = useLabState.getState()
    s.start()
    s.setMeasurement('t1', 58)
    s.reset()
    const r = useLabState.getState()
    expect(r.phase).toBe('intro')
    expect(r.journal).toHaveLength(0)
    expect(r.currentTaskIndex).toBe(0)
  })
})
