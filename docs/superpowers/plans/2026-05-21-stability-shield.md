# Stability Shield Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the app survive failures gracefully — an app-root error boundary, a branded loading overlay with a progress bar, a WebGL-unavailable fallback — and fix two visible bugs (apple emoji + native `alert()`).

**Architecture:** Four new SDK pieces (`ErrorBoundary`, `LoadingScreen`, `WebGLUnsupported`, `isWebGLAvailable`) wired at three integration points: `main.tsx` (boundary), both lab `index.tsx` (WebGL gate), both `LabScene.tsx` (loading overlay via Canvas `onCreated`). Bug fixes are isolated to one file.

**Tech Stack:** React 19 (class component for the boundary), TypeScript, `@react-three/drei` `useProgress` (already a dependency), `react-router-dom` `useNavigate`. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-05-21-stability-shield-design.md` (commit `340113b`).

**Branch:** `feat/stability-shield` (already created from `master` at `0a466dc`; spec commit `340113b` on it).

---

## File Structure

4 new files, 6 modified.

| File | Responsibility |
|---|---|
| `src/sdk/ui/ErrorBoundary.tsx` | NEW. Class component; catches subtree errors; branded recovery screen + reload. |
| `src/main.tsx` | MODIFY. Wrap `<App/>` in `<ErrorBoundary>`. |
| `src/sdk/scene/webgl.ts` | NEW. `isWebGLAvailable()` cached probe. |
| `src/sdk/ui/WebGLUnsupported.tsx` | NEW. Branded "3D unavailable" fallback. |
| `src/labs/electromagnetic-induction/index.tsx` | MODIFY. WebGL gate around `<LabScene/>`. |
| `src/labs/mass-measurement/index.tsx` | MODIFY. WebGL gate around `<LabScene/>`. |
| `src/sdk/ui/LoadingScreen.tsx` | NEW. Progress-bar overlay using drei `useProgress`. |
| `src/labs/electromagnetic-induction/scene/LabScene.tsx` | MODIFY. `ready` state + `onCreated` + `<LoadingScreen/>`. |
| `src/labs/mass-measurement/scene/LabScene.tsx` | MODIFY. Same. |
| `src/labs/mass-measurement/ui/RevealScene.tsx` | MODIFY. Apple emoji + alert→inline. |
| `tests/sdk/webgl.test.ts` | NEW (optional). Smoke test that `isWebGLAvailable()` returns a boolean. |

---

## Pre-flight

- [ ] **Step 0a: Confirm branch + clean tree**

Run: `git status`
Expected: `On branch feat/stability-shield`, clean. HEAD at `340113b`.

- [ ] **Step 0b: Baseline test + types**

Run: `npm test -- --run`
Expected: `Tests 220 passed (220)`.

Run: `npx tsc --noEmit`
Expected: 0 errors.

---

## Task 1: ErrorBoundary (Slice A)

**Files:**
- Create: `src/sdk/ui/ErrorBoundary.tsx`
- Modify: `src/main.tsx`

- [ ] **Step 1.1: Write `ErrorBoundary.tsx`**

Create `src/sdk/ui/ErrorBoundary.tsx` with EXACT content:

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

- [ ] **Step 1.2: Wire into `src/main.tsx`**

Replace the ENTIRE current content of `src/main.tsx`:

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app/App'
import './index.css'
import './site/styles/fonts.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

with:

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

- [ ] **Step 1.3: Type-check + build + test**

- `npx tsc --noEmit` — 0 errors.
- `npm run build` — succeeds (pre-existing chunk-size warning only).
- `npm test -- --run` — 220 passed.

- [ ] **Step 1.4: Commit**

```bash
git add src/sdk/ui/ErrorBoundary.tsx src/main.tsx
git commit -m "$(cat <<'EOF'
feat(sdk): app-root ErrorBoundary with branded recovery screen

Class component catching any subtree error (incl. R3F/Rapier crashes).
Shows «Щось пішло не так» + reload button instead of a blank page.
Wired around <App/> in main.tsx. Logs error + component stack.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: WebGL detection + fallback (Slice B)

