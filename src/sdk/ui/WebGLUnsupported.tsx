type Props = { onHome?: () => void }

const WRAP: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'radial-gradient(ellipse at center, #1f1f25 0%, #141418 60%, #0a0a0c 100%)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 20,
  padding: 32,
  textAlign: 'center',
  fontFamily: '"SF Pro Display", "Inter", system-ui, sans-serif',
  color: '#f5f5f7',
  zIndex: 9999,
}

const HOME_BTN: React.CSSProperties = {
  marginTop: 8,
  background: 'rgba(255,255,255,0.1)',
  color: '#f5f5f7',
  border: '1px solid rgba(255,255,255,0.2)',
  borderRadius: 12,
  padding: '14px 32px',
  fontSize: 16,
  fontWeight: 600,
  minHeight: 56,
  cursor: 'pointer',
}

/**
 * Friendly fallback when the browser can't create a WebGL context
 * (blocked by proxy/policy, old WebView, hardware acceleration off).
 * Shown instead of a black canvas. Same visual family as ErrorBoundary.
 */
export function WebGLUnsupported({ onHome }: Props) {
  return (
    <div style={WRAP} role="alert">
      <div style={{ fontSize: 48 }} aria-hidden="true">🖥️</div>
      <div style={{ fontSize: 22, fontWeight: 600 }}>3D-графіка недоступна</div>
      <div style={{ fontSize: 15, color: '#a8a8b0', maxWidth: 'min(440px, 90vw)', lineHeight: 1.5 }}>
        Твій браузер не підтримує WebGL або він вимкнений. Онови браузер до
        останньої версії або увімкни апаратне прискорення в налаштуваннях.
      </div>
      {onHome && (
        <button onClick={onHome} style={HOME_BTN}>На головну</button>
      )}
    </div>
  )
}
