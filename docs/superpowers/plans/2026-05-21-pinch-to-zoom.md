# Pinch-to-Zoom Gesture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a native two-finger pinch gesture to both labs on phone+tablet. The pinch midpoint becomes the camera's free focal point and the distance ratio drives the zoom multiplier. Active single-finger drags cancel cleanly when the pinch commits.

**Architecture:** A tiny pub/sub `dragBus` decouples drag cancellation from camera concerns. `useDrag` subscribes to it on mount. A new headless component `<PinchZoomController />` mounts inside each lab's `<Canvas>`, attaches global `window` pointer listeners, tracks the first two touch pointers, and on commit raycasts the initial midpoint onto the table plane to set `freeFocusPoint` while continuously updating `zoomMul`.

**Tech Stack:** React 19, TypeScript, @react-three/fiber (`useThree`), Three.js (`Vector3` raycast math). No new dependencies.

**Spec:** `docs/superpowers/specs/2026-05-21-pinch-to-zoom-design.md` (commit `b6444cc`).

**Branch:** `feat/pinch-to-zoom` (already created from `master` at commit `e78bbc7`; spec commit `b6444cc` lives on it).

---

## File Structure

2 new files, 3 modified.

| File | Responsibility |
|---|---|
| `src/sdk/physics/dragBus.ts` | NEW. Pub/sub bus. `onCancel(cb)` subscribes a cleanup callback; `cancelAll()` invokes every subscriber. Exceptions in one callback don't stop the others. |
| `src/sdk/physics/useDrag.ts` | MODIFY. Add `useEffect` to subscribe a cancel callback that releases the current drag — reverts the rigid body to Dynamic, clears sensor flags, resets internal state. No snap pull. |
| `src/sdk/scene/PinchZoomController.tsx` | NEW. Headless R3F component (`null` render). Inside `<Canvas>`. Window-level pointer listeners. Tracks first 2 touch pointers. On commit (≥6 px distance change) raycasts initial midpoint onto the table plane and calls `setFreeFocusPoint` + `setZoomMul`. Cancels drags via `dragBus.cancelAll()` at the commit moment. |
| `src/labs/electromagnetic-induction/scene/LabScene.tsx` | MODIFY. Import `PinchZoomController` and mount one instance directly under `<CameraRig />`. |
| `src/labs/mass-measurement/scene/LabScene.tsx` | MODIFY. Same. |

---

## Pre-flight

- [ ] **Step 0a: Confirm on branch with clean tree**

Run: `git status`
Expected: `On branch feat/pinch-to-zoom`, working tree clean. HEAD at `b6444cc` (the spec commit).

- [ ] **Step 0b: Baseline test run**

Run: `npm test -- --run`
Expected: `Tests 220 passed (220)`.

- [ ] **Step 0c: Baseline type-check**

Run: `npx tsc --noEmit`
Expected: 0 errors.

---

## Task 1: SDK dragBus

**Files:**
- Create: `src/sdk/physics/dragBus.ts`

- [ ] **Step 1.1: Write `dragBus.ts`**

Create `src/sdk/physics/dragBus.ts` with the FULL content below:

```ts
type CancelCb = () => void

const listeners = new Set<CancelCb>()

/**
 * Pub/sub bus for cancelling in-flight drags.
 *
 *   - useDrag subscribes via onCancel() on mount.
 *   - PinchZoomController calls cancelAll() when a 2-finger pinch starts,
 *     forcing every active drag to release its pointer and restore the
 *     rigid body to Dynamic before the camera starts zooming.
 *
 * Decoupled from cameraStore because not every consumer that needs to
 * cancel drags is camera-related, and not every camera change should
 * cancel drags. A bus keeps the concerns separate.
 */
export const dragBus = {
  onCancel(cb: CancelCb): () => void {
    listeners.add(cb)
    return () => { listeners.delete(cb) }
  },
  cancelAll(): void {
    listeners.forEach((cb) => {
      try { cb() } catch {}
    })
  },
}
```

- [ ] **Step 1.2: Type-check**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 1.3: Test (regression gate)**

Run: `npm test -- --run`
Expected: `Tests 220 passed (220)`.

