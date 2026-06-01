import { create } from 'zustand'
import type { OrganelleId } from '../content/organelles'

export type ParameciumPhase = 'intro' | 'in-progress'
export type ViewMode = 'environment' | 'cell'

type ParameciumState = {
  phase: ParameciumPhase
  viewMode: ViewMode
  selectedOrganelleId: OrganelleId | null
  viewedOrganelleIds: OrganelleId[]
  start: () => void
  enterCell: () => void
  exitToEnvironment: () => void
  select: (id: OrganelleId) => void
  deselect: () => void
  reset: () => void
}

export const useParameciumState = create<ParameciumState>((set, get) => ({
  phase: 'intro',
  viewMode: 'environment',
  selectedOrganelleId: null,
  viewedOrganelleIds: [],

  start: () => set({ phase: 'in-progress' }),

  enterCell: () => set({ viewMode: 'cell' }),

  exitToEnvironment: () => set({ viewMode: 'environment', selectedOrganelleId: null }),

  select: (id) => {
    const { viewedOrganelleIds } = get()
    const viewed = viewedOrganelleIds.includes(id) ? viewedOrganelleIds : [...viewedOrganelleIds, id]
    set({ selectedOrganelleId: id, viewMode: 'cell', viewedOrganelleIds: viewed })
  },

  deselect: () => set({ selectedOrganelleId: null }),

  reset: () => set({ phase: 'intro', viewMode: 'environment', selectedOrganelleId: null, viewedOrganelleIds: [] }),
}))
