import { create } from 'zustand'
import { SCENES } from '../content/scenes'

export type LabPhase = 'intro' | 'in-progress' | 'finished'

export type JournalEntry = {
  /** Friendly Ukrainian scene title, e.g., 'Дифузія в газах'. */
  sceneTitle: string
  chosenIndex: number
  timestamp: number
}

type LabState = {
  phase: LabPhase
  currentSceneIndex: number
  journal: JournalEntry[]
  sessionId: number
  goalReached: boolean
  mixedness: number
  start: () => void
  recordMCAnswer: (chosenIndex: number) => void
  advanceScene: () => void
  reset: () => void
  respawnObjects: () => void
  setGoalReached: (b: boolean) => void
  setMixedness: (v: number) => void
}

const TOTAL_SCENES = SCENES.length

export const useLabState = create<LabState>((set, get) => ({
  phase: 'intro',
  currentSceneIndex: 0,
  journal: [],
  sessionId: 0,
  goalReached: false,
  mixedness: 0,

  start: () => set({ phase: 'in-progress' }),

  recordMCAnswer: (chosenIndex) => {
    const { journal, currentSceneIndex } = get()
    const scene = SCENES[currentSceneIndex]
    if (!scene) return
    set({
      journal: [...journal, { sceneTitle: scene.title, chosenIndex, timestamp: Date.now() }],
    })
  },

  advanceScene: () => {
    const { currentSceneIndex } = get()
    const next = currentSceneIndex + 1
    set({
      currentSceneIndex: next,
      phase: next >= TOTAL_SCENES ? 'finished' : 'in-progress',
      goalReached: false,
    })
  },

  reset: () => set(s => ({
    phase: 'intro',
    currentSceneIndex: 0,
    journal: [],
    sessionId: s.sessionId + 1,
    goalReached: false,
    mixedness: 0,
  })),

  respawnObjects: () => set(s => ({ sessionId: s.sessionId + 1 })),

  setGoalReached: (b) => set({ goalReached: b }),
  setMixedness: (v) => set({ mixedness: v }),
}))
