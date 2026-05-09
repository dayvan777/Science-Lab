import { ReactNode, MouseEvent } from 'react'

type Props = {
  onClick: () => void
  variant?: 'primary' | 'secondary'
  children: ReactNode
  disabled?: boolean
}

export function Button({ onClick, variant = 'primary', children, disabled }: Props) {
  const isPrimary = variant === 'primary'
  return (
    <button
      onClick={(e: MouseEvent) => { e.preventDefault(); if (!disabled) onClick() }}
      disabled={disabled}
      style={{
        background: isPrimary ? (disabled ? '#a0a0a8' : '#0071e3') : 'rgba(255, 255, 255, 0.7)',
        backdropFilter: isPrimary ? undefined : 'blur(20px)',
        color: isPrimary ? '#fff' : (disabled ? '#a0a0a8' : '#0071e3'),
        border: isPrimary ? 'none' : '1px solid rgba(0, 113, 227, 0.2)',
        borderRadius: 12,
        padding: '14px 32px',
        fontSize: 16,
        fontWeight: 600,
        minHeight: 56,
        minWidth: 120,
        cursor: disabled ? 'not-allowed' : 'pointer',
        touchAction: 'manipulation',
        boxShadow: isPrimary
          ? '0 1px 2px rgba(0,0,0,0.1), 0 4px 12px rgba(0,113,227,0.3)'
          : '0 1px 2px rgba(0,0,0,0.05)',
        transition: 'transform 150ms cubic-bezier(0.34, 1.56, 0.64, 1), background 200ms ease',
        fontFamily: '"SF Pro Display", "Inter", system-ui, sans-serif',
      }}
      onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.96)' }}
      onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
    >
      {children}
    </button>
  )
}
