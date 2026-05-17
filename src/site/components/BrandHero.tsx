import type { CSSProperties } from 'react'
import { useViewport } from '../../sdk/a11y/useViewport'

type Props = {
  /** Kicker line above the logo (e.g. "ОСВІТНЯ ПЛАТФОРМА · 6–7 КЛАС · BETA"). */
  kicker?: string
  /** Tagline shown below the logo. Optional. */
  tagline?: string
  /** Visual size — affects logo height and gaps. */
  size?: 'large' | 'medium'
}

const KICKER_PARTS_SEPARATOR = '•'  // bullet "•"

export function BrandHero({ kicker, tagline, size = 'large' }: Props) {
  const { breakpoint } = useViewport()
  const isPhone = breakpoint === 'phone'
  const isTablet = breakpoint === 'tablet'

  const logoHeight = size === 'large'
    ? (isPhone ? 64 : isTablet ? 80 : 100)
    : (isPhone ? 56 : 72)
  const tagFontSize = size === 'large' ? 16 : 14
  const kickerFontSize = size === 'large' ? 12 : 11

  const wrapStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    color: '#fff',
    fontFamily: '"Inter", system-ui, sans-serif',
  }

  const kickerStyle: CSSProperties = {
    fontSize: kickerFontSize,
    letterSpacing: isPhone ? '0.2em' : '0.3em',
    textTransform: 'uppercase',
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: 500,
    marginBottom: 28,
  }

  const dotStyle: CSSProperties = {
    color: 'rgba(255, 255, 255, 0.3)',
    margin: '0 10px',
  }

  const logoStyle: CSSProperties = {
    height: logoHeight,
    width: 'auto',
    maxWidth: '100%',
    objectFit: 'contain',
    userSelect: 'none',
    marginBottom: tagline ? 18 : 0,
  }

  const taglineStyle: CSSProperties = {
    fontSize: tagFontSize,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: 400,
    marginBottom: size === 'large' ? 44 : 24,
    maxWidth: 'min(600px, 90vw)',
    lineHeight: 1.5,
  }

  const kickerNodes = kicker
    ? kicker.split(KICKER_PARTS_SEPARATOR).map((part, i, arr) => (
        <span key={i}>
          {part.trim()}
          {i < arr.length - 1 ? <span style={dotStyle} aria-hidden="true">{KICKER_PARTS_SEPARATOR}</span> : null}
        </span>
      ))
    : null

  return (
    <div style={wrapStyle}>
      {kicker && <div style={kickerStyle}>{kickerNodes}</div>}
      <img
        src="/nova-evrika-logo.png"
        alt="NOVA EVRIKA"
        style={logoStyle}
        draggable={false}
      />
      {tagline && <div style={taglineStyle}>{tagline}</div>}
    </div>
  )
}
