# Stability Shield — Design

**Date:** 2026-05-21
**Status:** Approved-in-concept (user picked "app-root only" ErrorBoundary + "progress bar" loading screen)
**Scope:** Robustness pass (PR-A of a multi-PR improvement plan from the 3-agent audit). Five bundled items: a top-level React ErrorBoundary, a branded loading screen with a real progress bar, a WebGL-unavailable fallback, and two visible bug fixes (apple emoji typo + native `alert()` replacement).

## Background

A three-lens audit (content, architecture, UX) of the live NOVA EVRIKA platform (`science-lab-phi.vercel.app`) surfaced a cluster of robustness gaps that all share one symptom — a blank screen with no recovery:

- **No error boundary anywhere.** `grep` found zero `componentDidCatch` / `ErrorBoundary`. Any throw inside R3F, Rapier, or a Zustand selector unmounts the whole React tree → blank page in production with only a console error.
- **No loading indicator.** Both labs render `<LabScene/>` → an R3F `<Canvas>` immediately. While WebGL initializes, Rapier WASM loads (~600 KB–1 MB), and the drei `<Environment preset="studio">` HDR fetches, the user sees the `#1a1a1a` body background — a multi-second black screen on mobile.
- **No WebGL fallback.** If WebGL is blocked (school proxy, old Android WebView, privacy browser), the Canvas mount throws → blank screen with no explanation.
- **Apple emoji bug.** `src/labs/mass-measurement/ui/RevealScene.tsx:23` maps `apple: '⚙️'` (gear) instead of an apple — visible on the summary screen to every student who finishes that lab.
- **Native `alert()` bug.** `RevealScene.tsx:247` the "Наступна лабораторна (скоро)" button calls `alert('Наступна лабораторна — скоро!')` — a jarring browser dialog, especially on iOS.

Current entry chain:
- `src/main.tsx` → `<React.StrictMode><App/></React.StrictMode>`.
- `src/app/App.tsx` → `<BrowserRouter><Routes>...</Routes></BrowserRouter>` with routes for landing, `/physics`, the two labs, math/history coming-soon, and a catch-all redirect.
- Lab `index.tsx` (both labs) → phase-gated render: `intro` → `<IntroScreen/>`, `finished` → `<RevealScene/>`, `in-progress` → `<LabScene/>` (the only phase that mounts the `<Canvas>`).

The drei `useProgress()` hook (backed by a module-level store, callable outside `<Canvas>`) tracks THREE's `DefaultLoadingManager` — which the `<Environment>` HDR load goes through. It does NOT track Rapier WASM (loaded outside THREE's manager), so the bar reflects asset/texture progress, not physics. That's acceptable: the HDR + first render is the dominant visible gap.

## Non-goals

- Per-lab error boundary (user chose app-root only).
- Retry logic beyond a full `window.location.reload()`.
- Error telemetry / reporting service integration (just `console.error` for now).
- A Rapier-WASM-aware progress number (THREE's manager can't see it; the bar reflects HDR/textures).
- WebGL fallback that renders a 2D approximation of the lab — just a friendly "unsupported" message.
- Touching the landing / coming-soon pages.
- Error boundaries inside the R3F tree (a throw inside the Canvas reconciler is caught by the app-root boundary; a 3D-specific boundary is out of scope).

## Architecture

Branch `feat/stability-shield` from `master` at commit `0a466dc`. Five slices, single merge.

| Slice | Files |
|---|---|
| **A** — ErrorBoundary | `src/sdk/ui/ErrorBoundary.tsx` (new), `src/main.tsx` (wire) |
| **B** — WebGL detection + fallback | `src/sdk/scene/webgl.ts` (new), `src/sdk/ui/WebGLUnsupported.tsx` (new), both lab `index.tsx` (gate) |
| **C** — LoadingScreen with progress bar | `src/sdk/ui/LoadingScreen.tsx` (new), both `LabScene.tsx` (wire) |
| **D** — Bug fixes | `src/labs/mass-measurement/ui/RevealScene.tsx` |
| **E** — Verify + merge | none |

4 new files, 5 modified. ~260 lines net.

---

## Slice A — ErrorBoundary

**File:** `src/sdk/ui/ErrorBoundary.tsx` (NEW)

A class component (the only way to implement `componentDidCatch` / `getDerivedStateFromError` in React). Catches any error in its subtree, logs it, and renders a branded full-screen fallback with a reload button.

### Implementation

```tsx
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
```

### Wiring — `src/main.tsx`

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app/App'
import { ErrorBoundary } from './sdk/ui/ErrorBoundary'
import './index.css'
import './site/styles/fonts.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
```

### Acceptance

1. A thrown error anywhere in the tree shows the «Щось пішло не так» screen, not a blank page.
2. The "Перезавантажити" button reloads the page.
3. `console.error` logs the error + component stack.
4. No behavioural change when nothing throws.

---

## Slice B — WebGL detection + fallback

**Files:** `src/sdk/scene/webgl.ts` (NEW), `src/sdk/ui/WebGLUnsupported.tsx` (NEW), both lab `index.tsx` (modify)

### `webgl.ts`

```ts
/**
 * Returns true if the browser can create a WebGL rendering context.
 * Tries webgl2 first, then webgl. Used to gate the 3D Canvas behind a
 * friendly fallback for blocked/old environments (school proxies, old
 * Android WebViews, privacy browsers).
 *
 * Result is cached after the first call — WebGL availability does not
 * change within a page session.
 */
