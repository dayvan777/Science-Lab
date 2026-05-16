# EM Induction Phase 1 — Coil Axis Fix · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rotate the EM induction lab's coil 90° to a lateral (X-axis) orientation matching PhET and the user's reference photos, and make the drag-plane height configurable so the magnet can pass through the coil's bore.

**Architecture:** One small backward-compatible SDK change (`Draggable` gains an optional `dragHeight` prop) + targeted geometry/axis updates inside `src/labs/electromagnetic-induction/`. The mass-measurement lab is unchanged (default `dragHeight=1.0`). Test count stays at 138 — two direction assertions in the lab physics test get their velocity vectors rotated from z to x.

**Tech Stack:** React 19, R3F, three.js (`Vector3`, `CatmullRomCurve3`, `TubeGeometry`), Rapier physics via `@react-three/rapier`. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-05-14-em-induction-phase1-coil-axis-design.md`

---

## File map

```
MODIFIED
  src/sdk/physics/useDrag.ts                                          (Task 2)
  src/sdk/object/Draggable.tsx                                        (Task 3)
  src/labs/electromagnetic-induction/physics/induction.ts             (Task 4)
  src/labs/electromagnetic-induction/instruments/Coil.tsx             (Task 5)
  src/labs/electromagnetic-induction/instruments/Wires.tsx            (Task 6)
  src/labs/electromagnetic-induction/instruments/CoilStand.tsx        (Task 7)
  src/labs/electromagnetic-induction/objects/BarMagnet.tsx            (Task 8)
  tests/labs/em-induction.test.ts                                     (Task 9)
```

## Verification commands

```bash
npx tsc --noEmit                    # clean
npx vitest run                      # 138/138 green (no count change)
npm run build                       # clean
```

Manual smoke after the slice ships: open `/physics/em-induction`, complete Scene 1, then in Scene 2 drag the bar magnet from the left tray toward the right — it should visibly pass THROUGH the coil's bore (entering from the left, exiting to the right). The galvanometer needle should deflect right during entry and left during withdrawal.

---

## Task 1 — Branch off master

- [ ] **Step 1: Create branch**

```bash
git checkout -b fix/em-induction-phase1-coil-axis
```

- [ ] **Step 2: Confirm clean tree**

```bash
git status
```

Expected: `On branch fix/em-induction-phase1-coil-axis` / `nothing to commit, working tree clean`.

---

## Task 2 — `useDrag.ts`: configurable drag-plane height

**Files:**
- Modify: `src/sdk/physics/useDrag.ts`

Promote the module-level `DRAG_HEIGHT = 1.0` constant to a hook parameter, defaulting to 1.0 (backward-compatible — mass-measurement keeps its current behaviour).

- [ ] **Step 1: Update the `Props` type and hook signature**

Find (~line 10-11 in current file):

```ts
const DRAG_HEIGHT = 1.0
const SMOOTHING = 0.3
```

Delete the `DRAG_HEIGHT` constant line (keep `SMOOTHING`). Then find the existing `Props` type and the hook signature (~line 49-51):

```ts
type Props = { rigidBody: RefObject<RapierRigidBody | null>; bodyId?: string }

