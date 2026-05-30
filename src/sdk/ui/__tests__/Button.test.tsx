import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Button } from '../Button'

describe('Button fullWidth', () => {
  it('stretches to 100% when fullWidth', () => {
    const { getByRole } = render(<Button fullWidth onClick={() => {}}>X</Button>)
    expect(getByRole('button').style.width).toBe('100%')
  })
  it('does not set width by default', () => {
    const { getByRole } = render(<Button onClick={() => {}}>X</Button>)
    expect(getByRole('button').style.width).toBe('')
  })
})
