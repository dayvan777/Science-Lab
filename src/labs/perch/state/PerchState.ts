import { create } from 'zustand'

// TEMP local type — replaced by `import type { PartId } from '../content/parts'` in a later task.
type PartId = string

export type PerchPhase = 'intro' | 'external' | 'internal'

type PerchState = {
  phase: PerchPhase
  cutProgress: number
  selectedPartId: PartId | null
  viewedPartIds: PartId[]
  start: () => void
  setCut: (p: number) => void
  suture: () => void
  select: (id: PartId) => void
  deselect: () => void
  reset: () => void
}

export const usePerchState = create<PerchState>((set, get) => ({
  phase: 'intro',
  cutProgress: 0,
  selectedPartId: null,
  viewedPartIds: [],

  start: () => set({ phase: 'external' }),

  setCut: (p) => {
    const cut = Math.min(1, Math.max(0, p))
    set(cut >= 1 ? { cutProgress: 1, phase: 'internal' } : { cutProgress: cut })
  },

  suture: () => set({ cutProgress: 0, phase: 'external', selectedPartId: null }),

  select: (id) => {
    const { viewedPartIds } = get()
    const viewed = viewedPartIds.includes(id) ? viewedPartIds : [...viewedPartIds, id]
    set({ selectedPartId: id, viewedPartIds: viewed })
  },

  deselect: () => set({ selectedPartId: null }),

  reset: () => set({ phase: 'intro', cutProgress: 0, selectedPartId: null, viewedPartIds: [] }),
}))
