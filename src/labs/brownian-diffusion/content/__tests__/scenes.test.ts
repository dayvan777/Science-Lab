import { describe, it, expect } from 'vitest'
import { SCENES } from '../scenes'

describe('SCENES (brownian-diffusion)', () => {
  it('has exactly 6 scenes', () => {
    expect(SCENES).toHaveLength(6)
  })

  it('each scene has a non-empty title and at least one step', () => {
    for (const s of SCENES) {
      expect(s.title.length).toBeGreaterThan(0)
      expect(s.steps.length).toBeGreaterThan(0)
    }
  })

  it('every MC-step has a valid correctIndex within its choices', () => {
    for (const scene of SCENES) {
      for (const step of scene.steps) {
        if (step.complete.kind === 'mc-selected') {
          const idx = step.complete.correctIndex
          expect(step.choices).toBeDefined()
          expect(idx).toBeGreaterThanOrEqual(0)
          expect(idx).toBeLessThan(step.choices!.length)
        }
      }
    }
  })

  it('every motion trigger uses a recognised name', () => {
    const allowed = new Set([
      'pollen-observed',
      'gases-mixed',
      'liquid-mixed-partial',
      'time-lapse-reached',
      'temp-reached-hot',
    ])
    for (const scene of SCENES) {
      for (const step of scene.steps) {
        if (step.motionTrigger) {
          expect(allowed.has(step.motionTrigger)).toBe(true)
        }
      }
    }
  })
})
