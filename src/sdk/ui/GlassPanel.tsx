import { CSSProperties, ReactNode } from 'react'

type Props = {
  children: ReactNode
  style?: CSSProperties
  variant?: 'default' | 'subtle' | 'strong'
}

export function GlassPanel({ children, style, variant = 'default' }: Props) {
  const variants: Record<string, CSSProperties> = {
    default: {
      background: 'rgba(255, 255, 255, 0.7)',
      backdropFilter: 'blur(40px) saturate(180%)',
      border: '1px solid rgba(255, 255, 255, 0.18)',
    },
    subtle: {
      background: 'rgba(255, 255, 255, 0.5)',
      backdropFilter: 'blur(20px) saturate(150%)',
      border: '1px solid rgba(255, 255, 255, 0.12)',
    },
    strong: {
      background: 'rgba(255, 255, 255, 0.85)',
      backdropFilter: 'blur(60px) saturate(200%)',
      border: '1px solid rgba(255, 255, 255, 0.25)',
    },
  }

  return (
    <div
      style={{
        ...variants[variant],
        borderRadius: 16,
        boxShadow:
          '0 1px 2px rgba(0,0,0,0.04), 0 8px 16px rgba(0,0,0,0.08), 0 30px 60px -10px rgba(0,0,0,0.15)',
        color: '#1d1d1f',
        ...style,
      }}
    >
      {children}
    </div>
  )
}
