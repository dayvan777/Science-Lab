# Touch + Responsive Polish — Design

**Date:** 2026-05-16
**Status:** Approved-in-concept (user said "ок" after compact full-design review)
**Scope:** Make the lab usable on smartphones. Three independent CSS-level changes that together turn the labs from "broken on touch" into "fully draggable on iOS/Android/Promethean panels." No new components, no layout rewriting.

## Background

User reported two symptoms on phone:
1. **Object doesn't get grabbed** — finger slides across the screen, the apple / bar magnet stays put. Verified in code: the R3F `<Canvas>` element has no `touch-action: none` style. The browser intercepts the touch gesture for page scroll/zoom before our pointer handler ever sees it.
2. **HUD elements overlap status bar / 3D scene on phone** — verified in code: `<meta name="viewport">` lacks `viewport-fit=cover`, and `top: 8` on the scene-counter pill slides under the iOS notch.

Existing responsive infrastructure (already shipped, NOT touched by this design):
- `useViewport()` gives `desktop | tablet | phone` breakpoints.
- Both `HUD.tsx` files already have per-breakpoint layouts.
- `CollapsibleGlassPanel` already collapses on phone by default, persists state to localStorage.
- SDK `Button` is already 56×56 min touch target with `touch-action: manipulation`.

So this design is **not** a phone-mode redesign. It's three targeted fixes to make the existing phone layout actually work on touch.

## Non-goals

- New mobile-first redesign of any panel.
- Bottom sheets, swipe-to-dismiss, or other custom mobile UX patterns.
- Pinch-to-zoom on the 3D scene (the camera-rig already handles framing per scene).
- Landscape-specific layout — phone landscape (600–900 px) reuses the tablet layout, which already works.
- Promethean-specific layout — at ≥900 px it's a desktop, and touch works as soon as the SDK fix lands.
- Tests — none of these changes have a unit-test surface. Existing 140-test suite stays at 140, used only as a regression gate.

## Architecture

Three independent slices, all in one PR (branch `feat/touch-responsive` from `master`):

| Slice | Purpose | Files |
|---|---|---|
| **A** | SDK-wide touch fix on the R3F Canvas | `src/sdk/scene/canvasStyle.ts` (new), `src/labs/mass-measurement/scene/LabScene.tsx`, `src/labs/electromagnetic-induction/scene/LabScene.tsx` |
| **B** | iOS safe-area insets so top/bottom HUD elements respect the notch | `index.html`, `src/sdk/a11y/safeArea.ts` (new), `src/labs/mass-measurement/ui/HUD.tsx`, `src/labs/electromagnetic-induction/ui/HUD.tsx` |
| **C** | Modest phone-typography bumps | same two HUD files as B |

Slices can be implemented in any order; A is the highest-impact and lands first.

---

## Slice A — SDK Touch Fix

**Problem:** The browser captures touch events for page-level gestures (scroll, pinch-zoom, double-tap-zoom, text selection, long-press context menu) before our `useDrag` pointer handler can claim them. On a desktop with a mouse this isn't an issue — none of those gestures fire.

**Fix:** A single CSS rule (well, four properties) applied to the `<Canvas>` DOM element:

```css
touch-action: none;            /* tells browser: don't scroll/zoom on this element */
user-select: none;             /* no text selection (long-press fallback on Android) */
-webkit-user-select: none;     /* Safari/iOS */
-webkit-touch-callout: none;   /* no iOS context menu */
-webkit-tap-highlight-color: transparent;  /* no blue flash on Android */
```

**Implementation:** create one centralized style object in the SDK so future labs inherit it:

```ts
// src/sdk/scene/canvasStyle.ts
import type { CSSProperties } from 'react'

/**
 * Base style for the R3F <Canvas> DOM element. Centralised here because the
 * touch-related properties are critical: without them, drag input is unreliable
 * on phones (browsers intercept the gesture before the pointer handler fires).
 *
 * Labs may extend this with their own `background` gradient.
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

Then in both lab `LabScene.tsx` files, replace the inline Canvas style with a spread:

```tsx
// Before
style={{
  position: 'fixed',
  inset: 0,
  background: 'radial-gradient(ellipse at center, #2a2a30 0%, #1a1a1e 50%, #0a0a0c 100%)',
}}

// After
style={{ ...CANVAS_BASE_STYLE, background: 'radial-gradient(...)' }}
```

The mass-measurement lab and EM-induction lab have slightly different background gradients — only the background is per-lab, the rest is shared.

**Risk:** `touch-action: none` disables pinch-zoom on the Canvas. Since the Canvas covers the entire viewport (`position: fixed; inset: 0`), this effectively kills pinch-zoom on the page. Acceptable — the page is not a text document; pinch-zooming a 3D scene that already has a camera rig would create a confusing dual-zoom interaction. The `ZoomControls` button gives the student explicit camera zoom.

**Acceptance:**
1. On an iPhone or Android phone in Safari/Chrome, tapping and dragging the bar magnet moves it through the coil's bore. The page itself does NOT scroll or zoom while dragging.
2. Long-pressing an object does NOT show the iOS image-save/context menu.
3. Mouse drag on desktop is unchanged.

---

## Slice B — Safe-Area Insets

**Problem:** Modern phones have non-rectangular display areas (iOS notch, Android cutouts, home indicator bars). The current top-pill at `top: 8` slides under the iOS notch; the bottom controls at `bottom: 16` can sit on top of the home-indicator bar.

**Fix:** Combine three things:

**B.1 — Update viewport meta tag** in `index.html`:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```

Without `viewport-fit=cover`, the `env(safe-area-inset-*)` CSS variables resolve to 0 on iOS, so step B.2 has no effect.

