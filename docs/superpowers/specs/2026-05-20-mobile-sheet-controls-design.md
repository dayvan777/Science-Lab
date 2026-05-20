# Mobile Bottom Sheet for Lab Controls — Design

**Date:** 2026-05-20
**Status:** Approved-in-concept (user picked "B — Two phased PRs" with additions: mass-measurement parallel + swipe-down dismiss)
**Scope:** PR1 of a two-PR mobile/tablet polish pass. Introduce a reusable SDK `BottomSheet` and a small `SheetTriggerButton`. Wire them into both lab scenes (EM induction + mass measurement) so on phone+tablet (<900 px) secondary controls hide behind a single ⚙ button instead of stacking into a wide column that eats the 3D viewport.

## Background

The user reported (with iPhone screenshot, 19:40 timestamp) that the EM-induction lab is unusable on phone: the right-side controls column takes ~45 % of the screen width, squashing the 3D scene into a thin band where the magnet and coil look like dots. Root cause in `src/labs/electromagnetic-induction/scene/LabScene.tsx` (lines 319-340): on phone, seven controls stack vertically — two 48×48 px utility buttons (zoom +/−) and five 120×56 px labelled buttons (`⊟ Поле`, `Витки: 3`, `Магніт: Сильн.`, `🌄 Все`, `↻`). The min-width of 120 px on the labelled buttons sets the entire column's width.

On tablet (600-899 px) the same controls render as a horizontal row at the bottom. With seven items at 120 px each plus gaps, the row is ~720 px wide — on iPad mini portrait (768 px) it nearly fills the bottom strip and crowds the home indicator.

The user chose the **bottom-sheet pattern** for the redesign (rejected: bottom toolbar, icon-only column, hybrid). Controls behind ⚙. Of the seven controls, the user picked `Zoom +/−` and `Focus Reset` to stay outside the sheet; the rest move inside. The sheet should appear on **phone + tablet (<900 px)**; on desktop (≥900 px) the current inline horizontal row stays unchanged. The user also asked for a **swipe-down dismiss** gesture on top of backdrop tap + close button — for an iOS-native feel.

Existing infrastructure (already shipped, reused as-is):
- `useViewport()` hook with `phone | tablet | desktop` breakpoints.
- `safeAreaTop` / `safeAreaBottom` CSS helpers for iOS notch / home indicator clearance.
- `CANVAS_BASE_STYLE` with `touch-action: none` on the R3F Canvas.
- `Button`, `GlassPanel`, `SoundToggle`, `ZoomControls` — used by sheet content and outside.
- `FieldToggleButton`, `CoilTurnsButton`, `MagnetStrengthButton`, `FocusResetButton` — lab-specific buttons that already read/write Zustand state; reused inside the sheet without state-layer changes.

## Non-goals

- Tablet HUD panel compaction (left task panel / right journal panel are still 280-340 px wide on tablet — deferred to PR2).
- Landing-page mobile audit (deferred to PR2).
- Phone-landscape special-case (falls into tablet bucket, gets the sheet — no further tuning).
- Pinch-to-zoom (intentionally disabled by `touch-action: none`).
- New camera POSEs.
- Re-styling existing lab-specific buttons.
- Changes to Zustand state or persist keys.
- New unit tests. The 220 pre-existing tests stay as a regression gate; sheet UI is visual and has no test surface.
- A new `useSheetStore` Zustand store. Open/closed state is local React state in each LabScene — it's per-lab and doesn't need to persist across navigation.

## Architecture

Single PR. Branch `feat/mobile-sheet-controls` from `master` at commit `628c430`. Four implementation slices + verify slice, all in one branch, in this order:

| Slice | Purpose | Files |
|---|---|---|
| **A** | SDK BottomSheet primitive with swipe-down dismiss | `src/sdk/ui/BottomSheet.tsx` (new) |
| **B** | SDK SheetTriggerButton — the ⚙ icon button | `src/sdk/ui/SheetTriggerButton.tsx` (new) |
| **C** | EM induction integration | `src/labs/electromagnetic-induction/scene/LabScene.tsx` (modify) |
| **D** | Mass-measurement integration | `src/labs/mass-measurement/scene/LabScene.tsx` (modify) |
| **E** | Verify + commit + push + merge | none — verification only |

