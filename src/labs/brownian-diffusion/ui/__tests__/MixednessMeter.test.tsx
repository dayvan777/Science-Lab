import { describe, it, expect, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { MixednessMeter } from '../MixednessMeter'
import { useLabState } from '../../state/LabState'

describe('MixednessMeter', () => {
  beforeEach(() => useLabState.setState({ mixedness: 0 }))

  it('renders the current mixedness as a percent', () => {
    useLabState.setState({ mixedness: 0.62 })
    const { getByTestId } = render(<MixednessMeter />)
    expect(getByTestId('mixedness-pct').textContent).toBe('62%')
  })

  it('clamps and rounds (1.0 -> 100%)', () => {
    useLabState.setState({ mixedness: 1 })
    const { getByTestId } = render(<MixednessMeter />)
    expect(getByTestId('mixedness-pct').textContent).toBe('100%')
  })
})
