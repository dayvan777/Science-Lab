import { CSSProperties } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { GlowBackground } from '../components/GlowBackground'
import { BrandHero } from '../components/BrandHero'
import { findSubject, type SubjectId } from '../content/subjects'

type Props = {
  subjectId: SubjectId
}

export function ComingSoonPage({ subjectId }: Props) {
  const subject = findSubject(subjectId)
  if (!subject) return <Navigate to="/" replace />

  const kicker = `ПРЕДМЕТ • ${subject.title.toUpperCase()}`

  const wrapStyle: CSSProperties = {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 24px',
    textAlign: 'center',
  }

  const messageStyle: CSSProperties = {
    fontFamily: '"Saira", "Inter", system-ui, sans-serif',
    fontSize: 38,
    fontWeight: 800,
    letterSpacing: '-0.01em',
    color: '#fff',
    textTransform: 'uppercase',
    margin: '0 0 16px',
  }

  const subStyle: CSSProperties = {
    fontFamily: '"Inter", system-ui, sans-serif',
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: 400,
    maxWidth: 480,
    lineHeight: 1.5,
    marginBottom: 32,
  }

  const backStyle: CSSProperties = {
    display: 'inline-block',
    padding: '14px 28px',
    borderRadius: 100,
    background: 'rgba(255, 255, 255, 0.96)',
    color: '#1d1d1f',
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: '0.10em',
    textTransform: 'uppercase',
    fontFamily: '"Inter", system-ui, sans-serif',
    textDecoration: 'none',
    boxShadow: '0 8px 28px rgba(0, 0, 0, 0.4)',
  }

  return (
    <>
      <GlowBackground />
      <main style={wrapStyle}>
        <BrandHero kicker={kicker} size="medium" />
        <h2 style={messageStyle}>Скоро</h2>
        <p style={subStyle}>
          Цей предмет з&apos;явиться найближчим часом. Поки що готова <strong>Фізика</strong> — там одна повноцінна лабораторна.
        </p>
        <Link to="/" style={backStyle} aria-label="Назад на головну">← На головну</Link>
      </main>
    </>
  )
}