**Files:**
- Create: `src/sdk/scene/webgl.ts`
- Create: `src/sdk/ui/WebGLUnsupported.tsx`
- Create: `tests/sdk/webgl.test.ts`
- Modify: `src/labs/electromagnetic-induction/index.tsx`
- Modify: `src/labs/mass-measurement/index.tsx`

- [ ] **Step 2.1: Write `webgl.ts`**

Create `src/sdk/scene/webgl.ts` with EXACT content:

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

- [ ] **Step 2.2: Write the optional smoke test**

Create `tests/sdk/webgl.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { isWebGLAvailable } from '../../src/sdk/scene/webgl'

describe('isWebGLAvailable', () => {
  it('returns a boolean without throwing', () => {
    const result = isWebGLAvailable()
    expect(typeof result).toBe('boolean')
  })

  it('is stable across calls (cached)', () => {
    expect(isWebGLAvailable()).toBe(isWebGLAvailable())
  })
})
```

(In jsdom, `getContext('webgl')` returns null, so the function returns `false` — the test asserts type + stability, not a specific value.)

- [ ] **Step 2.3: Write `WebGLUnsupported.tsx`**

Create `src/sdk/ui/WebGLUnsupported.tsx` with EXACT content:

```tsx
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
```

- [ ] **Step 2.4: Gate EM induction `index.tsx`**

Open `src/labs/electromagnetic-induction/index.tsx`. Find line 1:

```ts
import { useEffect } from 'react'
```

Replace with:

```ts
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
```

Find the other imports block (lines 2-6):

```ts
import { sound } from '../../sdk/audio/SoundManager'
import { LabScene } from './scene/LabScene'
import { useLabState } from './state/LabState'
import { IntroScreen } from './ui/IntroScreen'
import { RevealScene } from './ui/RevealScene'
```

Replace with (add two SDK imports):

```ts
import { sound } from '../../sdk/audio/SoundManager'
import { LabScene } from './scene/LabScene'
import { useLabState } from './state/LabState'
import { IntroScreen } from './ui/IntroScreen'
import { RevealScene } from './ui/RevealScene'
import { isWebGLAvailable } from '../../sdk/scene/webgl'
import { WebGLUnsupported } from '../../sdk/ui/WebGLUnsupported'
```

Find the component body start:

```ts
export function EMInductionLab() {
  const phase = useLabState(s => s.phase)
```

Replace with:

```ts
export function EMInductionLab() {
  const phase = useLabState(s => s.phase)
  const navigate = useNavigate()
  const webglOk = isWebGLAvailable()
```

Find the render line:

```tsx
      {phase === 'in-progress' && <LabScene />}
```

Replace with:

```tsx
      {phase === 'in-progress' && (webglOk
        ? <LabScene />
        : <WebGLUnsupported onHome={() => navigate('/')} />
      )}
```

- [ ] **Step 2.5: Gate mass-measurement `index.tsx`**

Open `src/labs/mass-measurement/index.tsx`. Find line 1:

```ts
import { useEffect, useMemo } from 'react'
```

Replace with:

```ts
import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
```

Find the imports block (lines 2-8):

```ts
import { sound } from '../../sdk/audio/SoundManager'
import { LabScene } from './scene/LabScene'
import { useLabState } from './state/LabState'
import { IntroScreen } from './ui/IntroScreen'
import { RevealScene } from './ui/RevealScene'
import { DemoController } from './demo/DemoController'
import { DemoBadge } from './demo/DemoBadge'
```

Replace with (add two SDK imports):

```ts
import { sound } from '../../sdk/audio/SoundManager'
import { LabScene } from './scene/LabScene'
import { useLabState } from './state/LabState'
import { IntroScreen } from './ui/IntroScreen'
import { RevealScene } from './ui/RevealScene'
import { DemoController } from './demo/DemoController'
import { DemoBadge } from './demo/DemoBadge'
import { isWebGLAvailable } from '../../sdk/scene/webgl'
import { WebGLUnsupported } from '../../sdk/ui/WebGLUnsupported'
```

Find the component body start:

```ts
export function MassMeasurementLab() {
  const phase = useLabState(s => s.phase)
  const demoMode = useDemoMode()
```

Replace with:

```ts
export function MassMeasurementLab() {
  const phase = useLabState(s => s.phase)
  const demoMode = useDemoMode()
  const navigate = useNavigate()
  const webglOk = isWebGLAvailable()
```

