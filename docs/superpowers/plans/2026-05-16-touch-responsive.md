# Touch + Responsive Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make both labs (mass-measurement, EM induction) usable on smartphones by fixing three pure-CSS issues: the R3F Canvas missing `touch-action: none` (palец-скользит bug), iOS safe-area not respected (notch overlap), and phone body-text slightly too small.

**Architecture:** Three independent slices. **A**: a single SDK helper `CANVAS_BASE_STYLE` applied to both labs' `<Canvas>` elements. **B**: a `viewport-fit=cover` meta + two safe-area `calc()` helpers, applied at the small number of bottom/top-anchored HUD elements. **C**: a one-pixel bump on phone-only body text.

**Tech Stack:** React 19, TypeScript, Vite. No new dependencies. Pure CSS-level changes — no new components, no tests added (the existing 140-test suite is the regression gate).

**Spec:** `docs/superpowers/specs/2026-05-16-touch-responsive-design.md` (commit `a4d5e9e`).

**Branch:** `feat/touch-responsive` (from `master` at commit `a4d5e9e`).

---

## File Structure

All changes are SDK-shared helpers or lab-local UI. No physics, no state, no tests modified.

| File | Change |
|---|---|
| `src/sdk/scene/canvasStyle.ts` | **NEW** — exports `CANVAS_BASE_STYLE` with `position: fixed`, `inset: 0`, `touchAction: 'none'`, `userSelect: 'none'`, vendor-prefixed equivalents. |
| `src/sdk/a11y/safeArea.ts` | **NEW** — exports `safeAreaTop(px)` and `safeAreaBottom(px)` returning `calc()` strings with `env(safe-area-inset-*)`. |
| `index.html` | **MODIFY** — add `viewport-fit=cover` to viewport meta. |
| `src/labs/mass-measurement/scene/LabScene.tsx` | **MODIFY** — Canvas style spreads `CANVAS_BASE_STYLE`; bottom-controls non-phone branch uses `safeAreaBottom(16)`. |
| `src/labs/electromagnetic-induction/scene/LabScene.tsx` | **MODIFY** — same two changes as mass-measurement LabScene. |
| `src/labs/mass-measurement/ui/HUD.tsx` | **MODIFY** — phone-branch: top-pill, journal collapsed pill, input-bar use safe-area helpers. Phone body fonts bumped (hint 13→14, journal entry 12→13). |
| `src/labs/electromagnetic-induction/ui/HUD.tsx` | **MODIFY** — phone-branch: top-pill, journal collapsed pill use safe-area helpers. Phone body font bumped (explanation 13→14). |

Total: 7 files touched, 2 new helpers, ~50–80 lines of net diff.

---

## Pre-flight

- [ ] **Step 0a: Confirm clean tree on master**

Run: `git status`
Expected: `nothing to commit, working tree clean`. HEAD should be at `a4d5e9e` on `master`.

- [ ] **Step 0b: Create feature branch**

Run: `git checkout -b feat/touch-responsive`
Expected: `Switched to a new branch 'feat/touch-responsive'`.

- [ ] **Step 0c: Baseline test run**

Run: `npm test -- --run`
Expected: `Tests 140 passed (140)`. Snapshot this before any changes.

---

## Task 1: SDK Canvas touch-action helper

**Files:**
- Create: `src/sdk/scene/canvasStyle.ts`
- Modify: `src/labs/mass-measurement/scene/LabScene.tsx` (line ~107, Canvas `style`)
- Modify: `src/labs/electromagnetic-induction/scene/LabScene.tsx` (lines ~208–212, Canvas `style`)

This is the **highest-impact fix** — it makes objects draggable with a finger on iOS/Android/Promethean. Currently `touch-action` defaults to `auto`, so the browser intercepts touch gestures for page scroll/zoom before pointer events fire.

- [ ] **Step 1.1: Create the helper file**

Create `src/sdk/scene/canvasStyle.ts` with this exact content:

```ts
import type { CSSProperties } from 'react'

/**
 * Base style for the R3F <Canvas> DOM element. Centralised here because the
 * touch-related properties are critical: without them, drag input is unreliable
 * on phones (browsers intercept the gesture for page scroll/zoom before the
 * pointer handler fires).
 *
 * Labs spread this and add their own `background` gradient on top.
 */
export const CANVAS_BASE_STYLE: CSSProperties = {
  position: 'fixed',
  inset: 0,
  touchAction: 'none',
  userSelect: 'none',
  WebkitUserSelect: 'none',
  WebkitTouchCallout: 'none',
  WebkitTapHighlightColor: 'transparent',
}
```

- [ ] **Step 1.2: Update mass-measurement LabScene Canvas style**

In `src/labs/mass-measurement/scene/LabScene.tsx`, add the import alongside the other SDK imports (near line 6–10):

```ts
import { CANVAS_BASE_STYLE } from '../../../sdk/scene/canvasStyle'
```

Then replace line 107:

```tsx
style={{ position: 'fixed', inset: 0, background: 'radial-gradient(ellipse at center, #2a2a30 0%, #1a1a1e 50%, #0a0a0c 100%)' }}
```

with:

```tsx
style={{ ...CANVAS_BASE_STYLE, background: 'radial-gradient(ellipse at center, #2a2a30 0%, #1a1a1e 50%, #0a0a0c 100%)' }}
```

- [ ] **Step 1.3: Update EM-induction LabScene Canvas style**

In `src/labs/electromagnetic-induction/scene/LabScene.tsx`, add the import alongside the other SDK imports (near line 6–10):

```ts
import { CANVAS_BASE_STYLE } from '../../../sdk/scene/canvasStyle'
```

Then replace the multi-line block at lines ~208–212:

```tsx
style={{
  position: 'fixed',
  inset: 0,
  background: 'radial-gradient(ellipse at center, #2a2a30 0%, #1a1a1e 50%, #0a0a0c 100%)',
}}
```

with:

```tsx
style={{ ...CANVAS_BASE_STYLE, background: 'radial-gradient(ellipse at center, #2a2a30 0%, #1a1a1e 50%, #0a0a0c 100%)' }}
```

- [ ] **Step 1.4: Type-check + test + build**

Run: `npx tsc --noEmit`
Expected: 0 errors.

Run: `npm test -- --run`
Expected: 140 tests passing.

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 1.5: Commit**

```bash
git add -A
git commit -m "feat(sdk): touch-action:none on R3F Canvas (touch-drag fix)"
```

---

## Task 2: Safe-area infrastructure

**Files:**
- Modify: `index.html` (line 7, the viewport meta)
- Create: `src/sdk/a11y/safeArea.ts`

No functional change yet — this task lays the foundation. Without `viewport-fit=cover` the `env(safe-area-inset-*)` CSS variables resolve to `0` on iOS, so the helpers would be no-ops. Both pieces must land before Tasks 3 and 4 use them.

- [ ] **Step 2.1: Update viewport meta tag**

In `index.html`, line 7 currently reads:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
```

Replace with:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```

- [ ] **Step 2.2: Create the safe-area helper file**

Create `src/sdk/a11y/safeArea.ts` with this exact content:

```ts
/**
 * CSS calc() helpers that combine a literal pixel offset with the device's
 * safe-area inset. Use these for elements pinned to the screen's top or
 * bottom edges so they clear the iOS notch / Android cutout / home indicator.
 *
 * The fallback inside env(..., 0px) preserves the literal offset on browsers
 * that don't expose env() (older Android Chrome, desktop) — those layouts
 * look identical to before.
 *
 * Requires `viewport-fit=cover` on the viewport meta tag, otherwise iOS
 * Safari resolves env() to 0 and the helpers are no-ops on iOS too.
 */
export const safeAreaTop = (px: number): string =>
  `calc(${px}px + env(safe-area-inset-top, 0px))`

export const safeAreaBottom = (px: number): string =>
  `calc(${px}px + env(safe-area-inset-bottom, 0px))`
```

- [ ] **Step 2.3: Type-check + test + build**

Run: `npx tsc --noEmit`
Expected: 0 errors.

