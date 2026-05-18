# EM Induction Final Polish — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finalise the EM induction lab: add a second short magnet, remove confusing background decorations, and re-anchor the galvanometer needle at the top of the dial.

**Architecture:** Five tasks. **Task 1** generalises `BarMagnet` to take size/bodyId props, adds `activeMagnet` state, and mounts both magnets. **Task 2** removes the spool and spare-magnet decorations from `LabClutter`. **Task 3** flips the galvanometer needle to a top-anchored pendulum (group-as-pivot pattern). **Task 4** wires the active-magnet selection to `FieldLines` (per-magnet field) and `SceneController` (EMF reads the active body). **Task 5** verifies and merges.

**Tech Stack:** React 19, TypeScript, Zustand 5 (with persist), `@react-three/fiber`, `@react-three/rapier`, Three.js. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-05-17-em-induction-final-polish-design.md` (commit `aff76ba`).

**Branch:** `feat/em-induction-final-polish` (from `master` at commit `aff76ba`).

---

## File Structure

6 files modified, 0 new files.

| File | Slice | Change |
|---|---|---|
| `src/labs/electromagnetic-induction/state/LabSettingsState.ts` | A | Add `ActiveMagnet` type, `activeMagnet` field (default `'long'`), `setActiveMagnet` action. |
| `src/labs/electromagnetic-induction/objects/BarMagnet.tsx` | A | Generalise to take `halfLength`, `bodyId`, `magnetSize` as props. Drop `BAR_MAGNET_BODY_ID`. Export `LONG_MAGNET_HALF_LENGTH = 0.09` + `SHORT_MAGNET_HALF_LENGTH = 0.045`. `onTap` dispatches `setActiveMagnet(magnetSize)` and `setFocusTarget('magnet')`. |
| `src/labs/electromagnetic-induction/instruments/LabClutter.tsx` | B | Remove spool + spare-magnet mesh definitions and their Props fields. Keep notebook. |
| `src/labs/electromagnetic-induction/instruments/Galvanometer.tsx` | C | Flip `NEEDLE_PIVOT_Y_LOCAL` to top of face. Move `needleRef` from mesh to group. Offset mesh DOWN inside the group. Add small pivot dot. Flip rotation sign. |
| `src/labs/electromagnetic-induction/instruments/FieldLines.tsx` | D | Accept `magnetHalfLength: number` prop. Drop hard-coded `MAGNET_HALF_LENGTH` import. `makeFieldLine` takes `halfLength` as third arg. |
| `src/labs/electromagnetic-induction/scene/LabScene.tsx` | A + B + D | Mount two `<BarMagnet>` + two `<FieldLines>`. Remove LabClutter's spool + spare-magnet props. Replace `BAR_MAGNET_BODY_ID` references with literal strings. Add `activeMagnet` selector + dragging-body sync. Update `SceneController` to read active body. |

---

## Pre-flight

- [ ] **Step 0a: Confirm clean tree on master**

Run: `git status`
Expected: `nothing to commit, working tree clean`. HEAD at `aff76ba` on `master`.

- [ ] **Step 0b: Create feature branch**

Run: `git checkout -b feat/em-induction-final-polish`
Expected: `Switched to a new branch 'feat/em-induction-final-polish'`.

- [ ] **Step 0c: Baseline test run**

Run: `npm test -- --run`
Expected: `Tests 220 passed (220)`.

---

## Task 1 (Slice A): Two magnets + activeMagnet state

**Files:**
- Modify: `src/labs/electromagnetic-induction/state/LabSettingsState.ts`
- Modify: `src/labs/electromagnetic-induction/objects/BarMagnet.tsx`
- Modify: `src/labs/electromagnetic-induction/scene/LabScene.tsx`

This task generalises `BarMagnet` to accept size/bodyId props, adds the new `activeMagnet` state, and mounts both magnets. After this task, both magnets are visible and tappable, but the physics (EMF, field lines) still uses only the long one — that comes in Task 4.

- [ ] **Step 1.1: Extend LabSettingsState.ts**

Open `src/labs/electromagnetic-induction/state/LabSettingsState.ts`. Find the existing exports near the top:

```ts
export type CoilTurns = 3 | 5 | 10 | 20
export type MagnetStrength = 'weak' | 'normal' | 'strong'