let cached: boolean | null = null

export function isWebGLAvailable(): boolean {
  if (cached !== null) return cached
  try {
    const canvas = document.createElement('canvas')
    cached = !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl2') || canvas.getContext('webgl'))
    )
  } catch {
    cached = false
  }
  return cached
}
```

### `WebGLUnsupported.tsx`

A branded full-screen message (same visual family as ErrorBoundary's fallback). Text: «Ваш браузер не підтримує 3D-графіку», a hint to update the browser or enable hardware acceleration, and a "На головну" link back to `/`.

```tsx
type Props = { onHome?: () => void }

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
```

`WRAP` and `HOME_BTN` style objects mirror the ErrorBoundary fallback (dark radial gradient, centered column). The implementer may co-locate a shared `fallbackStyles.ts` if the duplication is bothersome, but inline duplication of two style objects is acceptable (YAGNI).

### Gate in both lab `index.tsx`

In each lab, the `phase === 'in-progress'` branch gets a WebGL check. Example for EM induction:

```tsx
import { isWebGLAvailable } from '../../sdk/scene/webgl'
import { WebGLUnsupported } from '../../sdk/ui/WebGLUnsupported'
import { useNavigate } from 'react-router-dom'

// inside the component:
const navigate = useNavigate()
const webglOk = isWebGLAvailable()

// in the render:
{phase === 'in-progress' && (webglOk
  ? <LabScene />
  : <WebGLUnsupported onHome={() => navigate('/')} />
)}
```

Same pattern in mass-measurement's `index.tsx`.

### Acceptance

1. With WebGL disabled (DevTools → Rendering → "Disable WebGL", or a real blocked environment), starting a lab shows the «3D-графіка недоступна» screen instead of a black canvas.
2. The "На головну" button navigates to `/`.
3. With WebGL available (normal case), the lab renders as before.
4. `isWebGLAvailable()` caches its result (called multiple times = one context probe).

---

## Slice C — LoadingScreen with progress bar

**Files:** `src/sdk/ui/LoadingScreen.tsx` (NEW), both `LabScene.tsx` (modify)

### `LoadingScreen.tsx`

A DOM overlay (sibling to `<Canvas>`, not inside it) that reads drei's `useProgress()` for the bar fill and stays visible until the lab signals the renderer is ready.

```tsx
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
```

### Wiring in each `LabScene.tsx`

Add a `ready` state, set it on the Canvas `onCreated`, and render `<LoadingScreen done={ready} />` as a sibling after the `<Canvas>`.

```tsx
import { useState } from 'react'  // add if not present
import { LoadingScreen } from '../../../sdk/ui/LoadingScreen'

// inside LabScene():
const [ready, setReady] = useState(false)

// on the Canvas:
<Canvas
  /* ...existing props... */
  onCreated={() => setReady(true)}
>

// after </Canvas>, as a sibling:
<LoadingScreen done={ready} />
```

The overlay shows from first paint (covering the WebGL init), the bar reflects HDR/texture progress via `useProgress`, and once `onCreated` fires (renderer ready) the overlay fades out over 400 ms.

Note: `onCreated` fires when the renderer is initialized, which is typically after the first asset pass starts. If in practice the fade happens before the HDR finishes (causing a one-frame pop), the implementer may gate `done` on `ready && progress >= 100` instead — to be verified on a throttled build during Slice C.

### Acceptance

1. On a throttled connection (DevTools → Network → Slow 3G), starting a lab shows the «Завантаження лабораторії…» overlay with a filling bar + percentage, instead of a black screen.
2. When the renderer is ready, the overlay fades out over ~400 ms.
3. On a fast connection the overlay still appears briefly (no flash-of-black) and fades smoothly.
4. Desktop + mobile both show the overlay.

---

## Slice D — Bug fixes

**File:** `src/labs/mass-measurement/ui/RevealScene.tsx`

### D.1 — Apple emoji

Find (line 23):

```ts
  apple: '⚙️',
```

Replace with:

```ts
  apple: '🍎',
```

### D.2 — Replace `alert()` with an inline ephemeral message

Find (around line 247):

```tsx
        <Button variant="secondary" onClick={() => alert('Наступна лабораторна — скоро!')}>
          Наступна лабораторна (скоро)
        </Button>
```

Add a local state near the top of the component (next to the existing `phase` state):

```tsx
  const [showComingSoon, setShowComingSoon] = useState(false)