Find the render line:

```tsx
      {phase === 'in-progress' && <LabScene />}
```

Replace with:

```tsx
      {phase === 'in-progress' && (webglOk
        ? <LabScene />
        : <WebGLUnsupported onHome={() => navigate('/')} />
      )}
```

- [ ] **Step 2.6: Type-check + build + test**

- `npx tsc --noEmit` — 0 errors.
- `npm run build` — succeeds.
- `npm test -- --run` — expect 222 passed (220 + 2 new webgl tests).

- [ ] **Step 2.7: Commit**

```bash
git add src/sdk/scene/webgl.ts src/sdk/ui/WebGLUnsupported.tsx tests/sdk/webgl.test.ts \
        src/labs/electromagnetic-induction/index.tsx src/labs/mass-measurement/index.tsx
git commit -m "$(cat <<'EOF'
feat(sdk): WebGL availability gate + branded fallback

isWebGLAvailable() probes a throwaway canvas (cached per session).
Both labs gate <LabScene/> behind it — when WebGL is blocked, show
«3D-графіка недоступна» with a "На головну" link instead of a black
canvas. Adds 2 smoke tests for the probe.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: LoadingScreen + wiring (Slice C)

**Files:**
- Create: `src/sdk/ui/LoadingScreen.tsx`
- Modify: `src/labs/electromagnetic-induction/scene/LabScene.tsx`
- Modify: `src/labs/mass-measurement/scene/LabScene.tsx`

- [ ] **Step 3.1: Write `LoadingScreen.tsx`**

Create `src/sdk/ui/LoadingScreen.tsx` with EXACT content:

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

- [ ] **Step 3.2: Wire EM induction `LabScene.tsx`**

Open `src/labs/electromagnetic-induction/scene/LabScene.tsx`.

Add the import next to the other SDK UI imports (near the top, e.g. after the `SheetTriggerButton` import):

```ts
import { LoadingScreen } from '../../../sdk/ui/LoadingScreen'
```

Inside `LabScene()`, find where the local state is declared (the `sheetOpen` line added in a prior PR):

```ts
  const [sheetOpen, setSheetOpen] = useState(false)
```

Add a `ready` state right after it:

```ts
  const [sheetOpen, setSheetOpen] = useState(false)
  const [ready, setReady] = useState(false)
```

Find the Canvas opening tag:

```tsx
      <Canvas
        camera={{ position: [0, 1.5, 2.0], fov: 50 }}
        dpr={[1, 1.5]}
        shadows
        gl={{ toneMapping: ACESFilmicToneMapping, toneMappingExposure: 0.55 }}
        style={{ ...CANVAS_BASE_STYLE, background: 'radial-gradient(ellipse at center, #2a2a30 0%, #1a1a1e 50%, #0a0a0c 100%)' }}
      >
```

Add `onCreated`:

```tsx
      <Canvas
        camera={{ position: [0, 1.5, 2.0], fov: 50 }}
        dpr={[1, 1.5]}
        shadows
        gl={{ toneMapping: ACESFilmicToneMapping, toneMappingExposure: 0.55 }}
        style={{ ...CANVAS_BASE_STYLE, background: 'radial-gradient(ellipse at center, #2a2a30 0%, #1a1a1e 50%, #0a0a0c 100%)' }}
        onCreated={() => setReady(true)}
      >
```

Find the closing `</Canvas>` tag and add `<LoadingScreen>` immediately after it:

```tsx
      </Canvas>
      <LoadingScreen done={ready} />
```

- [ ] **Step 3.3: Wire mass-measurement `LabScene.tsx`**

Open `src/labs/mass-measurement/scene/LabScene.tsx`.

Add the import next to the other SDK UI imports:

```ts
import { LoadingScreen } from '../../../sdk/ui/LoadingScreen'
```

Inside `LabScene()`, find the existing state declarations (e.g. `const [introActive, setIntroActive] = useState(true)`). Add a `ready` state next to them:

```ts
  const [ready, setReady] = useState(false)
