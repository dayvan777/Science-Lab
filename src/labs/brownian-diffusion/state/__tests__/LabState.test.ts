import { describe, it, expect, beforeEach } from 'vitest'
import { useLabState } from '../LabState'
import { SCENES } from '../../content/scenes'

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

  it('advanceScene() finishes after the last scene', () => {
    useLabState.getState().start()
    for (let i = 0; i < SCENES.length; i++) {
      useLabState.getState().advanceScene()
    }
    const s = useLabState.getState()
    expect(s.currentSceneIndex).toBeGreaterThanOrEqual(SCENES.length)
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

  it('reset() returns to intro, clears journal, and bumps sessionId', () => {
    useLabState.getState().start()
    useLabState.getState().recordMCAnswer(0)
    useLabState.getState().advanceScene()
    const before = useLabState.getState().sessionId
    useLabState.getState().reset()
    const s = useLabState.getState()
    expect(s.phase).toBe('intro')
    expect(s.currentSceneIndex).toBe(0)
    expect(s.journal).toEqual([])
    expect(s.sessionId).toBeGreaterThan(before)
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
