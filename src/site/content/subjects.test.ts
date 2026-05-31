import { describe, it, expect } from 'vitest'
import { SUBJECTS, findSubject } from './subjects'

describe('subjects registry', () => {
  it('exposes an available biology subject with the anatomy lab', () => {
    const bio = findSubject('biology')
    expect(bio).toBeDefined()
    expect(bio?.status).toBe('available')
    expect(bio?.path).toBe('/biology')
    const anatomy = bio?.labs.find(l => l.id === 'anatomy')
    expect(anatomy).toBeDefined()
    expect(anatomy?.path).toBe('/biology/anatomy')
    expect(anatomy?.status).toBe('available')
  })

  it('keeps every subject path unique', () => {
    const paths = SUBJECTS.map(s => s.path)
    expect(new Set(paths).size).toBe(paths.length)
  })
})
