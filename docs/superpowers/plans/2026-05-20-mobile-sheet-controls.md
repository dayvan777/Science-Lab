# Mobile Bottom Sheet for Lab Controls — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On phone+tablet (<900 px) hide five secondary lab controls behind a single ⚙ button that opens a bottom sheet. Outside the sheet only zoom +/− and focus reset stay. Desktop layout unchanged.

**Architecture:** Two new SDK files (`BottomSheet.tsx`, `SheetTriggerButton.tsx`); two lab `LabScene.tsx` files modified to branch by viewport. New SDK components are dumb primitives — open state is local React state in each LabScene. Existing lab-specific buttons (`FieldToggleButton`, `CoilTurnsButton`, `MagnetStrengthButton`, `SoundToggle`, respawn `Button`) are reused as-is inside the sheet — no state-layer changes.

**Tech Stack:** React 19, TypeScript, no new dependencies. Pointer events for swipe-down dismiss. CSS transitions for slide-up animation.

**Spec:** `docs/superpowers/specs/2026-05-20-mobile-sheet-controls-design.md` (commit `243bec7`).

**Branch:** `feat/mobile-sheet-controls` (already created from `master` at commit `628c430`; spec commit is `243bec7` on the branch).

---

## File Structure

2 new files, 2 modified.

| File | Responsibility |
|---|---|
| `src/sdk/ui/BottomSheet.tsx` | NEW. Reusable bottom-sheet primitive. Controlled `open` prop. Three dismiss modes: backdrop tap, × button, swipe-down past 100 px. Slide-up animation 250 ms. iOS-safe-area-bottom inset. |
| `src/sdk/ui/SheetTriggerButton.tsx` | NEW. 48×48 glass-style ⚙ icon button. Matches `ZoomControls`/`SoundToggle` look so they align in a column. |
| `src/labs/electromagnetic-induction/scene/LabScene.tsx` | MODIFIED. Branch by `breakpoint`: mobile → outside [FocusReset, Zoom, ⚙] + sheet with 5 controls; desktop → unchanged inline row. Adds inline `SheetSection` helper at bottom of file. |
| `src/labs/mass-measurement/scene/LabScene.tsx` | MODIFIED. Same pattern. Mobile sheet has only Sound + Respawn. Adds inline `SheetSection` helper at bottom of file. |

---

## Pre-flight

- [ ] **Step 0a: Confirm on branch with clean tree**

Run: `git status`
Expected: `On branch feat/mobile-sheet-controls`, working tree clean. HEAD at `243bec7` (the spec commit).

- [ ] **Step 0b: Baseline test run**

Run: `npm test -- --run`
Expected: `Tests 220 passed (220)`.

- [ ] **Step 0c: Baseline type-check**

Run: `npx tsc --noEmit`
Expected: 0 errors.

---

## Task 1: SDK BottomSheet

**Files:**
- Create: `src/sdk/ui/BottomSheet.tsx`

- [ ] **Step 1.1: Write `BottomSheet.tsx`**

Create `src/sdk/ui/BottomSheet.tsx` with the FULL content below:

