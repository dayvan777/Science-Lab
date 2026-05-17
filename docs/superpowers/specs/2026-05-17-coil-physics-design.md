# Coil Physics — Bore Corridor + Magnetic Stay — Design

**Date:** 2026-05-17
**Status:** Approved-in-concept (user said "ок" after Approach B + keepKinematic fix proposal)
**Scope:** Fix two physics bugs in the EM induction lab reported by the user via iPhone screenshots:

1. **Magnet clips through coil mesh** — the bar magnet can be dragged to any (x, z) position on the drag plane, including through the helical copper-wire region. Looks visually wrong (magnet half-inside the coil's wire instead of cleanly entering the bore).
2. **Magnet falls down after snap inside the coil** — when the student drops the magnet inside the coil for the "stationary inside" pedagogy, it snaps to bore center then immediately falls because the coil has no collider and the body becomes Dynamic after snap.

## Background

The EM induction lab is the most-recently-shipped lab (Phase 1, 2, 3, Touch+Responsive, Mobile-v2, field-lines-scene-1 all merged). Live URL `science-lab-phi.vercel.app` runs the current master. User testing on iPhone 16 Pro Max produced both bug reports.

**Code state for Bug 1:**

- `src/sdk/physics/useDrag.ts` is SDK-shared. It projects pointer to a horizontal plane at `dragHeight` (0.95 for the bar magnet — matches `COIL_CENTER.y`). After projection, it clamps `target.x` and `target.z` to table bounds [-1.15, 1.15] × [-0.5, 0.5]. No corridor/axis constraint.

- The coil is purely visual (`<mesh>` in `<group>`, no physics body). So there's no collider to bounce the magnet off — a drag-time constraint in `useDrag` is the only path that doesn't require adding physics to the coil.

- Bar magnet dimensions (`BarMagnet.tsx`): `MAGNET_HALF_LENGTH = 0.045m` (total 9 cm), `MAGNET_HALF_DEPTH = 0.012m` (square cross-section 24 mm). Half-depth 1.2 cm fits easily inside the coil bore (radius 4 cm minus tube thickness ≈ 3.65 cm) with ~24 mm clearance on each side.

- The Phase-1 fix already moved the drag plane to y=0.95 to match `COIL_CENTER.y`. So `target.y` is always at the bore-center height — only `target.z` needs constraining.

**Code state for Bug 2:**

`src/labs/electromagnetic-induction/instruments/Coil.tsx` registers a coil-center snap target with `keepKinematic: false`. After the magnetic-pull tween completes, `useDrag.ts onPointerUp` sets the magnet's RigidBody back to Dynamic, gravity kicks in, magnet falls through the (collider-less) coil bore onto the table.

The intended pedagogy ("magnet stationary inside coil" — Scene 3 of EM induction) requires the magnet to stay where dropped at bore center. The fix is a one-flag change: `keepKinematic: true`. Picking the magnet up again still works because `onPointerDown` in `useDrag.ts` unconditionally converts to `KinematicPositionBased`.

## Non-goals

- Adding a physics body / collider to the coil. The drag-corridor constraint achieves the visual goal more cleanly.
- Constraining the magnet rotationally (it never rotates during drag because the rigidbody is kinematic-position-based, angular-vel zeroed in onPointerDown).
- Snap-to-axis funnel with smooth ease-in over distance. A hard z-clamp at the corridor boundary is acceptable and matches PhET's "approach through bore" feel.
- Bar magnet 3D orientation (north/south poles) changes during drag. Out of scope.
- New tests. The drag plane and snap targets are exercised by the existing 220-test suite as integration; no new test surface for the constraint and the one-flag change.

## Architecture

Two independent slices in one PR. Branch `fix/coil-physics` from `master` (commit `8a9030e`).

| Slice | Files | Net change |
|---|---|---|
| A. Drag corridor through coil bore | `useDrag.ts` (SDK), `Draggable.tsx` (SDK), `BarMagnet.tsx` (EM-induction lab) | ~25 lines |
| B. Magnet stays at snap point | `Coil.tsx` (EM-induction lab) | 1 line + comment |

Both slices independent; can ship in either order. Plan will order A → B since A is the bigger surface and exercises the SDK contract first.

---

## Slice A — Drag corridor through coil bore

### Problem

Currently `useDrag.ts onPointerMove` projects the pointer to the drag plane and clamps to table bounds. There is no constraint that prevents the magnet's (x, z) position from intersecting the visual coil mesh.

### Fix

Introduce an OPTIONAL `dragCorridor` prop on `useDrag` and `Draggable`. When present, after the table-bound clamp, apply an additional constraint:

> If `|target.x − corridor.center.x| < corridor.halfLength`, force `target.z = corridor.center.z`.

This represents an "approach corridor": within the corridor's x-extent (centered on the coil and slightly longer than the coil to account for the magnet's own length), the magnet's drag z is locked to the corridor's z (the coil bore axis). Outside the corridor's x-extent, the magnet drags freely.

