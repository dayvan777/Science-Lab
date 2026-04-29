import { ReactNode, MouseEvent } from 'react'

type Props = {
  onClick: () => void
  variant?: 'primary' | 'secondary'
  children: ReactNode
}

export function Button({ onClick, variant = 'primary', children }: Props) {
  const bg = variant === 'primary' ? '#2ecc71' : '#3498db'
  return (
    <button
      onClick={(e: MouseEvent) => { e.preventDefault(); onClick() }}
      style={{
        background: bg,
        color: '#fff',
        border: 'none',
        borderRadius: 12,
        padding: '16px 32px',
        fontSize: 18,
        fontWeight: 600,
        minHeight: 56,
        minWidth: 120,
        cursor: 'pointer',
        touchAction: 'manipulation',
      }}
    >
      {children}
    </button>
  )
}
