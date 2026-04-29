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
  start: () => void
  setMeasurement: (taskId: string, value: number) => void
  reset: () => void
}

const TOTAL_TASKS = 9

export const useLabState = create<LabState>((set, get) => ({
  phase: 'intro',
  currentTaskIndex: 0,
  journal: [],

  start: () => set({ phase: 'in-progress' }),

  setMeasurement: (taskId, userValue) => {
    const { journal, currentTaskIndex } = get()
    const newJournal = [...journal, { taskId, userValue, timestamp: Date.now() }]
    const newIndex = currentTaskIndex + 1
    set({
      journal: newJournal,
      currentTaskIndex: newIndex,
      phase: newIndex >= TOTAL_TASKS ? 'finished' : 'in-progress',
    })
  },

  reset: () => set({ phase: 'intro', currentTaskIndex: 0, journal: [] }),
}))
