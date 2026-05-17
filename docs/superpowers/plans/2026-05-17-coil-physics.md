# Coil Physics — Bore Corridor + Magnetic Stay — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop the bar magnet from clipping through the coil's helical mesh (it must enter only via the bore axis), and make it stay at the bore centre after snap instead of falling to the table.

**Architecture:** Two slices. **A**: add an optional `DragCorridor` prop to the SDK's `useDrag` + `Draggable`, then opt in from EM-induction's `BarMagnet`. When the magnet's drag-target x falls within the corridor's x-extent, its z is forced to the corridor's z (the coil bore axis). **B**: flip the coil's snap registration from `keepKinematic: false` to `keepKinematic: true` so the magnet stays floating at bore centre.

**Tech Stack:** React, TypeScript, `@react-three/rapier`, Three.js Vector3. No new dependencies. Existing SDK conventions (optional prop forwarding through `Draggable`).

**Spec:** `docs/superpowers/specs/2026-05-17-coil-physics-design.md` (commit `eea3a36`).

**Branch:** `fix/coil-physics` (from `master` at commit `eea3a36`).

---

## File Structure

4 files modified, 0 new files.

| File | Slice | Change |
|---|---|---|
| `src/sdk/physics/useDrag.ts` | A | Export new `DragCorridor` type. Add optional `dragCorridor?: DragCorridor` prop. Apply constraint inside `onPointerMove` after the existing table-bound clamp. |
| `src/sdk/object/Draggable.tsx` | A | Forward optional `dragCorridor` prop into the underlying `useDrag` call. |
| `src/labs/electromagnetic-induction/objects/BarMagnet.tsx` | A | Import `COIL_CENTER` from `../physics/induction`, `COIL_LENGTH` from `../instruments/Coil`. Compute corridor half-length. Pass `dragCorridor` to `<Draggable>`. |
| `src/labs/electromagnetic-induction/instruments/Coil.tsx` | B | One-line flip: `keepKinematic: false → true`. Update inline comment. |

Verified imports during plan-writing:
- `COIL_CENTER` is exported from `src/labs/electromagnetic-induction/physics/induction.ts` (line 7).
- `COIL_LENGTH` is exported from `src/labs/electromagnetic-induction/instruments/Coil.tsx` (line 8).
- `MAGNET_HALF_LENGTH` is already exported from `src/labs/electromagnetic-induction/objects/BarMagnet.tsx` (line 3 — used by `FieldLines.tsx` already).

---

## Pre-flight

- [ ] **Step 0a: Confirm clean tree on master**

Run: `git status`
Expected: `nothing to commit, working tree clean`. HEAD at `eea3a36` on `master`.

- [ ] **Step 0b: Create feature branch**

Run: `git checkout -b fix/coil-physics`
Expected: `Switched to a new branch 'fix/coil-physics'`.

- [ ] **Step 0c: Baseline test run**

Run: `npm test -- --run`
Expected: `Tests 220 passed (220)`.

---

## Task 1: SDK — add DragCorridor type + opt-in prop

**Files:**
- Modify: `src/sdk/physics/useDrag.ts`
- Modify: `src/sdk/object/Draggable.tsx`

This task adds the new SDK-level capability without changing any existing consumer. Mass-measurement balls/weights don't pass `dragCorridor` → no behaviour change there.

- [ ] **Step 1.1: Export `DragCorridor` type from useDrag.ts**

Open `src/sdk/physics/useDrag.ts`. The file currently imports `Vector3` from `'three'` already. Below the existing `DRAG_*` constants (around lines 15–18) and above the existing `animateMagneticSnap` function, add:

```ts
/**
 * Optional drag-time constraint. When passed via `dragCorridor`, the
 * drag handler forces the target z to `center.z` whenever the target's
 * x falls within `±halfLength` of `center.x`. Used by EM-induction's
 * bar magnet so it can only enter the coil through the bore axis.
 *
 * Generic enough to reuse for any future "thread through a tube"
 * interaction; opt-in via the optional `dragCorridor` prop.
 */
export type DragCorridor = {
  /** World position of the corridor's centre. */
  center: Vector3
  /** Half-length of the corridor along the world x-axis. */
  halfLength: number
}
```

