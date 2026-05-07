import { create } from 'zustand'

type GuidanceState = {
  enabled: boolean
  toggle: () => void
  setEnabled: (b: boolean) => void
}

export const useGuidance = create<GuidanceState>((set) => ({
  enabled: typeof localStorage !== 'undefined' ? localStorage.getItem('guidance') !== 'off' : true,
  toggle: () => set(s => {
    const newVal = !s.enabled
    if (typeof localStorage !== 'undefined') localStorage.setItem('guidance', newVal ? 'on' : 'off')
    return { enabled: newVal }
  }),
  setEnabled: (b) => set(() => {
    if (typeof localStorage !== 'undefined') localStorage.setItem('guidance', b ? 'on' : 'off')
    return { enabled: b }
  }),
}))

export function SkipGuidanceToggle() {
  const enabled = useGuidance(s => s.enabled)
  const toggle = useGuidance(s => s.toggle)
  return (
    <button
      onClick={toggle}
      style={{
        position: 'fixed', bottom: 16, left: 16, zIndex: 11,
        background: 'rgba(255,255,255,0.7)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(0,0,0,0.08)',
        padding: '8px 14px', borderRadius: 100,
        fontSize: 12, fontWeight: 500, color: '#1d1d1f',
        cursor: 'pointer', minHeight: 36,
        fontFamily: '"SF Pro Display", "Inter", system-ui',
      }}
    >
      🎓 Гід: {enabled ? 'Увімк' : 'Вимк'}
    </button>
  )
}
