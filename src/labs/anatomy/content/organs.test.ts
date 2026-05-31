import { describe, it, expect } from 'vitest'
import { ORGANS, ORGAN_IDS } from './organs'

describe('ORGANS data', () => {
  it('has exactly the five expected organs', () => {
    expect(ORGANS).toHaveLength(5)
    expect(ORGAN_IDS).toEqual(['brain', 'heart', 'lungs', 'liver', 'kidneys'])
  })

  it('has unique ids', () => {
    expect(new Set(ORGANS.map(o => o.id)).size).toBe(ORGANS.length)
  })

  it('every organ has a .glb file, a hex colour and ≥3 non-empty facts', () => {
    for (const o of ORGANS) {
      expect(o.file).toMatch(/^\/models\/.+\.glb$/)
      expect(o.color).toMatch(/^#[0-9a-fA-F]{6}$/)
      expect(o.label.length).toBeGreaterThan(0)
      expect(o.facts.length).toBeGreaterThanOrEqual(3)
      for (const f of o.facts) expect(f.trim().length).toBeGreaterThan(0)
    }
  })

  it('only the kidneys are mirrored', () => {
    expect(ORGANS.filter(o => o.mirrored).map(o => o.id)).toEqual(['kidneys'])
  })
})