- [ ] **Step 1.2: Add `dragCorridor` prop to useDrag's Props type and destructure it**

Still in `src/sdk/physics/useDrag.ts`, find the `Props` type (currently lines 48–57):

```ts
type Props = {
  rigidBody: RefObject<RapierRigidBody | null>
  bodyId?: string
  /** Y-plane the dragged body slides on during drag. Default 1.0 — floats
   *  objects above the table for visibility. Labs whose interaction needs
   *  the dragged body to align with another object's geometry (e.g. the
   *  EM-induction bar magnet passing through the coil's bore at y=0.95)
   *  pass an explicit value. */
  dragHeight?: number
}
```

Add `dragCorridor?: DragCorridor`:

```ts
type Props = {
  rigidBody: RefObject<RapierRigidBody | null>
  bodyId?: string
  /** Y-plane the dragged body slides on during drag. Default 1.0 — floats
   *  objects above the table for visibility. Labs whose interaction needs
   *  the dragged body to align with another object's geometry (e.g. the
   *  EM-induction bar magnet passing through the coil's bore at y=0.95)
   *  pass an explicit value. */
  dragHeight?: number
  /** Optional corridor that constrains drag z when the object enters
   *  the corridor's x-extent. Used in EM-induction so the bar magnet
   *  can only enter the coil through its bore axis. */
  dragCorridor?: DragCorridor
}
```

Then find the existing `useDrag` function signature (around line 59):

```ts
export function useDrag({ rigidBody, bodyId, dragHeight = 1.0 }: Props) {
```

Change it to also destructure `dragCorridor`:

```ts
export function useDrag({ rigidBody, bodyId, dragHeight = 1.0, dragCorridor }: Props) {
```

- [ ] **Step 1.3: Apply the corridor constraint in onPointerMove**

Still in `src/sdk/physics/useDrag.ts`, find the `onPointerMove` function (currently around lines 96–111). It currently reads:

```ts
const onPointerMove = (ev: ThreeEvent<PointerEvent>) => {
  if (!isDragging.current || ev.pointerId !== pointerId.current) return
  const next = intersectPlane(ev)
  target.current.lerp(next, SMOOTHING)
  // Clamp drag position to within table bounds — prevents user from
  // dragging objects off the edge where they'd fall and become unreachable.
  target.current.x = clamp(target.current.x, DRAG_MIN_X, DRAG_MAX_X)
  target.current.z = clamp(target.current.z, DRAG_MIN_Z, DRAG_MAX_Z)
  if (rigidBody.current) {
    rigidBody.current.setNextKinematicTranslation({
      x: target.current.x,
      y: target.current.y,
      z: target.current.z,
    })
  }
}
```

Insert the corridor constraint AFTER the table-bound clamp and BEFORE `if (rigidBody.current)`. The full function becomes:

```ts
const onPointerMove = (ev: ThreeEvent<PointerEvent>) => {
  if (!isDragging.current || ev.pointerId !== pointerId.current) return
  const next = intersectPlane(ev)
  target.current.lerp(next, SMOOTHING)
  // Clamp drag position to within table bounds — prevents user from
  // dragging objects off the edge where they'd fall and become unreachable.
  target.current.x = clamp(target.current.x, DRAG_MIN_X, DRAG_MAX_X)
  target.current.z = clamp(target.current.z, DRAG_MIN_Z, DRAG_MAX_Z)
  // Drag-corridor constraint — when enabled by the consumer, forces z
  // to the corridor's axis while inside the corridor's x-extent. Used
  // in EM-induction so the bar magnet can only enter the coil through
  // its bore axis, never clipping through the helical wire mesh.
  if (dragCorridor) {
    const dx = target.current.x - dragCorridor.center.x
    if (Math.abs(dx) < dragCorridor.halfLength) {
      target.current.z = dragCorridor.center.z
    }
  }
  if (rigidBody.current) {
    rigidBody.current.setNextKinematicTranslation({
      x: target.current.x,
      y: target.current.y,
      z: target.current.z,
    })
  }
}
```

- [ ] **Step 1.4: Forward dragCorridor through Draggable.tsx**