- [ ] **Step 1.4: Commit**

```bash
git add src/sdk/physics/dragBus.ts
git commit -m "$(cat <<'EOF'
feat(sdk): dragBus — pub/sub for cancelling in-flight drags

Tiny module-level Set of callbacks. onCancel(cb) returns the
unsubscriber. cancelAll() invokes every subscriber, swallowing any
exception so one bad subscriber doesn't break the others.

Used by useDrag to register its cleanup hook and by PinchZoomController
(next commits) to interrupt drags when a pinch begins.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: useDrag cancel hook-in

**Files:**
- Modify: `src/sdk/physics/useDrag.ts`

- [ ] **Step 2.1: Extend the react import on line 1**

Find on line 1:

```ts
import { useRef, useCallback, RefObject } from 'react'
```

Replace with:

```ts
import { useRef, useEffect, useCallback, RefObject } from 'react'
```

- [ ] **Step 2.2: Add `dragBus` import**

Find this block of imports near the top of `src/sdk/physics/useDrag.ts` (currently around lines 4-8):

```ts
import { Vector3 } from 'three'
import { RapierRigidBody } from '@react-three/rapier'
import { RigidBodyType } from '@dimforge/rapier3d-compat'
import { findSnapNear, snapProgress } from './snapTargets'
import { useStepEngine } from '../../sdk/guided/StepEngine'
import { clamp } from '../animation'
```

Add the `dragBus` import immediately after `snapTargets`:

```ts
import { Vector3 } from 'three'
import { RapierRigidBody } from '@react-three/rapier'
import { RigidBodyType } from '@dimforge/rapier3d-compat'
import { findSnapNear, snapProgress } from './snapTargets'
import { dragBus } from './dragBus'
import { useStepEngine } from '../../sdk/guided/StepEngine'
import { clamp } from '../animation'
```

- [ ] **Step 2.3: Subscribe to `dragBus.onCancel` from inside `useDrag()`**

Find this block inside `useDrag()` (currently around lines 92-103, the destructure + refs block):

```ts
export function useDrag({ rigidBody, bodyId, dragHeight = 1.0, dragCorridor, onTap }: Props) {
  const { camera, gl } = useThree()
  const target = useRef(new Vector3())
  const isDragging = useRef(false)
  const pointerId = useRef<number | null>(null)
  // Tap detection state — see TAP_MOVE_THRESHOLD_PX / TAP_MAX_DURATION_MS.
  const tapStartTime = useRef<number | null>(null)
  const tapStartScreenX = useRef(0)
  const tapStartScreenY = useRef(0)
  // True once movement has exceeded the tap threshold this gesture →
  // drag-start side effects have fired and onPointerUp must finalize drag.
  const hasExceededThreshold = useRef(false)
  const setLastSnap = useStepEngine.getState().setLastSnap
```

Insert a new `useEffect` block **immediately after** the `setLastSnap` line (before the `intersectPlane` definition):

```ts
  const setLastSnap = useStepEngine.getState().setLastSnap

  // Cancel any in-flight drag — invoked via dragBus when a pinch begins.
  // Restores the body to Dynamic, clears sensor flags, and resets internal
  // state. No snap-pull tween; the body stays where it currently is and
  // gravity resumes.
  useEffect(() => {
    return dragBus.onCancel(() => {
      if (!isDragging.current) return
      const wasFullDrag = hasExceededThreshold.current
      isDragging.current = false
      pointerId.current = null
      tapStartTime.current = null
      hasExceededThreshold.current = false
      if (wasFullDrag && rigidBody.current) {
        const n = rigidBody.current.numColliders()
        for (let i = 0; i < n; i++) {
          rigidBody.current.collider(i).setSensor(false)
        }
        rigidBody.current.setBodyType(RigidBodyType.Dynamic, true)
      }
    })
  }, [rigidBody])
```

The dependency array contains `rigidBody` because the cleanup closure captures `rigidBody.current`. All other refs are stable across renders.

- [ ] **Step 2.4: Type-check**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 2.5: Build**

Run: `npm run build`
Expected: build succeeds (pre-existing chunk-size warning only).

- [ ] **Step 2.6: Test (regression gate)**

Run: `npm test -- --run`
Expected: `Tests 220 passed (220)`.

- [ ] **Step 2.7: Commit**

```bash
git add src/sdk/physics/useDrag.ts
git commit -m "$(cat <<'EOF'
feat(sdk): useDrag subscribes to dragBus.onCancel

When the pinch controller fires dragBus.cancelAll() (next commit),
every active useDrag instance reverts its rigid body to Dynamic,
restores solid colliders, and clears internal state without playing
the snap-pull animation. In-tap-window drags simply clear their state
since no kinematic conversion happened yet.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: SDK PinchZoomController

**Files:**
- Create: `src/sdk/scene/PinchZoomController.tsx`

- [ ] **Step 3.1: Write `PinchZoomController.tsx`**

Create `src/sdk/scene/PinchZoomController.tsx` with the FULL content below:

```tsx
import { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { Vector3 } from 'three'
import { useCameraStore } from './cameraStore'
import { TABLE_TOP_Y } from './Table'
import { dragBus } from '../physics/dragBus'

const MIN_PINCH_TRAVEL_PX = 6

type PointerSample = { x: number; y: number }

/**
 * Two-finger pinch handler. Mount once per lab inside <Canvas>.
 *
 *   - Pinch in (fingers closer) → zoomMul grows → camera retreats.
 *   - Pinch out (fingers spread) → zoomMul shrinks → camera approaches.
 *   - The initial midpoint between the two fingers is projected onto the
 *     table-top plane and set as the camera's freeFocusPoint, so the
 *     camera both zooms and re-centres on what the student is pinching.
 *
 * Drag is mutually exclusive: when a pinch is *committed* (distance
 * change exceeds MIN_PINCH_TRAVEL_PX), every active drag is cancelled
 * via dragBus so the lab object stays put instead of following the
 * camera fly-in.
 *
 * Mouse and pen pointers are ignored (pointerType !== 'touch'); the
 * existing ZoomControls cover desktop.
 *
 * Returns null — pure side-effect component.
 */
export function PinchZoomController() {
  const { camera, gl } = useThree()
  const pointers = useRef(new Map<number, PointerSample>())
  const trackedIds = useRef<[number, number] | null>(null)
  const initialMidpoint = useRef<PointerSample | null>(null)
  const initialDistance = useRef<number>(0)
  const initialZoom = useRef<number>(1)
  const committed = useRef(false)

  useEffect(() => {
    function intersectTable(clientX: number, clientY: number): Vector3 {
      const rect = gl.domElement.getBoundingClientRect()
      const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1
      const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1
      const point = new Vector3(ndcX, ndcY, 0.5).unproject(camera)
      const dir = point.sub(camera.position).normalize()
      const t = -(camera.position.y - TABLE_TOP_Y) / dir.y
      return camera.position.clone().add(dir.multiplyScalar(t))
    }

    function distanceOf(): number {
      if (!trackedIds.current) return 0
      const [id1, id2] = trackedIds.current
      const a = pointers.current.get(id1)
      const b = pointers.current.get(id2)
      if (!a || !b) return 0
      return Math.hypot(a.x - b.x, a.y - b.y)
    }

    function midpointOf(): PointerSample | null {
      if (!trackedIds.current) return null
      const [id1, id2] = trackedIds.current
      const a = pointers.current.get(id1)
      const b = pointers.current.get(id2)
      if (!a || !b) return null
      return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
    }

    function resetGesture() {
      trackedIds.current = null
      initialMidpoint.current = null
      initialDistance.current = 0
      committed.current = false
    }

    function onDown(e: PointerEvent) {
      if (e.pointerType !== 'touch') return
      // Already tracking two pointers → ignore third+ touch.
      if (trackedIds.current !== null) return
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (pointers.current.size === 2) {
        const [id1, id2] = Array.from(pointers.current.keys())
        trackedIds.current = [id1, id2]
        initialMidpoint.current = midpointOf()
        initialDistance.current = distanceOf()
        initialZoom.current = useCameraStore.getState().zoomMul
        committed.current = false
        // Don't cancel drag yet — wait until the gesture actually pinches.
      }
    }

    function onMove(e: PointerEvent) {
      if (e.pointerType !== 'touch') return
      if (!pointers.current.has(e.pointerId)) return
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (!trackedIds.current) return
      // Only react if BOTH tracked pointers are still tracked.
      const [id1, id2] = trackedIds.current
      if (!pointers.current.has(id1) || !pointers.current.has(id2)) return
      const d = distanceOf()
      if (d === 0 || initialDistance.current === 0) return
      const delta = Math.abs(d - initialDistance.current)
      if (!committed.current) {
        if (delta < MIN_PINCH_TRAVEL_PX) return
        // First time the threshold is crossed — commit: cancel drags and
        // set the focal point at the INITIAL midpoint (so the focal point
        // doesn't drift as the user keeps moving fingers).
        committed.current = true
        dragBus.cancelAll()
        if (initialMidpoint.current) {
          const focal = intersectTable(initialMidpoint.current.x, initialMidpoint.current.y)
          useCameraStore.getState().setFreeFocusPoint(focal)
        }
      }
      // Pinch out (d > d0) → camera should zoom IN (zoomMul shrinks).
      const newZoom = initialZoom.current * (initialDistance.current / d)
      useCameraStore.getState().setZoomMul(newZoom)
    }

    function onUp(e: PointerEvent) {
      if (e.pointerType !== 'touch') return
      pointers.current.delete(e.pointerId)
      if (trackedIds.current) {
        const [id1, id2] = trackedIds.current
        if (e.pointerId === id1 || e.pointerId === id2) {
          // One tracked pointer lifted → end this gesture.
          resetGesture()
        }
      }
    }

    window.addEventListener('pointerdown', onDown, { passive: true })
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerup', onUp, { passive: true })
    window.addEventListener('pointercancel', onUp, { passive: true })

    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      pointers.current.clear()
      resetGesture()
    }
  }, [camera, gl])

  return null
}
```

- [ ] **Step 3.2: Type-check**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3.3: Build**

Run: `npm run build`
Expected: build succeeds (pre-existing chunk-size warning only).

- [ ] **Step 3.4: Test (regression gate)**

Run: `npm test -- --run`
Expected: `Tests 220 passed (220)`.

- [ ] **Step 3.5: Commit**

```bash
git add src/sdk/scene/PinchZoomController.tsx
git commit -m "$(cat <<'EOF'
feat(sdk): PinchZoomController — two-finger pinch with midpoint focal

Headless R3F component (renders null). Inside <Canvas>, uses useThree()
to grab camera + gl. Attaches window pointer listeners. Tracks the
first two touch pointers. After distance changes by ≥6 px, commits the
pinch: raycasts the initial midpoint onto the table-top plane and sets
freeFocusPoint, then drives zoomMul = initialZoom * (d0 / d). Cancels
active drags via dragBus.cancelAll() at the commit moment.

Mouse / pen / 3rd+ fingers ignored. ZoomControls and tap-to-focus
unaffected.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: EM induction wiring

**Files:**
- Modify: `src/labs/electromagnetic-induction/scene/LabScene.tsx`

- [ ] **Step 4.1: Add the import**

Find the block of SDK imports near the top of the file (currently around lines 11-16, including `CANVAS_BASE_STYLE`, `Button`, etc.). Add this single new import after the `BottomSheet` / `SheetTriggerButton` lines that landed in the previous PR:

Find:

```ts
import { BottomSheet } from '../../../sdk/ui/BottomSheet'
import { SheetTriggerButton } from '../../../sdk/ui/SheetTriggerButton'
```

Replace with:

```ts
import { BottomSheet } from '../../../sdk/ui/BottomSheet'
import { SheetTriggerButton } from '../../../sdk/ui/SheetTriggerButton'
import { PinchZoomController } from '../../../sdk/scene/PinchZoomController'
```

- [ ] **Step 4.2: Mount the component inside `<Canvas>`**

Find this block inside the `<Canvas>` (currently around lines 261-262):

```tsx
        <CinematicLighting />
        <CameraRig preset={preset} />
```

Insert `<PinchZoomController />` immediately under `<CameraRig />`:

```tsx
        <CinematicLighting />
        <CameraRig preset={preset} />
        <PinchZoomController />
```

- [ ] **Step 4.3: Type-check**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 4.4: Build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4.5: Test (regression gate)**

Run: `npm test -- --run`
Expected: `Tests 220 passed (220)`.

- [ ] **Step 4.6: Commit**

```bash
git add src/labs/electromagnetic-induction/scene/LabScene.tsx
git commit -m "$(cat <<'EOF'
feat(em-induction): mount PinchZoomController inside Canvas

Wires the new SDK pinch gesture controller next to CameraRig.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Mass-measurement wiring

**Files:**
- Modify: `src/labs/mass-measurement/scene/LabScene.tsx`

- [ ] **Step 5.1: Add the import**

Find the block of SDK imports near the top of the file (currently around lines 16-19, including `Button`, `SoundToggle`, etc.). Add this single new import after the `BottomSheet` / `SheetTriggerButton` lines:

Find:

```ts
import { BottomSheet } from '../../../sdk/ui/BottomSheet'
import { SheetTriggerButton } from '../../../sdk/ui/SheetTriggerButton'
```

Replace with:

```ts
import { BottomSheet } from '../../../sdk/ui/BottomSheet'
import { SheetTriggerButton } from '../../../sdk/ui/SheetTriggerButton'
import { PinchZoomController } from '../../../sdk/scene/PinchZoomController'
```

- [ ] **Step 5.2: Mount the component inside `<Canvas>`**

Find this block inside the `<Canvas>` (currently around lines 114-115):

```tsx
        <CinematicLighting />
        <CameraRig preset={preset} />
```

Insert `<PinchZoomController />` immediately under `<CameraRig />`:

```tsx
        <CinematicLighting />
        <CameraRig preset={preset} />
        <PinchZoomController />
```

- [ ] **Step 5.3: Type-check**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 5.4: Build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 5.5: Test (regression gate)**

Run: `npm test -- --run`
Expected: `Tests 220 passed (220)`.

- [ ] **Step 5.6: Commit**

```bash
git add src/labs/mass-measurement/scene/LabScene.tsx
git commit -m "$(cat <<'EOF'
feat(mass-measurement): mount PinchZoomController inside Canvas

Mirrors the EM-induction wiring so both labs share the same gesture
surface.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Verify + push + direct-merge to master

**Files:** None modified. Verification + git operations only.

- [ ] **Step 6.1: Final type-check**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 6.2: Final build**

Run: `npm run build`
Expected: build succeeds; only the pre-existing chunk-size warning.

- [ ] **Step 6.3: Final test**

Run: `npm test -- --run`
Expected: `Tests 220 passed (220)`.

- [ ] **Step 6.4: Sanity-check the commit chain**

Run: `git log --oneline master..HEAD`

Expected output (6 commits including the spec):

```
<sha> feat(mass-measurement): mount PinchZoomController inside Canvas
<sha> feat(em-induction): mount PinchZoomController inside Canvas
<sha> feat(sdk): PinchZoomController — two-finger pinch with midpoint focal
<sha> feat(sdk): useDrag subscribes to dragBus.onCancel
<sha> feat(sdk): dragBus — pub/sub for cancelling in-flight drags
b6444cc docs(specs): pinch-to-zoom gesture with midpoint as focal point
```

Run: `git diff master..HEAD --stat`

Expected: 5 files changed (the spec + 2 new SDK files + useDrag + 2 LabScenes). Roughly 600+ lines including the spec, ~180 lines of code.

- [ ] **Step 6.5: Push the branch**

Run: `git push -u origin feat/pinch-to-zoom`
Expected: branch pushed to remote.

- [ ] **Step 6.6: Direct-merge to master**

```bash
git checkout master
git merge --no-ff feat/pinch-to-zoom -m "Merge feat/pinch-to-zoom: two-finger pinch gesture with midpoint focal"
git push origin master
```

Expected: master fast-forwards onto a merge commit; pushed; Vercel triggers production deploy.

- [ ] **Step 6.7: User smoke-test (after Vercel deploy completes, ~2 min after push)**

On the live site `science-lab-phi.vercel.app`:

1. **iPhone, EM induction lab:**
   - Two fingers placed over the coil area and spread apart → camera flies toward the coil and zooms in smoothly.
   - Two fingers brought together → camera retreats.
   - Press the bar magnet with one finger and start dragging it; while still dragging, touch a second finger and spread → magnet releases mid-air (becomes Dynamic and may fall), camera starts zooming.
   - After pinching, the `🌄 Все` (Focus Reset) button appears in the bottom-right outside stack; tapping it clears the focus and zoom returns to the scene default.
   - `+` / `−` buttons still work and operate within the same [0.25, 2.0] range.
   - Single-finger drag of the magnet through the coil bore works exactly as before (no second finger).

2. **iPhone, mass-measurement lab:**
   - Two-finger pinch zooms the lever balance / scale / dynamometer area.
   - Single-finger drag of apple / tennis ball / baseball works as before.
   - Second-finger cancel: pick up the apple with one finger, add a second and spread — apple drops, camera zooms.

3. **iPad mini portrait (~768 px):** same pinch behaviour as phone.

4. **Desktop (browser at 1280+ px):**
   - No behavioural change. Mouse drag, `+` / `−` buttons all unchanged.
   - Confirm pinch listeners ignore mouse events (no accidental zoom on click).

If any smoke-test step fails, the relevant slice is the entry point for a targeted fix:
- Drag doesn't cancel → Tasks 1 + 2 (dragBus + useDrag subscription).
- Pinch doesn't fire → Task 3 (PinchZoomController gesture logic).
- Focal point lands in wrong place → Task 3 (raycast math against `TABLE_TOP_Y`).
- Pinch not active in one lab → Tasks 4 or 5 (wiring).

---

## Self-Review Notes

**Spec coverage:**
- ✅ Slice A (dragBus) — Task 1.
- ✅ Slice B (useDrag cancel hook-in) — Task 2.
- ✅ Slice C (PinchZoomController) — Task 3.
- ✅ Slice D (EM induction wiring) — Task 4.
- ✅ Slice E (mass-measurement wiring) — Task 5.
- ✅ Spec acceptance criteria (Slice C #1–#8) covered in Task 6's smoke-test list.
- ✅ Risks (CameraRig tween, focal-point priority, sheet edge case, pointer-capture mid-cancel, browser-pinch interference) all addressed in the PinchZoomController code (Task 3) or accepted in the smoke-test list (Task 6.7).

**Placeholder scan:** No "TBD" / "TODO" / "implement later" / "similar to Task N". Every code-changing step shows the full snippet or full Find/Replace. Every command shows the exact CLI + expected output.

**Type consistency:**
- `dragBus.onCancel(cb)` returns `() => void` (unsubscriber). Used in Task 2's `useEffect(() => dragBus.onCancel(...))` — the cleanup function returned from `onCancel` is the effect's teardown.
- `dragBus.cancelAll()` returns `void`. Used in Task 3 inside `onMove`.
- `useCameraStore.getState().setZoomMul(z)` matches the existing API (clamping happens inside the store).
- `useCameraStore.getState().setFreeFocusPoint(p)` accepts `Vector3 | null` — we pass a `Vector3`, valid.
- `TABLE_TOP_Y` is the exported constant from `src/sdk/scene/Table.tsx` (verified by reading the file: `export const TABLE_TOP_Y = TABLE_HEIGHT // 0.85`).
- `useThree()` returns `{ camera, gl, ... }` — `camera.position` (Vector3) and `gl.domElement` (HTMLCanvasElement) are both stable references.

**No new tests:** Spec explicitly carries the 220-test regression gate; pinch logic is DOM-driven and has no unit-testable surface. Task 6.3 confirms green.

**Branch parallelism:** Working on `feat/pinch-to-zoom` from fresh master (`e78bbc7`) plus spec commit (`b6444cc`). No conflicting open branches.

**Iteration order rationale:** Slices A → B → C → D → E means each commit produces working, type-checked code: A introduces the bus with no consumers yet; B wires useDrag to the bus (still no-op without a producer); C introduces the producer (pinch starts firing); D and E mount it in each lab so the gesture is live.
