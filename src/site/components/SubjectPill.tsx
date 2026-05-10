import { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import type { SubjectEntry } from '../content/subjects'

type Props = {
  subject: SubjectEntry
}

export function SubjectPill({ subject }: Props) {
  const isAvailable = subject.status === 'available'

  const baseStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 10,
    padding: '16px 32px',
    borderRadius: 100,
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    fontFamily: '"Inter", system-ui, sans-serif',
    textDecoration: 'none',
    cursor: 'pointer',
    transition: 'transform 200ms ease, background 200ms ease, box-shadow 200ms ease',
    minHeight: 52,
  }

  const availableStyle: CSSProperties = {
    background: 'rgba(255, 255, 255, 0.96)',
    color: '#1d1d1f',
    border: 'none',
    boxShadow: '0 8px 28px rgba(0, 0, 0, 0.4)',
  }

  const lockedStyle: CSSProperties = {
    background: 'rgba(255, 255, 255, 0.08)',
    color: 'rgba(255, 255, 255, 0.55)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.10)',
  }

  const badgeBaseStyle: CSSProperties = {
    display: 'inline-block',
    fontSize: 9,
    padding: '3px 8px',
    borderRadius: 100,
    fontWeight: 700,
    letterSpacing: '0.05em',
  }

  const badgeStyle: CSSProperties = isAvailable
    ? { ...badgeBaseStyle, background: 'rgba(0, 0, 0, 0.10)', color: '#1d1d1f' }
    : { ...badgeBaseStyle, background: 'rgba(255, 255, 255, 0.10)', color: 'rgba(255, 255, 255, 0.55)' }

  const labCount = subject.labs.length
  const badgeText = isAvailable
    ? labCount === 1 ? '1 ЛАБА' : `${labCount} ЛАБ`
    : 'СКОРО'

  const style = { ...baseStyle, ...(isAvailable ? availableStyle : lockedStyle) }

  return (
    <Link to={subject.path} style={style} aria-label={`Перейти до предмету: ${subject.title}`}>
      <span>{subject.title}</span>
      <span style={badgeStyle}>{badgeText}</span>
    </Link>
  )
}