Open `src/sdk/object/Draggable.tsx`. The file currently imports `useDrag` from `'../physics/useDrag'`. Add the type import alongside it:

```ts
import { useDrag, type DragCorridor } from '../physics/useDrag'
```

(The existing line is `import { useDrag } from '../physics/useDrag'` — replace with the above.)

Then find the `Props` type. Currently:

```ts
type Props = {
  position: [number, number, number]
  mass: number          // grams
  shape: Shape
  bodyId?: string       // for guided step detection
  enabled?: boolean     // if false, pointer-down is blocked (object not pickable)
  /** Y-plane the body slides on during drag. Default 1.0 (floats above the
   *  table). EM-induction's BarMagnet passes 0.95 so the magnet aligns with
   *  the coil's bore centre. */
  dragHeight?: number
  children: ReactNode
}
```

Add `dragCorridor?: DragCorridor` before `children`:

```ts
type Props = {
  position: [number, number, number]
  mass: number          // grams
  shape: Shape
  bodyId?: string       // for guided step detection
  enabled?: boolean     // if false, pointer-down is blocked (object not pickable)
  /** Y-plane the body slides on during drag. Default 1.0 (floats above the
   *  table). EM-induction's BarMagnet passes 0.95 so the magnet aligns with
   *  the coil's bore centre. */
  dragHeight?: number
  /** Optional drag corridor — when the dragged object's x falls within the
   *  corridor's x-extent, its z is forced to the corridor's z. Used by EM-
   *  induction so the bar magnet enters the coil only through the bore axis. */
  dragCorridor?: DragCorridor
  children: ReactNode
}
```

Then find the `Draggable` function signature and update it to destructure `dragCorridor`. Currently:

```ts
export function Draggable({ position, mass, shape, bodyId, enabled = true, dragHeight, children }: Props) {
```

Change to:

```ts
export function Draggable({ position, mass, shape, bodyId, enabled = true, dragHeight, dragCorridor, children }: Props) {
```

Then find the `useDrag` call inside the function body (currently around line 25):

```ts
const { onPointerDown: rawDown, onPointerMove, onPointerUp: rawUp } = useDrag({ rigidBody: ref, bodyId, dragHeight })
```

Add `dragCorridor`:

```ts
const { onPointerDown: rawDown, onPointerMove, onPointerUp: rawUp } = useDrag({ rigidBody: ref, bodyId, dragHeight, dragCorridor })
```

- [ ] **Step 1.5: Type-check + test + build**

Run: `npx tsc --noEmit`
Expected: 0 errors.

Run: `npm test -- --run`
Expected: 220 tests passing.

Run: `npm run build`
Expected: build succeeds (pre-existing chunk-size warning unchanged).

- [ ] **Step 1.6: Commit**

```bash
git add -A
git commit -m "feat(sdk): optional dragCorridor for axis-constrained drag through a bore"
```

---

## Task 2: Opt EM-induction's BarMagnet into the corridor

**Files:**
- Modify: `src/labs/electromagnetic-induction/objects/BarMagnet.tsx`

The corridor's `halfLength` must be `(coil's half-extent along x) + (magnet's half-length)` so the constraint activates BEFORE the magnet visually overlaps the helical wire (the magnet's leading edge reaches the coil's surface exactly when the magnet's center crosses the corridor boundary).

- [ ] **Step 2.1: Update BarMagnet.tsx**

Open `src/labs/electromagnetic-induction/objects/BarMagnet.tsx`. Replace the full file content with:

```tsx
import { Draggable } from '../../../sdk/object/Draggable'
import { COIL_CENTER } from '../physics/induction'
import { COIL_LENGTH } from '../instruments/Coil'

export const MAGNET_HALF_LENGTH = 0.045  // total length 9 cm
export const MAGNET_HALF_DEPTH = 0.012   // square cross-section 24 mm side
export const MAGNET_MASS_GRAMS = 80      // arbitrary — not used by EM-induction physics
export const BAR_MAGNET_BODY_ID = 'bar-magnet'

// Drag corridor — when the magnet's centre is within ±CORRIDOR_HALF_LENGTH of
// the coil's centre along x, the drag handler forces z to the coil bore axis.
// This guarantees the magnet enters the coil only through the bore, never
// clipping the helical wire mesh.
const CORRIDOR_HALF_LENGTH = COIL_LENGTH / 2 + MAGNET_HALF_LENGTH

type Props = { position: [number, number, number]; enabled?: boolean }

/**
 * Classic bar magnet — N pole red (#ff3b30), S pole blue (#0a84ff).
 * Draggable. Physics shape is a cuboid sized to match the visual mesh.
 */
export function BarMagnet({ position, enabled = true }: Props) {
  return (
    <Draggable
      position={position}
      mass={MAGNET_MASS_GRAMS}
      shape={{
        type: 'cuboid',
        halfExtents: [MAGNET_HALF_LENGTH, MAGNET_HALF_DEPTH, MAGNET_HALF_DEPTH],
      }}
      bodyId={BAR_MAGNET_BODY_ID}
      enabled={enabled}
      dragHeight={0.95}
      dragCorridor={{ center: COIL_CENTER, halfLength: CORRIDOR_HALF_LENGTH }}
    >
      {/* N pole (red) — left half (-x) */}
      <mesh position={[-MAGNET_HALF_LENGTH / 2, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[MAGNET_HALF_LENGTH, MAGNET_HALF_DEPTH * 2, MAGNET_HALF_DEPTH * 2]} />
        <meshStandardMaterial color="#ff3b30" metalness={0.6} roughness={0.4} envMapIntensity={0.5} />
      </mesh>
      {/* S pole (blue) — right half (+x) */}
      <mesh position={[MAGNET_HALF_LENGTH / 2, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[MAGNET_HALF_LENGTH, MAGNET_HALF_DEPTH * 2, MAGNET_HALF_DEPTH * 2]} />
        <meshStandardMaterial color="#0a84ff" metalness={0.6} roughness={0.4} envMapIntensity={0.5} />
      </mesh>
      {/* Tiny "N" / "S" letters on top face for clarity */}
      <mesh position={[-MAGNET_HALF_LENGTH / 2, MAGNET_HALF_DEPTH + 0.0005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[MAGNET_HALF_LENGTH * 0.6, MAGNET_HALF_DEPTH * 1.4]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.85} />
      </mesh>
      <mesh position={[MAGNET_HALF_LENGTH / 2, MAGNET_HALF_DEPTH + 0.0005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[MAGNET_HALF_LENGTH * 0.6, MAGNET_HALF_DEPTH * 1.4]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.85} />
      </mesh>
    </Draggable>
  )
}
```

Key changes vs the original:
- Added two imports: `COIL_CENTER` and `COIL_LENGTH`.
- Added module-level `CORRIDOR_HALF_LENGTH` constant.
- Added `dragCorridor={{ center: COIL_CENTER, halfLength: CORRIDOR_HALF_LENGTH }}` prop to `<Draggable>`.
- Everything else (meshes, materials, geometries, mass, half-extents) is unchanged.

- [ ] **Step 2.2: Type-check + test + build**

Run: `npx tsc --noEmit`
Expected: 0 errors.

Run: `npm test -- --run`
Expected: 220 tests passing.

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 2.3: Commit**

```bash
git add -A
git commit -m "fix(em-induction): bar magnet enters coil only through bore axis"
```

---

## Task 3: Keep magnet kinematic at bore centre after snap

**Files:**
- Modify: `src/labs/electromagnetic-induction/instruments/Coil.tsx`

One-flag change. The magnet currently snaps to bore centre and then falls because the snap is registered with `keepKinematic: false`.

- [ ] **Step 3.1: Flip keepKinematic and update comment**

Open `src/labs/electromagnetic-induction/instruments/Coil.tsx`. Find the `useEffect` that registers the coil snap (currently around lines 44–54):

```ts
  useEffect(() => {
    const unregister = registerSnap({
      id: 'coil-center',
      instrumentId: 'coil',
      position: new Vector3(...position),
      radius: COIL_SNAP_RADIUS,
      keepKinematic: false,
      onAttach: () => { /* magnet is free-form; no kinematic snap */ },
    })
    return unregister
  }, [position])
```

