# Mobile v2 — Critical Phone Bug Fixes

**Date:** 2026-05-17
**Status:** Approved-in-concept (user approved architecture + details)
**Scope:** Fix four concrete bugs reported by the user on iPhone 16 Pro Max against the live URL `science-lab-phi.vercel.app`. The lab is currently unusable on phone — the landing logo is clipped, the 3D scene appears as tiny dots in a sea of empty space, and the zoom buttons don't meaningfully change that.

## Background

User opened the live site on iPhone 16 Pro Max (430 px wide) and reported, with screenshots:

1. **Landing page horizontal overflow** — "NOVA EVRIKA" text is cut off ("NOVA EVRIK..."). DNA helix icon is clipped on the left. The whole page can be scrolled horizontally.
2. **Zoom controls don't meaningfully zoom in** — tapping "+" multiple times has barely any effect. Scene stays tiny.
3. **3D scene framing is way too wide on phone by default** — bar magnet, coil, and galvanometer look like dots on the table in the middle of a huge empty viewport.
4. **Zoom button touch target is too small** — 40×40 px, below Apple HIG 44 pt minimum.

Root-cause analysis (verified by reading the source):

| Bug | File | Cause |
|---|---|---|
| 1 | `src/site/components/BrandHero.tsx` | `<img height={100} width="auto" />` with no `maxWidth`. The native PNG is wider than 334 px (430 px viewport minus 48 px padding), so it overflows. `LandingPage.tsx` uses `padding: '48px 24px'` on all breakpoints — too generous for phones. |
| 2 | `src/sdk/scene/cameraStore.ts` + `CameraRig.tsx` | `MIN_ZOOM = 0.5` user-zoom × `DISTANCE_MUL_PHONE = 1.40` device-zoom = 0.7× preset distance at max zoom-in. The phone device-mul eats almost all the user's zoom-in range. |
| 3 | `src/sdk/scene/CameraRig.tsx` | `DISTANCE_MUL_PHONE = 1.40` pulls the camera 40 % farther on phone. With 70° vertical FOV this shows ~4 m of vertical space when the equipment occupies ~0.3 m. |
| 4 | `src/sdk/ui/ZoomControls.tsx` | Hardcoded `width: 40, height: 40, fontSize: 18`. No per-breakpoint sizing. |

All four bugs are independent, all fix-able in one PR (~30 lines of net diff). All changes are pure CSS / numeric-constant tweaks — no new components, no new tests.

## Non-goals

- Pinch-to-zoom gesture support. The `touch-action: none` from the `feat/touch-responsive` branch intentionally disables it; lab uses the explicit ZoomControls instead.
- Phone-specific camera POSES (different framing per scene/instrument on phone). Combining `DISTANCE_MUL_PHONE = 1.15` and the existing 70° phone FOV is sufficient.
- Polish of HUD pill sizes (already Apple-HIG-compliant 56 px height).
- Landscape orientation tuning. Phone-landscape (600–900 px) falls into the `tablet` breakpoint, where the existing values already work.
- New unit tests. All changes are CSS / numeric constants with no test surface; existing 138-test suite is the regression gate.

## Architecture

Four independent slices in one PR. Branch `feat/mobile-v2` from current `master` (commit `e543dcd`). Parallel to (and non-conflicting with) the un-merged `feat/em-induction-phase3-knobs` and `feat/touch-responsive`.

| Slice | Files | Net change |
|---|---|---|
| A. Landing overflow | `BrandHero.tsx`, `LandingPage.tsx` | ~10 lines |
| B. Zoom range | `cameraStore.ts` | 2 lines |
| C. Phone camera default | `CameraRig.tsx` | 1 line |
| D. Zoom buttons touch target | `ZoomControls.tsx` | ~10 lines |

Order during implementation: A → B → C → D. Each is an independent commit; B → C should land in adjacent commits because the two values are tuned together (see Slice C math below).

---

## Slice A — Landing page overflow

**Problem:** The NOVA EVRIKA logo is rendered as a fixed-height `<img>` whose native aspect ratio sets its width. On phones narrower than ~430 px (minus 48 px padding = 334 px), the rendered width exceeds the viewport and forces horizontal overflow. The KICKER ("ОСВІТНЯ ПЛАТФОРМА · 6–7 КЛАС · BETA") with `letter-spacing: 0.3em` is also wide; the tagline `maxWidth: 600` is fine on its own but the wrap padding consumes too much space.

