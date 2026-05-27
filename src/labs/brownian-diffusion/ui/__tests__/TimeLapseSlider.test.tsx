import { describe, it, expect, beforeEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { TimeLapseSlider } from '../TimeLapseSlider'
import { useLabSettings } from '../../state/LabSettingsState'

describe('TimeLapseSlider', () => {
  beforeEach(() => {
    useLabSettings.setState({ timeLapseYears: 1 })
  })

  it('shows the current years value', () => {
    const { container } = render(<TimeLapseSlider />)
    expect(container.textContent).toContain('1')
  })

  it('clicking the "10" button updates state', () => {
    const { getByRole } = render(<TimeLapseSlider />)
    fireEvent.click(getByRole('button', { name: /^10$/ }))
    expect(useLabSettings.getState().timeLapseYears).toBe(10)
  })

  it('clicking the "1000" button updates state', () => {
    const { getByRole } = render(<TimeLapseSlider />)
    fireEvent.click(getByRole('button', { name: /1000/ }))
    expect(useLabSettings.getState().timeLapseYears).toBe(1000)
  })
})