const COIL_TURNS_CYCLE: CoilTurns[] = [3, 5, 10, 20]
const MAGNET_STRENGTH_CYCLE: MagnetStrength[] = ['weak', 'normal', 'strong']
```

Add a new exported type after them:

```ts
export type ActiveMagnet = 'long' | 'short'
```

Then find the `LabSettings` type. Currently:

```ts
type LabSettings = {
  fieldVisible: boolean
  coilTurns: CoilTurns
  magnetStrength: MagnetStrength
  setFieldVisible: (v: boolean) => void
  cycleCoilTurns: () => void
  cycleMagnetStrength: () => void
}
```

Add the new field + action:

```ts
type LabSettings = {
  fieldVisible: boolean
  coilTurns: CoilTurns
  magnetStrength: MagnetStrength
  activeMagnet: ActiveMagnet
  setFieldVisible: (v: boolean) => void
  cycleCoilTurns: () => void
  cycleMagnetStrength: () => void
  setActiveMagnet: (m: ActiveMagnet) => void
}
```

Then find the `create<LabSettings>` block. Currently:

```ts
export const useLabSettings = create<LabSettings>()(
  persist(
    (set, get) => ({
      fieldVisible: true,
      coilTurns: 10,
      magnetStrength: 'normal',
      setFieldVisible: (fieldVisible) => set({ fieldVisible }),
      cycleCoilTurns: () => {
        const idx = COIL_TURNS_CYCLE.indexOf(get().coilTurns)
        const next = COIL_TURNS_CYCLE[(idx + 1) % COIL_TURNS_CYCLE.length]
        set({ coilTurns: next })
      },
      cycleMagnetStrength: () => {
        const idx = MAGNET_STRENGTH_CYCLE.indexOf(get().magnetStrength)
        const next = MAGNET_STRENGTH_CYCLE[(idx + 1) % MAGNET_STRENGTH_CYCLE.length]
        set({ magnetStrength: next })
      },
    }),
    { name: 'em-induction.lab-settings' },
  ),
)
```

Replace with (add `activeMagnet` default + `setActiveMagnet` action):

```ts
export const useLabSettings = create<LabSettings>()(
  persist(
    (set, get) => ({
      fieldVisible: true,
      coilTurns: 10,
      magnetStrength: 'normal',
      activeMagnet: 'long',
      setFieldVisible: (fieldVisible) => set({ fieldVisible }),
      cycleCoilTurns: () => {
        const idx = COIL_TURNS_CYCLE.indexOf(get().coilTurns)
        const next = COIL_TURNS_CYCLE[(idx + 1) % COIL_TURNS_CYCLE.length]
        set({ coilTurns: next })
      },
      cycleMagnetStrength: () => {
        const idx = MAGNET_STRENGTH_CYCLE.indexOf(get().magnetStrength)
        const next = MAGNET_STRENGTH_CYCLE[(idx + 1) % MAGNET_STRENGTH_CYCLE.length]
        set({ magnetStrength: next })
      },
      setActiveMagnet: (activeMagnet) => set({ activeMagnet }),
    }),
    { name: 'em-induction.lab-settings' },
  ),
)
```

- [ ] **Step 1.2: Generalise BarMagnet.tsx**

Open `src/labs/electromagnetic-induction/objects/BarMagnet.tsx`. Replace the FULL file content with:

```tsx
import { Draggable } from '../../../sdk/object/Draggable'
import { COIL_CENTER } from '../physics/induction'
import { COIL_LENGTH } from '../instruments/Coil'
import { useCameraStore } from '../../../sdk/scene/cameraStore'
import { useLabSettings, type ActiveMagnet } from '../state/LabSettingsState'

export const LONG_MAGNET_HALF_LENGTH = 0.09    // total length 18 cm
export const SHORT_MAGNET_HALF_LENGTH = 0.045  // total length 9 cm
export const MAGNET_HALF_DEPTH = 0.012         // square cross-section 24 mm side
export const MAGNET_MASS_GRAMS = 80            // arbitrary — not used by EM-induction physics

type Props = {
  position: [number, number, number]
  enabled?: boolean
  /** Half-length along x. Long magnet uses LONG_MAGNET_HALF_LENGTH (0.09);
   *  short magnet uses SHORT_MAGNET_HALF_LENGTH (0.045). */
  halfLength: number
  /** Physics body identifier. Use 'bar-magnet-long' or 'bar-magnet-short'
   *  so SceneController can pick the right body for EMF computation. */
  bodyId: string
  /** Which magnet variant this instance is. Dispatched to setActiveMagnet
   *  when the user taps or starts dragging it. */
  magnetSize: ActiveMagnet
}

/**
 * Classic bar magnet — N pole red (#ff3b30), S pole blue (#0a84ff).
 * Draggable. Physics shape is a cuboid sized to match the visual mesh.
 *
 * Two instances are mounted in LabScene: a long one (18 cm) and a short
 * one (9 cm). Only one is "active" at a time per useLabSettings; tapping
 * or dragging a magnet selects it.
 */
