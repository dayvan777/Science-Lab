import { describe, it, expect, beforeEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { ControlPanel } from '../ControlPanel'
import { useLabSettings } from '../../state/LabSettingsState'

const reset = () => useLabSettings.setState({
  materialState: 'gas', dividerRaised: false, redCount: 20, blueCount: 20,
  tracerActive: false, temperatureLevel: 'normal', showMolecules: true, timeLapseYears: 1,
})

describe('ControlPanel', () => {
  beforeEach(reset)

  it('switches material state', () => {
    const { getByRole } = render(<ControlPanel />)
    fireEvent.click(getByRole('button', { name: 'Рідина' }))
    expect(useLabSettings.getState().materialState).toBe('liquid')
  })

  it('toggles the divider', () => {
    const { getByRole } = render(<ControlPanel />)
    fireEvent.click(getByRole('button', { name: /Перегородка/ }))
    expect(useLabSettings.getState().dividerRaised).toBe(true)
  })

  it('adds a tracer; disabled in solid', () => {
    const { getByRole, rerender } = render(<ControlPanel />)
    fireEvent.click(getByRole('button', { name: /Тестова частинка/ }))
    expect(useLabSettings.getState().tracerActive).toBe(true)
    useLabSettings.setState({ materialState: 'solid' })
    rerender(<ControlPanel />)
    expect(getByRole('button', { name: /Тестова частинка/ })).toBeDisabled()
  })

  it('steps molecule counts by 5 (clamped to 40)', () => {
    useLabSettings.setState({ redCount: 38 })
    const { getByRole } = render(<ControlPanel />)
    fireEvent.click(getByRole('button', { name: 'Більше червоних' }))
    expect(useLabSettings.getState().redCount).toBe(40)
  })

  it('shows the time slider only in solid state', () => {
    const { queryByRole, rerender } = render(<ControlPanel />)
    expect(queryByRole('button', { name: '100' })).toBeNull()
    useLabSettings.setState({ materialState: 'solid' })
    rerender(<ControlPanel />)
    expect(queryByRole('button', { name: '100' })).not.toBeNull()
  })
})
