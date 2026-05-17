import type { CSSProperties } from 'react'
import { GlowBackground } from '../components/GlowBackground'
import { BrandHero } from '../components/BrandHero'
import { SubjectPill } from '../components/SubjectPill'
import { SUBJECTS } from '../content/subjects'
import { useViewport } from '../../sdk/a11y/useViewport'

const KICKER = 'ОСВІТНЯ ПЛАТФОРМА • 6–7 КЛАС • BETA'
const TAGLINE = 'Інтерактивні предмети для шкільної програми'

export function LandingPage() {
  const { breakpoint } = useViewport()

  const wrapStyle: CSSProperties = {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: breakpoint === 'phone' ? '32px 16px' : '48px 24px',
  }

  const pillsStyle: CSSProperties = {
    display: 'flex',
    gap: 14,
    flexWrap: 'wrap',
    justifyContent: 'center',
    maxWidth: 720,
  }

  return (
    <>
      <GlowBackground />
      <main style={wrapStyle}>
        <BrandHero kicker={KICKER} tagline={TAGLINE} size="large" />
        <nav style={pillsStyle} aria-label="Перейти до предмету">
          {SUBJECTS.map(s => (
            <SubjectPill key={s.id} subject={s} />
          ))}
        </nav>
      </main>
    </>
  )
}
