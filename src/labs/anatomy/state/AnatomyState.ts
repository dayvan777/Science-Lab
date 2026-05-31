import { create } from 'zustand'
import type { OrganId } from '../content/organs'

export type AnatomyPhase = 'intro' | 'in-progress'

type AnatomyState = {
  phase: AnatomyPhase
  selectedOrganId: OrganId | null
  viewedOrganIds: OrganId[]
  start: () => void
  select: (id: OrganId) => void
  deselect: () => void
  reset: () => void
}

export const useAnatomyState = create<AnatomyState>((set, get) => ({
  phase: 'intro',
  selectedOrganId: null,
  viewedOrganIds: [],

  start: () => set({ phase: 'in-progress' }),

  select: (id) => {
    const { viewedOrganIds } = get()
    const viewed = viewedOrganIds.includes(id) ? viewedOrganIds : [...viewedOrganIds, id]
    set({ selectedOrganId: id, viewedOrganIds: viewed })
  },

  deselect: () => set({ selectedOrganId: null }),

  reset: () => set({ phase: 'intro', selectedOrganId: null, viewedOrganIds: [] }),
}))
