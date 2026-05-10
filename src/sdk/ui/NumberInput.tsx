import { useState, useRef, useEffect } from 'react'
import { useStepEngine } from '../guided/StepEngine'

type Props = {
  unit: 'g' | 'N'
  onSubmit: (value: number) => void
}

export function NumberInput({ unit, onSubmit }: Props) {
  const [text, setText] = useState('')
  const setInputFocused = useStepEngine(s => s.setInputFocused)
  const inputRef = useRef<HTMLInputElement>(null)

  // Reset text when component is reused for new task
  useEffect(() => {
    setText('')
  }, [unit])

  const submit = () => {
    const v = parseFloat(text.replace(',', '.'))
    if (Number.isFinite(v) && v >= 0) {
      onSubmit(v)
      setText('')
      inputRef.current?.blur()
    }
  }

  const canSubmit = !!text && Number.isFinite(parseFloat(text.replace(',', '.')))

  const inputId = 'measurement-value-input'
  const unitLabel = unit === 'g' ? 'грамах' : 'Ньютонах'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <label htmlFor={inputId} style={{ fontSize: 14, opacity: 0.7, color: '#1d1d1f' }}>
        Значення в {unitLabel}:
      </label>
      <input
        id={inputId}
        ref={inputRef}
        type="number"
        inputMode="decimal"
        step="any"
        min="0"
        value={text}
        placeholder="0"
        aria-label={`Введи виміряне значення в ${unitLabel}`}
        onChange={(e) => setText(e.target.value)}
        onFocus={() => setInputFocused(true)}
        onBlur={() => setInputFocused(false)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit()
        }}
        style={{
          background: '#fff', color: '#1d1d1f',
          padding: '12px 16px', fontSize: 22, fontWeight: 700,
          border: '2px solid #d1d1d6', borderRadius: 12,
          width: 120, textAlign: 'right', fontFamily: 'monospace',
          outline: 'none',
        }}
      />
      <button
        onClick={submit}
        disabled={!canSubmit}
        aria-label="Записати виміряне значення і перейти до наступного завдання"
        style={{
          background: canSubmit ? '#0071e3' : '#c0c0c8',
          color: '#fff', border: 'none',
          padding: '12px 28px', fontSize: 16, fontWeight: 600,
          borderRadius: 12,
          cursor: canSubmit ? 'pointer' : 'not-allowed',
          minHeight: 48,
          boxShadow: canSubmit ? '0 2px 8px rgba(0,113,227,0.3)' : 'none',
          transition: 'all 200ms ease',
        }}
      >
        Записати → Далі
      </button>
    </div>
  )
}
