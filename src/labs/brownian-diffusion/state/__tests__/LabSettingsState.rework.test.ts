import { describe, it, expect, beforeEach } from 'vitest'
import { useLabSettings } from '../LabSettingsState'

describe('LabSettingsState rework fields', () => {
  beforeEach(() => {
    useLabSettings.setState({
      materialState: 'gas', dividerRaised: false, redCount: 20, blueCount: 20,
      tracerActive: false, temperatureLevel: 'normal',
    })
  })

  it('defaults: gas, divider down, 20/20, no tracer', () => {
    const s = useLabSettings.getState()
    expect(s.materialState).toBe('gas')
    expect(s.dividerRaised).toBe(false)
    expect(s.redCount).toBe(20)
    expect(s.tracerActive).toBe(false)
  })

  it('setMaterialState / setDividerRaised / setTemperature mutate', () => {
    const s = useLabSettings.getState()
    s.setMaterialState('liquid'); expect(useLabSettings.getState().materialState).toBe('liquid')
    s.setDividerRaised(true);     expect(useLabSettings.getState().dividerRaised).toBe(true)
    s.setTemperature('hot');      expect(useLabSettings.getState().temperatureLevel).toBe('hot')
  })

  it('setRedCount/setBlueCount clamp to [5,40]', () => {
    const s = useLabSettings.getState()
    s.setRedCount(99); expect(useLabSettings.getState().redCount).toBe(40)
    s.setBlueCount(0); expect(useLabSettings.getState().blueCount).toBe(5)
  })

  it('addTracer sets tracerActive true; setTracerActive(false) resets', () => {
    const s = useLabSettings.getState()
    s.addTracer();            expect(useLabSettings.getState().tracerActive).toBe(true)
    s.setTracerActive(false); expect(useLabSettings.getState().tracerActive).toBe(false)
  })
})
