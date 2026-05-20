type Props = {
  /** Called when the user taps the button. */
  onClick: () => void
  /** ARIA label. Defaults to 'Відкрити налаштування'. */
  'aria-label'?: string
}

/**
 * Small glass-style ⚙ icon button — opens a BottomSheet when tapped.
 * Sized 48×48 to match `ZoomControls` and `SoundToggle` so they align
 * visually when stacked in the same column on phone+tablet.
 */
export function SheetTriggerButton({ onClick, 'aria-label': ariaLabel }: Props) {
  return (
    <button
      onClick={onClick}
      title={ariaLabel ?? 'Відкрити налаштування'}
      aria-label={ariaLabel ?? 'Відкрити налаштування'}
      style={{
        background: 'rgba(20,20,24,0.72)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.08)',
        color: '#f5f5f7',
        borderRadius: 8,
        width: 48,
        height: 48,
        fontSize: 22,
        cursor: 'pointer',
      }}
    >
      ⚙
    </button>
  )
}