```tsx
import { ReactNode, useEffect, useRef, useState } from 'react'

type Props = {
  /** Controlled-open flag. Parent owns the state. */
  open: boolean
  /** Called on backdrop tap, × click, or swipe-down past threshold. */
  onClose: () => void
  /** Header title. Defaults to 'Налаштування'. */
  title?: string
  /** Sheet content. Caller composes whatever grouping/layout it needs. */
  children: ReactNode
}

/**
 * Bottom-sheet primitive — slides up from the bottom on phone+tablet to
 * host secondary lab controls (field/coil/magnet/sound/respawn) behind a
 * single settings button. Three dismiss modes:
 *  - Tap the backdrop (the dimmed area above the sheet)
 *  - Click the × button in the header
 *  - Swipe the drag handle or header DOWN by >100 px
 *
 * Body is independently scrollable; dragging the body does NOT trigger
 * dismissal — pointer handlers are attached only to the handle+header.
 *
 * z-index: backdrop 100, sheet 101 (above HUD's 10).
 *
 * The component renders nothing when `open === false` AND the close
 * animation has finished; this avoids holding the dialog DOM during the
 * common closed state.
 */
export function BottomSheet({ open, onClose, title = 'Налаштування', children }: Props) {
  // `mounted` keeps the sheet in the DOM during the close animation,
  // toggled in lockstep with `open` but with a 250 ms unmount delay.
  const [mounted, setMounted] = useState(open)
  // `visible` controls the slide-up transform. Lags `open` by one paint
  // frame on open, so the browser sees the initial translateY(100%) and
  // animates from there. Without the lag the first appearance jumps.
  const [visible, setVisible] = useState(false)

  // Swipe-down state — pointer events on handle+header only.
  const dragStartY = useRef<number | null>(null)
  const [dragOffset, setDragOffset] = useState(0)

  // Mount/unmount + visibility flip on every `open` change.
  useEffect(() => {
    if (open) {
      setMounted(true)
      // One RAF tick so the browser commits the initial style, then animate.
      const raf = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(raf)
    } else {
      setVisible(false)
      const t = setTimeout(() => setMounted(false), 250)
      return () => clearTimeout(t)
    }
  }, [open])

  // ESC closes (desktop debugging aid; no harm on touch).
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!mounted) return null

  const dragging = dragStartY.current !== null

  function onPointerDown(e: React.PointerEvent) {
    dragStartY.current = e.clientY
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  function onPointerMove(e: React.PointerEvent) {
    if (dragStartY.current === null) return
    const delta = Math.max(0, e.clientY - dragStartY.current)
    setDragOffset(delta)
  }
  function onPointerUp() {
    if (dragStartY.current === null) return
    const finalDelta = dragOffset
    dragStartY.current = null
    setDragOffset(0)
    if (finalDelta > 100) onClose()
  }

  return (
    <>
      {/* Backdrop — fades in/out, stops click propagation so taps don't fall to the canvas. */}
      <div
        onClick={(e) => { e.stopPropagation(); onClose() }}
        role="presentation"
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(2px)',
          opacity: visible ? 1 : 0,
          transition: 'opacity 250ms cubic-bezier(0.32, 0.72, 0, 1)',
          zIndex: 100,
          pointerEvents: 'auto',
        }}
      />
      {/* Sheet container — slides up. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="bottom-sheet-title"
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          height: 'min(70vh, 600px)',
          background: 'rgba(248,248,250,0.96)',
          backdropFilter: 'blur(40px) saturate(180%)',
          borderRadius: '16px 16px 0 0',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.25)',
          zIndex: 101,
          display: 'flex',
          flexDirection: 'column',
          transform: visible ? `translateY(${dragOffset}px)` : 'translateY(100%)',
          transition: dragging ? 'none' : 'transform 250ms cubic-bezier(0.32, 0.72, 0, 1)',
          color: '#1d1d1f',
          fontFamily: '"SF Pro Display", "Inter", system-ui, sans-serif',
        }}
      >
        {/* Drag handle + header — pointer-down here triggers swipe-down dismiss. */}
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{ flexShrink: 0, touchAction: 'none', cursor: 'grab' }}
        >
          {/* Grip handle */}
          <div style={{
            width: 36,
            height: 5,
            margin: '8px auto 4px',
            borderRadius: 100,
            background: 'rgba(0,0,0,0.18)',
          }} />
          {/* Header row */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 20px 12px',
            borderBottom: '1px solid rgba(0,0,0,0.08)',
          }}>
            <div id="bottom-sheet-title" style={{ fontSize: 18, fontWeight: 600 }}>
              {title}
            </div>
            <button
              onClick={onClose}
              aria-label="Закрити"
              title="Закрити"
              style={{
                background: 'rgba(0,0,0,0.06)',
                border: 'none',
                borderRadius: 100,
                width: 44,
                height: 44,
                fontSize: 20,
                lineHeight: 1,
                cursor: 'pointer',
                color: '#1d1d1f',
              }}
            >
              ×
            </button>
          </div>
        </div>
        {/* Scrollable body — pointer events here do NOT trigger dismiss. */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 20px',
          paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 0px))',
        }}>
          {children}
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 1.2: Type-check**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 1.3: Build**

Run: `npm run build`
Expected: build succeeds (only pre-existing chunk-size warning).

- [ ] **Step 1.4: Test (regression gate)**

Run: `npm test -- --run`
Expected: `Tests 220 passed (220)`.

- [ ] **Step 1.5: Commit**

```bash
git add src/sdk/ui/BottomSheet.tsx
git commit -m "$(cat <<'EOF'
feat(sdk): BottomSheet primitive with swipe-down dismiss