**B.2 — Add a tiny safe-area helper** in the SDK:

```ts
// src/sdk/a11y/safeArea.ts
/**
 * CSS calc() helpers that combine a literal pixel offset with the device's
 * safe-area inset. Use these for elements pinned to the screen's top/bottom
 * edges so they clear the iOS notch / Android cutout.
 *
 * Falls back to 0 on browsers that don't expose env() (older Android Chrome,
 * desktop) — the literal pixel value is preserved as-is.
 */
export const safeAreaTop = (px: number): string =>
  `calc(${px}px + env(safe-area-inset-top, 0px))`

export const safeAreaBottom = (px: number): string =>
  `calc(${px}px + env(safe-area-inset-bottom, 0px))`
```

**B.3 — Apply at four sites** (two per HUD):

In each `HUD.tsx`:

```ts
import { safeAreaTop } from '../../../sdk/a11y/safeArea'

// Phone layout — change:
topPill: { top: 8, padding: '6px 14px', fontSize: 12 }
// to:
topPill: { top: safeAreaTop(8), padding: '6px 14px', fontSize: 12 }
```

Similarly for the journal-panel `top: 56` collapsed pill in the EM-induction HUD, and the equivalent pill in mass-measurement.

For the input bar in mass-measurement (phone: `bottom: 8`), use `safeAreaBottom(8)`. EM-induction has no bottom-anchored HUD element (controls are bottom-right in the LabScene, also gets `safeAreaBottom` treatment).

The tablet/desktop branches are unchanged — `env(safe-area-inset-*)` is 0 on those layouts anyway, but we'd add jitter to a stable design. Keep them untouched.

**Risk:** `env(safe-area-inset-*)` is supported in all current iOS Safari versions and Chromium-based browsers from 2018+. Older Android Chrome (< 69) falls back to `0px` per the helper's second argument. Acceptable.

**Acceptance:**
1. On an iPhone with a notch, the scene-counter pill is visible BELOW the notch in portrait, and to the right of the notch in landscape.
2. On a device without a notch (desktop, older phones), layout is identical to before.

---

## Slice C — Phone Typography

**Problem:** User selected "Текст в панелях/кнопках слишком мелкий/крупний" in the brainstorming questionnaire. Without a specific screenshot, we err on the side of slightly larger body text on phone — the current 12–13 px is at the lower bound of readability for kids on a small portrait phone.

**Fix:** In each `HUD.tsx`, bump phone-only body-text sizes:

| Element | Current | New |
|---|---|---|
| Task-panel body explanation | 13 px | 14 px |
| Journal entry text | 12 px | 13 px |

Top-pill, button labels, and the live-reading large number stay as-is — they're already chosen for legibility at their breakpoints.

**Implementation:** the existing per-breakpoint `layout` object in each HUD already exposes `fontSize`. We just nudge two values inside the `if (breakpoint === 'phone')` branch. Tablet/desktop unchanged.

**Risk:** Phone layout already uses `maxHeight: '40vh'` on the task panel — bumping font size by 1 px will reflow the text but should not trigger overflow beyond `40vh`. If it does, the panel already scrolls.

**Acceptance:**
1. On a phone (< 600 px wide), the task panel's body text reads at 14 px.
2. On a tablet (600–899 px) or desktop, text sizes are unchanged.

---

## File touch-list

| File | Slice | Change |
|---|---|---|
| `src/sdk/scene/canvasStyle.ts` | A | NEW — exports `CANVAS_BASE_STYLE`. |
| `src/labs/mass-measurement/scene/LabScene.tsx` | A | Spread `CANVAS_BASE_STYLE` into the `<Canvas style>`. |
| `src/labs/electromagnetic-induction/scene/LabScene.tsx` | A | Same — spread `CANVAS_BASE_STYLE` into the `<Canvas style>`. Also apply `safeAreaBottom` to the bottom-right controls row. |
| `index.html` | B | Add `viewport-fit=cover` to the existing meta tag. |
| `src/sdk/a11y/safeArea.ts` | B | NEW — exports `safeAreaTop()` and `safeAreaBottom()`. |
| `src/labs/mass-measurement/ui/HUD.tsx` | B + C | Wrap top-pill `top`, journal-collapsed pill `top`, input-bar `bottom` in safe-area helpers. Bump phone body fonts. |
| `src/labs/electromagnetic-induction/ui/HUD.tsx` | B + C | Same. |

7 files touched, 2 new files. Roughly ~120 lines of net diff, mostly the two new helper modules.

## Testing strategy

No new unit tests. The full pre-existing suite (140 tests) must still pass — pure regression gate. `npx tsc --noEmit` and `npm run build` must remain clean.

The real test is a human picking up a phone and dragging objects. That happens after Vercel deploys the branch preview.

## Self-review checklist

- [x] Every fix has a concrete acceptance criterion and a written risk assessment.
- [x] No "TBD" / "TODO" / placeholder text.
- [x] All file changes either touch SDK (helpers) or are lab-local; no half-and-half changes.
- [x] Existing tests are NOT modified; the suite is used only as a regression gate.
- [x] No new dependencies. No new build steps. Pure code changes.
- [x] Persist keys, store names, component names — none touched.
- [x] Internally consistent: Slice B helpers are used inside Slice C's HUD edits in the same files, but the order of operations matters only at commit-time (B's helper file must exist before HUD imports it). Plan will order slices A → B → C accordingly.

## Out of scope

- Compass tool / lab content additions.
- Mobile-first redesign of any HUD panel.
- Bottom-sheet UI patterns.
- Continuous-slider controls for the Phase 3 knobs.
- Layout responsiveness beyond what `useViewport` already does.
- Promethean-specific tuning (it works at ≥900 px touch via the SDK fix).