export function useDrag({ rigidBody, bodyId }: Props) {
```

Replace with:

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

export function useDrag({ rigidBody, bodyId, dragHeight = 1.0 }: Props) {
```

- [ ] **Step 2: Use `dragHeight` inside `intersectPlane`**

Find the `intersectPlane` callback (~line 58-67). The current body uses `DRAG_HEIGHT`:

```ts
  const intersectPlane = useCallback((ev: ThreeEvent<PointerEvent>) => {
    const native = ev.nativeEvent
    const rect = gl.domElement.getBoundingClientRect()
    const x = ((native.clientX - rect.left) / rect.width) * 2 - 1
    const y = -((native.clientY - rect.top) / rect.height) * 2 + 1
    const ndc = new Vector3(x, y, 0.5).unproject(camera)
    const dir = ndc.sub(camera.position).normalize()
    const t = -(camera.position.y - DRAG_HEIGHT) / dir.y
    return camera.position.clone().add(dir.multiplyScalar(t))
  }, [camera, gl])
```

Replace with:

```ts
  const intersectPlane = useCallback((ev: ThreeEvent<PointerEvent>) => {
    const native = ev.nativeEvent
    const rect = gl.domElement.getBoundingClientRect()
    const x = ((native.clientX - rect.left) / rect.width) * 2 - 1
    const y = -((native.clientY - rect.top) / rect.height) * 2 + 1
    const ndc = new Vector3(x, y, 0.5).unproject(camera)
    const dir = ndc.sub(camera.position).normalize()
    const t = -(camera.position.y - dragHeight) / dir.y
    return camera.position.clone().add(dir.multiplyScalar(t))
  }, [camera, gl, dragHeight])
```

(Two changes: `DRAG_HEIGHT` → `dragHeight`, and `dragHeight` added to the dep array.)

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit
```

Expected: clean.

---

## Task 3 — `Draggable.tsx`: accept `dragHeight` prop and forward to `useDrag`

**Files:**
- Modify: `src/sdk/object/Draggable.tsx`

- [ ] **Step 1: Add the prop to the Props type**

Find (~line 9-16):

```ts
type Props = {
  position: [number, number, number]
  mass: number          // grams
  shape: Shape
  bodyId?: string       // for guided step detection
  enabled?: boolean     // if false, pointer-down is blocked (object not pickable)
  children: ReactNode
}
```

Replace with:

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

- [ ] **Step 2: Forward the prop to `useDrag`**

Find the component function signature (~line 18) and the `useDrag` call (~line 21):

```ts
export function Draggable({ position, mass, shape, bodyId, enabled = true, children }: Props) {
  const ref = useRef<RapierRigidBody>(null)
  const setDragging = useStepEngine(s => s.setDragging)
  const { onPointerDown: rawDown, onPointerMove, onPointerUp: rawUp } = useDrag({ rigidBody: ref, bodyId })
```

Replace with:

```ts
export function Draggable({ position, mass, shape, bodyId, enabled = true, dragHeight, children }: Props) {
  const ref = useRef<RapierRigidBody>(null)
  const setDragging = useStepEngine(s => s.setDragging)
  const { onPointerDown: rawDown, onPointerMove, onPointerUp: rawUp } = useDrag({ rigidBody: ref, bodyId, dragHeight })
```

(Two changes: destructure `dragHeight` in props, pass it to `useDrag`.)

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit
```

Expected: clean.

---

## Task 4 — `induction.ts`: rotate `COIL_AXIS` to X

**Files:**
- Modify: `src/labs/electromagnetic-induction/physics/induction.ts`

- [ ] **Step 1: Replace `COIL_AXIS` and its JSDoc**

Find (~lines 9-14):

```ts
/**
 * Coil axis — magnetic flux through the coil is the component of the
 * magnet's velocity along this direction. Coil's bore is oriented along z
 * so the student drags the magnet toward/away from the camera.
 */
export const COIL_AXIS = new Vector3(0, 0, 1)
```

Replace with:

```ts
/**
 * Coil axis — magnetic flux through the coil is the component of the
 * magnet's velocity along this direction. Coil's bore is oriented along x
 * (lateral, left-right of the viewer), so the student drags the magnet
 * sideways through the bore. Matches the PhET Faraday Lab layout and the
 * user's reference photos.
 */
export const COIL_AXIS = new Vector3(1, 0, 0)
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

Expected: clean.

---

## Task 5 — `Coil.tsx`: build helix along X

**Files:**
- Modify: `src/labs/electromagnetic-induction/instruments/Coil.tsx`

The helix point loop currently constructs `(cos·R, sin·R, z)` along z. Swap to `(x, sin·R, cos·R)` so the helix lies along x with cross-section in the y-z plane.

- [ ] **Step 1: Replace the `buildCoilGeometry` body**

Find the function (~lines 19-35):

```ts
function buildCoilGeometry(): TubeGeometry {
  const SEGMENTS = 96
  const points: Vector3[] = []
  for (let i = 0; i <= SEGMENTS; i++) {
    const t = i / SEGMENTS
    const angle = t * COIL_TURNS * Math.PI * 2
    // axis along z: vary z linearly, oscillate x and y
    const z = -COIL_LENGTH / 2 + t * COIL_LENGTH
    points.push(new Vector3(
      Math.cos(angle) * COIL_OUTER_RADIUS,
      Math.sin(angle) * COIL_OUTER_RADIUS,
      z,
    ))
  }
  const curve = new CatmullRomCurve3(points)
  return new TubeGeometry(curve, SEGMENTS * 2, COIL_TUBE_RADIUS, 6, false)
}
```

Replace with:

```ts
function buildCoilGeometry(): TubeGeometry {
  const SEGMENTS = 96
  const points: Vector3[] = []
  for (let i = 0; i <= SEGMENTS; i++) {
    const t = i / SEGMENTS
    const angle = t * COIL_TURNS * Math.PI * 2
    // axis along x: vary x linearly, oscillate y and z (cross-section in y-z plane).
    const x = -COIL_LENGTH / 2 + t * COIL_LENGTH
    points.push(new Vector3(
      x,
      Math.sin(angle) * COIL_OUTER_RADIUS,
      Math.cos(angle) * COIL_OUTER_RADIUS,
    ))
  }
  const curve = new CatmullRomCurve3(points)
  return new TubeGeometry(curve, SEGMENTS * 2, COIL_TUBE_RADIUS, 6, false)
}
```

(Two real changes: linear sweep moved from `z` to `x`, and the trig oscillation moved from `(x, y)` to `(y, z)` with cos→z, sin→y — the cross-section is now perpendicular to x.)

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

Expected: clean.

---

## Task 6 — `Wires.tsx`: coil endpoints at X-extents

**Files:**
- Modify: `src/labs/electromagnetic-induction/instruments/Wires.tsx`

Coil endpoints previously sat at `(cx, cy − R, cz ± COIL_LENGTH/2)`. With the axis now along x, they sit at `(cx ± COIL_LENGTH/2, cy − R, cz)`.

- [ ] **Step 1: Replace the two coil-end Vector3 declarations**

Find (~lines 60-69):

```ts
  // Coil end attach points (z ends, outer radius below coil top)
  // The wires emerge from the BOTTOM of the coil (radius * sin(-π/2)) so they
  // drop down to the table and curve toward the next instrument.
  const coilRightEnd = new Vector3(
    coilCentre.x,
    coilCentre.y - COIL_OUTER_RADIUS,
    coilCentre.z + COIL_LENGTH / 2,
  )
  const coilLeftEnd = new Vector3(
    coilCentre.x,
    coilCentre.y - COIL_OUTER_RADIUS,
    coilCentre.z - COIL_LENGTH / 2,
  )
```

Replace with:

```ts
  // Coil end attach points — with the coil now oriented along world X, the
  // "left" end sits at -COIL_LENGTH/2 (low x) and "right" at +COIL_LENGTH/2.
  // Wires emerge from the BOTTOM of the coil (y - outerRadius) so they drop
  // down to the table and curve toward the next instrument.
  const coilRightEnd = new Vector3(
    coilCentre.x + COIL_LENGTH / 2,
    coilCentre.y - COIL_OUTER_RADIUS,
    coilCentre.z,
  )
  const coilLeftEnd = new Vector3(
    coilCentre.x - COIL_LENGTH / 2,
    coilCentre.y - COIL_OUTER_RADIUS,
    coilCentre.z,
  )
```

(Two changes: the `COIL_LENGTH / 2` offset moves from the `z` component to the `x` component for both ends. Updated the comment.)

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

Expected: clean.

---

## Task 7 — `CoilStand.tsx`: stands at X-extents, rotated geometry

**Files:**
- Modify: `src/labs/electromagnetic-induction/instruments/CoilStand.tsx`

The two stands now flank the coil's X-extents (its long axis). The block geometry rotates so it's wide along z and narrow along x — visually it's a thin slab supporting each end of the now-horizontal coil.

- [ ] **Step 1: Update the JSDoc, constants, and JSX**

Replace the entire file content with:

```tsx
import { RoundedBox } from '@react-three/drei'

/**
 * Two small wooden blocks at the coil's x-extents. The coil — now
 * oriented along world X (Phase 1 axis rotation) — visually rests on
 * them, hiding the air gap that would otherwise leave the coil floating
 * 6 cm above the table.
 *
 * Geometry (lab-local, in metres):
 *   - Stand height: 0.06 m (= coil_center.y 0.95 − coil_outer_r 0.04 − table_top 0.85)
 *   - Stand width (x):  0.025 (narrow — just peeks beyond the coil ends)
 *   - Stand depth (z):  0.05  (deeper into the scene — thin slab look)
 *   - Offset beyond coil ends: 0.005 m (5 mm peek)
 *
 * Material: dark walnut #2a1c10 to match the lab-clutter notebook and
 * read clearly as wood against the polished-metal galvanometer.
 */

export const STAND_HEIGHT = 0.06
const STAND_WIDTH = 0.025  // along x — narrow
const STAND_DEPTH = 0.05   // along z — deeper into the scene
const STAND_OFFSET_X = 0.005

type Props = {
  /** World position of the coil's centre (matches LabScene's COIL_WORLD). */
  coilWorld: [number, number, number]
  /** Coil's length along x (imported from Coil.tsx in the caller). */
  coilLength: number
  /** Coil's outer radius (imported from Coil.tsx) — determines stand top y. */
  coilOuterRadius: number
}

export function CoilStand({ coilWorld, coilLength, coilOuterRadius }: Props) {
  const [cx, cy, cz] = coilWorld
  // Stand top y = coil bottom y. Stand center y = stand_top − height/2.
  const standTopY = cy - coilOuterRadius
  const standCenterY = standTopY - STAND_HEIGHT / 2

  return (
    <group>
      <RoundedBox
        args={[STAND_WIDTH, STAND_HEIGHT, STAND_DEPTH]}
        radius={0.003}
        smoothness={4}
        position={[cx - coilLength / 2 - STAND_OFFSET_X, standCenterY, cz]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#2a1c10" roughness={0.75} envMapIntensity={0.25} />
      </RoundedBox>
      <RoundedBox
        args={[STAND_WIDTH, STAND_HEIGHT, STAND_DEPTH]}
        radius={0.003}
        smoothness={4}
        position={[cx + coilLength / 2 + STAND_OFFSET_X, standCenterY, cz]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#2a1c10" roughness={0.75} envMapIntensity={0.25} />
      </RoundedBox>
    </group>
  )
}
```

(Three real changes: JSDoc text now says "x-extents" not "z-extents"; constants renamed and reassigned per axes; positions move the `coilLength / 2 + STAND_OFFSET` from z to x.)

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

Expected: clean.

---

## Task 8 — `BarMagnet.tsx`: pass `dragHeight={0.95}`

**Files:**
- Modify: `src/labs/electromagnetic-induction/objects/BarMagnet.tsx`

- [ ] **Step 1: Pass the prop to `<Draggable>`**

Find the `<Draggable>` opening tag (~lines 16-25):

```tsx
    <Draggable
      position={position}
      mass={MAGNET_MASS_GRAMS}
      shape={{
        type: 'cuboid',
        halfExtents: [MAGNET_HALF_LENGTH, MAGNET_HALF_DEPTH, MAGNET_HALF_DEPTH],
      }}
      bodyId={BAR_MAGNET_BODY_ID}
      enabled={enabled}
    >
```

Replace with:

```tsx
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
    >
```

(One added prop, matching `COIL_CENTER.y = 0.95` so the magnet's drag plane aligns with the coil's bore centre.)

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

Expected: clean.

---

## Task 9 — `em-induction.test.ts`: rotate direction assertions to X-axis

**Files:**
- Modify: `tests/labs/em-induction.test.ts`

Two direction tests (`positive z-velocity`, `negative z-velocity`) need their velocity vectors rotated from z to x. The `EMF clamps` test uses `(0, 0, 100)` and `(0, 0, -100)` — also needs rotating to x. The "stationary" test and "far away" test work as-is (zero velocity / distance-gated, axis-agnostic).

- [ ] **Step 1: Update the four direction-related test cases**

Find the three test cases (~lines 25-44):

```ts
  it('positive z-velocity inside coil → positive EMF', () => {
    const pos = COIL_CENTER.clone()
    const vel = new Vector3(0, 0, 0.5)
    const emf = computeEMF(pos, vel)
    expect(emf).toBeGreaterThan(0)
  })

  it('negative z-velocity inside coil → negative EMF (Lenz)', () => {
    const pos = COIL_CENTER.clone()
    const vel = new Vector3(0, 0, -0.5)
    const emf = computeEMF(pos, vel)
    expect(emf).toBeLessThan(0)
  })

  it('EMF clamps at ±EMF_MAX even for very fast motion', () => {
    const pos = COIL_CENTER.clone()
    const fast = new Vector3(0, 0, 100)
    expect(computeEMF(pos, fast)).toBe(EMF_MAX)
    expect(computeEMF(pos, new Vector3(0, 0, -100))).toBe(-EMF_MAX)
  })
```

Replace with:

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

  it('EMF clamps at ±EMF_MAX even for very fast motion', () => {
    const pos = COIL_CENTER.clone()
    const fast = new Vector3(100, 0, 0)
    expect(computeEMF(pos, fast)).toBe(EMF_MAX)
    expect(computeEMF(pos, new Vector3(-100, 0, 0))).toBe(-EMF_MAX)
  })
```

(Velocity vectors rotated z→x in all three tests, plus titles updated to say "x-velocity".)

- [ ] **Step 2: Run the lab physics tests**

```bash
npx vitest run tests/labs/em-induction.test.ts | tail -5
```

Expected: `Tests  10 passed (10)` (all 10 lab physics tests green after the rotation).

---

## Task 10 — Final verify + single atomic commit

- [ ] **Step 1: Full verification**

```bash
npx tsc --noEmit
npx vitest run | tail -3
npm run build 2>&1 | tail -3
```

Expected: typecheck clean, **138/138 tests pass** (no count change), build succeeds.

- [ ] **Step 2: Commit**

```bash
git add src/sdk/physics/useDrag.ts \
        src/sdk/object/Draggable.tsx \
        src/labs/electromagnetic-induction/physics/induction.ts \
        src/labs/electromagnetic-induction/instruments/Coil.tsx \
        src/labs/electromagnetic-induction/instruments/Wires.tsx \
        src/labs/electromagnetic-induction/instruments/CoilStand.tsx \
        src/labs/electromagnetic-induction/objects/BarMagnet.tsx \
        tests/labs/em-induction.test.ts
git commit -m "fix(em-induction): Phase 1 — rotate coil to X axis, drag-plane to bore

After PhET-comparison research and user smoke-test, identified one
root cause behind all three reported symptoms:

  - Coil was oriented along z (toward camera). User refs + PhET use x
    (lateral).
  - Drag-plane forced to y=1.0 (hard-coded constant). Coil centre at
    y=0.95 → magnet rode 5 cm above the bore, never entered.
  - velAlongAxis = magnetVel.dot(COIL_AXIS=(0,0,1)) read only
    z-velocity, which is near-zero during horizontal drag → EMF ≈ 0 →
    galvanometer stuck.

Phase 1 fix — geometry + axis only:

SDK (backward-compatible):
- useDrag accepts dragHeight as a hook param (default 1.0).
- Draggable forwards an optional dragHeight prop. Mass-measurement
  unchanged.

Lab:
- COIL_AXIS = (1, 0, 0).
- buildCoilGeometry sweeps linearly along x; cross-section now in y-z.
- Wires endpoints at coil's x-extents (cx ± COIL_LENGTH/2).
- CoilStand flanks the coil from its left/right x-ends; rotated
  geometry (narrow along x, deep along z) so the slab visually
  cradles the new orientation.
- BarMagnet passes dragHeight=0.95, aligning the drag plane with
  COIL_CENTER.y for a clean pass-through.

Tests: 138 → 138. Two direction assertions in em-induction.test.ts
got their velocity vectors rotated z → x (along with the EMF-clamp
test); the 'stationary' and 'far away' tests stay axis-agnostic.

Phase 2 (field lines + Lenz current arrows) and Phase 3 (turns
selector + magnet strength) are out of scope and will land as
separate slices."
```

- [ ] **Step 3: Verify clean tree**

```bash
git status
```

Expected: `nothing to commit, working tree clean`.

---

## Self-review

**Spec coverage:**

- §SDK change (useDrag + Draggable, default 1.0, backward-compatible) → Tasks 2 + 3 ✓
- §Lab change (COIL_AXIS rotation) → Task 4 ✓
- §Coil geometry along X → Task 5 ✓
- §Wires endpoints at X-extents → Task 6 ✓
- §CoilStand at X-extents + rotated block geometry → Task 7 ✓
- §BarMagnet passes dragHeight=0.95 → Task 8 ✓
- §Tests updated (z→x direction assertions, EMF clamp) → Task 9 ✓
- §Acceptance criteria 1–9 → covered by Tasks 4–8 implementations + Task 10 verification (and manual smoke for visual flow)
- §Risks section noted layout consequence (long blue return wire) — not addressed here, deferred as visual polish if smoke shows it's ugly

**Placeholder scan:** every step has concrete file paths, complete replacement code blocks, exact commands. No "TBD" / "implement later" / "similar to".

**Type consistency:**
- `dragHeight?: number` defined in Task 2 (Props on useDrag); used in Task 3 (Draggable props + forwarded to useDrag); set to `0.95` in Task 8 (BarMagnet).
- `COIL_AXIS = new Vector3(1, 0, 0)` (Task 4) flows into `velAlongAxis = magnetVel.dot(COIL_AXIS)` inside `computeEMF` (unchanged) — same signature, just different constant.
- `buildCoilGeometry` (Task 5) emits a `TubeGeometry` of the same shape, just rotated — consumer in `Coil.tsx` doesn't need a change.
- `coilLeftEnd` / `coilRightEnd` in `Wires.tsx` (Task 6) keep the same names but coordinates rotate — downstream `makeWireCurve(start, end)` doesn't care which axis the path goes along.
- `STAND_WIDTH` / `STAND_DEPTH` in CoilStand (Task 7) keep their numeric values from the previous version; only their *labels* swap (semantic clarity), so `<RoundedBox args=[w, h, d]>` reads sensibly.
- Test imports unchanged (Task 9) — `COIL_CENTER`, `EMF_MAX`, `BULB_THRESHOLD`, `computeEMF`, `computeBulbBrightness`, `computeGalvanometerAngle` all exported from `physics/induction.ts` with unchanged signatures.

No fixes needed.
