import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Lab-local persisted settings. Three knobs:
 *   - `fieldVisible` — toggles magnetic-field-line + current-arrow rendering.
 *   - `coilTurns` — number of helix wraps in the coil. Discrete values
 *     3 / 5 / 10 / 20 cycle on the "Витки" pill. Affects both the coil's
 *     visual geometry and the EMF magnitude (linear scaling).
 *   - `magnetStrength` — discrete `'weak' | 'normal' | 'strong'` cycle on
 *     the "Магніт" pill. Affects EMF magnitude (×0.5 / ×1.0 / ×1.5) and the
 *     field-line opacity (faint / normal / bright).
 *
 * Persisted under `'em-induction.lab-settings'` (a fresh key — Phase 2's
 * `'em-induction.visual-state'` becomes a tiny orphan in localStorage, which
 * is acceptable per the spec).
 */
export type CoilTurns = 3 | 5 | 10 | 20
export type MagnetStrength = 'weak' | 'normal' | 'strong'

const COIL_TURNS_CYCLE: CoilTurns[] = [3, 5, 10, 20]
const MAGNET_STRENGTH_CYCLE: MagnetStrength[] = ['weak', 'normal', 'strong']

type LabSettings = {
  fieldVisible: boolean
  coilTurns: CoilTurns
  magnetStrength: MagnetStrength
  setFieldVisible: (v: boolean) => void
  cycleCoilTurns: () => void
  cycleMagnetStrength: () => void
}

export const useLabSettings = create<LabSettings>()(
  persist(
    (set, get) => ({
      fieldVisible: true,
      coilTurns: 10,
      magnetStrength: 'normal',
      setFieldVisible: (fieldVisible) => set({ fieldVisible }),
      cycleCoilTurns: () => {
        const idx = COIL_TURNS_CYCLE.indexOf(get().coilTurns)
        const next = COIL_TURNS_CYCLE[(idx + 1) % COIL_TURNS_CYCLE.length]
        set({ coilTurns: next })
      },
      cycleMagnetStrength: () => {
        const idx = MAGNET_STRENGTH_CYCLE.indexOf(get().magnetStrength)
        const next = MAGNET_STRENGTH_CYCLE[(idx + 1) % MAGNET_STRENGTH_CYCLE.length]
        set({ magnetStrength: next })
      },
    }),
    { name: 'em-induction.lab-settings' },
  ),
)
