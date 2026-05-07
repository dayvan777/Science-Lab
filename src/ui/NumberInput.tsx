import { useState } from 'react'
import { TouchNumberKeypad } from './TouchNumberKeypad'

type Props = {
  unit: 'g' | 'N'
  onSubmit: (value: number) => void
}

export function NumberInput({ unit, onSubmit }: Props) {
  const [keypadOpen, setKeypadOpen] = useState(false)
  const [pendingValue, setPendingValue] = useState<string>('')

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 14, opacity: 0.7, color: '#1d1d1f' }}>Значення:</span>
        <button
          onClick={() => setKeypadOpen(true)}
          style={{
            background: '#fff', color: '#1d1d1f',
            padding: '12px 20px', fontSize: 22, fontWeight: 600,
            border: '1px solid #d1d1d6', borderRadius: 12,
            minWidth: 120, textAlign: 'right', cursor: 'pointer',
            fontFamily: 'monospace',
          }}
        >
          {pendingValue || '—'}
        </button>
        <span style={{ fontSize: 14, opacity: 0.7, color: '#1d1d1f' }}>
          {unit === 'g' ? 'грамів' : 'Ньютонів'}
        </span>
        <button
          onClick={() => {
            const v = parseFloat(pendingValue.replace(',', '.'))
            if (Number.isFinite(v) && v >= 0) {
              onSubmit(v)
              setPendingValue('')
            }
          }}
          disabled={!pendingValue}
          style={{
            background: pendingValue ? '#0071e3' : '#a0a0a8',
            color: '#fff', border: 'none',
            padding: '12px 24px', fontSize: 16, fontWeight: 600,
            borderRadius: 12, cursor: pendingValue ? 'pointer' : 'not-allowed',
            minHeight: 48,
          }}
        >
          Записати → Далі
        </button>
      </div>
      {keypadOpen && (
        <TouchNumberKeypad
          initialValue={pendingValue}
          onConfirm={(v) => {
            setPendingValue(String(v))
            setKeypadOpen(false)
          }}
          onCancel={() => setKeypadOpen(false)}
        />
      )}
    </>
  )
}