```

Find the Canvas opening tag:

```tsx
      <Canvas
        camera={{ position: [0, 1.5, 2.0], fov: 50 }}
        dpr={[1, 1.5]}
        shadows
        gl={{ toneMapping: ACESFilmicToneMapping, toneMappingExposure: 0.55 }}
        style={{ ...CANVAS_BASE_STYLE, background: 'radial-gradient(ellipse at center, #2a2a30 0%, #1a1a1e 50%, #0a0a0c 100%)' }}
      >
```

Add `onCreated`:

```tsx
      <Canvas
        camera={{ position: [0, 1.5, 2.0], fov: 50 }}
        dpr={[1, 1.5]}
        shadows
        gl={{ toneMapping: ACESFilmicToneMapping, toneMappingExposure: 0.55 }}
        style={{ ...CANVAS_BASE_STYLE, background: 'radial-gradient(ellipse at center, #2a2a30 0%, #1a1a1e 50%, #0a0a0c 100%)' }}
        onCreated={() => setReady(true)}
      >
```

Find the closing `</Canvas>` tag and add `<LoadingScreen>` immediately after it:

```tsx
      </Canvas>
      <LoadingScreen done={ready} />
```

- [ ] **Step 3.4: Type-check + build + test**

- `npx tsc --noEmit` — 0 errors.
- `npm run build` — succeeds.
- `npm test -- --run` — 222 passed.

- [ ] **Step 3.5: Commit**

```bash
git add src/sdk/ui/LoadingScreen.tsx \
        src/labs/electromagnetic-induction/scene/LabScene.tsx \
        src/labs/mass-measurement/scene/LabScene.tsx
git commit -m "$(cat <<'EOF'
feat(sdk): LoadingScreen overlay with progress bar

Branded dark overlay driven by drei useProgress (tracks Environment
HDR + textures). Both LabScenes set a `ready` flag on Canvas onCreated
and render <LoadingScreen done={ready}/> as a sibling — covers the
black-screen gap during WebGL init + asset load, fades out at 400 ms.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Bug fixes (Slice D)

**Files:**
- Modify: `src/labs/mass-measurement/ui/RevealScene.tsx`

- [ ] **Step 4.1: Fix apple emoji**

Open `src/labs/mass-measurement/ui/RevealScene.tsx`. Find (line 23):

```ts
  apple: '⚙️',
```

Replace with:

```ts
  apple: '🍎',
```

- [ ] **Step 4.2: Add `showComingSoon` state**

Find the existing phase state inside `RevealScene()` (line ~68):

```ts
  const [phase, setPhase] = useState<RevealPhase>('fade-in')
```

Add a new state line right after it:

```ts
  const [phase, setPhase] = useState<RevealPhase>('fade-in')
  const [showComingSoon, setShowComingSoon] = useState(false)
```

- [ ] **Step 4.3: Replace the `alert()` button + add inline message**

Find the CTA block (around lines 245-250):

```tsx
        <Button onClick={reset}>Спробувати знову</Button>
        <Button variant="secondary" onClick={() => alert('Наступна лабораторна — скоро!')}>
          Наступна лабораторна (скоро)
        </Button>
      </div>
```

Replace with:

```tsx
        <Button onClick={reset}>Спробувати знову</Button>
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
            transition: 'opacity 300ms ease',
          }}
        >
          Наступна лабораторна — скоро! 🚧
        </div>
      )}
```

- [ ] **Step 4.4: Type-check + build + test**

- `npx tsc --noEmit` — 0 errors.
- `npm run build` — succeeds.
- `npm test -- --run` — 222 passed.

- [ ] **Step 4.5: Commit**

