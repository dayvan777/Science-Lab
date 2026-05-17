# EM Induction Polish v3 — Field Lines + Magnet Length + Bulb Inertia — Design

**Date:** 2026-05-17
**Status:** Approved-in-concept (user said "да" after Approach proposal — split into Polish v3 now + Focus Navigation as separate PR2)
**Scope:** Three independent visual/behaviour polish items on the EM induction lab, bundled into one PR (PR1). A fourth item — per-object camera focus navigation — is split into a separate PR2 since it's a new feature, not polish.

## Background

User opened the live lab on iPhone, compared to a reference image of classic dipole field lines (elliptical arcs from N pole around to S pole with directional arrowheads on each line), and gave three polish requests plus a navigation request:

1. **Field lines should look elliptical** with **directional arrow markers** along each line — visually match the standard physics-textbook dipole-field illustration.
2. **Bar magnet should be 2× longer** (18 cm instead of 9 cm).
3. **Bulb should be dimmer** and should have **thermal inertia** — when the user stops moving the magnet, the bulb fades out smoothly rather than going dark instantly.
4. *(Separate PR2)* User wants to zoom in on any specific instrument, not just the table centre.

This spec covers items 1–3 only. Item 4 is mentioned in "Out of scope" below.

## Non-goals

- No new tests — all three slices are visual or numeric-constant changes. 220-test suite stays as regression gate.
- No new feature in the focus-navigation area. That's PR2.
- No bulb flicker (user explicitly chose "Симулируем реальную лампу — только инерция"). 60 Hz AC analogy from the user's request is interpreted as "the inertia smooths out current fluctuations the way a real filament does" — no visible flicker is implemented.
- No change to the EMF formula. `computeEMF` and `computeBulbBrightness` are unchanged; only the brightness consumer (`Bulb.tsx`) gets a low-pass filter.
- No physics shape change for the magnet. Same cuboid collider — just longer along its drag/long axis.

## Architecture

Three independent slices in one PR. Branch `feat/em-induction-polish-v3` from `master` at commit `a8a7995`.

| Slice | File(s) | Net diff |
|---|---|---|
| A. Elliptical field lines + arrow markers | `src/labs/electromagnetic-induction/instruments/FieldLines.tsx` | ~30 lines |
| B. Bar magnet 2× longer | `src/labs/electromagnetic-induction/objects/BarMagnet.tsx` | 1 line (constant) |
| C. Bulb inertia + dimmer | `src/labs/electromagnetic-induction/instruments/Bulb.tsx` | ~10 lines |

3 files, ~40 lines net diff. No new files, no new exports, no API surface changes.

---

## Slice A — Elliptical field lines + arrow markers

### Problem

Current `FieldLines.tsx` builds 8 CatmullRom curves with 5 control points (N tip → arc up → mid → arc down → S tip). At `yMax = extent * 0.6` the curves look like teardrops — narrow at the poles, slightly arched in the middle. The reference image shows fuller elliptical arcs with more vertical extent relative to magnet length. Additionally, no directional indicators show flow N → S externally.

### Fix

Two changes in `FieldLines.tsx`:

**A.1 — More elliptical curves.** Increase the curve's vertical extent. Change `const yMax = extent * 0.6` to `const yMax = extent * 0.85` so the arcs are taller relative to the magnet's length. The CatmullRom curve through the same 5 points becomes more elliptical.

**A.2 — Directional arrows.** Add 3 small cone meshes per line at parameter values `t ∈ {0.2, 0.5, 0.8}`. Each cone is oriented along the curve's tangent at that point so the cone's apex points in the curve's traversal direction (N tip → S tip, i.e. externally N → S, matching the physics convention).

Cone dimensions: `radius = TUBE_RADIUS * 1.6` (≈ 2.4 mm), `height = TUBE_RADIUS * 4` (≈ 6 mm). Cone material reuses the existing `MeshBasicMaterial` (same amber colour, same transparent + tone-mapped flags, same fade-in/fade-out from `visible`/`opacityScale`).

Geometry budget: 8 lines × 3 arrows = 24 cones. Each cone is `coneGeometry` with the default 32 radial segments — but Three's `coneGeometry(radius, height, segments)` defaults to 8 segments. For tiny 6 mm cones we use `coneGeometry(radius, height, 6)` — keeps the budget low. 24 × ~24 triangles = ~576 triangles. Combined with the existing 768 triangles for tubes: ~1.3k triangles. Well within budget.

### Tangent computation

