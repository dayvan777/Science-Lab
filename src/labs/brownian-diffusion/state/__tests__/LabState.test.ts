import { describe, it, expect, beforeEach } from 'vitest'
import { useLabState } from '../LabState'

describe('useLabState (brownian-diffusion)', () => {
  beforeEach(() => {
    useLabState.getState().reset()
  })

  it('starts in the intro phase at scene 0 with empty journal', () => {
    const s = useLabState.getState()
    expect(s.phase).toBe('intro')
    expect(s.currentSceneIndex).toBe(0)
    expect(s.journal).toEqual([])
  })

  it('start() moves to in-progress', () => {
    useLabState.getState().start()
    expect(useLabState.getState().phase).toBe('in-progress')
  })

  it('advanceScene() walks 0 → 5 then finishes at scene 6', () => {
    useLabState.getState().start()
    for (let i = 0; i < 6; i++) {
      useLabState.getState().advanceScene()
    }
    const s = useLabState.getState()
    expect(s.currentSceneIndex).toBe(6)
    expect(s.phase).toBe('finished')
  })

  it('recordMCAnswer pushes an entry with the current scene title', () => {
    useLabState.getState().start()
    useLabState.getState().recordMCAnswer(1)
    const s = useLabState.getState()
    expect(s.journal).toHaveLength(1)
    expect(s.journal[0].sceneTitle).toBe('Знайомство з молекулами')
    expect(s.journal[0].chosenIndex).toBe(1)
    expect(typeof s.journal[0].timestamp).toBe('number')
  })

  it('reset() returns to intro and clears journal', () => {
    useLabState.getState().start()
    useLabState.getState().recordMCAnswer(0)
    useLabState.getState().advanceScene()
    useLabState.getState().reset()
    const s = useLabState.getState()
    expect(s.phase).toBe('intro')
    expect(s.currentSceneIndex).toBe(0)
    expect(s.journal).toEqual([])
  })

  it('respawnObjects() bumps sessionId without changing phase or index', () => {
    useLabState.getState().start()
    useLabState.getState().advanceScene()
    const before = useLabState.getState()
    useLabState.getState().respawnObjects()
    const after = useLabState.getState()
    expect(after.sessionId).toBe(before.sessionId + 1)
    expect(after.phase).toBe('in-progress')
    expect(after.currentSceneIndex).toBe(before.currentSceneIndex)
  })
})
