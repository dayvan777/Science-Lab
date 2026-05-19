# EM Induction Final Polish v2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Three follow-up polish items: galvanometer needle anchored at the BOTTOM (speedometer-style), field arrows pointing the correct direction (N→S externally), and a Blender-style click-on-any-point camera focus.

**Architecture:** Slice A is a focused JSX/constant change in `Galvanometer.tsx` (revert pivot to bottom, flip the mesh offset back to UP, restore rotation sign). Slice B is a one-line `.negate()` on the tangent inside `FieldLines.tsx`. Slice C is the bigger feature: extend `useTapDetector` to pass the pointer event, add `freeFocusPoint` to `cameraStore`, compute a dynamic pose in `CameraRig`, wrap the SDK Table in a tap-detector inside the EM-induction LabScene, and have `FocusResetButton` clear both focus sources.

**Tech Stack:** React 19, TypeScript, Zustand 5, `@react-three/fiber`, Three.js (`Vector3`, `Quaternion`). No new dependencies.

**Spec:** `docs/superpowers/specs/2026-05-17-em-induction-final-polish-v2-design.md` (commit `64e533f`).

**Branch:** `feat/em-induction-final-polish-v2` (from `master` at commit `64e533f`).

---

## File Structure

7 files modified, 0 new files.

| File | Slice | Change |
|---|---|---|
| `src/labs/electromagnetic-induction/instruments/Galvanometer.tsx` | A | `NEEDLE_PIVOT_Y_LOCAL` → bottom of face. Mesh `position[1]` → `+NEEDLE_LEN/2`. `rotation.z` sign → `-r.current`. Comment updated. |
| `src/labs/electromagnetic-induction/instruments/FieldLines.tsx` | B | Add `.negate()` to the tangent vector in `arrowTransforms` useMemo. |
| `src/sdk/object/useTapDetector.ts` | C | Callback signature changes from `() => void` to `(e: ThreeEvent<PointerEvent>) => void`. Existing call-sites compatible (extra arg ignored). |
| `src/sdk/scene/cameraStore.ts` | C | Add `freeFocusPoint: Vector3 \| null` field and `setFreeFocusPoint` action. |
| `src/sdk/scene/CameraRig.tsx` | C | Read `freeFocusPoint`. Compute dynamic `effectivePose` (free > focusTarget > preset). Use `effectivePoseKey` for tween change detection. Use `effectivePose` in `useFrame`. |
| `src/labs/electromagnetic-induction/ui/FocusResetButton.tsx` | C | Render if EITHER `focusTarget` or `freeFocusPoint` is non-null. Click clears BOTH. |
| `src/labs/electromagnetic-induction/scene/LabScene.tsx` | C | Wrap `<Table />` with a tap detector that captures `e.point` and dispatches `setFreeFocusPoint`. Extend scene-change effect to clear `freeFocusPoint` too. |

---

## Pre-flight

- [ ] **Step 0a: Confirm clean tree on master**

Run: `git status`
Expected: `nothing to commit, working tree clean`. HEAD at `64e533f` on `master`.

- [ ] **Step 0b: Create feature branch**

Run: `git checkout -b feat/em-induction-final-polish-v2`
Expected: `Switched to a new branch 'feat/em-induction-final-polish-v2'`.

- [ ] **Step 0c: Baseline test run**

Run: `npm test -- --run`
Expected: `Tests 220 passed (220)`.

---

## Task 1 (Slice A): Needle pivot back to BOTTOM (speedometer)

**File:** `src/labs/electromagnetic-induction/instruments/Galvanometer.tsx`

The previous PR moved the pivot to the TOP. Revert to bottom-pivot pendulum-up (speedometer pattern), keeping the group-as-pivot pattern + pivot dot from the previous PR.

- [ ] **Step 1.1: Flip the pivot constant**

Open `src/labs/electromagnetic-induction/instruments/Galvanometer.tsx`. Find the constants block (around line 17):

```ts
const NEEDLE_PIVOT_Y_LOCAL = +FACE_H / 2 - 0.005  // near the TOP of the face (needle hangs down from here)
```

Replace with:

```ts
const NEEDLE_PIVOT_Y_LOCAL = -FACE_H / 2 + 0.005  // near the BOTTOM of the face (needle points up like a speedometer)
```