`CatmullRomCurve3.getTangent(t)` returns the unit tangent at parameter `t`. We orient the cone using a `Quaternion.setFromUnitVectors(coneAxis, tangent)` rotation, where `coneAxis = new Vector3(0, 1, 0)` (the default direction `coneGeometry` points). Same pattern as `CurrentArrows.tsx` Phase 2 work.

### Mirror correctness

The existing `makeFieldLine(extent, mirror)` builds either the upper-half (N up → S) or lower-half (N down → S) curve. The tangent direction at t=0 starts pointing toward N→S externally for both. Cones positioned at the SAME parameter values t ∈ {0.2, 0.5, 0.8} get tangents that naturally orient them outward from N → S along the curve. Mirror handled implicitly.

### Acceptance

1. On a fresh page load, Scene 1+, with field toggle on (default): 8 amber arcs visible around the magnet, taller/more-elliptical-looking than current. Each arc has 3 small amber cone arrows along it, all pointing N→S externally.
2. Dragging the magnet: arcs and arrows follow with the magnet (already do — they're parented to the magnet body group).
3. Toggling field off: arcs + arrows fade out together over ~250 ms (existing fade behaviour, opacity material is shared).
4. Magnet strength weak/strong: opacity scales together (existing `opacityScale` already applied to the shared material).

---

## Slice B — Bar magnet 2× longer

### Problem

User wants a longer magnet for better visual impact (clearer pole separation, easier touch interaction). Currently 9 cm overall; user requested 18 cm.

### Fix

In `src/labs/electromagnetic-induction/objects/BarMagnet.tsx`, change one line:

```ts
export const MAGNET_HALF_LENGTH = 0.09  // was: 0.045 — total length 18 cm
```

### Cascade effects (automatic via imports)

- `BarMagnet.tsx` itself: cross-section (`MAGNET_HALF_DEPTH = 0.012`) unchanged — magnet stays 24 mm × 24 mm in cross-section, 18 cm long. The physics `halfExtents: [MAGNET_HALF_LENGTH, ...]` recompiles to `[0.09, 0.012, 0.012]` automatically. The visual `<boxGeometry>` and the inner `<mesh position>` arithmetic that uses `MAGNET_HALF_LENGTH` rescales automatically.
- `BarMagnet.tsx` `CORRIDOR_HALF_LENGTH = COIL_LENGTH / 2 + MAGNET_HALF_LENGTH` recomputes from 0.105 → 0.150 m. The drag corridor activates 4.5 cm earlier on each side, ensuring the longer magnet still enters the coil only through the bore.
- `FieldLines.tsx` imports `MAGNET_HALF_LENGTH` and uses it as the N/S tip x-coordinate. Curves automatically stretch to the new magnet length.

### Coil bore fit check

Coil bore length = `COIL_LENGTH = 0.12 m` = 12 cm. New magnet length = 18 cm. When centered in the coil, the magnet extends 3 cm past each end. Acceptable — the magnet's bulk sits inside the coil's main influence zone, ends stick out symmetrically.

The bore inner radius (~3.65 cm) easily accommodates the 1.2 cm magnet half-depth. No clipping. ✓

### Acceptance

1. Visually: the bar magnet is twice as long. Red N pole and blue S pole each cover roughly the same area as the WHOLE old magnet.
2. Dragging: magnet still snaps to bore axis via the corridor; constraint activates earlier (when magnet's center is ±15 cm from coil center along x, vs ±10.5 cm before).
3. Field lines: arcs are roughly twice as wide along x as before (still go N tip → S tip).
4. Snap into coil: still works — coil snap radius `COIL_SNAP_RADIUS = 0.10 m` is unchanged, and snap is to coil CENTER. Magnet ends will stick out 3 cm.

---

## Slice C — Bulb inertia + dimmer

### Problem

`Bulb.tsx` directly maps `bulbBrightness` from `useInductionReadings` to light intensity and emissive intensity every frame. No filtering. When the user stops moving the magnet, the bulb instantly goes dark — feels unphysical (real incandescent bulbs have ~100–200 ms thermal time constant). Also, at max brightness the bulb light dominates the scene visually.

### Fix

Two changes in `Bulb.tsx`:

**C.1 — Inertia filter.** Add a `useRef` for smoothed brightness. Each frame, lerp toward the target with a stiffness coefficient derived from the desired time constant.

```ts
const smoothBrightness = useRef(0)
const TIME_CONSTANT_MS = 150
const STIFFNESS = 1000 / TIME_CONSTANT_MS  // ≈ 6.67 (units: per second)

useFrame((_, delta) => {
  const target = useInductionReadings.getState().bulbBrightness
  const step = Math.min(1, delta * STIFFNESS)
  smoothBrightness.current += (target - smoothBrightness.current) * step
  if (lightRef.current) {
    lightRef.current.intensity = smoothBrightness.current * MAX_LIGHT_INTENSITY
  }
  if (glassMatRef.current) {
    glassMatRef.current.emissiveIntensity = smoothBrightness.current * EMISSIVE_SCALE
  }
})
```

At 60 fps the per-frame step is `min(1, 0.0167 * 6.67) ≈ 0.111`. After 150 ms (9 frames) the smoothed value reaches ~65% of target (one time constant). After 300 ms (~18 frames) it reaches ~86% (two time constants). After 450 ms (~27 frames) ~95% (three time constants). This is the standard exponential lerp.

**C.2 — Dimmer.** Reduce both intensity scales:
- `MAX_LIGHT_INTENSITY: 2.5 → 1.8` (point light)
- New constant `EMISSIVE_SCALE = 2.0` (was inline `2.5` in the original code)

The bulb glows softer overall but the inertia gives it a "real bulb" feel.

### Acceptance

1. With field+arrows enabled, swipe the magnet through the coil at moderate speed. Bulb glows during the swipe.
2. Stop the magnet abruptly (release on the table away from coil). The galvanometer needle goes to zero instantly (already does — that's correct physics for current). The bulb's glow fades out smoothly over ~300 ms instead of going dark in one frame.
3. Wiggle the magnet back and forth quickly through the coil. Bulb pulses with each wiggle, but the pulses are softened — no harsh on/off, just bright-dim-bright-dim.
4. At peak EMF, the bulb's light is visibly softer than before — does not "wash out" the rest of the scene.

---

## File touch-list

| File | Slice | Change |
|---|---|---|
| `src/labs/electromagnetic-induction/instruments/FieldLines.tsx` | A | Increase `yMax` factor. Build per-curve tangent-aligned cones. Render cones inside the existing `<group ref={groupRef}>`. Reuse shared material. |
| `src/labs/electromagnetic-induction/objects/BarMagnet.tsx` | B | One line: `MAGNET_HALF_LENGTH = 0.09`. Comment updated. |
| `src/labs/electromagnetic-induction/instruments/Bulb.tsx` | C | Add `smoothBrightness` ref, `TIME_CONSTANT_MS` + `STIFFNESS` consts, low-pass filter in `useFrame`. Lower `MAX_LIGHT_INTENSITY` to 1.8. Add `EMISSIVE_SCALE = 2.0`. |

3 files, ~40 lines net diff.

## Testing strategy

No new unit tests. The 220-test suite stays as the regression gate. Smoke-test (user, on Vercel preview after deploy):

1. Field lines: open EM induction lab → field arcs are elliptical, each with 3 arrow markers pointing N→S externally.
2. Magnet length: visually twice as long; still fits through coil bore.
3. Bulb: dimmer overall; lingers softly after motion stops.

## Risks

- **Slice A — cone count.** 24 small cones add ~600 triangles. Should be invisible at modern phone fill rates. If FPS regresses on low-end devices, dropping to 2 arrows per line cuts the budget in half. Easy follow-up.
- **Slice A — overdraw.** Cones share the same transparent material as the tubes. They sit on top of the tube path so there's some overdraw, but it's tiny per cone.
- **Slice B — drag-corridor halfLength grows.** Now 15 cm vs 10.5 cm. The magnet will visually "snap" to the bore axis at a wider x-range. This is the intended pedagogy (clear approach-to-bore behaviour), but if it feels too aggressive we can scale back to `COIL_LENGTH / 2 + MAGNET_HALF_LENGTH * 0.75` later.
- **Slice C — frame-rate-dependent decay.** The `delta * STIFFNESS` formula is correct exponential smoothing regardless of frame rate (60 fps and 120 fps give the same perceived time constant). Verified analytically.

## Out of scope (for PR2 separately)

- **Focus navigation:** HUD buttons to focus the camera on individual instruments (magnet tray / coil / galvanometer / bulb / overview). Will be a separate spec with new state (`useCameraStore.focusTarget`) + new HUD pill row + new POSES presets.
- **Pinch / two-finger pan gestures.** Same PR2.
- Touching the EMF physics formula. Not requested.
- Bulb flicker / AC simulation. Explicitly excluded by user.

## Self-review checklist

- [x] Each slice has concrete acceptance criteria.
- [x] No "TBD" / "TODO" / placeholder.
- [x] Slice B's downstream effects (corridor, field lines) are explicit and verified to update automatically.
- [x] Slice C's math is correct (frame-rate-independent exponential smoothing).
- [x] No new tests, rationale stated.
- [x] PR2 scope (focus nav) explicitly carved out.
- [x] Mass-measurement lab not touched.