```

Replace the button onClick + add an inline message below the CTA row:

```tsx
        <Button variant="secondary" onClick={() => {
          setShowComingSoon(true)
          setTimeout(() => setShowComingSoon(false), 3000)
        }}>
          Наступна лабораторна (скоро)
        </Button>
      </div>
      {showComingSoon && (
        <div
          role="status"
          style={{
            marginTop: 16,
            fontSize: 14,
            color: '#a8a8b0',
            opacity: showComingSoon ? 1 : 0,
            transition: 'opacity 300ms ease',
          }}
        >
          Наступна лабораторна — скоро! 🚧
        </div>
      )}
```

(Exact JSX placement: the message `<div>` goes immediately after the closing `</div>` of the CTA row, inside the same parent container. The implementer confirms the `useState` import is present — RevealScene already uses hooks for `phase`.)

### Acceptance

1. The summary screen shows 🍎 for the apple object (not ⚙️).
2. Tapping "Наступна лабораторна (скоро)" shows an inline «Наступна лабораторна — скоро! 🚧» message that auto-clears after 3 s — no browser `alert()` dialog.

---

## Slice E — Verify + merge

No file changes. Verification + git only: `npx tsc --noEmit` (0 errors), `npm run build` (success), `npm test -- --run` (220 passing, +1 if the optional `isWebGLAvailable` test is added), commit-chain sanity, push, direct-merge to master, user smoke-test.

---

## File touch-list

| File | Slice | Change |
|---|---|---|
| `src/sdk/ui/ErrorBoundary.tsx` | A | NEW — class component + branded fallback. |
| `src/main.tsx` | A | Wrap `<App/>` in `<ErrorBoundary>`. |
| `src/sdk/scene/webgl.ts` | B | NEW — `isWebGLAvailable()` cached probe. |
| `src/sdk/ui/WebGLUnsupported.tsx` | B | NEW — branded fallback message. |
| `src/labs/electromagnetic-induction/index.tsx` | B | WebGL gate around `<LabScene/>`. |
| `src/labs/mass-measurement/index.tsx` | B | WebGL gate around `<LabScene/>`. |
| `src/sdk/ui/LoadingScreen.tsx` | C | NEW — progress-bar overlay using `useProgress`. |
| `src/labs/electromagnetic-induction/scene/LabScene.tsx` | C | `ready` state + `onCreated` + `<LoadingScreen/>`. |
| `src/labs/mass-measurement/scene/LabScene.tsx` | C | Same. |
| `src/labs/mass-measurement/ui/RevealScene.tsx` | D | Apple emoji + alert→inline. |

4 new files, 6 modified. ~260 lines net.

## Testing strategy

The 220-test suite is the regression gate. One optional new test: `tests/sdk/webgl.test.ts` asserting `isWebGLAvailable()` returns a boolean (in jsdom it returns `false` since jsdom has no WebGL — a weak but valid smoke test that the function doesn't throw). Everything else (error boundary, loading overlay, WebGL fallback rendering) is verified by human smoke-test:

1. Force a throw (temporarily, in dev) → recovery screen + reload works.
2. DevTools disable WebGL → «3D-графіка недоступна» + "На головну".
3. Network throttle Slow 3G → loading overlay with filling bar.
4. mass-measurement summary → 🍎 + inline coming-soon message.

## Risks

- **`onCreated` fires before assets finish → loading overlay pops out one frame early.** Mitigation noted in Slice C: gate `done` on `ready && progress >= 100` if observed. Verified on throttled build.
- **`useProgress` shows 0 % when nothing is registered with THREE's manager yet.** If the Environment HDR is the only tracked asset and it registers late, the bar may jump 0 → 100. Acceptable for v1; the bar is reassurance, not a precise metric.
- **ErrorBoundary catches errors but `window.location.reload()` re-triggers the same error if it's deterministic.** Accepted — a reload is the honest recovery; a persistent crash needs a code fix, not a UI affordance. Zustand persist holds settings so the reload is clean.
- **WebGL probe creates a throwaway `<canvas>` on every page that calls it.** Mitigated by the module-level `cached` flag — one probe per session.
- **`React.StrictMode` double-invokes lifecycles in dev.** The ErrorBoundary's `componentDidCatch` may log twice in dev; harmless and dev-only.

## Out of scope

- Per-lab error boundaries.
- Error reporting/telemetry beyond `console.error`.
- Rapier-WASM progress tracking.
- 2D fallback rendering of labs.
- Landing/coming-soon page changes.
- Retry beyond reload.

## Self-review checklist

- [x] Every slice has concrete acceptance criteria.
- [x] Architecture is internally consistent — A is independent; B and C both gate/wrap the lab render; D is isolated bug fixes.
- [x] No "TBD" / "TODO" / placeholder text.
- [x] File touch-list matches the slices.
- [x] Existing tests are NOT modified; one optional new test stated.
- [x] No new dependencies (`@react-three/drei`'s `useProgress` is already available).
- [x] User's two picks (app-root-only boundary + progress bar) are both reflected.
- [x] Risks cover the onCreated/progress timing, the WebGL probe cost, and the reload-loop honesty.
- [x] Out-of-scope items explicit.