Run: `npm test -- --run`
Expected: 140 tests passing.

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 2.4: Commit**

```bash
git add -A
git commit -m "feat(sdk): safe-area helpers + viewport-fit=cover (iOS notch infra)"
```

---

## Task 3: Apply safe-area to HUDs (phone branch)

**Files:**
- Modify: `src/labs/mass-measurement/ui/HUD.tsx` (3 sites in phone-branch layout)
- Modify: `src/labs/electromagnetic-induction/ui/HUD.tsx` (2 sites in phone-branch layout)

All edits happen inside the `if (breakpoint === 'phone')` branch of the existing `layout` object. The tablet and desktop branches are not modified — they'd benefit slightly on phone-landscape (where `tablet` breakpoint matches), but the spec scopes this change to phone-portrait only.

- [ ] **Step 3.1: Update mass-measurement HUD imports**

In `src/labs/mass-measurement/ui/HUD.tsx`, add an import next to the existing `useViewport` import (around line 10):

```ts
import { safeAreaTop, safeAreaBottom } from '../../../sdk/a11y/safeArea'
```

- [ ] **Step 3.2: Apply safe-area in mass-measurement HUD phone layout**

In the same file, find the `if (breakpoint === 'phone')` block (around lines 92–108). Replace the three positional values:

Before:

```ts
return {
  topPill: { top: 8, padding: '6px 14px', fontSize: 12 } as const,
  taskPanel: {
    left: 8, right: 8, bottom: 96, top: undefined,
    width: 'auto', maxHeight: '40vh', padding: 14,
  } as const,
  journalPanel: {
    left: 8, right: 8, bottom: undefined, top: 56,
    width: 'auto', maxHeight: 120, padding: 10, fontSize: 12,
  } as const,
  inputBar: { left: 8, right: 8, bottom: 8, padding: '10px 14px' } as const,
}
```

After:

```ts
return {
  topPill: { top: safeAreaTop(8), padding: '6px 14px', fontSize: 12 } as const,
  taskPanel: {
    left: 8, right: 8, bottom: 96, top: undefined,
    width: 'auto', maxHeight: '40vh', padding: 14,
  } as const,
  journalPanel: {
    left: 8, right: 8, bottom: undefined, top: safeAreaTop(56),
    width: 'auto', maxHeight: 120, padding: 10, fontSize: 12,
  } as const,
  inputBar: { left: 8, right: 8, bottom: safeAreaBottom(8), padding: '10px 14px' } as const,
}
```

Three values changed: `topPill.top`, `journalPanel.top`, `inputBar.bottom`.

The TypeScript `as const` assertion on each object means the property types narrow to their string literal — `safeAreaTop(8)` returns a generic `string`, so we keep `as const` and TypeScript will widen the literal types where needed. This should compile cleanly because the values are still consumed via `...layout.topPill` spread into a CSS-properties style object.

If `npx tsc --noEmit` complains about the `as const` narrowing (e.g. `Type 'string' is not assignable to type '8'`), simply remove the `as const` on those three object literals — they're not load-bearing for type-safety in this file.

- [ ] **Step 3.3: Update collapsed-pill `top` for the journal panel**

Still in `src/labs/mass-measurement/ui/HUD.tsx`, find the journal panel's `collapsedStyle` ternary (around lines 218–222):

Before:

```tsx
collapsedStyle={
  breakpoint === 'phone'
    ? { top: 56, right: 8 }
    : { top: layout.journalPanel.top ?? 64, right: 8 }
}
```

After:

```tsx
collapsedStyle={
  breakpoint === 'phone'
    ? { top: safeAreaTop(56), right: 8 }
    : { top: layout.journalPanel.top ?? 64, right: 8 }
}
```

Note: there is a parallel collapsed-style for the task panel (around lines 160–164) — that one uses `bottom: 96` on phone, which is already well above the home indicator. Leave it as-is.

- [ ] **Step 3.4: Update EM-induction HUD imports**

In `src/labs/electromagnetic-induction/ui/HUD.tsx`, add an import next to the existing `useViewport` import (around line 6):