The Mass-measurement lab does NOT pass `dragCorridor` to its draggable balls/weights → behaviour unchanged in that lab. Only EM-induction's `BarMagnet` opts in.

### Type signature

```ts
// In src/sdk/physics/useDrag.ts
import { Vector3 } from 'three'

export type DragCorridor = {
  /** World position of the corridor's centre (typically the instrument's centre). */
  center: Vector3
  /** Half-length of the corridor along the world x-axis. When the dragged
   *  object's x falls within ±halfLength of center.x, its z is forced to
   *  center.z. */
  halfLength: number
}

type Props = {
  rigidBody: RefObject<RapierRigidBody | null>
  bodyId?: string
  dragHeight?: number
  /** Optional corridor that constrains drag z when the object enters
   *  the corridor's x-extent. Used in EM-induction so the bar magnet
   *  can only enter the coil through its bore axis. */
  dragCorridor?: DragCorridor
}
```

### Apply site (in `onPointerMove` of `useDrag.ts`)

After the existing table-bound clamp:

```ts
target.current.x = clamp(target.current.x, DRAG_MIN_X, DRAG_MAX_X)
target.current.z = clamp(target.current.z, DRAG_MIN_Z, DRAG_MAX_Z)

// Drag-corridor constraint — when enabled by the consumer, forces z to
// the corridor axis while within the x-extent. This is how the EM-induction
// bar magnet is kept on the coil's bore axis when approaching/inside the coil.
if (dragCorridor) {
  const dx = target.current.x - dragCorridor.center.x
  if (Math.abs(dx) < dragCorridor.halfLength) {
    target.current.z = dragCorridor.center.z
  }
}
```

### Draggable forwarding

`src/sdk/object/Draggable.tsx` already forwards `dragHeight`. Add `dragCorridor` as an optional pass-through prop with the same pattern.

### EM-induction consumer (`BarMagnet.tsx`)

Pass `dragCorridor`:

```ts
import { COIL_CENTER, COIL_LENGTH } from '../instruments/Coil'

// halfLength = (coil's half-extent along x) + (magnet's half-length)
// so the constraint kicks in BEFORE the magnet visually overlaps the coil mesh.
const CORRIDOR_HALF_LENGTH = COIL_LENGTH / 2 + MAGNET_HALF_LENGTH

// In the Draggable JSX:
dragCorridor={{ center: COIL_CENTER, halfLength: CORRIDOR_HALF_LENGTH }}
```

`COIL_CENTER` is already exported from `physics/induction.ts`. `COIL_LENGTH` is already exported from `instruments/Coil.tsx`. The import path is internal to the lab.

**Note:** the import path for `COIL_CENTER` should come from wherever it's currently defined. Let me re-verify in the plan step — the spec hints it might be `physics/induction.ts` (where the EM math lives) rather than `instruments/Coil.tsx`. The plan task will use the correct path.

### Acceptance for Slice A

1. On phone/desktop, drag the bar magnet horizontally toward the coil. As soon as the magnet's x reaches the corridor boundary (coil x-extent + magnet half-length), the magnet's z snaps to 0 (coil bore axis). Continue dragging — magnet slides along the bore axis. Visually it enters the coil through the bore, never overlapping the helical copper.
2. Drag the magnet AWAY from the coil. Outside the corridor's x-extent, z is free again — magnet can be dragged anywhere on the table.
3. Mass-measurement lab: behaviour unchanged (no `dragCorridor` passed).

---

## Slice B — Magnet stays at snap point

### Problem

`Coil.tsx` registers a snap target with `keepKinematic: false`. After magnetic-pull tween (300 ms walk from drop position to coil center), `useDrag.onPointerUp` sees `keepKinematic === false` and converts the magnet's RigidBody to `Dynamic`. Gravity pulls the magnet down through the bore (no collider blocks it) onto the table.

### Fix

In `Coil.tsx`, change `keepKinematic: false` → `keepKinematic: true`. Update the inline comment to reflect that the magnet now stays at bore center after snap.

