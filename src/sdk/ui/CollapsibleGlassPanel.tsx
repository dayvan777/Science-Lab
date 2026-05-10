import { CSSProperties, ReactNode, useEffect, useState } from 'react'
import { GlassPanel } from './GlassPanel'

type Props = {
  /** Stable id used to persist collapsed state to localStorage. */
  storageKey: string
  /** Short label shown on the collapsed pill (sr-only when an icon is given). */
  label: string
  /** Optional icon shown on the collapsed pill. Defaults to '+'. */
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
 * GlassPanel wrapper with a visible collapse button (top-right corner of
 * the panel) and an expand pill (when collapsed). Both buttons are sized
 * for Promethean-panel touch (≥36×36 in expanded state, 44×44 collapsed)
 * and use a clear plus/minus icon — children of school age recognise these
 * at a glance, unlike the previous transparent ‹‹ glyph.
 *
 *   ┌──────────────────[ − ]┐                ( + )  ← visible glass pill
 *   │  panel content...     │   ─click─►     in the same corner
 *   │  ...                  │
 *   └───────────────────────┘
 *
 * Collapsed state persists to localStorage under `lab.collapse.<storageKey>`.
 */
export function CollapsibleGlassPanel({
  storageKey,
  label,
  collapsedIcon = '+',
  defaultCollapsed = false,
  style,
  collapsedStyle,
  children,
  'aria-labelledby': ariaLabelledBy,
}: Props) {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof localStorage === 'undefined') return defaultCollapsed
    try {
      const raw = localStorage.getItem(`lab.collapse.${storageKey}`)
      if (raw === '1') return true
      if (raw === '0') return false
      return defaultCollapsed
    } catch {
      return defaultCollapsed
    }
  })

  useEffect(() => {
    if (typeof localStorage === 'undefined') return
    try { localStorage.setItem(`lab.collapse.${storageKey}`, collapsed ? '1' : '0') } catch {}
  }, [collapsed, storageKey])

  if (collapsed) {
    // NOTE: callers MUST provide `collapsedStyle` with at least one vertical
    // anchor (top OR bottom) and one horizontal anchor (left OR right).
    // Previously this block also set `top: 16, left: 16` as defaults, but
    // callers that wanted to anchor by `bottom` or `right` ended up with
    // BOTH sides set on a fixed element with explicit width/height — the
    // browser silently keeps `top`/`left` and ignores the override. That
    // bug stacked phone-breakpoint pills in the top-left corner.
    return (
      <button
        onClick={() => setCollapsed(false)}
        aria-label={`Розгорнути ${label}`}
        title={`Розгорнути ${label}`}
        style={{
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(60px) saturate(200%)',
          border: '1px solid rgba(0,0,0,0.12)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
          color: '#0071e3',
          borderRadius: 100,
          width: 48,
          height: 48,
          fontSize: 28,
          fontWeight: 400,
          lineHeight: 1,
          cursor: 'pointer',
          position: 'fixed',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
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
      {/* Visible collapse button: clear minus icon on a subtle glass plate
          so a 6th-grader can spot it at a glance on a Promethean panel. */}
      <button
        onClick={() => setCollapsed(true)}
        aria-label={`Згорнути ${label}`}
        title={`Згорнути ${label}`}
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          background: 'rgba(0,0,0,0.06)',
          border: '1px solid rgba(0,0,0,0.12)',
          color: '#1d1d1f',
          fontSize: 22,
          fontWeight: 500,
          lineHeight: 1,
          width: 36,
          height: 36,
          cursor: 'pointer',
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          zIndex: 1,
        }}
      >
        −
      </button>
      {children}
    </GlassPanel>
  )
}