Slices A → B → C → D in code-dependency order: A and B are pure SDK additions; C and D depend on both.

Three files modified, two new. ~280 lines net diff.

---

## Slice A — SDK BottomSheet

**File:** `src/sdk/ui/BottomSheet.tsx` (NEW)

### Props

```ts
type Props = {
  /** Controlled-open flag. Parent owns the state. */
  open: boolean
  /** Called on backdrop tap, X click, or swipe-down past threshold. */
  onClose: () => void
  /** Header title. Defaults to 'Налаштування'. */
  title?: string
  /** Sheet content. Caller composes whatever grouping/layout it needs. */
  children: ReactNode
}
```

### Visual layout

```
┌──────────────────────────┐
│           ━━━            │  ← drag handle, 36×5 px, color rgba(0,0,0,0.18)
│  <title>            [×]  │  ← header row, 52 px tall, border-bottom
├──────────────────────────┤
│                          │
│   <children>             │  ← scrollable body
│                          │
│                          │  ← safe-area-bottom inset on last item
└──────────────────────────┘
```

### Style specifics

- Backdrop: fixed full-viewport, `background: rgba(0,0,0,0.4)`, `backdropFilter: blur(2px)`, `zIndex: 100`. Tap closes via `onClose()`.
- Sheet container: fixed `bottom: 0, left: 0, right: 0`, `height: min(70vh, 600px)`, `background: rgba(248,248,250,0.96)`, `backdropFilter: blur(40px) saturate(180%)`, `borderRadius: 16px 16px 0 0`, `boxShadow: 0 -8px 40px rgba(0,0,0,0.25)`, `zIndex: 101`.
- Drag handle: centred, `width: 36, height: 5, borderRadius: 100, background: rgba(0,0,0,0.18)`, margin `8px auto 4px`.
- Header row: `display: flex, justifyContent: space-between, alignItems: center, padding: '12px 20px 12px 20px', borderBottom: 1px solid rgba(0,0,0,0.08)`. Title font: 18px, weight 600, color `#1d1d1f`.
- Close button: 44×44, `background: rgba(0,0,0,0.06)`, `borderRadius: 100`, X char fontSize 20.
- Body: `flex: 1, overflowY: auto, padding: '16px 20px', paddingBottom: calc(20px + env(safe-area-inset-bottom, 0px))`.

### Animation

CSS transition on the sheet container's `transform`:

```css
transform: translateY(0);          /* open */
transform: translateY(100%);       /* closed */
transition: transform 250ms cubic-bezier(0.32, 0.72, 0, 1);  /* iOS spring */
```

Backdrop fades via `opacity: 0 → 1` over the same duration.

When `open` becomes `false`, the component stays mounted for the duration of the close animation, then unmounts (via a small `mounted` state ticked on each `open` change with a `setTimeout(250)` clear).

### Swipe-down dismiss

Pointer events attached **only** to the drag-handle + header (NOT the body — body is scrollable, dragging it should scroll, not dismiss).

```ts
const dragStartY = useRef<number | null>(null)
const [dragOffset, setDragOffset] = useState(0)

function onPointerDown(e: React.PointerEvent) {
  dragStartY.current = e.clientY
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}

function onPointerMove(e: React.PointerEvent) {
  if (dragStartY.current === null) return
  const delta = Math.max(0, e.clientY - dragStartY.current)  // ignore upward drags
  setDragOffset(delta)
}

function onPointerUp() {
  if (dragStartY.current === null) return
  const finalDelta = dragOffset
  dragStartY.current = null
  setDragOffset(0)
  if (finalDelta > 100) onClose()  // threshold: 100 px downward = dismiss
}
```

During a drag, the sheet's `transform` is `translateY(${dragOffset}px)` (overriding the CSS transition by adding `transition: 'none'` while `dragStartY.current !== null`). On `onPointerUp`, transition resumes for the snap-back.

### Accessibility

