import { useState } from 'react'
import { TouchNumberKeypad } from './TouchNumberKeypad'
import { useStepEngine } from '../guided/StepEngine'

type Props = {
  unit: 'g' | 'N'
  onSubmit: (value: number) => void
}

export function NumberInput({ unit, onSubmit }: Props) {
  const [keypadOpen, setKeypadOpen] = useState(false)
  const [pendingValue, setPendingValue] = useState<string>('')
  const setInputFocused = useStepEngine(s => s.setInputFocused)

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 14, opacity: 0.7, color: '#1d1d1f' }}>
          Значення в {unit === 'g' ? 'грамах' : 'Ньютонах'}:
        </span>
        <button
          onClick={() => { setKeypadOpen(true); setInputFocused(true) }}
          style={{
            background: '#0071e3', color: '#fff',
            padding: '12px 24px', fontSize: 16, fontWeight: 600,
            border: 'none', borderRadius: 12,
            minWidth: 200, textAlign: 'center', cursor: 'pointer',
            minHeight: 48,
            boxShadow: '0 2px 8px rgba(0,113,227,0.3)',
          }}
        >
          ✏️ Ввести і записати
        </button>
      </div>
      {keypadOpen && (
        <TouchNumberKeypad
          initialValue={pendingValue}
          onConfirm={(v) => {
            // Confirm = submit immediately. No need to click separate button.
            setPendingValue('')
            setKeypadOpen(false)
            setInputFocused(false)
            if (Number.isFinite(v) && v >= 0) {
              onSubmit(v)
            }
          }}
          onCancel={() => { setKeypadOpen(false); setInputFocused(false) }}
        />
      )}
    </>
  )
}
