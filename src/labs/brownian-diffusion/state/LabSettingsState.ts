import { create } from 'zustand'

export type TemperatureLevel = 'cold' | 'normal' | 'warm' | 'hot'
export type TimeLapseYears = 1 | 10 | 100 | 1000
export type MaterialState = 'gas' | 'liquid' | 'solid'

export const TIME_LAPSE_VALUES: TimeLapseYears[] = [1, 10, 100, 1000]
const TEMP_CYCLE: TemperatureLevel[] = ['cold', 'normal', 'warm', 'hot']
const clampCount = (n: number) => Math.max(5, Math.min(40, Math.round(n)))

type Settings = {
  temperatureLevel: TemperatureLevel
  showMolecules: boolean
  timeLapseYears: TimeLapseYears
  maxParticles: number
  materialState: MaterialState
  dividerRaised: boolean
  redCount: number
  blueCount: number
  tracerActive: boolean

  cycleTemperature: () => void
  toggleMolecules: () => void
  setMolecules: (b: boolean) => void
  setTimeLapse: (y: TimeLapseYears) => void
  setTemperature: (level: TemperatureLevel) => void
  setMaterialState: (s: MaterialState) => void
  setDividerRaised: (b: boolean) => void
  setRedCount: (n: number) => void
  setBlueCount: (n: number) => void
  addTracer: () => void
  setTracerActive: (b: boolean) => void
}

export const useLabSettings = create<Settings>((set, get) => ({
  temperatureLevel: 'normal',
  showMolecules: true,
  timeLapseYears: 1,
  maxParticles: 150,
  materialState: 'gas',
  dividerRaised: false,
  redCount: 20,
  blueCount: 20,
  tracerActive: false,

  cycleTemperature: () => {
    const i = TEMP_CYCLE.indexOf(get().temperatureLevel)
    set({ temperatureLevel: TEMP_CYCLE[(i + 1) % TEMP_CYCLE.length] })
  },
  toggleMolecules: () => set(s => ({ showMolecules: !s.showMolecules })),
  setMolecules: (b) => set({ showMolecules: b }),
  setTimeLapse: (y) => { if (TIME_LAPSE_VALUES.includes(y)) set({ timeLapseYears: y }) },
  setTemperature: (level) => set({ temperatureLevel: level }),
  setMaterialState: (s) => set({ materialState: s }),
  setDividerRaised: (b) => set({ dividerRaised: b }),
  setRedCount: (n) => set({ redCount: clampCount(n) }),
  setBlueCount: (n) => set({ blueCount: clampCount(n) }),
  addTracer: () => set({ tracerActive: true }),
  setTracerActive: (b) => set({ tracerActive: b }),
}))