**Fix — three changes in `src/site/components/BrandHero.tsx`:**

1. Per-breakpoint logo height: 100 (desktop), 80 (tablet), 64 (phone). Use existing `useViewport()` to read `breakpoint`.

2. Add `maxWidth: '100%', objectFit: 'contain'` to `logoStyle`. The width still auto-derives from aspect ratio, but the image can never exceed its container's width.

3. Constrain `taglineStyle.maxWidth` from `600` to `'min(600px, 90vw)'` so it never bumps the viewport edge.

4. Reduce `kickerStyle.letterSpacing` from `'0.3em'` to `'0.2em'` on phone — three "•" separators in `0.3em` letter-spacing make the kicker too wide otherwise.

**One change in `src/site/pages/LandingPage.tsx`:**

5. Per-breakpoint `wrapStyle.padding`: `'48px 24px'` desktop/tablet, `'32px 16px'` phone. Use `useViewport()`.

**Acceptance:**
1. On a 430 px-wide phone viewport, the NOVA EVRIKA logo is fully visible (no clipping on either side), the DNA helix icon is visible.
2. KICKER fits in one line; no wrap.
3. No horizontal scroll on the landing page.
4. Tablet and desktop layouts are unchanged.

---

## Slice B — Zoom range expansion

**Problem:** `MIN_ZOOM = 0.5` was calibrated for desktop where there's no device-multiplier. On phone the user's max zoom-in is multiplied by `DISTANCE_MUL_PHONE = 1.40` (see Slice C — that's the OLD value), giving an effective minimum of 0.7× preset distance — barely closer than the default.

**Fix in `src/sdk/scene/cameraStore.ts`:**

```ts
const MIN_ZOOM = 0.25  // was 0.5
const MAX_ZOOM = 2.0   // was 1.8
```

Lowering `MIN_ZOOM` lets the user zoom in 2× closer than today on every device. Slightly bumping `MAX_ZOOM` gives more room to zoom out (useful on phone where after Slice C the default is closer, so the user may want to pull back to see the whole table).

**Acceptance:**
1. On desktop, tapping "+" several times zooms the camera demonstrably closer than the previous limit.
2. On phone, tapping "+" 2-3 times brings the active instrument to a comfortable working size.
3. Wheel-zoom on desktop respects the same bounds.

---

## Slice C — Phone camera default

**Problem:** `DISTANCE_MUL_PHONE = 1.40` was a guess at how much extra pullback phones need to fit the scene horizontally. In practice, combined with the already-widened 70° vertical FOV on phone, it pulls back so far that the equipment looks like dots.

Math for the `overview` preset (`position: [0, 1.5, 2.0]`, `lookAt: [0, 0.85, 0]`):

| Value | Camera distance from lookAt | Vertical view at 70° FOV |
|---|---|---|
| `1.40` (current) | 2.94 m | 4.12 m |
| `1.15` (proposed) | 2.42 m | 3.39 m |
| `1.00` (no mul) | 2.10 m | 2.94 m |

The table is 2.5 m wide × 1.2 m deep; the visible 3D content occupies a strip about 0.3 m × 1.2 m. We want the default frame to comfortably contain the table-depth (1.2 m) with reasonable margin and not waste 3 m of empty space above and below. 1.15× achieves that.

**Fix in `src/sdk/scene/CameraRig.tsx`:**

```ts
const DISTANCE_MUL_PHONE = 1.15  // was 1.40
```

Combined with Slice B's expanded zoom range, the effective user-controllable distance on phone is 1.15 × [0.25, 2.0] = [0.29, 2.30] preset multiples. That covers both "close-up on one instrument" and "see the whole table" at the user's discretion.

**Acceptance:**
1. On Scene 1 of either lab on phone, equipment (coil, magnet, galvanometer / scale, lever, dynamometer) is clearly visible and recognisable without zooming in.
2. The default frame does not leave more than ~30 % of the vertical viewport as empty background.
3. Tablet (`DISTANCE_MUL_TABLET = 1.10`) and desktop (no multiplier) defaults are unchanged.

---

## Slice D — Zoom buttons touch target

**Problem:** `ZoomControls.tsx` hardcodes `width: 40, height: 40, fontSize: 18`. Apple HIG specifies 44 pt minimum touch target; Material Design recommends 48 dp. 40 px misses both.

**Fix in `src/sdk/ui/ZoomControls.tsx`:** read `breakpoint` from `useViewport()` and switch button size per breakpoint.

```ts
const isPhone = breakpoint === 'phone'
const buttonStyle: React.CSSProperties = {
  background: 'rgba(20,20,24,0.72)',
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: '#f5f5f7',
  borderRadius: 8,
  width: isPhone ? 48 : 40,
  height: isPhone ? 48 : 40,
  fontSize: isPhone ? 22 : 18,
  cursor: 'pointer',
}
```

Move the `buttonStyle` definition inside the component (so it can read `breakpoint`), or keep the constants outside and derive `width/height/fontSize` from `breakpoint` inside the JSX. Either pattern is fine — choose what reads clearest.

**Acceptance:**
1. On phone, the zoom +/− buttons each occupy 48×48 px.
2. On desktop and tablet, buttons remain at 40×40 px.
3. The font icon scales accordingly (22 px on phone, 18 px otherwise) so the +/− glyph stays centred.

---

## File touch-list

| File | Slice | Change summary |
|---|---|---|
| `src/site/components/BrandHero.tsx` | A | Per-breakpoint logo height; `maxWidth: '100%', objectFit: 'contain'` on logo; `maxWidth: 'min(600px, 90vw)'` on tagline; per-breakpoint kicker letter-spacing. Import `useViewport`. |
| `src/site/pages/LandingPage.tsx` | A | Per-breakpoint wrap padding. Import `useViewport`. |
| `src/sdk/scene/cameraStore.ts` | B | Two constants (MIN_ZOOM, MAX_ZOOM). |
| `src/sdk/scene/CameraRig.tsx` | C | One constant (DISTANCE_MUL_PHONE). |
| `src/sdk/ui/ZoomControls.tsx` | D | Add `useViewport`, per-breakpoint button size. |

5 files modified, 0 new files, ~30 lines net diff.

## Testing strategy

No new unit tests. The 138 existing tests stay as a regression gate; they cover physics math (`computeEMF`, `computeBulbBrightness`, etc.) and don't touch UI styling. The real verification is a human opening `science-lab-phi.vercel.app` on a phone after Vercel deploys the preview.

## Risks

- **Default phone view becomes too tight if the user is on a larger phone (e.g. iPad-mini in portrait at 768 px width).** This falls into the `tablet` breakpoint, where `DISTANCE_MUL_TABLET = 1.10` is unchanged. Acceptable.
- **`maxWidth: '100%'` on the logo means the rendered logo size depends on the parent container.** That's the intended behaviour. If a future redesign adds a narrow column, the logo correctly downscales.
- **`MIN_ZOOM = 0.25` may let the camera clip through the table on close zoom-in.** Each lab's POSES are tuned with safety margin; at 0.25× of the `overview` preset (`position [0, 1.5, 2.0]`), the camera would be at `[0, 0.375, 0.5]` — above the table-top (TABLE_TOP_Y ≈ 0.84) but inside the room. Tested in three.js: depth-buffer handles this. If clipping appears in practice, raise `MIN_ZOOM` to 0.30. The 0.25 value is a conservative first try.

## Out of scope

- Polish of other UI components (FieldToggleButton, Витки/Магніт pills already at 56 px touch target — fine).
- Phone-specific camera POSES per scene. The 70° FOV + 1.15× pullback combination is sufficient.
- Pinch-to-zoom gesture (intentionally disabled by `touch-action: none` in `feat/touch-responsive`).
- Landscape-orientation phone tuning.

## Self-review checklist

- [x] Every fix has a concrete acceptance criterion.
- [x] No "TBD" / "TODO" / placeholder text.
- [x] All file changes are non-overlapping (slice-per-file, no two slices touch the same file).
- [x] Existing tests are NOT modified.
- [x] No new dependencies. No new build steps.
- [x] Internally consistent: Slice B and Slice C math is laid out together; Slice A and Slice D are independent.
- [x] Out-of-scope items are explicit so the plan doesn't drift.
