import { useState, useCallback, useEffect } from 'react'
import type { CSSProperties } from 'react'

type Choice = { id: string; label: string }

type Props = {
  question: string
  choices: Choice[]
  /** Index (0-based) of the correct option. */
  correctIndex: number
  /** Fires when the student picks the correct answer. */
  onCorrect: (chosenIndex: number) => void
}

type ButtonState = 'idle' | 'wrong' | 'correct'

/**
 * Three-button vertical-stack MC widget styled to match the lab's glass HUD.
 * Click flashes green for correct (calls `onCorrect`), red for wrong (then
 * resets after 700 ms so the student can try again). Once correct, all
 * buttons disabled.
 */
export function MultipleChoice({ question, choices, correctIndex, onCorrect }: Props) {
  const [states, setStates] = useState<ButtonState[]>(() => choices.map(() => 'idle'))
  const [locked, setLocked] = useState(false)

  // Reset internal state if the question changes (e.g. we move to next scene).
  useEffect(() => {
    setStates(choices.map(() => 'idle'))
    setLocked(false)
  }, [question, choices])

  const handleClick = useCallback((idx: number) => {
    if (locked) return
    if (idx === correctIndex) {
      setStates(s => s.map((_, i) => (i === idx ? 'correct' : 'idle')))
      setLocked(true)
      onCorrect(idx)
      return
    }
    setStates(s => s.map((cur, i) => (i === idx ? 'wrong' : cur)))
    setTimeout(() => {
      setStates(s => s.map((cur, i) => (i === idx ? 'idle' : cur)))
    }, 700)
  }, [locked, correctIndex, onCorrect])

  const wrapStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    fontFamily: '"Inter", system-ui, sans-serif',
  }
  const questionStyle: CSSProperties = {
    fontSize: 15,
    fontWeight: 600,
    color: '#1d1d1f',
    margin: '0 0 8px',
    lineHeight: 1.4,
  }
  const buttonStyle = (state: ButtonState): CSSProperties => {
    const base: CSSProperties = {
      padding: '14px 18px',
      borderRadius: 100,
      fontSize: 14,
      fontWeight: 600,
      fontFamily: '"Inter", system-ui, sans-serif',
      textAlign: 'left',
      cursor: locked ? 'default' : 'pointer',
      transition: 'background 200ms ease, color 200ms ease, border-color 200ms ease',
      border: '1px solid rgba(0,0,0,0.10)',
    }
    if (state === 'correct') {
      return { ...base, background: '#34c759', color: '#fff', borderColor: '#34c759' }
    }
    if (state === 'wrong') {
      return { ...base, background: '#ff3b30', color: '#fff', borderColor: '#ff3b30' }
    }
    return { ...base, background: 'rgba(0,0,0,0.04)', color: '#1d1d1f' }
  }

  return (
    <div style={wrapStyle} role="group" aria-label={question}>
      <p style={questionStyle}>{question}</p>
      {choices.map((c, i) => (
        <button
          key={c.id}
          type="button"
          style={buttonStyle(states[i])}
          onClick={() => handleClick(i)}
          disabled={locked && states[i] !== 'correct'}
          aria-label={c.label}
        >
          {c.label}
        </button>
      ))}
    </div>
  )
}
