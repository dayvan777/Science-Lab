import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Lab-local visualization toggle. Controls whether the bar magnet's
 * field lines and the coil's induced-current arrows are rendered. The
 * toggle persists across page reloads via the existing zustand/middleware
 * persist helper — localStorage key is namespaced under the lab's domain.
 *
 * Default: ON (true). Students see the field by default; the toggle is
 * available to strip the scene down to the bare instruments.
 */
type VisualState = {
  fieldVisible: boolean
  setFieldVisible: (v: boolean) => void
}

export const useVisualState = create<VisualState>()(
  persist(
    (set) => ({
      fieldVisible: true,
      setFieldVisible: (fieldVisible) => set({ fieldVisible }),
    }),
    { name: 'em-induction.visual-state' },
  ),
)
