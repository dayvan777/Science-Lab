import { create } from 'zustand'

type InstrumentReadings = {
  digitalScaleGrams: number
  dynamometerNewtons: number
  // For lever balance: angle from horizontal (radians). 0 = balanced, positive = right pan heavier.
  leverBalanceTilt: number
  // For lever balance: derived total mass on each pan, in grams.
  leverLeftPanGrams: number
  leverRightPanGrams: number
  setDigitalScale: (g: number) => void
  setDynamometer: (n: number) => void
  setLeverTilt: (rad: number) => void
  setLeverLeftPanGrams: (g: number) => void
  setLeverRightPanGrams: (g: number) => void
}

export const useReadings = create<InstrumentReadings>((set) => ({
  digitalScaleGrams: 0,
  dynamometerNewtons: 0,
  leverBalanceTilt: 0,
  leverLeftPanGrams: 0,
  leverRightPanGrams: 0,
  setDigitalScale: (g) => set({ digitalScaleGrams: g }),
  setDynamometer: (n) => set({ dynamometerNewtons: n }),
  setLeverTilt: (rad) => set({ leverBalanceTilt: rad }),
  setLeverLeftPanGrams: (g) => set({ leverLeftPanGrams: g }),
  setLeverRightPanGrams: (g) => set({ leverRightPanGrams: g }),
}))
