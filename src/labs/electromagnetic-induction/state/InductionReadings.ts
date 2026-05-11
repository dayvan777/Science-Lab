import { create } from 'zustand'

/**
 * Real-time physics readings. LabScene writes here every frame; instruments
 * (Galvanometer, Bulb) subscribe and render reactively.
 */
type InductionReadings = {
  /** Signed EMF in galvanometer-scale units (±EMF_MAX from induction.ts). */
  currentEMF: number
  /** 0..1, drives the bulb's PointLight intensity + emissive material. */
  bulbBrightness: number
  /** Radians, drives the galvanometer needle's rotation around its pivot. */
  galvanometerAngle: number
  /** Magnitude of magnet velocity in m/s — used by scene-advance heuristics. */
  magnetSpeed: number
  /** Magnet position (world) — used by scene-advance heuristics. */
  magnetWorldZ: number
  setReadings: (r: Partial<Pick<InductionReadings,
    'currentEMF' | 'bulbBrightness' | 'galvanometerAngle' | 'magnetSpeed' | 'magnetWorldZ'>>) => void
}

export const useInductionReadings = create<InductionReadings>((set) => ({
  currentEMF: 0,
  bulbBrightness: 0,
  galvanometerAngle: 0,
  magnetSpeed: 0,
  magnetWorldZ: 0,
  setReadings: (r) => set(r),
}))
