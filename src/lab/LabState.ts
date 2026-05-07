import { create } from 'zustand'

export type LabPhase = 'intro' | 'in-progress' | 'finished'

export type JournalEntry = {
  taskId: string
  userValue: number
  timestamp: number
}

type LabState = {
  phase: LabPhase
  currentTaskIndex: number
  journal: JournalEntry[]
  sessionId: number
  lastSubmittedAtMs: number
  start: () => void
  setMeasurement: (taskId: string, value: number) => void
  reset: () => void
}

const TOTAL_TASKS = 9

export const useLabState = create<LabState>((set, get) => ({
  phase: 'intro',
  currentTaskIndex: 0,
  journal: [],
  sessionId: 0,
  lastSubmittedAtMs: 0,

  start: () => set({ phase: 'in-progress' }),

  setMeasurement: (taskId, userValue) => {
    const { journal, currentTaskIndex } = get()
    const newJournal = [...journal, { taskId, userValue, timestamp: Date.now() }]
    const newIndex = currentTaskIndex + 1
    set({
      journal: newJournal,
      currentTaskIndex: newIndex,
      phase: newIndex >= TOTAL_TASKS ? 'finished' : 'in-progress',
      lastSubmittedAtMs: Date.now(),
    })
  },

  reset: () => set(s => ({
    phase: 'intro',
    currentTaskIndex: 0,
    journal: [],
    sessionId: s.sessionId + 1,
  })),
}))
