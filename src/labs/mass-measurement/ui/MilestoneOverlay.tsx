import { useEffect, useState } from 'react'

const BASE_FONT = '"SF Pro Display", "Inter", system-ui, sans-serif'

const MILESTONE_TEXTS: Record<string, { title: string; body: string }> = {
  'tennis-ball': {
    title: 'Пінг-понговий м\'ячик зважений',
    body: 'Ти виміряв його масу 3-ма приладами. Запам\'ятай ці числа — далі побачиш чому.',
  },
  apple: {
    title: 'Металева кулька зважена',
    body: 'Ще одне підтвердження. Останній об\'єкт — і покажу головне.',
  },
}

type Props = {
  /** Object id whose three measurements just completed. null = hidden. */
  objectId: string | null
  /** Called when the overlay's auto-dismiss timer expires. */
  onDismiss: () => void
}

/**
 * Slide-in overlay shown for 4 seconds when the user finishes the third
 * measurement of an object (i.e. before the experiment moves on to the
 * next object). Click-through (pointerEvents: none) so the user can keep
 * interacting with the scene if they want to skip ahead.
 */
export function MilestoneOverlay({ objectId, onDismiss }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!objectId) return
    setVisible(true)
    const fadeOutAt = setTimeout(() => setVisible(false), 3700)
    const dismissAt = setTimeout(() => onDismiss(), 4000)
    return () => { clearTimeout(fadeOutAt); clearTimeout(dismissAt) }
  }, [objectId, onDismiss])

  if (!objectId) return null
  const text = MILESTONE_TEXTS[objectId]
  if (!text) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: visible ? 24 : -120,
        left: '50%',
        transform: 'translateX(-50%)',
        opacity: visible ? 1 : 0,
        transition: 'top 350ms cubic-bezier(.2,.9,.3,1.05), opacity 350ms ease',
        pointerEvents: 'none',
        zIndex: 30,
        background: 'rgba(20, 20, 24, 0.85)',
        backdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: 16,
        padding: '18px 28px',
        color: '#f5f5f7',
        fontFamily: BASE_FONT,
        textAlign: 'center',
        maxWidth: 520,
        boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
      }}
    >
      <div style={{
        fontSize: 11,
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        color: '#34c759',
        marginBottom: 6,
        fontWeight: 600,
      }}>
        ✓ Етап завершено
      </div>
      <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
        {text.title}
      </div>
      <div style={{ fontSize: 14, color: '#a8a8b0', lineHeight: 1.5 }}>
        {text.body}
      </div>
    </div>
  )
}
