import { CSSProperties } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { GlowBackground } from '../components/GlowBackground'
import { BrandHero } from '../components/BrandHero'
import { LabCard } from '../components/LabCard'
import { findSubject } from '../content/subjects'

const KICKER = 'ПРЕДМЕТ • ФІЗИКА'

export function PhysicsPage() {
  const subject = findSubject('physics')
  if (!subject) return <Navigate to="/" replace />

  const wrapStyle: CSSProperties = {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '40px 24px 64px',
  }

  const backStyle: CSSProperties = {
    alignSelf: 'flex-start',
    color: 'rgba(255, 255, 255, 0.6)',
    textDecoration: 'none',
    fontSize: 13,
    fontFamily: '"Inter", system-ui, sans-serif',
    fontWeight: 500,
    letterSpacing: '0.05em',
    padding: '8px 12px',
    borderRadius: 100,
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
  }

  const labsStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
    marginTop: 32,
    width: '100%',
    alignItems: 'center',
  }

  return (
    <>
      <GlowBackground />
      <main style={wrapStyle}>
        <Link to="/" style={backStyle} aria-label="Назад на головну">← Усі предмети</Link>
        <div style={{ marginTop: 32 }}>
          <BrandHero kicker={KICKER} size="medium" />
        </div>
        <div style={labsStyle}>
          {subject.labs.map(lab => (
            <LabCard key={lab.id} lab={lab} />
          ))}
        </div>
      </main>
    </>
  )
}
