import { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import type { LabEntry } from '../content/subjects'

type Props = {
  lab: LabEntry
}

export function LabCard({ lab }: Props) {
  const cardStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    padding: 32,
    borderRadius: 20,
    background: 'rgba(255, 255, 255, 0.06)',
    backdropFilter: 'blur(40px)',
    border: '1px solid rgba(255, 255, 255, 0.10)',
    color: '#fff',
    fontFamily: '"Inter", system-ui, sans-serif',
    maxWidth: 720,
    width: '100%',
  }

  const titleStyle: CSSProperties = {
    fontFamily: '"Saira", "Inter", system-ui, sans-serif',
    fontWeight: 800,
    fontSize: 32,
    letterSpacing: '-0.01em',
    lineHeight: 1.05,
    color: '#fff',
    textTransform: 'uppercase',
    margin: 0,
  }

  const subtitleStyle: CSSProperties = {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: 400,
    margin: 0,
  }

  const ctaWrapStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'flex-start',
    marginTop: 16,
  }

  const ctaStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '14px 28px',
    borderRadius: 100,
    background: '#0a84ff',
    color: '#fff',
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: '0.10em',
    textTransform: 'uppercase',
    textDecoration: 'none',
    boxShadow: '0 4px 20px rgba(10, 132, 255, 0.4)',
  }

  return (
    <article style={cardStyle}>
      <h2 style={titleStyle}>{lab.title}</h2>
      {lab.subtitle && <p style={subtitleStyle}>{lab.subtitle}</p>}
      <div style={ctaWrapStyle}>
        <Link to={lab.path} style={ctaStyle} aria-label={`Почати лабораторну: ${lab.title}`}>
          Почати лабораторну
        </Link>
      </div>
    </article>
  )
}