Reusable controlled-open sheet. Slides up from the bottom over a dimmed
backdrop. Three dismiss modes: backdrop tap, × button, swipe-down past
100 px. Body is independently scrollable; pointer handlers attached only
to the drag handle + header so body drags scroll instead of dismissing.
ESC also closes (desktop debugging aid). z-index 100/101 above HUD.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: SDK SheetTriggerButton

**Files:**
- Create: `src/sdk/ui/SheetTriggerButton.tsx`

- [ ] **Step 2.1: Write `SheetTriggerButton.tsx`**

Create `src/sdk/ui/SheetTriggerButton.tsx` with the FULL content below:

```tsx
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
```

- [ ] **Step 2.2: Type-check**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 2.3: Test (regression gate)**

Run: `npm test -- --run`
Expected: `Tests 220 passed (220)`.

- [ ] **Step 2.4: Commit**

```bash
git add src/sdk/ui/SheetTriggerButton.tsx
git commit -m "$(cat <<'EOF'
feat(sdk): SheetTriggerButton — ⚙ icon button matching glass control style

48×48 dark-glass button rendering the gear glyph. Same dimensions and
material as ZoomControls / SoundToggle so they align in a column on
phone+tablet. Caller wires onClick to setSheetOpen(true).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: EM induction wiring

**Files:**
- Modify: `src/labs/electromagnetic-induction/scene/LabScene.tsx`

This task has more steps because we touch four different parts of the file: imports, state hooks, return JSX, and a new helper function appended at the bottom.

- [ ] **Step 3.1: Extend the `react` import on line 1**

Find on line 1:

```ts
import { useEffect, useRef } from 'react'
```

Replace with:

```ts
import { useEffect, useRef, useState, type ReactNode } from 'react'
```

- [ ] **Step 3.2: Add BottomSheet + SheetTriggerButton imports**

Find this block (currently around lines 11-14):

```ts
import { CANVAS_BASE_STYLE } from '../../../sdk/scene/canvasStyle'
import { Button } from '../../../sdk/ui/Button'
import { SoundToggle } from '../../../sdk/ui/SoundToggle'
import { ZoomControls } from '../../../sdk/ui/ZoomControls'
```

Add two new imports immediately after `ZoomControls`:

```ts
import { CANVAS_BASE_STYLE } from '../../../sdk/scene/canvasStyle'
import { Button } from '../../../sdk/ui/Button'
import { SoundToggle } from '../../../sdk/ui/SoundToggle'
import { ZoomControls } from '../../../sdk/ui/ZoomControls'
import { BottomSheet } from '../../../sdk/ui/BottomSheet'
import { SheetTriggerButton } from '../../../sdk/ui/SheetTriggerButton'
```

- [ ] **Step 3.3: Add `isMobile` and `sheetOpen` hooks**

Find this block at the top of `LabScene()` (currently around lines 212-214):

```ts
  const { breakpoint } = useViewport()
  const isPhone = breakpoint === 'phone'
  const preset: CameraPreset = sceneToPreset(idx)