```bash
git add src/labs/mass-measurement/ui/RevealScene.tsx
git commit -m "$(cat <<'EOF'
fix(mass-measurement): apple emoji 🍎 + inline coming-soon message

Two summary-screen bugs: the apple object was mapped to ⚙️ (gear);
and the "Наступна лабораторна" button fired a native alert() dialog.
Apple is now 🍎; the button shows an inline ephemeral message that
auto-clears after 3 s instead of a browser alert.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Verify + push + direct-merge to master

**Files:** None modified. Verification + git only.

- [ ] **Step 5.1: Final type-check** — `npx tsc --noEmit` → 0 errors.
- [ ] **Step 5.2: Final build** — `npm run build` → succeeds, only pre-existing chunk-size warning.
- [ ] **Step 5.3: Final test** — `npm test -- --run` → `Tests 222 passed (222)`.
- [ ] **Step 5.4: Sanity-check commit chain**

Run: `git log --oneline master..HEAD`

Expected (5 commits + spec):

```
<sha> fix(mass-measurement): apple emoji 🍎 + inline coming-soon message
<sha> feat(sdk): LoadingScreen overlay with progress bar
<sha> feat(sdk): WebGL availability gate + branded fallback
<sha> feat(sdk): app-root ErrorBoundary with branded recovery screen
340113b docs(specs): stability shield — error boundary, loading screen, WebGL fallback + 2 bug fixes
```

- [ ] **Step 5.5: Push** — `git push -u origin feat/stability-shield`.

- [ ] **Step 5.6: Direct-merge to master**

```bash
git checkout master
git merge --no-ff feat/stability-shield -m "Merge feat/stability-shield: error boundary, loading screen, WebGL fallback + bug fixes"
git push origin master
```

- [ ] **Step 5.7: User smoke-test (after Vercel deploy, ~2 min)**

On `science-lab-phi.vercel.app`:

1. **Loading:** DevTools → Network → Slow 3G → open a lab → see «Завантаження лабораторії…» with a filling bar + %, fading out when ready (no black screen).
2. **WebGL fallback:** DevTools → Rendering → "Disable WebGL" (or `chrome://settings` hardware accel off) → open a lab → see «3D-графіка недоступна» + "На головну" works.
3. **Error boundary:** (dev-only check) temporarily throw in a component → «Щось пішло не так» + "Перезавантажити" works. Revert the temporary throw.
4. **Apple emoji:** finish mass-measurement → summary shows 🍎 for the apple (not ⚙️).
5. **Coming-soon:** tap "Наступна лабораторна (скоро)" → inline «Наступна лабораторна — скоро! 🚧» message appears, auto-clears after 3 s, no browser alert.
6. **No regressions:** both labs play through normally; pinch-zoom, auto-collapse, sheet all still work.

If a smoke-test fails, the relevant task is the entry point: loading→Task 3, WebGL→Task 2, boundary→Task 1, bugs→Task 4.

---

## Self-Review Notes

**Spec coverage:**
- ✅ Slice A (ErrorBoundary + main.tsx) — Task 1.
- ✅ Slice B (webgl util + WebGLUnsupported + both gates) — Task 2.
- ✅ Slice C (LoadingScreen + both LabScene wires) — Task 3.
- ✅ Slice D (apple emoji + alert→inline) — Task 4.
- ✅ Slice E (verify + merge) — Task 5.
- ✅ Optional `isWebGLAvailable` test — Task 2.2.
- ✅ Acceptance criteria from the spec covered in Task 5.7 smoke-test list.

**Placeholder scan:** No "TBD" / "TODO" / "implement later". Every code step shows full file content or full Find/Replace. Every command shows the exact CLI + expected output.

**Type consistency:**
- `ErrorBoundary` (Task 1) — `Props = { children: ReactNode }`, used in main.tsx (Task 1.2).
- `isWebGLAvailable(): boolean` (Task 2.1) — called in both index.tsx (Tasks 2.4, 2.5) and the test (2.2).
- `WebGLUnsupported` props `{ onHome?: () => void }` (Task 2.3) — both gates pass `onHome={() => navigate('/')}` (Tasks 2.4, 2.5).
- `LoadingScreen` props `{ done: boolean }` (Task 3.1) — both LabScenes pass `done={ready}` (Tasks 3.2, 3.3).
- `ready` state set by Canvas `onCreated` in both LabScenes — consistent.
- `showComingSoon` state (Task 4.2) drives both the button onClick (4.3) and the inline message (4.3).

**Test count:** baseline 220 → 222 after Task 2's two webgl tests. Tasks 3-5 keep 222.

**Branch parallelism:** `feat/stability-shield` from fresh master (`0a466dc`) + spec commit (`340113b`). No conflicting branches.

**Iteration order:** Task 1 (boundary) is independent. Task 2 (WebGL gate) is independent. Task 3 (loading) depends on nothing but touches LabScenes. Task 4 (bugs) isolated. Each task type-checks + tests green on its own, so any task could be reverted independently.
