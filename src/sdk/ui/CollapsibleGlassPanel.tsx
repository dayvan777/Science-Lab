import { CSSProperties, ReactNode, useEffect, useState } from 'react'
import { GlassPanel } from './GlassPanel'

type Props = {
  /** Stable id used to persist collapsed state to localStorage. */
  storageKey: string
  /** Short label shown on the collapsed pill (sr-only when an icon is given). */
  label: string
  /** Optional icon shown on the collapsed pill. Defaults to '⊟'. */
  collapsedIcon?: string
  /** Default collapsed state on first mount (overridden by localStorage). */
  defaultCollapsed?: boolean
  /** Outer panel style (when expanded). */
  style?: CSSProperties
  /** Inline style for the collapsed pill — override position to keep it
   *  in the same corner as the expanded panel. */
  collapsedStyle?: CSSProperties
  /** ARIA region label id (the element with this id labels the panel). */
  'aria-labelledby'?: string
  children: ReactNode
}

/**
 * GlassPanel wrapper with a collapse-to-pill button in the top-right corner.
 *
 *   ┌──────────────────────┐               ⊟ (small pill)
 *   │  panel content...    │   ─click─►    or expand again with one click
 *   │  ...                 │
 *   └──────────────────────┘
 *
 * Collapsed state persists to localStorage under `lab.collapse.<storageKey>`.
 */
export function CollapsibleGlassPanel({
  storageKey,
  label,
  collapsedIcon = '⊟',
  defaultCollapsed = false,
  style,
  collapsedStyle,
  children,
  'aria-labelledby': ariaLabelledBy,
}: Props) {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof localStorage === 'undefined') return defaultCollapsed
    const raw = localStorage.getItem(`lab.collapse.${storageKey}`)
    if (raw === '1') return true
    if (raw === '0') return false
    return defaultCollapsed
  })

  useEffect(() => {
    if (typeof localStorage === 'undefined') return
    try { localStorage.setItem(`lab.collapse.${storageKey}`, collapsed ? '1' : '0') } catch {}
  }, [collapsed, storageKey])

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        aria-label={`Розгорнути ${label}`}
        title={`Розгорнути ${label}`}
        style={{
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(60px) saturate(200%)',
          border: '1px solid rgba(255,255,255,0.25)',
          color: '#1d1d1f',
          borderRadius: 100,
          width: 44,
          height: 44,
          fontSize: 18,
          cursor: 'pointer',
          position: 'fixed',
          zIndex: 10,
          ...collapsedStyle,
        }}
      >
        <span aria-hidden="true">{collapsedIcon}</span>
        <span className="sr-only">{label}</span>
      </button>
    )
  }

  return (
    <GlassPanel
      variant="strong"
      role="region"
      aria-labelledby={ariaLabelledBy}
      style={{
        position: 'fixed',
        zIndex: 10,
        color: '#1d1d1f',
        ...style,
      }}
    >
      <button
        onClick={() => setCollapsed(true)}
        aria-label={`Згорнути ${label}`}
        title={`Згорнути ${label}`}
        style={{
          position: 'absolute',
          top: 8, right: 8,
          background: 'transparent',
          border: 'none',
          color: '#6e6e73',
          fontSize: 16,
          width: 32, height: 32,
          cursor: 'pointer',
          borderRadius: 8,
        }}
      >
        ‹‹
      </button>
      {children}
    </GlassPanel>
  )
}
