import { describe, it, expect, beforeEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { ShowMoleculesToggle } from '../ShowMoleculesToggle'
import { useLabSettings } from '../../state/LabSettingsState'

describe('ShowMoleculesToggle', () => {
  beforeEach(() => {
    useLabSettings.setState({ showMolecules: false })
  })

  it('shows "Показати причину" when molecules are hidden', () => {
    const { getByRole } = render(<ShowMoleculesToggle />)
    expect(getByRole('button').textContent).toContain('Показати причину')
  })

  it('shows "Сховати молекули" when molecules are visible', () => {
    useLabSettings.setState({ showMolecules: true })
    const { getByRole } = render(<ShowMoleculesToggle />)
    expect(getByRole('button').textContent).toContain('Сховати молекули')
  })

  it('toggles state on click', () => {
    const { getByRole } = render(<ShowMoleculesToggle />)
    fireEvent.click(getByRole('button'))
    expect(useLabSettings.getState().showMolecules).toBe(true)
    fireEvent.click(getByRole('button'))
    expect(useLabSettings.getState().showMolecules).toBe(false)
  })
})
