import { useState, useEffect } from 'react'
import { GlassPanel } from './GlassPanel'

type Props = {
  initialValue?: string
  onConfirm: (value: number) => void
  onCancel: () => void
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✓']

export function TouchNumberKeypad({ initialValue = '', onConfirm, onCancel }: Props) {
  const [text, setText] = useState(initialValue)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
      if (e.key === 'Enter') confirm()
      if (e.key >= '0' && e.key <= '9') setText(t => t + e.key)
      if (e.key === 'Backspace') setText(t => t.slice(0, -1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [text])

  const handleKey = (key: string) => {
    if (key === '⌫') setText(t => t.slice(0, -1))
    else if (key === '✓') confirm()
    else setText(t => t + key)
  }

  const confirm = () => {
    const v = parseFloat(text.replace(',', '.'))
    if (Number.isFinite(v) && v >= 0) onConfirm(v)
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onCancel}
    >
      <GlassPanel
        variant="strong"
        style={{ padding: 16, width: 280, maxWidth: '90vw' }}
      >
        <div onClick={(e) => e.stopPropagation()}>
          <div style={{
            background: '#fff', color: '#1d1d1f',
            padding: '12px 16px', borderRadius: 10,
            fontSize: 28, fontWeight: 700, fontFamily: 'monospace',
            textAlign: 'right', marginBottom: 12, minHeight: 48,
          }}>
            {text || '0'}
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 6,
          }}>
            {KEYS.map((k) => (
              <button
                key={k}
                onClick={() => handleKey(k)}
                style={{
                  height: 52, fontSize: 20, fontWeight: 500,
                  border: 'none', borderRadius: 10,
                  background: k === '✓' ? '#0071e3' : 'rgba(255,255,255,0.95)',
                  color: k === '✓' ? '#fff' : '#1d1d1f',
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  fontFamily: '"SF Pro Display", "Inter", system-ui',
                }}
              >
                {k}
              </button>
            ))}
          </div>
          <button
            onClick={onCancel}
            style={{
              width: '100%', marginTop: 8, padding: '8px',
              background: 'transparent', color: '#6e6e73',
              border: 'none', fontSize: 13, cursor: 'pointer',
            }}
          >
            Скасувати
          </button>
        </div>
      </GlassPanel>
    </div>
  )
}