- [ ] **Step 1.2: Flip the rotation sign back to `-r.current`**

Still in the same file, find the `useFrame` body (around line 56):

```ts
if (needleRef.current) {
  needleRef.current.rotation.z = r.current
}
```

Replace with:

```ts
if (needleRef.current) {
  needleRef.current.rotation.z = -r.current
}
```

- [ ] **Step 1.3: Flip the mesh offset UP + update inline comment**

Still in the same file, find the needle JSX (around lines 80–97):

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

Replace with:

```tsx
{/* Needle — thin red box pointing UP from a pivot at the bottom of the face.
    Rotation is applied to the wrapping group (whose origin IS the pivot),
    so the needle swings like a speedometer. A small black sphere marks
    the pivot point visibly. */}
<group
  ref={needleRef}
  position={[0, HOUSING_H / 2 + NEEDLE_PIVOT_Y_LOCAL, HOUSING_D / 2 + 0.002]}
>
  <mesh position={[0, NEEDLE_LEN / 2, 0]}>
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

Two changes from the previous version: the inline comment text ("pointing UP / speedometer" instead of "hanging DOWN / pendulum") and the mesh's `position` y-coordinate (`+NEEDLE_LEN / 2` instead of `-NEEDLE_LEN / 2`).

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
git commit -m "feat(em-induction): galvanometer needle pivots from bottom of dial (speedometer)"
```

---

## Task 2 (Slice B): Flip field-arrow direction

**File:** `src/labs/electromagnetic-induction/instruments/FieldLines.tsx`

One-line change. User reports the cone arrows on the field arcs point the wrong way externally. Negating the tangent flips them by 180° (apex now points in `-tangent` direction).

- [ ] **Step 2.1: Negate the tangent in arrowTransforms useMemo**

Open `src/labs/electromagnetic-induction/instruments/FieldLines.tsx`. Find the `arrowTransforms` useMemo (around line 90). Inside the inner loop, find:

```ts
const tangent = curve.getTangent(t).normalize()
```

Replace with:

```ts
const tangent = curve.getTangent(t).normalize().negate()
```

