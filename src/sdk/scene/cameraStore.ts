import { create } from 'zustand'

/**
 * Manual camera zoom factor applied on top of the active CameraRig preset.
 * 1.0 = preset default. Lower = closer (zoomed in). Higher = farther (out).
 */
type CameraStore = {
  zoomMul: number
  setZoomMul: (z: number) => void
  zoomBy: (factor: number) => void
  resetZoom: () => void
}

const MIN_ZOOM = 0.25
const MAX_ZOOM = 2.0

export const useCameraStore = create<CameraStore>((set) => ({
  zoomMul: 1,
  setZoomMul: (z) => set({ zoomMul: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z)) }),
  zoomBy: (factor) =>
    set((s) => ({ zoomMul: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, s.zoomMul * factor)) })),
  resetZoom: () => set({ zoomMul: 1 }),
}))
