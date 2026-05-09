import { CSSProperties, ReactNode } from 'react'

type Props = { children: ReactNode; active: boolean; style?: CSSProperties }

export function PulseEffect({ children, active, style }: Props) {
  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-block',
        ...style,
      }}
    >
      {children}
      {active && (
        <div
          style={{
            position: 'absolute', inset: -4, borderRadius: 16,
            border: '2px solid #0071e3',
            animation: 'pulseRing 1.2s ease-out infinite',
            pointerEvents: 'none',
          }}
        />
      )}
      <style>{`
        @keyframes pulseRing {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(1.15); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