```

Insert two new lines between `isPhone` and `preset`:

```ts
  const { breakpoint } = useViewport()
  const isPhone = breakpoint === 'phone'
  const isMobile = breakpoint === 'phone' || breakpoint === 'tablet'
  const [sheetOpen, setSheetOpen] = useState(false)
  const preset: CameraPreset = sceneToPreset(idx)
```

Note: `isPhone` is preserved per the spec — it's no longer USED inside the new JSX, but the spec asks to keep it "for safety". If `tsc --noEmit` complains about an unused declaration, prefix it with an underscore (`_isPhone`) — do not delete.

- [ ] **Step 3.4: Replace the controls block at the bottom of the return**

Find this block (currently around lines 319-340):

```tsx
      <div
        style={
          isPhone
            ? { position: 'fixed', top: 110, right: 8, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 10 }
            : { position: 'fixed', bottom: safeAreaBottom(16), right: 16, display: 'flex', gap: 8, zIndex: 10 }
        }
      >
        <ZoomControls />
        <SoundToggle />
        <FieldToggleButton />
        <CoilTurnsButton />
        <MagnetStrengthButton />
        <FocusResetButton />
        <Button
          variant="secondary"
          onClick={() => respawnObjects()}
          aria-label="Скинути предмети"
          title="Скинути предмети"
        >
          {isPhone ? '↻' : '↻ Скинути предмети'}
        </Button>
      </div>
```

Replace the ENTIRE block above with:

```tsx
      {isMobile ? (
        <>
          {/* Outside the sheet — bottom-right vertical stack on phone+tablet. */}
          <div
            style={{
              position: 'fixed',
              bottom: safeAreaBottom(16),
              right: 8,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              zIndex: 10,
            }}
          >
            <FocusResetButton />
            <ZoomControls />
            <SheetTriggerButton onClick={() => setSheetOpen(true)} />
          </div>

          {/* Sheet content — secondary settings + respawn action. */}
          <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)}>
            <SheetSection label="Магнітне поле">
              <FieldToggleButton />
            </SheetSection>
            <SheetSection label="Витки котушки">
              <CoilTurnsButton />
            </SheetSection>
            <SheetSection label="Сила магніту">
              <MagnetStrengthButton />
            </SheetSection>
            <SheetSection label="Звук">
              <SoundToggle />
            </SheetSection>
            <div style={{ marginTop: 8 }}>
              <Button
                variant="secondary"
                onClick={() => respawnObjects()}
                aria-label="Скинути предмети"
                title="Скинути предмети"
              >
                ↻ Скинути предмети
              </Button>
            </div>
          </BottomSheet>
        </>
      ) : (
        /* Desktop ≥900 — inline horizontal row, unchanged behaviour. */
        <div
          style={{
            position: 'fixed',
            bottom: safeAreaBottom(16),
            right: 16,
            display: 'flex',
            gap: 8,
            zIndex: 10,
          }}
        >
          <ZoomControls />
          <SoundToggle />
          <FieldToggleButton />
          <CoilTurnsButton />
          <MagnetStrengthButton />
          <FocusResetButton />
          <Button
            variant="secondary"
            onClick={() => respawnObjects()}
            aria-label="Скинути предмети"
            title="Скинути предмети"
          >
            ↻ Скинути предмети
          </Button>
        </div>
      )}
```

- [ ] **Step 3.5: Add `SheetSection` helper at the bottom of the file**

Append the following block at the END of `src/labs/electromagnetic-induction/scene/LabScene.tsx` (after the `export function LabScene()` body — i.e. after the LAST closing brace of the file):

```tsx

function SheetSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div
        style={{
          fontSize: 11,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: '#86868b',
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  )
}
```

Note: the `ReactNode` type was added to the `react` import in Step 3.1 — the helper compiles cleanly.

- [ ] **Step 3.6: Type-check**

Run: `npx tsc --noEmit`
Expected: 0 errors. If unused-locals error fires on `isPhone`, rename to `_isPhone` (do NOT delete — see Step 3.3 note).

- [ ] **Step 3.7: Build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3.8: Test (regression gate)**

Run: `npm test -- --run`
Expected: `Tests 220 passed (220)`.

- [ ] **Step 3.9: Commit**

```bash
git add src/labs/electromagnetic-induction/scene/LabScene.tsx
git commit -m "$(cat <<'EOF'
feat(em-induction): mobile bottom-sheet hosts secondary controls