That's the entire code change for this slice.

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
git commit -m "fix(em-induction): flip field-arrow direction (N→S externally)"
```

---

## Task 3 (Slice C.1): Extend useTapDetector to pass the event

**File:** `src/sdk/object/useTapDetector.ts`

Slice C needs the world-space hit point from the pointer event. Update the callback signature so consumers can read `e.point`. Existing consumers pass `() => something()` callbacks — JavaScript silently drops the extra arg, so they keep working.

- [ ] **Step 3.1: Update the callback signature**

Open `src/sdk/object/useTapDetector.ts`. Find the function signature (line 16):

```ts
export function useTapDetector(onTap: () => void) {
```

Replace with:

```ts
export function useTapDetector(onTap: (e: ThreeEvent<PointerEvent>) => void) {
```

Then find the body where `onTap` is called (line 35):

```ts
if (dt < TAP_MAX_DURATION_MS && dx < TAP_MOVE_THRESHOLD_PX && dy < TAP_MOVE_THRESHOLD_PX) {
  onTap()
}
```

Replace with:

```ts
if (dt < TAP_MAX_DURATION_MS && dx < TAP_MOVE_THRESHOLD_PX && dy < TAP_MOVE_THRESHOLD_PX) {
  onTap(e)
}
```

Also update the JSDoc immediately above the function to reflect the new signature. Find the JSDoc block (lines 7–15):

```ts
/**
 * Detects a tap (quick stationary pointer-down → pointer-up) on a mesh
 * or group. Returns `onPointerDown` and `onPointerUp` handlers to spread
 * onto the target.
 *
 * Used by non-draggable EM-induction instruments (Coil, Bulb,
 * Galvanometer) so the student can tap any of them to focus the camera.
 * Same tap heuristic as `useDrag` (8 px / 250 ms).
 */
```

Replace with:

```ts
/**
 * Detects a tap (quick stationary pointer-down → pointer-up) on a mesh
 * or group. Returns `onPointerDown` and `onPointerUp` handlers to spread
 * onto the target.
 *
 * The `onTap` callback receives the ThreeEvent so consumers that need
 * the world-space hit position (e.g. "click any point on the table to
 * focus the camera there") can read `e.point`. Consumers that just
 * trigger a discrete action can ignore the argument — JavaScript drops
 * extra args silently.
 *
 * Same tap heuristic as `useDrag` (8 px / 250 ms).
 */
```

No consumer call-sites need updating — they all pass `() => ...` callbacks which remain compatible.

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
git commit -m "feat(sdk): useTapDetector passes ThreeEvent to onTap callback"
```

---

## Task 4 (Slice C.2): Add freeFocusPoint to cameraStore

**File:** `src/sdk/scene/cameraStore.ts`

Add the new state field that represents "user clicked an arbitrary world point and wants the camera to fly there."

- [ ] **Step 4.1: Add Vector3 import + state + action**

Open `src/sdk/scene/cameraStore.ts`. Find the existing imports (line 1):

```ts
import { create } from 'zustand'
```

Add a Vector3 import on the next line:

```ts
import { create } from 'zustand'
import { Vector3 } from 'three'
```

Find the `CameraStore` type. Currently:

```ts
type CameraStore = {
  zoomMul: number
  focusTarget: FocusTarget
  setZoomMul: (z: number) => void
  zoomBy: (factor: number) => void
  resetZoom: () => void
  setFocusTarget: (t: FocusTarget) => void
}
```

Add `freeFocusPoint` field and `setFreeFocusPoint` action:

```ts
type CameraStore = {
  zoomMul: number
  focusTarget: FocusTarget
  freeFocusPoint: Vector3 | null
  setZoomMul: (z: number) => void
  zoomBy: (factor: number) => void
  resetZoom: () => void
  setFocusTarget: (t: FocusTarget) => void
  setFreeFocusPoint: (p: Vector3 | null) => void
}
```

Then find the `create<CameraStore>` block. Currently:

```ts
export const useCameraStore = create<CameraStore>((set) => ({
  zoomMul: 1,
  focusTarget: null,
  setZoomMul: (z) => set({ zoomMul: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z)) }),
  zoomBy: (factor) =>
    set((s) => ({ zoomMul: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, s.zoomMul * factor)) })),
  resetZoom: () => set({ zoomMul: 1 }),
  setFocusTarget: (focusTarget) => set({ focusTarget }),
}))
```

Add `freeFocusPoint: null` default + `setFreeFocusPoint` action:

```ts
export const useCameraStore = create<CameraStore>((set) => ({
  zoomMul: 1,
  focusTarget: null,
  freeFocusPoint: null,
  setZoomMul: (z) => set({ zoomMul: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z)) }),
  zoomBy: (factor) =>
    set((s) => ({ zoomMul: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, s.zoomMul * factor)) })),
  resetZoom: () => set({ zoomMul: 1 }),
  setFocusTarget: (focusTarget) => set({ focusTarget }),
  setFreeFocusPoint: (freeFocusPoint) => set({ freeFocusPoint }),
}))
```

Also update the JSDoc on `FocusTarget` if applicable, but the existing comment at top already serves — no change needed.

- [ ] **Step 4.2: Type-check + test + build**

Run: `npx tsc --noEmit`
Expected: 0 errors.

Run: `npm test -- --run`
Expected: 220 tests passing.

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4.3: Commit**

```bash
git add -A
git commit -m "feat(sdk): cameraStore gains freeFocusPoint for click-to-focus"
```

---

## Task 5 (Slice C.3): CameraRig uses freeFocusPoint as dynamic pose

**File:** `src/sdk/scene/CameraRig.tsx`

When `freeFocusPoint` is non-null, the camera ignores `focusTarget` and the scene `preset`, instead computing a pose dynamically around the free-focus point. Precedence: `freeFocusPoint` > `focusTarget` > scene `preset`.

- [ ] **Step 5.1: Read freeFocusPoint + compute effectivePose + change-detection key**

Open `src/sdk/scene/CameraRig.tsx`. Find the `CameraRig` function body. Currently the relevant block (lines 82–95):

```ts
const userZoomMul = useCameraStore(s => s.zoomMul)
const focusTarget = useCameraStore(s => s.focusTarget)
const reducedMotion = useReducedMotion()
const { breakpoint } = useViewport()

// User-driven focus override. When a focusTarget is set, it wins over
// the scene-driven `preset` prop. Tap-on-instrument dispatches set this
// via useCameraStore; FocusResetButton or a scene change clears it.
const effectivePreset: CameraPreset =
  focusTarget === 'magnet' ? 'focus-magnet' :
  focusTarget === 'coil'   ? 'focus-coil'   :
  focusTarget === 'bulb'   ? 'focus-bulb'   :
  focusTarget === 'galv'   ? 'focus-galv'   :
  preset
```

Replace with (adds `freeFocusPoint` selector + `effectivePose` + `effectivePoseKey`):

```ts
const userZoomMul = useCameraStore(s => s.zoomMul)
const focusTarget = useCameraStore(s => s.focusTarget)
const freeFocusPoint = useCameraStore(s => s.freeFocusPoint)
const reducedMotion = useReducedMotion()
const { breakpoint } = useViewport()

// User-driven focus override. Precedence:
//   1. freeFocusPoint (user clicked an arbitrary point) — dynamic pose
//   2. focusTarget (user tapped an instrument) — fixed preset
//   3. preset prop (scene-driven default) — fixed preset
// FocusResetButton or a scene change clears the user-driven values.
const effectivePreset: CameraPreset =
  focusTarget === 'magnet' ? 'focus-magnet' :
  focusTarget === 'coil'   ? 'focus-coil'   :
  focusTarget === 'bulb'   ? 'focus-bulb'   :
  focusTarget === 'galv'   ? 'focus-galv'   :
  preset

// Compute the effective pose. When freeFocusPoint is set, build a pose
// dynamically around it (camera ~40 cm above and ~1.1 m in front, looking
// straight at the point). Otherwise, use the named preset's POSES entry.
const effectivePose: Pose = freeFocusPoint
  ? {
      position: [freeFocusPoint.x, freeFocusPoint.y + 0.4, freeFocusPoint.z + 1.1],
      lookAt: [freeFocusPoint.x, freeFocusPoint.y, freeFocusPoint.z],
    }
  : POSES[effectivePreset]

// Stable string key for tween change detection. When freeFocusPoint is
// set, encode its coordinates (rounded to mm) so different clicks
// trigger a new tween.
const effectivePoseKey: string = freeFocusPoint
  ? `free:${freeFocusPoint.x.toFixed(3)},${freeFocusPoint.y.toFixed(3)},${freeFocusPoint.z.toFixed(3)}`
  : effectivePreset
```

- [ ] **Step 5.2: Update tween useEffect to use effectivePoseKey + effectivePose**

Still in the same file. Find the tween `useEffect` (lines 131–142):

```ts
// Start a tween whenever the active preset changes.
useEffect(() => {
  if (lastPreset.current === effectivePreset) return
  fromPos.current.copy(camera.position)
  const dir = new Vector3()
  camera.getWorldDirection(dir)
  fromLook.current.copy(camera.position).add(dir)
  const target = POSES[effectivePreset]
  targetLook.current.set(...target.lookAt)
  tweenStart.current = performance.now()
  lastPreset.current = effectivePreset
}, [effectivePreset, camera])
```

Change `lastPreset` (which currently tracks `CameraPreset`) to `lastPoseKey` (tracking the string key). Replace the entire useEffect with:

```ts
// Start a tween whenever the effective pose changes. The pose key
// uniquely identifies named presets and dynamic free-focus points.
useEffect(() => {
  if (lastPoseKey.current === effectivePoseKey) return
  fromPos.current.copy(camera.position)
  const dir = new Vector3()
  camera.getWorldDirection(dir)
  fromLook.current.copy(camera.position).add(dir)
  targetLook.current.set(...effectivePose.lookAt)
  tweenStart.current = performance.now()
  lastPoseKey.current = effectivePoseKey
}, [effectivePoseKey, effectivePose, camera])
```

Then find the `lastPreset` ref declaration (line 81):

```ts
const lastPreset = useRef<CameraPreset | null>(null)
```

Replace with:

```ts
const lastPoseKey = useRef<string | null>(null)
```

- [ ] **Step 5.3: Update useFrame to use effectivePose**

Still in the same file. Find the `useFrame` body (line 144 onward). Currently:

```ts
useFrame(() => {
  const target = POSES[effectivePreset]
  const targetPos = applyZoom(target.position, target.lookAt, zoomMul)
  // ...rest unchanged...
})
```

Replace the first two lines with `effectivePose`:

```ts
useFrame(() => {
  const target = effectivePose
  const targetPos = applyZoom(target.position, target.lookAt, zoomMul)
  // ...rest unchanged...
})
```

The rest of `useFrame` (the tween interpolation and the "no tween, apply zoom directly" branches) is unchanged — both branches use `target.position` and `target.lookAt`, which now come from `effectivePose`.

- [ ] **Step 5.4: Type-check + test + build**

Run: `npx tsc --noEmit`
Expected: 0 errors.

Run: `npm test -- --run`
Expected: 220 tests passing.

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 5.5: Commit**

```bash
git add -A
git commit -m "feat(sdk): CameraRig supports dynamic free-focus pose"
```

---

## Task 6 (Slice C.4): FocusResetButton clears both focus sources

**File:** `src/labs/electromagnetic-induction/ui/FocusResetButton.tsx`

Make the pill visible when EITHER `focusTarget` or `freeFocusPoint` is non-null. Click handler clears BOTH.

- [ ] **Step 6.1: Update FocusResetButton.tsx**

Open `src/labs/electromagnetic-induction/ui/FocusResetButton.tsx`. Replace the FULL file content with:

```tsx
import { Button } from '../../../sdk/ui/Button'
import { sound } from '../../../sdk/audio/SoundManager'
import { useCameraStore } from '../../../sdk/scene/cameraStore'

/**
 * Bottom-right HUD pill, visible only when the user has manually focused
 * (on an instrument OR on an arbitrary table point). Tap to clear both
 * focus sources and return to the scene's default camera preset. Plays
 * a tick sound on click.
 */
export function FocusResetButton() {
  const focusTarget = useCameraStore(s => s.focusTarget)
  const freeFocusPoint = useCameraStore(s => s.freeFocusPoint)
  const setFocusTarget = useCameraStore(s => s.setFocusTarget)
  const setFreeFocusPoint = useCameraStore(s => s.setFreeFocusPoint)

  if (focusTarget === null && freeFocusPoint === null) return null

  const handleClick = () => {
    sound.play('tick')
    setFocusTarget(null)
    setFreeFocusPoint(null)
  }

  const label = 'Загальний вигляд'

  return (
    <Button
      variant="secondary"
      onClick={handleClick}
      aria-label={label}
      title={label}
    >
      🌄 Все
    </Button>
  )
}
```

Key changes from before:
- New `freeFocusPoint` and `setFreeFocusPoint` selectors.
- The early-return guard now checks BOTH (`focusTarget === null && freeFocusPoint === null`).
- `handleClick` clears BOTH (`setFocusTarget(null)` AND `setFreeFocusPoint(null)`).
- Updated JSDoc.

- [ ] **Step 6.2: Type-check + test + build**

Run: `npx tsc --noEmit`
Expected: 0 errors.

Run: `npm test -- --run`
Expected: 220 tests passing.

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 6.3: Commit**

```bash
git add -A
git commit -m "feat(em-induction): FocusResetButton clears both focusTarget and freeFocusPoint"
```

---

## Task 7 (Slice C.5): LabScene wraps Table with tap-detector

**File:** `src/labs/electromagnetic-induction/scene/LabScene.tsx`

Wrap the `<Table />` in a group with a tap detector. On tap, read the world-space hit point from `e.point` and dispatch `setFreeFocusPoint`. Also extend the existing scene-change clear effect to reset `freeFocusPoint`.

- [ ] **Step 7.1: Add useTapDetector import + table tap handler**

Open `src/labs/electromagnetic-induction/scene/LabScene.tsx`. Find the existing `useTapDetector` and `useCameraStore` imports — `useTapDetector` may not be imported yet in this file. Find the SDK imports near the top. Currently there's:

```ts
import { useCameraStore } from '../../../sdk/scene/cameraStore'
```

Add the tap-detector import alongside (or check if already present — only add if missing):

```ts
import { useTapDetector } from '../../../sdk/object/useTapDetector'
```

Inside the `LabScene` function body, AFTER the existing `setFocusTarget` declaration and BEFORE the `return` block, add the table tap handler:

```ts
// Click-to-focus: tap any point on the table surface and the camera
// flies in close to that exact world position. Instrument taps (Coil,
// Bulb, Galvanometer, BarMagnet) still take precedence because R3F's
// raycasting picks the closest mesh first.
const tableTap = useTapDetector((e) => {
  useCameraStore.getState().setFreeFocusPoint(e.point.clone())
})
```

`e.point` is a Three.js `Vector3` provided by R3F's pointer-event raycast (world-space coordinate of the hit). Cloning it is defensive — we don't want a future event mutating the value stored in Zustand.

- [ ] **Step 7.2: Wrap `<Table />` with the tap handler**

Still in the same file. Find the `<Table />` element inside the `<Physics>` block (around line 240-something — search for `<Table />`):

```tsx
<Table />
```

Replace with:

```tsx
<group {...tableTap}>
  <Table />
</group>
```

The `<group>` inherits Table's positioning and shadow behaviour; the spread `{...tableTap}` attaches both `onPointerDown` and `onPointerUp` handlers.

- [ ] **Step 7.3: Extend scene-change clear effect to reset freeFocusPoint**

Still in the same file. Find the existing useEffect that clears `focusTarget` on scene change (added in the Focus Nav PR):

```ts
// Clear manual focus on scene change. The guided flow's scene-default
// preset takes over; if the student wants a different focus, they tap
// the instrument again.
const setFocusTarget = useCameraStore(s => s.setFocusTarget)
useEffect(() => {
  setFocusTarget(null)
}, [idx, setFocusTarget])
```

Replace with (also clears `freeFocusPoint`):

```ts
// Clear manual focus on scene change. The guided flow's scene-default
// preset takes over; if the student wants a different focus, they tap
// the instrument or the table again.
const setFocusTarget = useCameraStore(s => s.setFocusTarget)
const setFreeFocusPoint = useCameraStore(s => s.setFreeFocusPoint)
useEffect(() => {
  setFocusTarget(null)
  setFreeFocusPoint(null)
}, [idx, setFocusTarget, setFreeFocusPoint])
```

- [ ] **Step 7.4: Type-check + test + build**

Run: `npx tsc --noEmit`
Expected: 0 errors.

Run: `npm test -- --run`
Expected: 220 tests passing.

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 7.5: Commit**

```bash
git add -A
git commit -m "feat(em-induction): wrap Table in tap detector for click-to-focus camera"
```

---

## Task 8: Final verification + push + direct-merge to master

**Files:** None modified. Verification only.

- [ ] **Step 8.1: Full clean run**

Run: `npx tsc --noEmit`
Expected: 0 errors.

Run: `npm run build`
Expected: build succeeds, only the pre-existing chunk-size warning.

Run: `npm test -- --run`
Expected: 220 tests passing, 0 failures.

- [ ] **Step 8.2: Sanity-check the diff**

Run: `git log --oneline master..HEAD`
Expected to show 7 commits in this order:
1. `feat(em-induction): galvanometer needle pivots from bottom of dial (speedometer)`
2. `fix(em-induction): flip field-arrow direction (N→S externally)`
3. `feat(sdk): useTapDetector passes ThreeEvent to onTap callback`
4. `feat(sdk): cameraStore gains freeFocusPoint for click-to-focus`
5. `feat(sdk): CameraRig supports dynamic free-focus pose`
6. `feat(em-induction): FocusResetButton clears both focusTarget and freeFocusPoint`
7. `feat(em-induction): wrap Table in tap detector for click-to-focus camera`

Run: `git diff master..HEAD --stat`
Expected: 7 files changed, ~60 lines net.

- [ ] **Step 8.3: Push the branch**

Run: `git push -u origin feat/em-induction-final-polish-v2`
Expected: branch pushed to remote.

- [ ] **Step 8.4: Direct-merge to master**

```bash
git checkout master
git merge --no-ff feat/em-induction-final-polish-v2 -m "Merge feat/em-induction-final-polish-v2: needle bottom, arrows flip, free-focus"
git push origin master
```

Expected: master fast-forwards onto a merge commit; pushed; Vercel triggers prod deploy.

- [ ] **Step 8.5: User smoke-test (after Vercel deploys)**

On iPhone, open `science-lab-phi.vercel.app` → EM induction lab:

1. Galvanometer needle anchored at BOTTOM of dial face (visible pivot dot). Tip points UP toward the scale. Positive EMF (fast drag right-to-left through coil) → tip swings RIGHT toward "+5".
2. Field arrows now point from RED pole (N) to BLUE pole (S) externally on all 8 arcs. If still wrong direction, revert by removing `.negate()` in FieldLines.tsx Task 2.1.
3. Tap on EMPTY TABLE → camera flies in close to that exact point. "🌄 Все" reset pill appears.
4. Tap on an instrument (magnet/coil/bulb/galv) → existing instrument-focus behaviour (no change).
5. Tap "🌄 Все" → camera returns to scene-default preset. Reset pill disappears.
6. Scene change (guided flow advance) → focus auto-clears.
7. Drag a magnet → drag works as before. No focus change.
8. Mass-measurement lab → balls/weights drag and snap as before. No table-tap focus (we didn't wrap Table there).

---

## Self-Review Notes

**Spec coverage:**
- ✅ Slice A — Tasks 1.1 (constant) + 1.2 (rotation sign) + 1.3 (JSX flip).
- ✅ Slice B — Task 2.1 (negate tangent).
- ✅ Slice C — Task 3 (useTapDetector signature) + Task 4 (cameraStore) + Task 5 (CameraRig) + Task 6 (FocusResetButton) + Task 7 (LabScene wrap + scene-change clear).
- ✅ Smoke-test list in Step 8.5 covers all 8 acceptance criteria.

**Placeholder scan:** No "TBD" / "TODO" / "fill in later". Every step shows full code or full command with expected output.

**Type consistency:**
- `freeFocusPoint: Vector3 | null` defined in Task 4.1. Read in Task 5.1 (CameraRig), Task 6.1 (FocusResetButton), Task 7 (LabScene). All matches.
- `setFreeFocusPoint(p: Vector3 | null)` action: Task 7.1 calls with `e.point.clone()` (a Vector3); Task 6.1 calls with `null`. Both compatible.
- `effectivePose: Pose` defined in Task 5.1. Used in Task 5.2 (tween) and 5.3 (useFrame). Consistent.
- `lastPoseKey` ref renamed from `lastPreset` in Task 5.2. Used inside the same effect; no external references — safe.
- `useTapDetector((e) => ...)` consumers: existing call-sites (Coil, Bulb, Galvanometer) pass `() => ...` callbacks which remain TS-compatible because JS ignores extra args. Task 3.1's signature change is opt-in for consumers that want the event.

**Rotation sign caveat:** Task 1.2 restores `-r.current` because the needle now points UP again. Positive EMF should produce RIGHT-side deflection (toward "+5" on the dial scale). If the smoke-test in Step 8.5.1 reveals the opposite direction, flip back to `+r.current` and re-deploy. This is a 1-line tweak.

**No new tests:** All changes are visual/state plumbing. The 220-test suite (physics math, step engine) stays as regression gate.

**Branch parallelism:** This work is on top of fresh master (`64e533f`) which includes all prior merges. No conflicting open branches.

**Mass-measurement regression check:** Slice A's Galvanometer is EM-induction-specific. Slice B's FieldLines is EM-induction-specific. Slice C's SDK changes (useTapDetector + cameraStore + CameraRig) are backward-compatible — existing call-sites unaffected. Slice C's Table-wrap is only done in EM-induction's LabScene; mass-measurement's Table is unwrapped, so it has no click-to-focus behaviour (intentional per spec). Smoke-test 8.5.8 verifies mass-measurement.

**Pointer-event ordering:** Smoke-test step 8.5.7 verifies that magnet drag still works (no focus change). If a user reports double-firing (tap on magnet ALSO triggers table focus), the fix is to add `e.stopPropagation()` to the magnet's onTap path. Plan doesn't include this preemptively — wait for evidence.
