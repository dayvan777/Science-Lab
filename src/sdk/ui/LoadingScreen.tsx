import { useProgress } from '@react-three/drei'

type Props = {
  /** When true, the overlay fades out (renderer ready + assets done). */
  done: boolean
}

/**
 * Branded full-screen loading overlay. Shows a NOVA EVRIKA dark background
 * with a horizontal progress bar driven by drei's useProgress (tracks the
 * Environment HDR + any textures via THREE's DefaultLoadingManager). The
 * `done` flag — set by the lab on Canvas onCreated once assets are also
 * loaded — triggers the fade-out. Respects prefers-reduced-motion (the bar
 * still fills; only the fade transition is shortened by index.css).
 */
export function LoadingScreen({ done }: Props) {
  const { progress } = useProgress()
  return (
    <div
      aria-hidden={done}
      role="status"
      style={{
        position: 'fixed',
        inset: 0,
        background: '#1a1a1a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
        zIndex: 50,
        opacity: done ? 0 : 1,
        pointerEvents: done ? 'none' : 'auto',
        transition: 'opacity 400ms ease',
        fontFamily: '"SF Pro Display", "Inter", system-ui, sans-serif',
      }}
    >
      <div style={{ fontSize: 15, color: '#a8a8b0', letterSpacing: '0.04em' }}>
        Завантаження лабораторії…
      </div>
      <div style={{ width: 'min(240px, 60vw)', height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.12)', overflow: 'hidden' }}>
        <div style={{
          width: `${Math.round(progress)}%`,
          height: '100%',
          background: '#0071e3',
          borderRadius: 2,
          transition: 'width 200ms ease',
        }} />
      </div>
      <div style={{ fontSize: 13, color: '#6e6e73', fontVariantNumeric: 'tabular-nums' }}>
        {Math.round(progress)}%
      </div>
    </div>
  )
}
