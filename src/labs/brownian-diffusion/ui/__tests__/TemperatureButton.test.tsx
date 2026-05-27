import { describe, it, expect, beforeEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { TemperatureButton } from '../TemperatureButton'
import { useLabSettings } from '../../state/LabSettingsState'

describe('TemperatureButton', () => {
  beforeEach(() => {
    useLabSettings.setState({ temperatureLevel: 'normal' })
  })

  it('renders the current level label in Ukrainian', () => {
    const { container } = render(<TemperatureButton />)
    expect(container.textContent).toContain('Норма')
  })

  it('clicking cycles to next level', () => {
    const { getByRole } = render(<TemperatureButton />)
    fireEvent.click(getByRole('button'))
    expect(useLabSettings.getState().temperatureLevel).toBe('warm')
  })

  it('cycles around: hot → cold', () => {
    useLabSettings.setState({ temperatureLevel: 'hot' })
    const { getByRole } = render(<TemperatureButton />)
    fireEvent.click(getByRole('button'))
    expect(useLabSettings.getState().temperatureLevel).toBe('cold')
  })
})