```ts
useEffect(() => {
  const unregister = registerSnap({
    id: 'coil-center',
    instrumentId: 'coil',
    position: new Vector3(...position),
    radius: COIL_SNAP_RADIUS,
    keepKinematic: true,
    onAttach: () => { /* magnet stays kinematic at bore centre after snap. */ },
  })
  return unregister
}, [position])
```

Picking the magnet up after the snap works as expected: `useDrag.onPointerDown` converts the RigidBody back to `KinematicPositionBased` for the drag duration, then back to either `Dynamic` (away from snap) or `KinematicPositionBased` (re-snapped to coil).

### Acceptance for Slice B

1. Drag the magnet into the coil bore. Release. Magnet snaps via 300 ms tween to bore center. Magnet stays floating at bore center — does NOT fall.
2. Tap the magnet again — drag works, magnet can be moved anywhere along the bore axis (Slice A) or anywhere on the table (outside the corridor).
3. Drop the magnet away from coil (outside `COIL_SNAP_RADIUS` = 10 cm) — no snap fires, magnet becomes Dynamic and falls to the table as before.

---

## File touch-list

| File | Slice | Change |
|---|---|---|
| `src/sdk/physics/useDrag.ts` | A | Add `DragCorridor` exported type, `dragCorridor?: DragCorridor` prop, apply constraint in `onPointerMove` after table clamp. |
| `src/sdk/object/Draggable.tsx` | A | Add `dragCorridor?: DragCorridor` prop (re-export type), forward to `useDrag`. |
| `src/labs/electromagnetic-induction/objects/BarMagnet.tsx` | A | Import `COIL_CENTER` (from `physics/induction.ts`), import `COIL_LENGTH` (from `instruments/Coil.tsx`). Compute `CORRIDOR_HALF_LENGTH`. Pass `dragCorridor` to `<Draggable>`. |
| `src/labs/electromagnetic-induction/instruments/Coil.tsx` | B | `keepKinematic: false` → `true`. Update comment. |

4 files modified, 0 new files, ~30 lines net diff.

## Testing strategy

No new unit tests. The constraint math is straightforward and exercised at runtime; the snap-flag change is a constant. Existing 220 tests stay as regression gate.

Smoke-test (user, on Vercel preview after deploy):
1. Drag bar magnet toward coil → enters through bore cleanly, no overlap with helix.
2. Drop inside coil → stays at bore center, doesn't fall.
3. Drop far from coil → becomes Dynamic, falls to table (unchanged).
4. Mass-measurement lab → balls/weights drag and snap as before.

## Risks

- **`dragCorridor` is a one-off API for the EM-induction lab.** Generic enough to reuse (e.g. for a future "thread through tube" interaction), explicit enough that future SDK consumers won't accidentally hit it. The optional prop pattern means it's opt-in.
- **Hard z-snap may feel abrupt** at the corridor boundary. If users complain, easy follow-up is to add an interpolation factor or smooth-corridor variant. Out of scope for this fix.
- **Magnet stuck at bore center if user accidentally drops it there.** Mitigation: re-tap to pick up; drag away. Standard interaction. Same UX as the existing snap targets in mass-measurement (digital scale, lever pan).
- **Phase-3 store reset on session restart** (`useLabState.sessionId` increments → Physics key remounts → all bodies respawn) — `keepKinematic: true` does NOT prevent this. Magnet returns to spawn tray on hard reset. Acceptable.

## Out of scope

- Adding any physics body to the coil itself.
- Magnetic-attraction force from coil center pulling the magnet (purely a UI snap, no physics).
- Pinch-to-zoom or other gesture changes.
- Rotating the magnet during drag.
- Sound effect on magnet-stays-in-coil event.

## Self-review checklist

- [x] Acceptance criteria are concrete for both slices.
- [x] No "TBD" / "TODO" / placeholder.
- [x] `DragCorridor` type signature is complete.
- [x] Math for `CORRIDOR_HALF_LENGTH = COIL_LENGTH/2 + MAGNET_HALF_LENGTH` is correct: corridor activates BEFORE the magnet visually overlaps the coil mesh.
- [x] Slice B is genuinely one-flag — no other consumers of the `keepKinematic` flag for this snap exist.
- [x] No tests added; rationale stated.
- [x] Risk list covers the obvious cases.
- [x] Mass-measurement lab explicitly verified unchanged (no `dragCorridor` passed to its Draggables).
