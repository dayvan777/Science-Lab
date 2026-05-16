# EM Induction Phase 1 — Coil Axis Fix Design

**Date:** 2026-05-14
**Status:** Approved (user agreed to sequential phases after PhET-comparison research)
**Scope:** First of three planned phases for bringing the EM induction lab to PhET-comparable correctness. This phase fixes the **fundamental geometry bug** that causes all three user-reported symptoms (magnet doesn't enter coil, galvanometer doesn't respond properly, coil orientation doesn't match references).

---

## Goal

Rotate the coil 90° so its axis lies along **world X** (lateral) instead of world Z (depth). Make the drag-plane height a lab-configurable parameter so the magnet's drag plane can match the coil's bore center exactly (not 5 cm above it as today). Recompute wire endpoints, coil-stand positions, and motion-trigger axis math accordingly.

After this phase ships, dragging the magnet from left to right will visibly pass it through the coil's bore. The galvanometer needle will deflect in proportion to lateral magnet velocity — direction determined by entry-vs-exit, matching the PhET reference and the user's reference photos.

## Non-goals (deferred to later phases)

- **Phase 2:** Visible magnetic field lines around the bar magnet + induced-current direction arrows on the coil (Lenz's law visualization).
- **Phase 3:** Number-of-turns selector (1 / 2 / 3 / 5), magnet-strength slider, optional compass tool.
- **Separate slice:** Touch + responsive polish across the platform.

These are real fixes — Phase 1 is **not** the whole story. But Phase 1 unlocks the others by making the basic interaction physically correct.

---

## Reference

Two user-supplied screenshots of a horizontal coil + galvanometer setup show:
- Coil is horizontal, **axis lateral** (left-right of the viewer).
- Magnet enters through the coil's left-side bore.
- Wires connect coil ends down to the galvanometer + bulb in the closed circuit.

The PhET Faraday's Electromagnetic Lab (https://phet.colorado.edu/sims/html/faradays-electromagnetic-lab/) has the same lateral-axis orientation — it's the standard pedagogical layout for this experiment.

## Root cause analysis (from code reading)

Three symptoms collapse to one structural bug:

| Symptom | Cause |
|---|---|
| Магніт не входить у котушку | `useDrag.DRAG_HEIGHT = 1.0` forces the magnet's y to 1.0 during drag, but `COIL_CENTER.y = 0.95` — the magnet rides **5 cm above the bore** and never enters it. |
| Котушка орієнтована не так | `buildCoilGeometry` in `Coil.tsx` constructs a helix along the **z-axis** (`COIL_AXIS = (0, 0, 1)`). User wants it along **x-axis**, matching references. |
| Стрілка гальванометра не працює правильно | `velAlongAxis = magnetVel.dot(COIL_AXIS)` reads only the z-component of velocity. With horizontal drag, z-velocity is near zero → EMF ≈ 0 → needle barely moves. Even when it does move, the direction is decoupled from the visible motion direction. |

One geometry fix (coil along X + drag-plane lowered to bore height) resolves all three.

---

## Architecture

### SDK change — drag-height becomes a configurable Draggable prop

**Files:**
- `src/sdk/physics/useDrag.ts` — promote `DRAG_HEIGHT` from a hard-coded module constant to a hook param.
- `src/sdk/object/Draggable.tsx` — accept optional `dragHeight?: number` prop, forward to `useDrag`.

The mass-measurement lab keeps the default (`dragHeight={1.0}` — balls and weights float above the table during drag). The EM lab passes `dragHeight={0.95}` to match the coil's bore centre. No behaviour change for existing lab.

```ts
// useDrag.ts — new signature
type Props = {
  rigidBody: RefObject<RapierRigidBody | null>
  bodyId?: string
  dragHeight?: number  // y-plane the dragged body slides on. Default 1.0.
}

export function useDrag({ rigidBody, bodyId, dragHeight = 1.0 }: Props) {
  // ...intersectPlane uses dragHeight instead of the constant DRAG_HEIGHT
}
```

```tsx
// Draggable.tsx — new prop
type Props = {
  // ...existing props...
  /** Y-plane the body slides on during drag. Default 1.0 (floats above the table). */
  dragHeight?: number
}

export function Draggable({ ..., dragHeight, children }: Props) {
  const { onPointerDown: rawDown, onPointerMove, onPointerUp: rawUp } =
    useDrag({ rigidBody: ref, bodyId, dragHeight })
  // ...
}
```

### Lab change — coil rotated 90° along Y axis

**Files:**
- `src/labs/electromagnetic-induction/physics/induction.ts` — `COIL_AXIS = (1, 0, 0)`.
- `src/labs/electromagnetic-induction/instruments/Coil.tsx` — `buildCoilGeometry` constructs helix along X (swap z↔x in the point loop).
- `src/labs/electromagnetic-induction/instruments/Wires.tsx` — coil endpoint attach points now at coil's X-extents (`±COIL_LENGTH/2`), not Z-extents.
- `src/labs/electromagnetic-induction/instruments/CoilStand.tsx` — stands now at coil's X-extents (the coil is now visually long left-right; stands hold it from the SIDES, not the FRONT/BACK).
- `src/labs/electromagnetic-induction/objects/BarMagnet.tsx` — pass `dragHeight={0.95}`.
- `src/labs/electromagnetic-induction/scene/LabScene.tsx` — verify camera preset, magnet tray position, motion triggers still work (most should just work — distance check is axis-agnostic).

### Layout after the rotation

```
World X axis: -0.40 ────── -0.05 ────── +0.30 ── +0.55
                ↓             ↓            ↓        ↓
            Magnet tray     Coil      Galvanometer Bulb
            (x=-0.40)    (centred,    (x=0.30)   (x=0.55)
                         X-axis bore,
                         left end ≈ x=-0.11,
                         right end ≈ x=+0.01)
```

The student drags the magnet right from the tray, enters the coil's left-side bore at x ≈ -0.11, passes through to x ≈ +0.01, exits to the right. The galvanometer and bulb sit further right and visually receive the wires from the coil's bottom (via the existing `Wires.tsx` curves recomputed for new endpoints).

### Coil geometry — exact code change

`buildCoilGeometry` currently constructs points oscillating in `(x, y)` along the `z` length. To rotate, oscillate in `(z, y)` along the `x` length:

```ts
// BEFORE — axis along Z
const z = -COIL_LENGTH / 2 + t * COIL_LENGTH
points.push(new Vector3(
  Math.cos(angle) * COIL_OUTER_RADIUS,
  Math.sin(angle) * COIL_OUTER_RADIUS,
  z,
))

// AFTER — axis along X
const x = -COIL_LENGTH / 2 + t * COIL_LENGTH
points.push(new Vector3(
  x,
  Math.sin(angle) * COIL_OUTER_RADIUS,
  Math.cos(angle) * COIL_OUTER_RADIUS,
))
```

(The "axis along z" comment in `Coil.tsx:25` also needs updating to "axis along x".)

### Wire endpoint recalculation

`Wires.tsx` previously computed coil ends as `(coilCentre.x, coilCentre.y - R, coilCentre.z ± COIL_LENGTH/2)` (top/bottom of the coil's BOTTOM line, at coil's z-extents). With X-axis orientation, the equivalent is `(coilCentre.x ± COIL_LENGTH/2, coilCentre.y - R, coilCentre.z)`. The "bottom-of-coil" stays at `coilCentre.y - COIL_OUTER_RADIUS` since the helix's bottom point is still at y = cy − R.

Specifically:

```ts
// BEFORE
const coilRightEnd = new Vector3(coilCentre.x, coilCentre.y - COIL_OUTER_RADIUS, coilCentre.z + COIL_LENGTH / 2)
const coilLeftEnd  = new Vector3(coilCentre.x, coilCentre.y - COIL_OUTER_RADIUS, coilCentre.z - COIL_LENGTH / 2)

// AFTER
const coilRightEnd = new Vector3(coilCentre.x + COIL_LENGTH / 2, coilCentre.y - COIL_OUTER_RADIUS, coilCentre.z)
const coilLeftEnd  = new Vector3(coilCentre.x - COIL_LENGTH / 2, coilCentre.y - COIL_OUTER_RADIUS, coilCentre.z)
```

The naming `coilRightEnd` / `coilLeftEnd` now matches the visible orientation (right = +x, left = -x). Galvanometer wire still attaches to the right end; bulb to the left, via the existing terminal geometry.

But wait — the layout has galvanometer at `x=+0.30` (to the right of the coil at `x=-0.05`). So the **right end** of the coil (`x=+0.01`) attaches to the **galvanometer left terminal**. The **left end** of the coil (`x=-0.11`) — that's the FAR LEFT of the table — needs to wrap around to the bulb at `x=+0.55` (FAR RIGHT). That's a very long wire path.

This is a real layout problem with X-axis orientation. Two solutions:

**Option A (preferred):** swap galvanometer ↔ bulb positions, so galvanometer is to the LEFT of the coil (at x=-0.40 ... wait that's the magnet tray) — no, simpler: put galvanometer and bulb both to the RIGHT of coil with wires emerging from coil's BOTTOM (one going LEFT then UP, one going RIGHT to galvanometer, then RIGHT to bulb in series). The wires loop OVER the table.

**Option B:** keep current galvanometer + bulb positions, accept long wires. Visually fine since wires are decorative TubeGeometries with catenary drape.

Going with **Option B** — minimal change. Wires can be long.

### CoilStand recomputation

Stands previously placed at `cz ± (COIL_LENGTH/2 + STAND_OFFSET_Z)`. Now they should be at coil's X-extents:

```ts
// BEFORE
position={[cx, standCenterY, cz - coilLength / 2 - STAND_OFFSET_Z]}
position={[cx, standCenterY, cz + coilLength / 2 + STAND_OFFSET_Z]}

// AFTER — stands flank the coil along its new long axis (X)
position={[cx - coilLength / 2 - STAND_OFFSET_X, standCenterY, cz]}
position={[cx + coilLength / 2 + STAND_OFFSET_X, standCenterY, cz]}
```

Rename `STAND_OFFSET_Z` → `STAND_OFFSET_X` for clarity, but the constant value (`0.005`) stays the same.

Stand orientation should also rotate — what was a block-long-along-Z (0.05×0.06×0.025) should now be a block-long-along-Z (0.025×0.06×0.05) so it visually "cradles" the coil from the X-extent side. Swap `STAND_DEPTH` and `STAND_WIDTH` references in the `RoundedBox args`:

```ts
// args[0] = x extent, args[1] = y, args[2] = z
// BEFORE: x=0.05 long along x (depth), z=0.025 narrow along z
// AFTER:  x=0.025 narrow along x (just barely peeks beyond coil end), z=0.05 long along z

<RoundedBox args={[STAND_WIDTH, STAND_HEIGHT, STAND_DEPTH]} ... />
```

Where `STAND_WIDTH = 0.025` (peek beyond coil) and `STAND_DEPTH = 0.05` (depth into the scene). Effectively: the stand block is now WIDE along z, narrow along x. Visually it's a thin slab supporting the coil from one end.

### BarMagnet — pass dragHeight

```tsx
<Draggable
  position={position}
  mass={MAGNET_MASS_GRAMS}
  shape={{ type: 'cuboid', halfExtents: [MAGNET_HALF_LENGTH, MAGNET_HALF_DEPTH, MAGNET_HALF_DEPTH] }}
  bodyId={BAR_MAGNET_BODY_ID}
  enabled={enabled}
  dragHeight={0.95}  // ← NEW — matches COIL_CENTER.y so magnet enters the bore
>
```

### Camera preset

`focus-coil` is `{ position: [-0.05, 1.35, 1.1], lookAt: [-0.05, 0.95, 0] }`. With the coil now long along X (from -0.11 to +0.01) and the magnet entering from the LEFT, the camera framing should still work — the lateral spread (0.12 m) is well within the view frustum. No change needed.

### Motion triggers

`magnet-near-coil` uses `distance.distanceTo(COIL_CENTER)` — axis-agnostic, works as-is.
`magnet-leaving-coil` uses `wasInside` flag — axis-agnostic, works as-is.
`magnet-stationary-in-coil` uses inside + speed — axis-agnostic, works as-is.

No motion-trigger changes needed.

---

## File touch-list

| File | Change |
|---|---|
| `src/sdk/physics/useDrag.ts` | Add `dragHeight` to hook props (default 1.0); use it in `intersectPlane` instead of module constant |
| `src/sdk/object/Draggable.tsx` | Add `dragHeight?: number` prop, forward to `useDrag` |
| `src/labs/electromagnetic-induction/physics/induction.ts` | `COIL_AXIS = new Vector3(1, 0, 0)`; update comment |
| `src/labs/electromagnetic-induction/instruments/Coil.tsx` | `buildCoilGeometry` constructs helix along X; comment update |
| `src/labs/electromagnetic-induction/instruments/Wires.tsx` | Coil endpoint attach points at X-extents not Z-extents |
| `src/labs/electromagnetic-induction/instruments/CoilStand.tsx` | Stand positions at coil's X-extents; rotated geometry (wide along Z, narrow along X) |
| `src/labs/electromagnetic-induction/objects/BarMagnet.tsx` | Pass `dragHeight={0.95}` to Draggable |

No state changes, no content changes, no test changes (tests for `computeEMF` continue to pass — the function signature is unchanged; only the COIL_AXIS constant differs, and existing tests use explicit velocity vectors not tied to the axis direction).

Wait — actually the existing `computeEMF` tests at `tests/labs/em-induction.test.ts` do test specific direction behaviour:

```ts
it('positive z-velocity inside coil → positive EMF', () => {
  const pos = COIL_CENTER.clone()
  const vel = new Vector3(0, 0, 0.5)
  const emf = computeEMF(pos, vel)
  expect(emf).toBeGreaterThan(0)
})
```

These tests will **fail** after `COIL_AXIS = (1, 0, 0)` because positive z-velocity will no longer produce positive EMF (only positive x-velocity will).

The tests need to be updated to test **positive x-velocity** instead. That's the only test-level change.

Update the test file:

```ts
it('positive x-velocity inside coil → positive EMF', () => {
  const pos = COIL_CENTER.clone()
  const vel = new Vector3(0.5, 0, 0)
  const emf = computeEMF(pos, vel)
  expect(emf).toBeGreaterThan(0)
})

it('negative x-velocity inside coil → negative EMF (Lenz)', () => {
  const pos = COIL_CENTER.clone()
  const vel = new Vector3(-0.5, 0, 0)
  const emf = computeEMF(pos, vel)
  expect(emf).toBeLessThan(0)
})
```

Also the "EMF clamps at ±EMF_MAX" test needs new vels. Test count stays at 138 (10 lab physics tests in their original count).

Updated file touch-list now includes:
- `tests/labs/em-induction.test.ts` — update direction tests from z-velocity to x-velocity.

---

## Acceptance criteria

1. The coil renders with its long axis horizontal-lateral. From the camera's POV, it looks like a horizontal cylinder of copper turns.
2. Dragging the bar magnet from the left tray (`x=-0.40`) toward the right visibly passes the magnet THROUGH the coil's bore (entering at x ≈ -0.11, exiting at x ≈ +0.01).
3. During this passage, the galvanometer needle deflects to the right (positive EMF) on entry and to the left (negative EMF) on withdrawal. The deflection magnitude scales with drag speed.
4. The coil sits visually on the two wooden stands that flank its left and right X-ends.
5. The closed-circuit wires (red/red/blue) connect the coil ends to galvanometer terminals and bulb base — no wires intersect the coil or any other instrument.
6. The bulb lights up during fast passage and stays dark during slow passage (same threshold behaviour as before — `BULB_THRESHOLD = 1.5`).
7. Existing scene-advance behaviour is intact: `magnet-near-coil` fires after the magnet has spent ~600 ms inside the influence radius, regardless of which direction it entered from.
8. **138 tests pass** after updating the EMF direction tests in `em-induction.test.ts`. `npx tsc --noEmit` clean. `npm run build` clean.
9. The mass-measurement lab's drag behaviour is **unchanged** — the SDK change to `Draggable` is backward-compatible (`dragHeight` defaults to 1.0).

---

## Risks

- **Long blue return wire** — with the new orientation, the blue wire connects coil's LEFT end (`x=-0.11`) to the bulb at `x=+0.55`. That's a 66 cm horizontal span. The Y-clamp in `Wires.tsx` (set in Polish v2: `WIRE_MIN_Y = TABLE_TOP_Y + 0.005`) will prevent it from drooping under the table, but the catenary curve might look unnaturally stretched. Mitigation: if it looks ugly, add a second mid-point control to route the wire UNDER the table (visually behind the table edge); but this is visual polish, not a blocker for Phase 1.

- **Magnet drag plane y=0.95 mass-measurement regression** — the SDK change is backward-compatible (`dragHeight` defaults to 1.0). Verified by reading: nothing in mass-measurement passes a `dragHeight` prop, so `Draggable` uses the default. **No regression risk.**

- **Existing test direction assertions** — explicitly listed in the file touch-list above; test count stays 138.

- **Stand orientation looks odd if dimensions are wrong** — the stand is now WIDE along z and NARROW along x. Smoke-test will catch any z-extent that goes through the table or the wires. Numeric values fall back to the same `0.05` and `0.025` constants, just assigned to different axes.

## Out of scope

- All Phase 2 / Phase 3 content (field lines, current arrows, turn-count selector, magnet-strength slider, compass).
- Camera-preset recalibration beyond the existing `focus-coil`.
- Touch + responsive polish (separate slice).
- Galvanometer needle smoothing tuning (already done in earlier polish).

---

## Self-review checklist

- [x] All three reported symptoms map to specific architectural changes
- [x] No "TBD" / "TODO" / placeholder text
- [x] SDK change is backward-compatible (default `dragHeight=1.0`)
- [x] Existing test failure mode identified and listed in touch-list
- [x] File touch-list maps to architecture sections
- [x] Scope bounded to Phase 1; explicit "out of scope" prevents creep
- [x] Risk section flags layout consequence (long wire) but doesn't block ship
