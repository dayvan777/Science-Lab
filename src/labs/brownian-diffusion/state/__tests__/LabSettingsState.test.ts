import { describe, it, expect, beforeEach } from 'vitest'
import { useLabSettings, TIME_LAPSE_VALUES } from '../LabSettingsState'

describe('useLabSettings (brownian-diffusion)', () => {
  beforeEach(() => {
    useLabSettings.setState({
      temperatureLevel: 'normal',
      showMolecules: false,
      timeLapseYears: 1,
      maxParticles: 150,
    })
  })

  it('has sensible defaults', () => {
    const s = useLabSettings.getState()
    expect(s.temperatureLevel).toBe('normal')
    expect(s.showMolecules).toBe(false)
    expect(s.timeLapseYears).toBe(1)
    expect(s.maxParticles).toBe(150)
  })

  it('cycleTemperature walks cold → normal → warm → hot → cold', () => {
    const order = ['cold', 'normal', 'warm', 'hot'] as const
    useLabSettings.setState({ temperatureLevel: 'cold' })
    for (let i = 1; i <= 4; i++) {
      useLabSettings.getState().cycleTemperature()
      expect(useLabSettings.getState().temperatureLevel).toBe(order[i % 4])
    }
  })

  it('toggleMolecules flips boolean', () => {
    useLabSettings.getState().toggleMolecules()
    expect(useLabSettings.getState().showMolecules).toBe(true)
    useLabSettings.getState().toggleMolecules()
    expect(useLabSettings.getState().showMolecules).toBe(false)
  })

  it('setTimeLapse only accepts allowed values', () => {
    useLabSettings.getState().setTimeLapse(100)
    expect(useLabSettings.getState().timeLapseYears).toBe(100)
    // Disallowed: ignored
    useLabSettings.getState().setTimeLapse(50 as 1 | 10 | 100 | 1000)
    expect(useLabSettings.getState().timeLapseYears).toBe(100)
  })

  it('TIME_LAPSE_VALUES exposes the 4 allowed values in order', () => {
    expect(TIME_LAPSE_VALUES).toEqual([1, 10, 100, 1000])
  })
})
