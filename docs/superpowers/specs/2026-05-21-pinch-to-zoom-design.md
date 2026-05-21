# Pinch-to-Zoom Gesture — Design

**Date:** 2026-05-21
**Status:** Approved-in-concept (user picked "midpoint as focal point" + "drag cancels, pinch takes over")
**Scope:** Native two-finger pinch gesture on phone/tablet 3D canvas. Pinch midpoint maps to the on-table world point and becomes the camera's focus target; pinch distance ratio drives the zoom multiplier. Drag is cancelled when pinch starts.

## Background

The lab canvas has `touch-action: none` (via `src/sdk/scene/canvasStyle.ts`), which disables every native browser gesture so that single-finger drags reliably hit the rigid-body pointer handlers in `useDrag`. The side effect is that pinch-to-zoom is disabled too. Students on phones today can only zoom via the explicit `+` / `−` buttons in `ZoomControls`. The user asked for the standard Photos-style two-finger pinch gesture so zooming feels native, and asked that the midpoint between the two fingers become the focal point of the camera (the camera not only zooms but also flies toward what's between the fingers).

Existing infrastructure that this design reuses:
- `useCameraStore.zoomMul` (range [0.25, 2.0]) — driven by `ZoomControls` and consumed by `CameraRig` to scale the preset-to-camera distance.
- `useCameraStore.freeFocusPoint` (world `Vector3` | null) — driven by tap-to-focus on the table; consumed by `CameraRig` to override the scene-default `lookAt`.
- `useCameraStore.setZoomMul(z)` — already clamps to [0.25, 2.0].
- `useCameraStore.setFreeFocusPoint(p)` — overrides scene-default lookAt and `CameraRig` tweens to it.
- `Table.tsx` exports `TABLE_TOP_Y = 0.85` (the y-plane the camera focuses on).
- `useDrag` in `src/sdk/physics/useDrag.ts` — handles single-pointer drag-vs-tap with `setPointerCapture`. Tracks `pointerId.current`, `isDragging.current`, `hasExceededThreshold.current`.

The `CameraRig` is already smooth-lerped, so an instantaneous `setFreeFocusPoint` + `setZoomMul` will play as a 1500 ms tween. That's acceptable — pinch feels responsive (zoom updates every frame, while the camera lerps toward the new pose).

## Non-goals

- Pan with two fingers (the camera has fixed POSEs per scene; pan would conflict with the focus-target system).
- Pinch-rotate (no orbit rotation in our camera).
- Pinch on desktop trackpad (uses a different `wheel + ctrlKey` API; out of scope).
- Pinch on desktop with mouse (no equivalent gesture; ZoomControls cover it).
- Variable pinch sensitivity / pinch curve. Stay with a natural 1:1 distance ratio.
- Three-or-more-finger gestures. Ignored.
- Pinch inside the BottomSheet. Out of scope; the gesture is captured at the window level so users in theory could pinch with the sheet open — accepted edge case for v1.
- New unit tests. The 220 pre-existing tests stay as a regression gate; the new pinch code is DOM-driven and has no good test surface.

## Architecture

Branch `feat/pinch-to-zoom` from `master` at commit `e78bbc7`.

| Slice | Purpose | Files |
|---|---|---|
| **A** | SDK drag-cancel bus | `src/sdk/physics/dragBus.ts` (NEW) |
| **B** | `useDrag` subscribes to the bus | `src/sdk/physics/useDrag.ts` (modify) |
| **C** | SDK `<PinchZoomController />` inside the Canvas | `src/sdk/scene/PinchZoomController.tsx` (NEW) |
| **D** | EM induction wiring | `src/labs/electromagnetic-induction/scene/LabScene.tsx` (modify) |
| **E** | Mass-measurement wiring | `src/labs/mass-measurement/scene/LabScene.tsx` (modify) |

2 new files, 3 modified. ~180 lines net.

Slices in code-dependency order: A → B → C → D → E. C consumes A; D and E consume C. The wiring of `usePinchZoom` belongs in the Canvas children (not at LabScene top level) because the controller needs `useThree()` for `camera` and `gl.domElement` access.

---

## Slice A — Drag-cancel bus

**File:** `src/sdk/physics/dragBus.ts` (NEW)

A tiny pub/sub. Used by the pinch controller to tell every active `useDrag` instance to release its drag mid-gesture.

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

### Acceptance

1. `dragBus.onCancel(cb)` adds `cb` to the listener set and returns an unsubscriber.
2. `dragBus.cancelAll()` invokes every listener; an exception in one listener doesn't prevent the others from firing.
3. The returned unsubscriber removes the listener (verified by `dragBus.cancelAll()` no longer invoking it).

---

## Slice B — `useDrag` cancellation hook-in

**File:** `src/sdk/physics/useDrag.ts` (modify)

Add a `cancelDrag` function and subscribe it to `dragBus.onCancel`. The function performs the cleanup that `onPointerUp` does, minus the snap pull.

### Imports

Add:

```ts
import { useEffect } from 'react'
import { dragBus } from './dragBus'
```

(`useEffect` is not currently imported in `useDrag.ts`; verify before adding.)

### Inside `useDrag()`, after the existing `useDrag.ts` declarations but before `intersectPlane`:

```ts
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

The dependency list contains `rigidBody` because the cleanup closes over `rigidBody.current`. All other refs are stable across renders.

### Acceptance

1. While a drag is in progress (kinematic body, sensor on), `dragBus.cancelAll()` reverts the body to Dynamic, restores solid colliders, and resets all drag state.
2. While a drag is in the tap window (no kinematic conversion yet), `dragBus.cancelAll()` simply clears the tap-detection state — body untouched.
3. When no drag is in progress, `dragBus.cancelAll()` is a no-op for this `useDrag` instance.

---

## Slice C — `PinchZoomController` component

**File:** `src/sdk/scene/PinchZoomController.tsx` (NEW)

A headless R3F component (renders `null`) that:
- Lives inside `<Canvas>` so `useThree()` gives it `camera` and `gl`.
- Attaches `pointerdown`/`pointermove`/`pointerup`/`pointercancel` listeners on `window`.
- Tracks the first two **touch** pointers.
- On second-finger-down, computes the initial midpoint and pinch distance, and arms the gesture (but does NOT yet commit anything to cameraStore).
- On subsequent `pointermove`, once the pinch distance has changed by ≥ `MIN_PINCH_TRAVEL_PX`, commits: maps the initial midpoint to a world point on the table plane via raycast, calls `setFreeFocusPoint(worldPoint)`, then updates `setZoomMul` continuously.
- Calls `dragBus.cancelAll()` at the commit moment (not on the bare touch — only when the user actually pinches).

### Full implementation

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

### Acceptance

1. With one finger on the canvas, nothing happens — `zoomMul` and `freeFocusPoint` unchanged.
2. Two fingers tapped quickly without spreading — nothing happens (threshold not crossed).
3. Two fingers spreading apart on the canvas — once the distance change exceeds 6 px, `freeFocusPoint` is set to the table-plane intersection of the initial midpoint, and `zoomMul` shrinks proportionally to `d0/d`. The camera flies toward the focal point AND zooms in over the existing CameraRig tween.
4. Two fingers pinching together — `zoomMul` grows; camera retreats.
5. Three+ fingers — third finger ignored; pinch continues with the first two.
6. One finger holding a draggable object, second finger touches elsewhere and the pair spreads enough to commit — the drag releases (body becomes Dynamic, snap-pull skipped), pinch takes over.
7. Lifting either tracked finger ends the gesture; placing two fingers down again re-anchors with the new pose.
8. Mouse drag on desktop, mouse wheel, and `ZoomControls` work unchanged.

---

## Slice D — EM induction wiring

**File:** `src/labs/electromagnetic-induction/scene/LabScene.tsx` (modify)

### Import

Add after the existing SDK imports near line 14:

```ts
import { PinchZoomController } from '../../../sdk/scene/PinchZoomController'
```

### Mount inside `<Canvas>`

Find the existing tree inside `<Canvas>`, somewhere near `<CinematicLighting />` / `<CameraRig />`:

```tsx
<CinematicLighting />
<CameraRig preset={preset} />
```

Add `<PinchZoomController />` directly under `<CameraRig />`:

```tsx
<CinematicLighting />
<CameraRig preset={preset} />
<PinchZoomController />
```

(The exact placement doesn't matter for the gesture — the controller is `null`-rendering. Placing it next to `CameraRig` puts camera-related machinery together.)

### Acceptance

1. EM-induction lab on iPhone: two-finger pinch zooms the camera and re-centres on the on-table pinch midpoint.
2. Single-finger drag of bar magnet works exactly as before.
3. ZoomControls `+`/`−` work unchanged.

---

## Slice E — Mass-measurement wiring

**File:** `src/labs/mass-measurement/scene/LabScene.tsx` (modify)

Identical pattern. Add the import and mount the controller inside `<Canvas>` next to `<CameraRig />`.

### Acceptance

1. Mass-measurement lab on iPhone: same pinch behaviour.
2. Existing single-finger drag of apple / tennis ball / baseball / weights unchanged.

---

## File touch-list

| File | Change |
|---|---|
| `src/sdk/physics/dragBus.ts` | NEW — ~20 lines. Pub/sub bus. |
| `src/sdk/physics/useDrag.ts` | Modify — subscribe to dragBus.onCancel in a useEffect. ~20 lines added. |
| `src/sdk/scene/PinchZoomController.tsx` | NEW — ~120 lines. The whole pinch gesture controller. |
| `src/labs/electromagnetic-induction/scene/LabScene.tsx` | Modify — 1 import + 1 line mount. |
| `src/labs/mass-measurement/scene/LabScene.tsx` | Modify — 1 import + 1 line mount. |

2 new files, 3 modified. ~180 lines net.

## Testing strategy

No new unit tests. The 220-test suite stays as a regression gate. Pinch behaviour is exercised by a human smoke-test on a phone/tablet after the branch deploys to Vercel.

### Smoke-test list

1. **EM-induction on iPhone:**
   - Two fingers spread out somewhere over the table → camera flies toward that spot and zooms in.
   - Two fingers pinch together → camera retreats.
   - One finger drags bar magnet halfway, second finger appears and spreads → magnet releases mid-air (becomes Dynamic, falls / settles), camera starts zooming.
   - Tap-to-focus on an instrument still works; FocusReset still works.
   - Single-finger drag through the coil bore still works without pinch interference.
   - `+`/`−` zoom buttons still work.
2. **Mass-measurement on iPhone:**
   - Two-finger pinch zooms the lever balance / scale / dynamometer area.
   - Drag-an-apple still works; the second-finger cancel still works.
3. **iPad portrait (768 px tablet):** same pinch behaviour as phone.
4. **Desktop:** no behavioural change. Mouse drag, wheel-zoom (if any), `+`/`−` buttons all unchanged.

## Risks

- **CameraRig tween fights pinch responsiveness.** `setZoomMul` updates instantly, but `CameraRig` lerps over 1500 ms. So the camera lags the fingers by up to that duration during a fast pinch. Acceptable — keeps motion smooth. If complaints arise, shorten `DOLLY_DURATION_MS` for pinch-triggered updates specifically.
- **freeFocusPoint set on every pinch.** A student who pinches once near the magnet then taps elsewhere expects the new tap to retarget. Tap-to-focus on the table sets a new freeFocusPoint, so this works. Tap-to-focus on an instrument sets `focusTarget` (different field), so freeFocusPoint stays — but `CameraRig`'s priority is `freeFocusPoint > focusTarget > preset`, so the pinch focal point wins. The FocusReset button (🌄 Все) clears both. Documented edge case, no fix needed.
- **Window-level pointer listeners while BottomSheet is open.** A two-finger pinch with the sheet visible would zoom the canvas behind the sheet. Edge case (sheet is usually used with one finger at a time). Accepted for v1.
- **Pointer capture and window listeners.** `useDrag` calls `setPointerCapture` on the dragged element. After `dragBus.cancelAll()` clears `isDragging.current`, the captured element still owns the OS-level pointer until pointer-up — but `onPointerMove` checks `isDragging.current` first and bails. So no rogue body motion. Verified.
- **Browser pinch-zoom on the page.** With `touch-action: none` on the Canvas, the browser cannot intercept two-finger gestures for page zoom. Confirmed unchanged. Outside the Canvas (HUD, sheet) `touch-action` defaults apply — but those areas aren't where students pinch.
- **iOS Safari rubber-band scroll on pull-down.** The page body has `position: fixed; inset: 0` via the canvas style, so the page is non-scrollable and there's no rubber-band. Confirmed unchanged.

## Out of scope

- Pinch-to-rotate (no orbit camera anyway).
- Two-finger pan.
- Desktop trackpad pinch (`wheel + ctrlKey`).
- Sensitivity slider / pinch-curve options.
- Pinch inside BottomSheet.
- Adaptive `MIN_PINCH_TRAVEL_PX` per device DPI.
- New ARIA/keyboard-equivalent for the pinch action (covered by existing `+`/`−` buttons).

## Self-review checklist

- [x] Every slice has a concrete acceptance criterion.
- [x] Architecture is internally consistent — A is consumed by B; B and C share the bus; D/E mount C.
- [x] No "TBD" / "TODO" / placeholder text.
- [x] File touch-list matches what each slice describes.
- [x] Existing tests are NOT modified; suite is regression gate.
- [x] No new dependencies, no new Zustand stores, no new persist keys.
- [x] User's explicit picks (drag-cancels-on-pinch + midpoint-as-focal-point) both in the design.
- [x] Risks section addresses tween-vs-pinch responsiveness, focus-target priority, sheet edge case, pointer-capture mid-cancel, browser-pinch interference.
- [x] Out-of-scope items are explicit.