- `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing at the title node.
- ESC key closes (desktop debug aid; phones don't have it but harmless).
- Focus trap is **not** implemented in PR1 (out of scope — sheet content is mostly toggles, focus rarely matters for kids' lab interactions on phones). PR2 candidate.

### Acceptance

1. When `open={true}` from a closed state, sheet slides up over 250 ms with a backdrop fade-in.
2. Tapping backdrop calls `onClose()`.
3. Clicking the `×` button calls `onClose()`.
4. Swiping the drag handle/header down by >100 px calls `onClose()`. Releasing before 100 px snaps the sheet back into place.
5. Body scrolls independently when content overflows — body drag does **not** trigger dismissal.
6. `ESC` keypress (when DOM focus is on the sheet) closes it.
7. On unmount, no leftover scroll-lock or zombie listeners.

---

## Slice B — SDK SheetTriggerButton

**File:** `src/sdk/ui/SheetTriggerButton.tsx` (NEW)

A tiny convenience component — the ⚙ icon button styled to match `ZoomControls` and `SoundToggle` (rgba(20,20,24,0.72) glass on dark scenes).

### Props

```ts
type Props = {
  /** Called when the user taps the button. */
  onClick: () => void
  /** ARIA label. Defaults to 'Відкрити налаштування'. */
  'aria-label'?: string
}
```

### Implementation

```tsx
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

Same shape/size as `ZoomControls` phone buttons so the column visually aligns.

### Acceptance

1. Renders a 48×48 glass-style button with the gear glyph.
2. Click/tap calls `onClick`.
3. Hover tooltip + accessible name are both 'Відкрити налаштування' (overridable).

---

## Slice C — EM induction wiring

**File:** `src/labs/electromagnetic-induction/scene/LabScene.tsx` (modify)

### Imports added

```ts
// Add `useState` to the existing react import. Line 1 currently reads:
//   import { useEffect, useRef } from 'react'
// becomes:
//   import { useEffect, useRef, useState } from 'react'
import { BottomSheet } from '../../../sdk/ui/BottomSheet'
import { SheetTriggerButton } from '../../../sdk/ui/SheetTriggerButton'
```

### Local state

Inside `LabScene()`:

```ts
const [sheetOpen, setSheetOpen] = useState(false)
const isMobile = breakpoint === 'phone' || breakpoint === 'tablet'
```

`isPhone` is already computed — `isMobile` is the new branch for sheet-vs-inline. `isPhone` is retained for whatever phone-specific styles need it (none after this change, but keep for safety).

### JSX changes — replace the controls block (lines 319-340)

**Before:**

```tsx
<div style={isPhone ? {...vertical} : {...horizontal}}>
  <ZoomControls />
  <SoundToggle />
  <FieldToggleButton />
  <CoilTurnsButton />
  <MagnetStrengthButton />
  <FocusResetButton />
  <Button>...</Button>
</div>
```

**After:**

```tsx
{isMobile ? (
  <>
    {/* Outside the sheet — bottom-right vertical stack on mobile */}
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

    {/* Sheet content — sound + field + turns + magnet + respawn */}
    <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Налаштування">
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
      <Button variant="secondary" onClick={() => respawnObjects()} title="Скинути предмети">
        ↻ Скинути предмети
      </Button>
    </BottomSheet>
  </>
) : (
  /* Desktop ≥900 — unchanged inline horizontal row */
  <div style={{ position: 'fixed', bottom: safeAreaBottom(16), right: 16, display: 'flex', gap: 8, zIndex: 10 }}>
    <ZoomControls />
    <SoundToggle />
    <FieldToggleButton />
    <CoilTurnsButton />
    <MagnetStrengthButton />
    <FocusResetButton />
    <Button variant="secondary" onClick={() => respawnObjects()} title="Скинути предмети">
      ↻ Скинути предмети
    </Button>
  </div>
)}
```

### SheetSection

A small inline helper defined at the bottom of `LabScene.tsx` (the same file — too small to deserve its own module):

```tsx
function SheetSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{
        fontSize: 11,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: '#86868b',
        marginBottom: 8,
      }}>
        {label}
      </div>
      {children}
    </div>
  )
}
```

