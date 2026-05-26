import { create } from 'zustand'

export type TemperatureLevel = 'cold' | 'normal' | 'warm' | 'hot'
export type TimeLapseYears = 1 | 10 | 100 | 1000

export const TIME_LAPSE_VALUES: TimeLapseYears[] = [1, 10, 100, 1000]

const TEMP_CYCLE: TemperatureLevel[] = ['cold', 'normal', 'warm', 'hot']

type Settings = {
  temperatureLevel: TemperatureLevel
  showMolecules: boolean
  /** Scene 5 only. */
  timeLapseYears: TimeLapseYears
  /** Internal — dev fallback, no UI control. */
  maxParticles: number

  cycleTemperature: () => void
  toggleMolecules: () => void
  setTimeLapse: (y: TimeLapseYears) => void
}

export const useLabSettings = create<Settings>((set, get) => ({
  temperatureLevel: 'normal',
  showMolecules: false,
  timeLapseYears: 1,
  maxParticles: 150,

  cycleTemperature: () => {
    const cur = get().temperatureLevel
    const i = TEMP_CYCLE.indexOf(cur)
    const next = TEMP_CYCLE[(i + 1) % TEMP_CYCLE.length]
    set({ temperatureLevel: next })
  },

  toggleMolecules: () => set(s => ({ showMolecules: !s.showMolecules })),

  setTimeLapse: (y) => {
    if (!TIME_LAPSE_VALUES.includes(y)) return
    set({ timeLapseYears: y })
  },
}))