export function BarMagnet({ position, enabled = true, halfLength, bodyId, magnetSize }: Props) {
  const setFocusTarget = useCameraStore(s => s.setFocusTarget)
  const setActiveMagnet = useLabSettings(s => s.setActiveMagnet)

  // Corridor activation: when the magnet's centre is within ±corridorHalfLength
  // of the coil's centre along x, drag z is forced to bore axis. Per-magnet
  // because the corridor extent depends on the magnet's length.
  const corridorHalfLength = COIL_LENGTH / 2 + halfLength

  const handleTap = () => {
    setActiveMagnet(magnetSize)
    setFocusTarget('magnet')
  }

  return (
    <Draggable
      position={position}
      mass={MAGNET_MASS_GRAMS}
      shape={{
        type: 'cuboid',
        halfExtents: [halfLength, MAGNET_HALF_DEPTH, MAGNET_HALF_DEPTH],
      }}
      bodyId={bodyId}
      enabled={enabled}
      dragHeight={0.95}
      dragCorridor={{ center: COIL_CENTER, halfLength: corridorHalfLength }}
      onTap={handleTap}
    >
      {/* N pole (red) — left half (-x) */}
      <mesh position={[-halfLength / 2, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[halfLength, MAGNET_HALF_DEPTH * 2, MAGNET_HALF_DEPTH * 2]} />
        <meshStandardMaterial color="#ff3b30" metalness={0.6} roughness={0.4} envMapIntensity={0.5} />
      </mesh>
      {/* S pole (blue) — right half (+x) */}
      <mesh position={[halfLength / 2, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[halfLength, MAGNET_HALF_DEPTH * 2, MAGNET_HALF_DEPTH * 2]} />
        <meshStandardMaterial color="#0a84ff" metalness={0.6} roughness={0.4} envMapIntensity={0.5} />
      </mesh>
      {/* Tiny "N" / "S" letters on top face for clarity */}
      <mesh position={[-halfLength / 2, MAGNET_HALF_DEPTH + 0.0005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[halfLength * 0.6, MAGNET_HALF_DEPTH * 1.4]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.85} />
      </mesh>
      <mesh position={[halfLength / 2, MAGNET_HALF_DEPTH + 0.0005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[halfLength * 0.6, MAGNET_HALF_DEPTH * 1.4]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.85} />
      </mesh>
    </Draggable>
  )
}
```

Key changes from the original:
- `MAGNET_HALF_LENGTH` → `LONG_MAGNET_HALF_LENGTH` + new `SHORT_MAGNET_HALF_LENGTH`.
- `BAR_MAGNET_BODY_ID` constant removed (each instance gets its own string from `bodyId` prop).
- Props now include `halfLength`, `bodyId`, `magnetSize`.
- `onTap` calls both `setActiveMagnet(magnetSize)` AND `setFocusTarget('magnet')`.
- `corridorHalfLength` is computed per-instance from `halfLength`.
- All visual meshes use `halfLength` (the prop) instead of the hard-coded constant.

- [ ] **Step 1.3: Update LabScene.tsx — replace single magnet with two**

Open `src/labs/electromagnetic-induction/scene/LabScene.tsx`. Find the existing imports for `BarMagnet`:

```ts
import { BarMagnet, BAR_MAGNET_BODY_ID } from '../objects/BarMagnet'
```

Replace with:

```ts
import { BarMagnet, LONG_MAGNET_HALF_LENGTH, SHORT_MAGNET_HALF_LENGTH } from '../objects/BarMagnet'
```

Find the `MAGNET_TRAY_WORLD` constant (around line 38):

```ts
const MAGNET_TRAY_WORLD: [number, number, number] = [-0.40, 0.94, 0.30]
```

Add a second tray position below it:

```ts
const MAGNET_TRAY_WORLD: [number, number, number] = [-0.40, 0.94, 0.30]
const SHORT_MAGNET_TRAY_WORLD: [number, number, number] = [-0.40, 0.94, 0.50]
```

Find the existing `<BarMagnet>` element (around line 252):

```tsx
<BarMagnet position={MAGNET_TRAY_WORLD} enabled={phase === 'in-progress'} />
```

Replace with two magnets:

```tsx
<BarMagnet
  position={MAGNET_TRAY_WORLD}
  enabled={phase === 'in-progress'}
  halfLength={LONG_MAGNET_HALF_LENGTH}
  bodyId="bar-magnet-long"
  magnetSize="long"
/>
<BarMagnet
  position={SHORT_MAGNET_TRAY_WORLD}
  enabled={phase === 'in-progress'}
  halfLength={SHORT_MAGNET_HALF_LENGTH}
  bodyId="bar-magnet-short"
  magnetSize="short"
/>
```

Find the existing FieldLines line:

```tsx
<FieldLines magnetBodyId={BAR_MAGNET_BODY_ID} visible={fieldVisible} opacityScale={opacityScale} />
```

Replace `BAR_MAGNET_BODY_ID` with the literal string `"bar-magnet-long"` (Task 4 will mount the second FieldLines):

```tsx
<FieldLines magnetBodyId="bar-magnet-long" visible={fieldVisible} opacityScale={opacityScale} />
```

Find the SceneController function. The body lookup uses `findBodyByTag(BAR_MAGNET_BODY_ID)`:

```ts
const body = findBodyByTag(BAR_MAGNET_BODY_ID)
```

Replace with the literal:

```ts
const body = findBodyByTag('bar-magnet-long')
```

(Task 4 will swap this with active-magnet logic.)

- [ ] **Step 1.4: Type-check + test + build**

Run: `npx tsc --noEmit`
Expected: 0 errors.

Run: `npm test -- --run`
Expected: 220 tests passing.

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 1.5: Commit**

```bash
git add -A
git commit -m "feat(em-induction): two-magnet support — long + short, activeMagnet state"
```

---

## Task 2 (Slice B): Remove background clutter (spool + spare magnet)

**Files:**
- Modify: `src/labs/electromagnetic-induction/instruments/LabClutter.tsx`
- Modify: `src/labs/electromagnetic-induction/scene/LabScene.tsx`

User reports the spool (small coil-like prop) and spare-magnet (decorative bar magnet) in the background look like duplicate equipment and confuse the scene. Remove them. Notebook stays.

- [ ] **Step 2.1: Strip LabClutter.tsx to notebook only**

Open `src/labs/electromagnetic-induction/instruments/LabClutter.tsx`. Replace the FULL file content with:

```tsx
import { RoundedBox } from '@react-three/drei'

const NOTEBOOK_W = 0.14
const NOTEBOOK_D = 0.10
const NOTEBOOK_H = 0.008

type Props = {
  /** World position of the notebook (front of the table, near magnet tray). */
  notebookWorld: [number, number, number]
}

/**
 * Decorative lab notebook — purely visual, no physics. Adds the "lived-in
 * lab desk" feel. Spool + spare-magnet were removed (they read as duplicate
 * coil + magnet, confusing the scene).
 */
export function LabClutter({ notebookWorld }: Props) {
  return (
    <group>
      {/* Notebook — dark blue cover, slightly rotated */}
      <RoundedBox
        args={[NOTEBOOK_W, NOTEBOOK_H, NOTEBOOK_D]}
        radius={0.001}
        smoothness={2}
        position={notebookWorld}
        rotation={[0, Math.PI / 12, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#1a3060" roughness={0.70} envMapIntensity={0.30} />
      </RoundedBox>
      {/* Page-edge stripe sitting just above the notebook top face */}
      <mesh
        position={[notebookWorld[0], notebookWorld[1] + NOTEBOOK_H / 2 + 0.0005, notebookWorld[2]]}
        rotation={[0, Math.PI / 12, 0]}
      >
        <boxGeometry args={[NOTEBOOK_W * 0.98, 0.0008, NOTEBOOK_D * 0.98]} />
        <meshStandardMaterial color="#e0d8c0" roughness={0.9} />
      </mesh>
    </group>
  )
}
```

Key changes from the original:
- Drop `SPOOL_R`, `SPOOL_H`, `SPARE_MAGNET_L`, `SPARE_MAGNET_THICK` constants.
- Props type drops `spoolWorld` and `spareMagnetWorld`.
- Function signature drops the corresponding params.
- Drop the spool `<group position={spoolWorld}>` block and the spare-magnet `<group>` block.
- Component now renders only the notebook.

- [ ] **Step 2.2: Remove unused world constants + props in LabScene.tsx**

Open `src/labs/electromagnetic-induction/scene/LabScene.tsx`. Find the decorative-position constants (around lines 42-46):

```ts
// Decorative clutter positions — chosen so they don't overlap any
// interactive object and don't intersect the camera's focus-coil framing.
const NOTEBOOK_WORLD: [number, number, number] = [-0.55, 0.86, 0.30]
const SPOOL_WORLD: [number, number, number] = [0.10, 0.86, -0.35]
const SPARE_MAGNET_WORLD: [number, number, number] = [0.55, 0.86, -0.30]
```

Replace with (keep only notebook):

```ts
// Decorative clutter position — chosen so it doesn't overlap any
// interactive object and doesn't intersect the camera's focus-coil framing.
const NOTEBOOK_WORLD: [number, number, number] = [-0.55, 0.86, 0.30]
```

Then find the `<LabClutter>` JSX:

```tsx
<LabClutter
  notebookWorld={NOTEBOOK_WORLD}
  spoolWorld={SPOOL_WORLD}
  spareMagnetWorld={SPARE_MAGNET_WORLD}
/>
```

Replace with:

```tsx
<LabClutter notebookWorld={NOTEBOOK_WORLD} />
```

- [ ] **Step 2.3: Type-check + test + build**

Run: `npx tsc --noEmit`
Expected: 0 errors.

Run: `npm test -- --run`
Expected: 220 tests passing.

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 2.4: Commit**

```bash
git add -A
git commit -m "feat(em-induction): remove background spool + spare-magnet decorations"
```

---

## Task 3 (Slice C): Galvanometer needle pivot at TOP

**Files:**
- Modify: `src/labs/electromagnetic-induction/instruments/Galvanometer.tsx`

The needle currently rotates around its middle because the rotation is applied to the mesh (whose origin is the box's centre) rather than to the wrapping group. Flip the pivot to the TOP of the dial and rotate the GROUP so the needle hangs down like a pendulum.

- [ ] **Step 3.1: Update imports + pivot constant**

Open `src/labs/electromagnetic-induction/instruments/Galvanometer.tsx`. Find the imports:

```ts
import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import type { Mesh } from 'three'
import { useInductionReadings } from '../state/InductionReadings'
import { createGalvanometerDialTexture } from '../textures/galvanometerDial'
import { springStep } from '../../../sdk/animation'
import { useTapDetector } from '../../../sdk/object/useTapDetector'
import { useCameraStore } from '../../../sdk/scene/cameraStore'
```

Replace `import type { Mesh } from 'three'` with:

```ts
import type { Group } from 'three'
```

Then find the constants block (around lines 11–17):

```ts
const HOUSING_W = 0.16
const HOUSING_H = 0.18
const HOUSING_D = 0.06
const FACE_W = 0.13
const FACE_H = 0.13
const NEEDLE_LEN = 0.05
const NEEDLE_PIVOT_Y_LOCAL = -FACE_H / 2 + 0.005  // near the bottom of the face
```

Change `NEEDLE_PIVOT_Y_LOCAL` to the TOP:

```ts
const HOUSING_W = 0.16
const HOUSING_H = 0.18
const HOUSING_D = 0.06
const FACE_W = 0.13
const FACE_H = 0.13
const NEEDLE_LEN = 0.05
const NEEDLE_PIVOT_Y_LOCAL = +FACE_H / 2 - 0.005  // near the TOP of the face (needle hangs down from here)
```

- [ ] **Step 3.2: Change needleRef type + rotation sign**

In the same file, find the existing refs (around line 26):

```ts
const needleRef = useRef<Mesh>(null)
```

Replace with:

```ts
const needleRef = useRef<Group>(null)
```

Then find the rotation line inside `useFrame` (around line 56):

```ts
if (needleRef.current) {
  needleRef.current.rotation.z = -r.current
}
```

Flip the sign (pivot is now at top, so positive EMF needs the opposite rotation direction to keep "right deflection" semantics):

```ts
if (needleRef.current) {
  needleRef.current.rotation.z = r.current
}
```

- [ ] **Step 3.3: Restructure needle JSX**

Still in `Galvanometer.tsx`, find the existing needle JSX (around lines 80-86):

```tsx
{/* Needle — thin red box rotating around its base */}
<group position={[0, HOUSING_H / 2 + NEEDLE_PIVOT_Y_LOCAL, HOUSING_D / 2 + 0.002]}>
  <mesh ref={needleRef} position={[0, NEEDLE_LEN / 2, 0]}>
    <boxGeometry args={[0.0028, NEEDLE_LEN, 0.002]} />
    <meshStandardMaterial color="#ff3b30" emissive="#ff3b30" emissiveIntensity={0.7} toneMapped={false} />
  </mesh>
</group>
```

Replace with:

```tsx
{/* Needle — thin red box hanging DOWN from a pivot at the top of the face.
    Rotation is applied to the wrapping group (whose origin IS the pivot),
    so the needle swings like a clock pendulum. A small black sphere marks
    the pivot point visibly. */}
<group
  ref={needleRef}
  position={[0, HOUSING_H / 2 + NEEDLE_PIVOT_Y_LOCAL, HOUSING_D / 2 + 0.002]}
>
  <mesh position={[0, -NEEDLE_LEN / 2, 0]}>
    <boxGeometry args={[0.0028, NEEDLE_LEN, 0.002]} />
    <meshStandardMaterial color="#ff3b30" emissive="#ff3b30" emissiveIntensity={0.7} toneMapped={false} />
  </mesh>
  {/* Pivot dot — small black sphere at the group origin (the pivot itself) */}
  <mesh>
    <sphereGeometry args={[0.004, 8, 8]} />
    <meshStandardMaterial color="#0a0a0a" metalness={0.8} roughness={0.2} />
  </mesh>
</group>
```

Key changes:
- `ref={needleRef}` moved from the inner `<mesh>` to the outer `<group>` (rotation applied to the group).
- Mesh `position={[0, NEEDLE_LEN / 2, 0]}` (was UP) → `position={[0, -NEEDLE_LEN / 2, 0]}` (DOWN). So the needle extends from the group origin DOWN by its length.
- New small sphere mesh at group origin marks the pivot point.
- Updated inline comment.

- [ ] **Step 3.4: Type-check + test + build**

Run: `npx tsc --noEmit`
Expected: 0 errors.

Run: `npm test -- --run`
Expected: 220 tests passing.

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3.5: Commit**

```bash
git add -A
git commit -m "feat(em-induction): galvanometer needle pivots from top of dial (pendulum)"
```

---

## Task 4 (Slice D): Wire active magnet to FieldLines + SceneController

**Files:**
- Modify: `src/labs/electromagnetic-induction/instruments/FieldLines.tsx`
- Modify: `src/labs/electromagnetic-induction/scene/LabScene.tsx`

`FieldLines` becomes magnet-size-aware (the field-line tip positions depend on the magnet's length). LabScene mounts TWO FieldLines (one per magnet) and toggles their visibility based on `activeMagnet`. SceneController reads the active body for EMF.

- [ ] **Step 4.1: FieldLines accepts magnetHalfLength prop**

Open `src/labs/electromagnetic-induction/instruments/FieldLines.tsx`. Find the import of `MAGNET_HALF_LENGTH`:

```ts
import { MAGNET_HALF_LENGTH } from '../objects/BarMagnet'
```

Remove this line entirely (the constant no longer exists — replaced by `LONG_MAGNET_HALF_LENGTH` / `SHORT_MAGNET_HALF_LENGTH`, but FieldLines takes it as a prop now).

Find the `Props` type:

```ts
type Props = {
  /** Body-id of the bar magnet (matches Draggable.bodyId). */
  magnetBodyId: string
  /** When false, the entire group fades to opacity 0 over ~250 ms. */
  visible: boolean
  /** Multiplier on the field-line opacity (e.g. 0.5 weak, 1.0 normal, 1.5 strong). */
  opacityScale: number
}
```

Add `magnetHalfLength`:

```ts
type Props = {
  /** Body-id of the bar magnet (matches Draggable.bodyId). */
  magnetBodyId: string
  /** When false, the entire group fades to opacity 0 over ~250 ms. */
  visible: boolean
  /** Multiplier on the field-line opacity (e.g. 0.5 weak, 1.0 normal, 1.5 strong). */
  opacityScale: number
  /** Half-length of the magnet this field belongs to. Used to place the
   *  N/S tip points of each curve. Long magnet: 0.09; short magnet: 0.045. */
  magnetHalfLength: number
}
```

Find the `makeFieldLine` function (around line 51):

```ts
function makeFieldLine(extent: number, mirror: boolean): CatmullRomCurve3 {
  const sign = mirror ? -1 : 1
  const yMax = extent * 0.85
  return new CatmullRomCurve3(
    [
      new Vector3(-MAGNET_HALF_LENGTH, 0, 0),
      new Vector3(-extent * 0.5, sign * yMax * 0.6, 0),
      new Vector3(0, sign * yMax, 0),
      new Vector3(extent * 0.5, sign * yMax * 0.6, 0),
      new Vector3(MAGNET_HALF_LENGTH, 0, 0),
    ],
    false,
    'catmullrom',
    0.5,
  )
}
```

Add `halfLength: number` as a third arg, replace `MAGNET_HALF_LENGTH` with `halfLength`:

```ts
function makeFieldLine(extent: number, mirror: boolean, halfLength: number): CatmullRomCurve3 {
  const sign = mirror ? -1 : 1
  const yMax = extent * 0.85
  return new CatmullRomCurve3(
    [
      new Vector3(-halfLength, 0, 0),
      new Vector3(-extent * 0.5, sign * yMax * 0.6, 0),
      new Vector3(0, sign * yMax, 0),
      new Vector3(extent * 0.5, sign * yMax * 0.6, 0),
      new Vector3(halfLength, 0, 0),
    ],
    false,
    'catmullrom',
    0.5,
  )
}
```

Then find the `FieldLines` function signature:

```ts
export function FieldLines({ magnetBodyId, visible, opacityScale }: Props) {
```

Add `magnetHalfLength`:

```ts
export function FieldLines({ magnetBodyId, visible, opacityScale, magnetHalfLength }: Props) {
```

Find both calls to `makeFieldLine` (inside the `geometries` useMemo and the `arrowTransforms` useMemo). They currently look like:

```ts
out.push(new TubeGeometry(makeFieldLine(extent, false), PATH_SEGMENTS, TUBE_RADIUS, RADIAL_SEGMENTS, false))
out.push(new TubeGeometry(makeFieldLine(extent, true), PATH_SEGMENTS, TUBE_RADIUS, RADIAL_SEGMENTS, false))
```

and

```ts
const curve = makeFieldLine(extent, mirror)
```

Update both to pass `magnetHalfLength`:

```ts
out.push(new TubeGeometry(makeFieldLine(extent, false, magnetHalfLength), PATH_SEGMENTS, TUBE_RADIUS, RADIAL_SEGMENTS, false))
out.push(new TubeGeometry(makeFieldLine(extent, true, magnetHalfLength), PATH_SEGMENTS, TUBE_RADIUS, RADIAL_SEGMENTS, false))
```

and

```ts
const curve = makeFieldLine(extent, mirror, magnetHalfLength)
```

The `geometries` and `arrowTransforms` `useMemo` deps must now include `magnetHalfLength`:

Find:
```ts
}, [])
```
on both useMemo calls. Replace with:
```ts
}, [magnetHalfLength])
```

- [ ] **Step 4.2: LabScene mounts two FieldLines + active-magnet selectors**

Open `src/labs/electromagnetic-induction/scene/LabScene.tsx`. Find the existing selectors near the top of the `LabScene` function (added in earlier tasks):

```ts
const coilTurns = useLabSettings((s) => s.coilTurns)
const magnetStrength = useLabSettings((s) => s.magnetStrength)
```

Add an `activeMagnet` selector right after:

```ts
const coilTurns = useLabSettings((s) => s.coilTurns)
const magnetStrength = useLabSettings((s) => s.magnetStrength)
const activeMagnet = useLabSettings((s) => s.activeMagnet)
```

Find the existing single `<FieldLines>` line:

```tsx
<FieldLines magnetBodyId="bar-magnet-long" visible={fieldVisible} opacityScale={opacityScale} />
```

Replace with TWO FieldLines, one per magnet:

```tsx
<FieldLines
  magnetBodyId="bar-magnet-long"
  magnetHalfLength={LONG_MAGNET_HALF_LENGTH}
  visible={fieldVisible && activeMagnet === 'long'}
  opacityScale={opacityScale}
/>
<FieldLines
  magnetBodyId="bar-magnet-short"
  magnetHalfLength={SHORT_MAGNET_HALF_LENGTH}
  visible={fieldVisible && activeMagnet === 'short'}
  opacityScale={opacityScale}
/>
```

- [ ] **Step 4.3: SceneController reads active body**

Still in `LabScene.tsx`, find the SceneController's `useFrame` body. Currently:

```ts
useFrame(({ clock }, delta) => {
  const body = findBodyByTag('bar-magnet-long')
  if (!body) return
  // ...
```

Read the active magnet from the settings store (via `getState()` to avoid re-render) and use the corresponding body ID:

```ts
useFrame(({ clock }, delta) => {
  const activeBodyId =
    useLabSettings.getState().activeMagnet === 'long'
      ? 'bar-magnet-long'
      : 'bar-magnet-short'
  const body = findBodyByTag(activeBodyId)
  if (!body) return
  // ...
```

- [ ] **Step 4.4: SceneController syncs activeMagnet to dragging body**

Still in `SceneController` (the function inside LabScene). After the existing trigger-state reset `useEffect` (which keys on `currentSceneIdx, currentStepIdx`), add a new `useEffect` that watches `useStepEngine.draggingBodyId` and syncs `activeMagnet`.

Find the existing reset effect:

```ts
// Reset trigger-state on scene change
useEffect(() => {
  wasInside.current = false
  nearAccumulatedMs.current = 0
  stationaryAccumulatedMs.current = 0
}, [currentSceneIdx, currentStepIdx])
```

Right BELOW it (still inside `SceneController`), add:

```ts
// Sync activeMagnet to whichever magnet is currently being dragged.
// Belt-and-suspenders with BarMagnet's onTap dispatch — handles the case
// where the student starts a drag without first tapping.
const draggingBodyId = useStepEngine(s => s.draggingBodyId)
useEffect(() => {
  if (draggingBodyId === 'bar-magnet-long') {
    useLabSettings.getState().setActiveMagnet('long')
  } else if (draggingBodyId === 'bar-magnet-short') {
    useLabSettings.getState().setActiveMagnet('short')
  }
}, [draggingBodyId])
```

- [ ] **Step 4.5: Type-check + test + build**

Run: `npx tsc --noEmit`
Expected: 0 errors.

Run: `npm test -- --run`
Expected: 220 tests passing.

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4.6: Commit**

```bash
git add -A
git commit -m "feat(em-induction): wire active magnet to FieldLines + EMF"
```

---

## Task 5: Final verification + push + direct-merge to master

**Files:** None modified. Verification only.

- [ ] **Step 5.1: Full clean run**

Run: `npx tsc --noEmit`
Expected: 0 errors.

Run: `npm run build`
Expected: build succeeds, only the pre-existing chunk-size warning.

Run: `npm test -- --run`
Expected: 220 tests passing.

- [ ] **Step 5.2: Sanity-check the diff**

Run: `git log --oneline master..HEAD`
Expected to show 4 commits in this order:
1. `feat(em-induction): two-magnet support — long + short, activeMagnet state`
2. `feat(em-induction): remove background spool + spare-magnet decorations`
3. `feat(em-induction): galvanometer needle pivots from top of dial (pendulum)`
4. `feat(em-induction): wire active magnet to FieldLines + EMF`

Run: `git diff master..HEAD --stat`
Expected: ~6 files changed, ~100 lines net.

- [ ] **Step 5.3: Push the branch**

Run: `git push -u origin feat/em-induction-final-polish`
Expected: branch pushed to remote.

- [ ] **Step 5.4: Direct-merge to master**

```bash
git checkout master
git merge --no-ff feat/em-induction-final-polish -m "Merge feat/em-induction-final-polish: two magnets, clean background, top-pivot needle"
git push origin master
```

Expected: master fast-forwards onto a merge commit; pushed; Vercel triggers prod deploy.

- [ ] **Step 5.5: User smoke-test (after Vercel deploys)**

On iPhone, open `science-lab-phi.vercel.app` → EM induction lab:
1. Two magnets visible on table (long front, short behind).
2. Drag long magnet through coil → galvanometer responds; long magnet's field lines visible.
3. Tap short magnet → field lines swap (long fades out, short fades in over ~250ms). Camera also focuses on magnet area.
4. Drag short magnet through coil → galvanometer responds; short magnet's field lines visible.
5. Background: no spool, no spare magnet. Notebook still on table.
6. Galvanometer needle anchored at TOP of dial face (visible black sphere marks the pivot). Tip swings at BOTTOM, like a pendulum. Positive EMF (drag right-to-left through coil) → tip swings RIGHT.
7. Refresh page → last-active magnet persists.
8. Mass-measurement lab → balls/weights still drag and snap as before.

---

## Self-Review Notes

**Spec coverage:**
- ✅ Slice A — Tasks 1.1 (state) + 1.2 (BarMagnet) + 1.3 (mount two).
- ✅ Slice B — Tasks 2.1 (LabClutter strip) + 2.2 (LabScene constants/props).
- ✅ Slice C — Tasks 3.1 (constant) + 3.2 (ref type + rotation sign) + 3.3 (JSX restructure).
- ✅ Slice D — Tasks 4.1 (FieldLines) + 4.2 (LabScene two mounts) + 4.3 (SceneController body) + 4.4 (draggingBodyId sync).
- ✅ Smoke-test list in 5.5 covers all 8 acceptance criteria.

**Placeholder scan:** No "TBD" / "TODO" / "fill in later". Every step shows full code or full command.

**Type consistency:**
- `ActiveMagnet` defined in Task 1.1 as `'long' | 'short'`. Used in BarMagnet's `magnetSize` prop (Task 1.2), LabScene's mounts (Task 1.3), and SceneController's body-id lookup (Task 4.3). String literals match.
- `LONG_MAGNET_HALF_LENGTH = 0.09` and `SHORT_MAGNET_HALF_LENGTH = 0.045` exported from BarMagnet in Task 1.2 and imported by LabScene in Task 1.3 + Task 4.2.
- `magnetHalfLength: number` prop added to FieldLines in Task 4.1; passed from LabScene in Task 4.2.
- bodyId strings `'bar-magnet-long'` and `'bar-magnet-short'` used consistently across Task 1.3 (mount), Task 4.2 (FieldLines), Task 4.3 (SceneController), Task 4.4 (sync effect).
- needleRef type changed from `Mesh` to `Group` in Task 3.2 — must match the JSX target (the wrapping `<group ref={needleRef}>` in Task 3.3). Consistent.

**Rotation sign caveat:** Task 3.2 flips the sign from `-r.current` to `r.current`. Task 5.5's smoke-test step 6 verifies the visible direction (positive EMF → right deflection). If wrong in practice, the implementer can flip the sign back in a follow-up tiny commit.

**No new tests:** All changes are visual / state / behaviour. The 220-test suite (physics math + step engine) stays as regression gate.

**Branch parallelism:** This work is on top of fresh master (`aff76ba`) which includes all prior merges (Phase 3 + Touch+Responsive + Mobile-v2 + field-lines + coil-physics + Polish v3 + Focus Nav). No conflicting open branches.

**Mass-measurement regression check:** Slice A's BarMagnet refactor is EM-induction-specific. Slice B's LabClutter is mounted only in EM-induction. Slice C's Galvanometer is EM-induction-specific. Slice D's FieldLines + SceneController are EM-induction-specific. Mass-measurement lab is unaffected. Step 5.5.8 explicitly verifies.