Provides a consistent "label above control" pattern inside the sheet.

### FocusResetButton — important detail

`FocusResetButton` returns `null` when neither `focusTarget` nor `freeFocusPoint` is set. So on mobile the outside column is normally just `[Zoom +, Zoom −, ⚙]` (3 buttons), expanding to `[FocusReset, Zoom +, Zoom −, ⚙]` (4 buttons) only when the user has tapped to focus. This is correct — the reset button SHOULD be reachable instantly when active, hence outside the sheet.

### Acceptance

1. On iPhone (≤599 px) the right column shows 3-4 small (48×48) icon buttons only.
2. Tapping ⚙ slides up the sheet from the bottom.
3. Each of the five controls inside the sheet works exactly as before — toggling `fieldVisible`, cycling `coilTurns`, etc. — and persists via Zustand persist as before.
4. On iPad mini portrait (768 px, tablet) the same UI appears.
5. On desktop (1280 px) the inline horizontal row at bottom-right looks identical to today.
6. `npx tsc --noEmit` is clean.

---

## Slice D — Mass-measurement wiring

**File:** `src/labs/mass-measurement/scene/LabScene.tsx` (modify)

Mass-measurement has fewer controls — only `ZoomControls`, `SoundToggle`, and the respawn `Button`. The sheet here is smaller (2 items: Sound, Respawn) but maintains UX consistency across labs.

### Imports added

```ts
import { BottomSheet } from '../../../sdk/ui/BottomSheet'
import { SheetTriggerButton } from '../../../sdk/ui/SheetTriggerButton'
```

### Local state

Inside `LabScene()`:

```ts
const [sheetOpen, setSheetOpen] = useState(false)
const isMobile = breakpoint === 'phone' || breakpoint === 'tablet'
```

### JSX — replace the controls block (lines 150-182)

```tsx
{isMobile ? (
  <>
    {/* Outside the sheet — bottom-right vertical stack on mobile */}
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

    <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Налаштування">
      <SheetSection label="Звук">
        <SoundToggle />
      </SheetSection>
      <Button variant="secondary" onClick={() => respawnObjects()} title="Скинути предмети">
        ↻ Скинути предмети
      </Button>
    </BottomSheet>
  </>
) : (
  /* Desktop ≥900 — unchanged inline horizontal row */
  <div style={{ position: 'fixed', bottom: safeAreaBottom(16), right: 16, display: 'flex', gap: 8, zIndex: 10 }}>
    <ZoomControls />
    <SoundToggle />
    <Button variant="secondary" onClick={() => respawnObjects()} title="Скинути предмети">
      ↻ Скинути предмети
    </Button>
  </div>
)}
```

`SheetSection` is duplicated inline at the bottom of this file too — same 12-line snippet. We do NOT promote it to SDK because (a) it's trivial, (b) only used in two places, (c) different labs may want different section styling later. YAGNI.