Replace with:

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

Two changes: `keepKinematic: false → true` and the inline comment text updated to reflect the new behaviour. No other edits to this file.

- [ ] **Step 3.2: Type-check + test + build**

Run: `npx tsc --noEmit`
Expected: 0 errors.

Run: `npm test -- --run`
Expected: 220 tests passing.

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3.3: Commit**

```bash
git add -A
git commit -m "fix(em-induction): magnet stays at bore centre after snap"
```

---

## Task 4: Final verification + push

**Files:** None modified. Verification only.

- [ ] **Step 4.1: Full clean run**

Run: `npx tsc --noEmit`
Expected: 0 errors.

Run: `npm run build`
Expected: build succeeds, only the pre-existing chunk-size warning.

Run: `npm test -- --run`
Expected: 220 tests passing, 0 failures.

- [ ] **Step 4.2: Sanity-check the diff**

Run: `git log --oneline master..HEAD`
Expected to show 3 commits in this order:
1. `feat(sdk): optional dragCorridor for axis-constrained drag through a bore`
2. `fix(em-induction): bar magnet enters coil only through bore axis`
3. `fix(em-induction): magnet stays at bore centre after snap`

Run: `git diff master..HEAD --stat`
Expected: 4 files changed, ~30 lines net added.

- [ ] **Step 4.3: Push the branch**

Run: `git push -u origin fix/coil-physics`
Expected: branch pushed to remote.

- [ ] **Step 4.4: Direct merge to master**

```bash
git checkout master
git merge --no-ff fix/coil-physics -m "Merge fix/coil-physics: bore corridor + magnet stays in coil"
git push origin master
```

Expected: master fast-forwards onto a merge commit; pushed; Vercel triggers prod deploy.

Stop here. User smoke-tests on iPhone:
1. Drag bar magnet toward coil — magnet only enters through the bore, never clips through the wire mesh.
2. Drop the magnet inside the coil — it stays floating at bore centre, does not fall.
3. Pick the magnet up again — drag works as before.
4. Drop the magnet far from the coil — it falls to the table as before (Dynamic body).
5. Open the mass-measurement lab — drag balls and weights as usual. No behaviour change.

---

## Self-Review Notes

**Spec coverage:**
- ✅ Slice A — Task 1 (SDK contract: `DragCorridor` type, optional prop, constraint application) + Task 2 (EM-induction consumer opts in).
- ✅ Slice B — Task 3 (`keepKinematic: true` + comment update).
- ✅ Acceptance criteria from both slices are covered by the per-task verification commands plus Step 4.4 user smoke-test list.
- ✅ Mass-measurement lab non-regression — Task 2 only changes the EM-induction `BarMagnet`. Mass-measurement's draggable objects (Apple, Baseball, TennisBall, Weights) do not pass `dragCorridor` to their `<Draggable>` calls, so the new optional prop defaults to `undefined` and the constraint never fires.

**Placeholder scan:** No "TBD" / "TODO" / "fill in later". Every step shows the full code or the full command with expected output.

**Type consistency:**
- `DragCorridor` defined in Task 1.1 with `{ center: Vector3; halfLength: number }`. Task 1.2 destructures it. Task 1.3 reads `dragCorridor.center.x`, `dragCorridor.halfLength`, `dragCorridor.center.z` — all match. Task 1.4 imports and forwards. Task 2.1 constructs the object with both fields — matches.
- `COIL_CENTER` type: `Vector3`. `COIL_LENGTH` type: `number`. `MAGNET_HALF_LENGTH` type: `number`. Arithmetic `COIL_LENGTH / 2 + MAGNET_HALF_LENGTH` returns `number` — matches `halfLength: number`.

**No new tests:** All changes are either a new optional prop (defaults to no-op) or a single flag flip. The 220-test suite already exercises the drag plane projection, the snap mechanism, and the EM-physics math; it serves as a regression gate for "nothing else got broken."

**Branch parallelism:** This fix is on top of the fresh `master` (`eea3a36`) which already contains Phase 3 + Touch+Responsive + Mobile-v2 + field-lines-scene-1. No other un-merged branches exist that touch the same files.