Phone+tablet (<900 px) now show only [FocusReset?, Zoom+, Zoom−, ⚙]
as a bottom-right vertical icon stack. Tapping ⚙ slides up a sheet with
Field toggle, Coil turns, Magnet strength, Sound, and the Respawn
action — labelled by group. Desktop ≥900 px keeps the existing inline
horizontal row at bottom-right. Sheet state is local React state.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Mass-measurement wiring

**Files:**
- Modify: `src/labs/mass-measurement/scene/LabScene.tsx`

Same pattern as Task 3, smaller sheet (Sound + Respawn).

- [ ] **Step 4.1: Extend the `react` import on line 1**

Find on line 1:

```ts
import { useEffect, useRef, useState } from 'react'
```

`useState` is already imported. Add ONE token, `type ReactNode`:

```ts
import { useEffect, useRef, useState, type ReactNode } from 'react'
```

- [ ] **Step 4.2: Add BottomSheet + SheetTriggerButton imports**

Find this block (currently around lines 16-18):

```ts
import { Button } from '../../../sdk/ui/Button'
import { SoundToggle } from '../../../sdk/ui/SoundToggle'
import { ZoomControls } from '../../../sdk/ui/ZoomControls'
```

Add two new imports immediately after `ZoomControls`:

```ts
import { Button } from '../../../sdk/ui/Button'
import { SoundToggle } from '../../../sdk/ui/SoundToggle'
import { ZoomControls } from '../../../sdk/ui/ZoomControls'
import { BottomSheet } from '../../../sdk/ui/BottomSheet'
import { SheetTriggerButton } from '../../../sdk/ui/SheetTriggerButton'
```

- [ ] **Step 4.3: Add `isMobile` and `sheetOpen` hooks**

Find this block near the top of `LabScene()` (currently around lines 47-48):

```ts
  const { breakpoint } = useViewport()
  const isPhone = breakpoint === 'phone'
```

Insert two new lines immediately after:

```ts
  const { breakpoint } = useViewport()
  const isPhone = breakpoint === 'phone'
  const isMobile = breakpoint === 'phone' || breakpoint === 'tablet'
  const [sheetOpen, setSheetOpen] = useState(false)
```

Note: same `isPhone` retention rule as in Task 3 — if `tsc --noEmit` complains, rename to `_isPhone`.

- [ ] **Step 4.4: Replace the controls block at the bottom of the return**

Find this block (currently around lines 150-181):

```tsx
      <div
        style={
          isPhone
            ? {
                position: 'fixed',
                top: 110,
                right: 8,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                zIndex: 10,
              }
            : {
                position: 'fixed',
                bottom: safeAreaBottom(16),
                right: 16,
                display: 'flex',
                gap: 8,
                zIndex: 10,
              }
        }
      >
        <ZoomControls />
        <SoundToggle />
        <Button
          variant="secondary"
          onClick={() => respawnObjects()}
          aria-label="Скинути предмети"
          title="Скинути предмети"
        >
          {isPhone ? '↻' : '↻ Скинути предмети'}
        </Button>
      </div>
```

Replace the ENTIRE block above with:

```tsx
      {isMobile ? (
        <>
          {/* Outside the sheet — bottom-right vertical stack on phone+tablet. */}
          <div
            style={{
              position: 'fixed',
              bottom: safeAreaBottom(16),
              right: 8,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              zIndex: 10,
            }}
          >
            <ZoomControls />
            <SheetTriggerButton onClick={() => setSheetOpen(true)} />
          </div>

          {/* Sheet content — sound + respawn action. */}
          <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)}>
            <SheetSection label="Звук">
              <SoundToggle />
            </SheetSection>
            <div style={{ marginTop: 8 }}>
              <Button
                variant="secondary"
                onClick={() => respawnObjects()}
                aria-label="Скинути предмети"
                title="Скинути предмети"
              >
                ↻ Скинути предмети
              </Button>
            </div>
          </BottomSheet>
        </>
      ) : (
        /* Desktop ≥900 — inline horizontal row, unchanged behaviour. */
        <div
          style={{
            position: 'fixed',
            bottom: safeAreaBottom(16),
            right: 16,
            display: 'flex',
            gap: 8,
            zIndex: 10,
          }}
        >
          <ZoomControls />
          <SoundToggle />
          <Button
            variant="secondary"
            onClick={() => respawnObjects()}
            aria-label="Скинути предмети"
            title="Скинути предмети"
          >
            ↻ Скинути предмети
          </Button>
        </div>
      )}
```

- [ ] **Step 4.5: Add `SheetSection` helper at the bottom of the file**

Append the following block at the END of `src/labs/mass-measurement/scene/LabScene.tsx` (after the LAST closing brace of the file). This is the same helper as Task 3 — kept inline per the spec (only two consumers, YAGNI on extracting):

```tsx

function SheetSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div
        style={{
          fontSize: 11,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: '#86868b',
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  )
}
```

- [ ] **Step 4.6: Type-check**

Run: `npx tsc --noEmit`
Expected: 0 errors. Apply `_isPhone` rename if unused-locals fires (same as Step 3.6).

- [ ] **Step 4.7: Build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4.8: Test (regression gate)**

Run: `npm test -- --run`
Expected: `Tests 220 passed (220)`.

- [ ] **Step 4.9: Commit**

