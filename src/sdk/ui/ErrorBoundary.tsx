import { Component, ErrorInfo, ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { hasError: boolean }

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

/**
 * App-root error boundary. Catches any render/lifecycle error in the tree
 * (including R3F + Rapier crashes) and shows a branded recovery screen
 * instead of a blank page. Recovery is a full reload — labs are stateless
 * enough (Zustand persist holds settings) that a reload is a clean reset.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary] uncaught error:', error, info.componentStack)
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div style={WRAP} role="alert">
        <div style={{ fontSize: 48 }} aria-hidden="true">⚠️</div>
        <div style={{ fontSize: 22, fontWeight: 600 }}>Щось пішло не так</div>
        <div style={{ fontSize: 15, color: '#a8a8b0', maxWidth: 'min(420px, 90vw)', lineHeight: 1.5 }}>
          Сталася неочікувана помилка. Спробуй перезавантажити сторінку.
        </div>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: 8,
            background: '#0071e3',
            color: '#fff',
            border: 'none',
            borderRadius: 12,
            padding: '14px 32px',
            fontSize: 16,
            fontWeight: 600,
            minHeight: 56,
            cursor: 'pointer',
          }}
        >
          Перезавантажити
        </button>
      </div>
    )
  }
}
