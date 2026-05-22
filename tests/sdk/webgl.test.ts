import { describe, it, expect } from 'vitest'
import { isWebGLAvailable } from '../../src/sdk/scene/webgl'

describe('isWebGLAvailable', () => {
  it('returns a boolean without throwing', () => {
    const result = isWebGLAvailable()
    expect(typeof result).toBe('boolean')
  })

  it('is stable across calls (cached)', () => {
    expect(isWebGLAvailable()).toBe(isWebGLAvailable())
  })
})