```ts
import { safeAreaTop } from '../../../sdk/a11y/safeArea'
```

- [ ] **Step 3.5: Apply safe-area in EM-induction HUD phone layout**

In the same file, find the `if (breakpoint === 'phone')` block (around lines 43–49). Replace two positional values:

Before:

```ts
return {
  topPill: { top: 8, padding: '6px 14px', fontSize: 12 } as const,
  taskPanel: { left: 8, right: 8, bottom: 96, top: undefined, width: 'auto', maxHeight: '40vh', padding: 14 } as const,
  journalPanel: { left: 8, right: 8, bottom: undefined, top: 56, width: 'auto', maxHeight: 120, padding: 10, fontSize: 12 } as const,
}
```

After:

```ts
return {
  topPill: { top: safeAreaTop(8), padding: '6px 14px', fontSize: 12 } as const,
  taskPanel: { left: 8, right: 8, bottom: 96, top: undefined, width: 'auto', maxHeight: '40vh', padding: 14 } as const,
  journalPanel: { left: 8, right: 8, bottom: undefined, top: safeAreaTop(56), width: 'auto', maxHeight: 120, padding: 10, fontSize: 12 } as const,
}
```

Two values changed: `topPill.top`, `journalPanel.top`. The same TypeScript `as const` note from Step 3.2 applies — drop `as const` if narrowing complains.

- [ ] **Step 3.6: Update collapsed-pill `top` for the EM-induction journal**

Still in `src/labs/electromagnetic-induction/ui/HUD.tsx`, find the journal panel's `collapsedStyle` ternary (around lines 135–138):

Before:

```tsx
collapsedStyle={
  breakpoint === 'phone' ? { top: 56, right: 8 } : { top: layout.journalPanel.top ?? 64, right: 8 }
}
```

After:

```tsx
collapsedStyle={
  breakpoint === 'phone' ? { top: safeAreaTop(56), right: 8 } : { top: layout.journalPanel.top ?? 64, right: 8 }
}
```

- [ ] **Step 3.7: Type-check + test + build**

Run: `npx tsc --noEmit`
Expected: 0 errors. If errors about `as const` narrowing appear, drop `as const` on the affected object literals.

Run: `npm test -- --run`
Expected: 140 tests passing.

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3.8: Commit**

```bash
git add -A
git commit -m "feat(em-induction,mass-measurement): safe-area insets on HUD edges"
```

---

## Task 4: Apply safe-area to LabScene bottom controls

**Files:**
- Modify: `src/labs/mass-measurement/scene/LabScene.tsx`
- Modify: `src/labs/electromagnetic-induction/scene/LabScene.tsx`

Both labs render a bottom-right utility-controls row. On phone-portrait it sits at `top: 110, right: 8` (column layout — no bottom edge concern). On all other breakpoints it sits at `bottom: 16, right: 16` — which collides with the iOS home indicator when the device is held in landscape (tablet breakpoint). Wrap the `bottom: 16` value in `safeAreaBottom(16)` so the controls clear the home indicator on phone-landscape while remaining visually identical on desktop.

- [ ] **Step 4.1: Update mass-measurement LabScene bottom-controls**

In `src/labs/mass-measurement/scene/LabScene.tsx`, add an import:

```ts
import { safeAreaBottom } from '../../../sdk/a11y/safeArea'
```

Then find the bottom-controls inline-style ternary (around lines 148–168):

Before:

```tsx
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
        bottom: 16,
        right: 16,
        display: 'flex',
        gap: 8,
        zIndex: 10,
      }
}
```

Change the non-phone branch's `bottom: 16` to `bottom: safeAreaBottom(16)`:

```tsx
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
```

- [ ] **Step 4.2: Update EM-induction LabScene bottom-controls**

In `src/labs/electromagnetic-induction/scene/LabScene.tsx`, add an import:

```ts
import { safeAreaBottom } from '../../../sdk/a11y/safeArea'
```

Then find the bottom-controls inline-style ternary (around lines 250–256). The shape is identical to mass-measurement's:

Before:

