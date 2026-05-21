import { create } from 'zustand'
import { SCENES } from '../content/scenes'

export type LabPhase = 'intro' | 'in-progress' | 'finished'

export type JournalEntry = {
  /** Friendly Ukrainian scene title, e.g., 'Повільний рух'. */
  sceneTitle: string
  chosenIndex: number
  timestamp: number
}

type LabState = {
  phase: LabPhase
  currentSceneIndex: number
  journal: JournalEntry[]
  sessionId: number
  start: () => void
  recordMCAnswer: (chosenIndex: number) => void
  advanceScene: () => void
  reset: () => void
  respawnObjects: () => void
}

const TOTAL_SCENES = 5

export const useLabState = create<LabState>((set, get) => ({
  phase: 'intro',
  currentSceneIndex: 0,
  journal: [],
  sessionId: 0,

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
    })
  },

  reset: () => set(s => ({
    phase: 'intro',
    currentSceneIndex: 0,
    journal: [],
    sessionId: s.sessionId + 1,
  })),

  respawnObjects: () => set(s => ({ sessionId: s.sessionId + 1 })),
}))
