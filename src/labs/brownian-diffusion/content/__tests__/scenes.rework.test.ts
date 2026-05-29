import { describe, it, expect } from 'vitest'
import { SCENES } from '../scenes'

describe('mission arc', () => {
  it('has 7 missions (6 concepts + free play)', () => {
    expect(SCENES).toHaveLength(7)
  })

  it('contains no dragging completion rules (drag is removed)', () => {
    for (const m of SCENES)
      for (const s of m.steps)
        expect(s.complete.kind).not.toBe('dragging')
  })

  it('every goal step (motionTrigger) is a submitted step', () => {
    for (const m of SCENES)
      for (const s of m.steps)
        if (s.motionTrigger) expect(s.complete.kind).toBe('submitted')
  })

  it('every mc step has correctIndex 0 and 3 choices', () => {
    const mc = SCENES.flatMap(m => m.steps).filter(s => s.complete.kind === 'mc-selected')
    expect(mc.length).toBeGreaterThanOrEqual(6)
    for (const s of mc) {
      expect(s.choices).toHaveLength(3)
      expect(s.complete).toMatchObject({ kind: 'mc-selected', correctIndex: 0 })
    }
  })
})