```bash
git add src/labs/mass-measurement/scene/LabScene.tsx
git commit -m "$(cat <<'EOF'
feat(mass-measurement): mobile bottom-sheet hosts secondary controls

Phone+tablet (<900 px) now show only [Zoom+, Zoom−, ⚙] as a bottom-right
vertical icon stack. Tapping ⚙ slides up a short sheet with Sound and
the Respawn action. Desktop ≥900 px keeps the existing inline row.
Mirrors the EM-induction implementation for cross-lab consistency.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Verify + push + direct-merge to master

**Files:** None modified. Verification + git operations only.

- [ ] **Step 5.1: Final type-check**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 5.2: Final build**

Run: `npm run build`
Expected: build succeeds; only pre-existing chunk-size warning.

- [ ] **Step 5.3: Final test**

Run: `npm test -- --run`
Expected: `Tests 220 passed (220)`.

- [ ] **Step 5.4: Sanity-check the commit chain**

Run: `git log --oneline master..HEAD`

Expected output (5 commits including the spec):

```
<sha> feat(mass-measurement): mobile bottom-sheet hosts secondary controls
<sha> feat(em-induction): mobile bottom-sheet hosts secondary controls
<sha> feat(sdk): SheetTriggerButton — ⚙ icon button matching glass control style
<sha> feat(sdk): BottomSheet primitive with swipe-down dismiss
243bec7 docs(specs): mobile bottom-sheet for lab controls (PR1)
```

Run: `git diff master..HEAD --stat`

Expected: 5 files changed (the spec + 2 new SDK files + 2 modified LabScenes). Approximately 700+ insertions for the spec doc and ~280 lines net for the code changes.

- [ ] **Step 5.5: Push the branch**

Run: `git push -u origin feat/mobile-sheet-controls`
Expected: branch pushed to remote.

- [ ] **Step 5.6: Direct-merge to master**

```bash
git checkout master
git merge --no-ff feat/mobile-sheet-controls -m "Merge feat/mobile-sheet-controls: mobile bottom-sheet for lab controls"
git push origin master
```

Expected: master fast-forwards onto a merge commit; pushed; Vercel triggers production deploy.

- [ ] **Step 5.7: User smoke-test (after Vercel deploy completes, ~2 min after push)**

On the live site `science-lab-phi.vercel.app`:

1. **iPhone portrait (any width <600 px), EM induction lab:**
   - Right-side column shows only 3 small (48×48) glass icons: `[+] [−] [⚙]`. (FocusReset appears as a 4th item ABOVE the zoom only when a tap-to-focus is active.)
   - The 3D scene fills the full viewport horizontally — no big control column eating the right half.
   - Tap ⚙ — sheet slides up from the bottom over 250 ms. Backdrop dims behind it.
   - Sheet header reads "Налаштування" with a × close button on the right.
   - Sheet body has four labelled sections (Магнітне поле, Витки котушки, Сила магніту, Звук) each holding their existing button, plus a "↻ Скинути предмети" action at the bottom.
   - Toggle field on/off via the in-sheet button — field lines fade in/out behind the sheet as expected.
   - Cycle coil turns / magnet strength / sound — labels update in real time inside the sheet.
   - Tap "↻ Скинути предмети" — objects respawn (sheet stays open).
   - Tap backdrop (any area outside the sheet) — sheet slides down over 250 ms.
   - Open again → swipe the top of the sheet (drag handle or header) DOWN by ~150 px → sheet dismisses.
   - Open again → press × → sheet dismisses.

2. **iPad mini portrait (~768 px wide, tablet bucket), EM induction lab:**
   - Same icon column + sheet experience as phone.

3. **Desktop (browser at 1280+ px), EM induction lab:**
   - Bottom-right row shows the full inline strip exactly as before merge — no ⚙ visible.

4. **iPhone, mass-measurement lab:**
   - Right column shows just `[+] [−] [⚙]`.
   - Tap ⚙ — short sheet with "Звук" section + "↻ Скинути предмети" action.

5. **Galvanometer + bulb + lever behaviour unchanged across all devices.**

If anything fails the smoke-test, the relevant slice (A=Bottom­Sheet, B=trigger, C=EM, D=mass) is the entry point for a targeted fix.

---

## Self-Review Notes

**Spec coverage:**
- ✅ Slice A (BottomSheet) — Task 1.
- ✅ Slice B (SheetTriggerButton) — Task 2.
- ✅ Slice C (EM induction wiring) — Task 3.
- ✅ Slice D (Mass-measurement wiring) — Task 4.
- ✅ Slice E (verify + merge) — Task 5.
- ✅ Acceptance criteria #1–#8 from spec covered in Task 5's smoke-test list.
- ✅ Risks (backdrop event propagation, swipe vs body scroll, breakpoint flip, animation timing) all addressed in the BottomSheet code in Task 1.

**Placeholder scan:** No "TBD" / "TODO" / "implement later" / "similar to Task N". Every code-changing step shows the full code or full Find/Replace. Every command shows the exact CLI + expected output.

**Type consistency:** `BottomSheet` props (`open: boolean; onClose: () => void; title?: string; children: ReactNode`) match between definition (Task 1) and usage (Tasks 3 + 4). `SheetTriggerButton` props (`onClick: () => void`) match between definition (Task 2) and usage (Tasks 3 + 4). `SheetSection` is the same 12-line helper in both LabScene files (Tasks 3.5 + 4.5). The `ReactNode` type is imported via `type ReactNode` in both LabScenes (Steps 3.1 + 4.1).

**No new tests:** Spec explicitly carries forward the 220-test regression gate; no unit-testable surface added (visual / interaction primitive). Task 5.3 confirms green.

**Branch parallelism:** Working on `feat/mobile-sheet-controls` from fresh master (`628c430`) plus spec commit (`243bec7`). No conflicting open branches.

**iPhone-on-stickin-edge note:** Bottom-right `safeAreaBottom(16)` keeps the icon stack above the iOS home-indicator strip. The sheet itself uses `paddingBottom: calc(20px + env(safe-area-inset-bottom, 0px))` on its scroll body to keep the last action above the same indicator.
