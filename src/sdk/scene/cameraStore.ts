import { create } from 'zustand'

/**
 * Per-lab user-controllable focus target. When non-null, CameraRig
 * overrides the scene-default preset and flies to the corresponding
 * focus-* pose. EM-induction's instruments dispatch `setFocusTarget(...)`
 * on tap; FocusResetButton clears it.
 */
export type FocusTarget = 'magnet' | 'coil' | 'bulb' | 'galv' | null

/**
 * Manual camera zoom factor applied on top of the active CameraRig preset.
 * 1.0 = preset default. Lower = closer (zoomed in). Higher = farther (out).
 */
type CameraStore = {
  zoomMul: number
  focusTarget: FocusTarget
  setZoomMul: (z: number) => void
  zoomBy: (factor: number) => void
  resetZoom: () => void
  setFocusTarget: (t: FocusTarget) => void
}

const MIN_ZOOM = 0.25
const MAX_ZOOM = 2.0

export const useCameraStore = create<CameraStore>((set) => ({
  zoomMul: 1,
  focusTarget: null,
  setZoomMul: (z) => set({ zoomMul: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z)) }),
  zoomBy: (factor) =>
    set((s) => ({ zoomMul: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, s.zoomMul * factor)) })),
  resetZoom: () => set({ zoomMul: 1 }),
  setFocusTarget: (focusTarget) => set({ focusTarget }),
}))
