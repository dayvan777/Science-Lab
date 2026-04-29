import { useState } from 'react'

type Props = {
  unit: 'g' | 'N'
  onSubmit: (value: number) => void
}

export function NumberInput({ unit, onSubmit }: Props) {
  const [text, setText] = useState('')

  const handleSubmit = () => {
    const value = parseFloat(text.replace(',', '.'))
    if (Number.isFinite(value) && value >= 0) {
      onSubmit(value)
      setText('')
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ fontSize: 14, opacity: 0.7 }}>Значення:</span>
      <input
        type="number"
        inputMode="decimal"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        style={{
          background: '#fff', color: '#000',
          padding: '10px 16px', fontSize: 18,
          border: 'none', borderRadius: 8,
          width: 100, fontWeight: 600,
        }}
      />
      <span style={{ fontSize: 14, opacity: 0.7 }}>{unit === 'g' ? 'грамів' : 'Ньютонів'}</span>
      <button
        onClick={handleSubmit}
        disabled={!text}
        style={{
          background: text ? '#2ecc71' : '#444',
          color: '#fff',
          padding: '10px 20px', fontSize: 14, fontWeight: 600,
          border: 'none', borderRadius: 8,
          cursor: text ? 'pointer' : 'not-allowed',
        }}
      >
        Записати → Далі
      </button>
    </div>
  )
}