```tsx
style={
  isPhone
    ? { position: 'fixed', top: 110, right: 8, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 10 }
    : { position: 'fixed', bottom: 16, right: 16, display: 'flex', gap: 8, zIndex: 10 }
}
```

After:

```tsx
style={
  isPhone
    ? { position: 'fixed', top: 110, right: 8, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 10 }
    : { position: 'fixed', bottom: safeAreaBottom(16), right: 16, display: 'flex', gap: 8, zIndex: 10 }
}
```

- [ ] **Step 4.3: Type-check + test + build**

Run: `npx tsc --noEmit`
Expected: 0 errors.

Run: `npm test -- --run`
Expected: 140 tests passing.

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4.4: Commit**

```bash
git add -A
git commit -m "feat(em-induction,mass-measurement): safe-area on LabScene bottom controls"
```

---

## Task 5: Phone typography bump

**Files:**
- Modify: `src/labs/mass-measurement/ui/HUD.tsx` (2 sites)
- Modify: `src/labs/electromagnetic-induction/ui/HUD.tsx` (1 site)

Modest one-pixel bumps to make body text easier to read on a small portrait phone. We use a `breakpoint === 'phone'` ternary inline on each affected element so tablet and desktop sizes stay exactly as today.

- [ ] **Step 5.1: Bump mass-measurement HUD hint explanation font**

In `src/labs/mass-measurement/ui/HUD.tsx`, find the hint-explanation block (around line 173–178):

Before:

```tsx
<div style={{
  fontSize: 13, color: '#6e6e73', lineHeight: 1.5,
  padding: '12px 0', borderTop: '1px solid rgba(0,0,0,0.08)', borderBottom: '1px solid rgba(0,0,0,0.08)',
}}>
  💡 {current.hint}
</div>
```

After:

```tsx
<div style={{
  fontSize: breakpoint === 'phone' ? 14 : 13, color: '#6e6e73', lineHeight: 1.5,
  padding: '12px 0', borderTop: '1px solid rgba(0,0,0,0.08)', borderBottom: '1px solid rgba(0,0,0,0.08)',
}}>
  💡 {current.hint}
</div>
```

Then find the inner currentStep hint-explanation (around lines 184–188):

Before:

```tsx
{currentStep.hintExplanation && (
  <div style={{ fontSize: 13, color: '#6e6e73', lineHeight: 1.5 }}>
    {currentStep.hintExplanation}
  </div>
)}
```

After:

```tsx
{currentStep.hintExplanation && (
  <div style={{ fontSize: breakpoint === 'phone' ? 14 : 13, color: '#6e6e73', lineHeight: 1.5 }}>
    {currentStep.hintExplanation}
  </div>
)}
```

- [ ] **Step 5.2: Bump mass-measurement HUD journal entry font**

In the same file, find the journal-entry row (around lines 268–284). It currently has `fontSize: 12` inline. Replace with conditional:

Before:

```tsx
<div key={t.id} style={{
  display: 'flex', justifyContent: 'space-between',
  padding: '4px 0 4px 6px',
  fontSize: 12,
  opacity: isDone || isCurrent ? 1 : 0.6,
}}>
```

After:

```tsx
<div key={t.id} style={{
  display: 'flex', justifyContent: 'space-between',
  padding: '4px 0 4px 6px',
  fontSize: breakpoint === 'phone' ? 13 : 12,
  opacity: isDone || isCurrent ? 1 : 0.6,
}}>
```

- [ ] **Step 5.3: Bump EM-induction HUD explanation font**

In `src/labs/electromagnetic-induction/ui/HUD.tsx`, find the explanation block (around lines 99–103):

Before:

```tsx
{step?.hintExplanation && (
  <div style={{ fontSize: 13, color: '#6e6e73', lineHeight: 1.5, marginBottom: 14 }}>
    {step.hintExplanation}
  </div>
)}
```

After:

```tsx
{step?.hintExplanation && (
  <div style={{ fontSize: breakpoint === 'phone' ? 14 : 13, color: '#6e6e73', lineHeight: 1.5, marginBottom: 14 }}>
    {step.hintExplanation}
  </div>
)}
```