(If both labs end up with 3+ sections each, we'd promote `SheetSection` to `src/sdk/ui/SheetSection.tsx`. Two duplicates is fine.)

### Acceptance

1. On iPhone the mass-measurement scene shows a bottom-right column of 2 buttons: `[+ −][⚙]` (zoom group + sheet trigger).
2. Tapping ⚙ opens a short sheet with two items: Sound toggle, Respawn button.
3. Desktop layout unchanged.

---

## Slice E — Verify + commit + push + merge

No file changes. Verification only.

1. `npx tsc --noEmit` — 0 errors.
2. `npm run build` — succeeds, only pre-existing chunk-size warning.
3. `npm test -- --run` — 220 tests passing.
4. `git log --oneline master..HEAD` shows the four implementation commits (one per slice A-D).
5. `git push -u origin feat/mobile-sheet-controls`.
6. `git checkout master && git merge --no-ff feat/mobile-sheet-controls -m "..." && git push origin master`.
7. After Vercel deploys, user smoke-tests on iPhone + iPad and reports.

---

## File touch-list

| File | Change |
|---|---|
| `src/sdk/ui/BottomSheet.tsx` | NEW — ~140 lines including swipe-down handlers. |
| `src/sdk/ui/SheetTriggerButton.tsx` | NEW — ~25 lines. |
| `src/labs/electromagnetic-induction/scene/LabScene.tsx` | Modify — replace controls block with branched JSX; add SheetSection helper at bottom. ~70 lines added, ~22 removed. |
| `src/labs/mass-measurement/scene/LabScene.tsx` | Modify — same pattern, smaller sheet. ~35 lines added, ~10 removed. |

2 new files, 2 modified. ~280 lines net.

## Testing strategy

No new unit tests. The 220-test suite stays as a regression gate; `npx tsc --noEmit` and `npm run build` stay clean.

The real verification is a human smoke-test on a phone after Vercel deploys the merged branch:
1. iPhone (~430 px) — open EM induction lab. Confirm: only 3-4 small icons bottom-right; 3D scene fills the entire screen; tap ⚙ → sheet appears; toggle field/turns/magnet, verify reflected in scene; swipe sheet down → closes; backdrop tap → closes.
2. iPad mini portrait (~768 px) — open EM induction lab. Confirm: same sheet experience as phone.
3. Desktop browser (1280+ px) — open EM induction lab. Confirm: inline horizontal row at bottom-right looks identical to before; no ⚙ button visible.
4. iPhone — open mass-measurement lab. Confirm: 2-button column bottom-right; tap ⚙ → short sheet with 2 items.

## Risks

- **Backdrop tap pierces to canvas:** If `pointer-events` propagation isn't blocked, tapping the backdrop could trigger a free-focus tap on the 3D scene below. Mitigation: backdrop element has its own `onClick` AND `pointer-events: auto` AND calls `e.stopPropagation()`. Sheet's `z-index: 100/101` keeps it above HUD (10) and below nothing user-visible.
- **Swipe gesture conflicts with iOS pull-to-refresh:** Pull-to-refresh is browser-level on the page root, not the sheet element. Since the page already has `overflow: hidden` on body (via `CANVAS_BASE_STYLE`'s `position: fixed; inset: 0`), pull-to-refresh is already disabled. No conflict.
- **Sheet open on desktop after window resize (≥900 → <900):** If the user resizes from desktop to mobile width with controls inline, we don't auto-open the sheet — sheet is closed by default. `isMobile` flips, the inline row disappears, sheet trigger ⚙ appears. Acceptable.
- **Sheet open on mobile then resize to desktop:** Sheet stays open (state persists), but the parent's `isMobile` returns false, so the sheet (which is rendered inside the `isMobile` branch) unmounts. Open state is lost on next resize back to mobile (it's local state, defaults to false). Acceptable — edge case, no data loss.
- **Animation jank on first open:** Mounting + immediate slide-up could miss the first frame. Mitigation: render sheet with `translateY(100%)` on the very first frame (i.e. before `open` is read), then on next frame swap to `translateY(0)`. Use `requestAnimationFrame` inside `useEffect`. Standard pattern.

## Out of scope

- Pinch-to-zoom on the 3D scene.
- Tablet HUD panel compaction (left/right panels still 280-340 px).
- Landing page mobile audit.
- Focus trap inside the sheet (desktop a11y polish).
- Persistence of sheet open state across navigation.
- New SDK store for sheet management.
- Phone landscape special-casing.
- Promethean-panel-specific tuning (desktop layout, already works).
- New translations / Ukrainian copy review.

## Self-review checklist

- [x] Every slice has a concrete acceptance criterion.
- [x] Architecture is internally consistent — A+B are pure SDK additions; C+D consume both; no circular deps.
- [x] No "TBD" / "TODO" / placeholder text.
- [x] File touch-list matches what each slice describes.
- [x] Existing tests are NOT modified; suite is regression gate.
- [x] No new dependencies. No new persist keys. No new Zustand stores.
- [x] Out-of-scope items are explicit so the plan doesn't drift.
- [x] User's explicit additions (mass-measurement parallel + swipe-down) are both in the design.
- [x] Risk section addresses backdrop event propagation, swipe-gesture conflict, breakpoint flip edge cases, and animation timing.