The `breakpoint` value is already destructured from `useViewport()` at the top of this component (around line 20) — no new imports needed.

- [ ] **Step 5.4: Type-check + test + build**

Run: `npx tsc --noEmit`
Expected: 0 errors.

Run: `npm test -- --run`
Expected: 140 tests passing.

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 5.5: Commit**

```bash
git add -A
git commit -m "feat(em-induction,mass-measurement): phone body-text +1px for readability"
```

---

## Task 6: Final verification + push

**Files:** None modified. Verification only.

- [ ] **Step 6.1: Full clean run**

Run: `npx tsc --noEmit`
Expected: 0 errors.

Run: `npm run build`
Expected: build succeeds, only the pre-existing chunk-size warning (no new warnings).

Run: `npm test -- --run`
Expected: 140 tests passing, 0 failures, 0 skipped.

- [ ] **Step 6.2: Sanity-check the diff**

Run: `git log --oneline master..HEAD`
Expected to show 5 commits in this order:
1. `feat(sdk): touch-action:none on R3F Canvas (touch-drag fix)`
2. `feat(sdk): safe-area helpers + viewport-fit=cover (iOS notch infra)`
3. `feat(em-induction,mass-measurement): safe-area insets on HUD edges`
4. `feat(em-induction,mass-measurement): safe-area on LabScene bottom controls`
5. `feat(em-induction,mass-measurement): phone body-text +1px for readability`

Run: `git diff master..HEAD --stat`
Expected: 7 files changed, ~50–80 lines net added.

- [ ] **Step 6.3: Push the branch**

Run: `git push -u origin feat/touch-responsive`
Expected: branch pushed to remote.

Stop here. Do NOT open a PR. User will smoke-test the Vercel preview on a real phone first.

- [ ] **Step 6.4: Manual smoke-test (user action, after deploy)**

On an iPhone or Android phone, open the Vercel preview URL for `feat/touch-responsive`:

1. EM induction lab → drag the bar magnet through the coil. Object must follow the finger, page must NOT scroll or zoom.
2. Mass-measurement lab → drag a ball onto the scale. Same behaviour.
3. On a notched device (iPhone X+, Pixel 6+), confirm the top scene-counter pill is fully visible below the notch.
4. Rotate the phone to landscape — the bottom-right controls row clears the home indicator.
5. Read the task panel body text on phone — comfortable reading size, no truncation.

---

## Self-Review Notes

**Spec coverage check:**
- ✅ Slice A — Tasks 1.1–1.5 implement the SDK touch fix.
- ✅ Slice B.1 — Task 2.1 (viewport-fit).
- ✅ Slice B.2 — Task 2.2 (safe-area helpers).
- ✅ Slice B.3 — Task 3 (HUD edges, 5 sites total) + Task 4 (LabScene bottom controls, 2 sites). The plan also includes mass-measurement LabScene controls (not explicitly in the spec) for symmetry with EM-induction; this is a minor scope expansion noted explicitly here.
- ✅ Slice C — Task 5 (phone typography). Two sites in mass-measurement HUD (hint + journal), one site in EM-induction HUD (explanation). EM-induction journal entries are already at 13px and left as-is; the spec's 12→13 mapping does not match that file.

**Placeholder scan:** No TBDs, no "TODO", no "fill in later". Every step shows full code or full commands.

**Type consistency:** `safeAreaTop` and `safeAreaBottom` are defined in Task 2.2 with signature `(px: number) => string`. Tasks 3 and 4 pass integer arguments (8, 16, 56) — consistent.

**TypeScript `as const`:** Tasks 3.2 and 3.5 may need to drop `as const` if the literal type for `top`/`bottom` no longer narrows. Step text already calls this out.

**No new tests:** All changes are CSS-level with no testable surface. The 140-test suite is the regression gate.

**Phase 3 branch unaffected:** This work is on `feat/touch-responsive` from `master`, parallel to the un-merged `feat/em-induction-phase3-knobs`. Both can be merged independently.
