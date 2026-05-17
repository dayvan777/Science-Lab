# EM Induction Focus Navigation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the student tap any EM-induction instrument (магніт / котушка / лампа / гальванометр) to fly the camera to it, plus a small "🌄 Все" pill that returns to the scene-default preset.

**Architecture:** Four independent slices. Slice A extends `useCameraStore` with a `focusTarget` field and adds a `focus-bulb` POSE; `CameraRig` maps `focusTarget` to a preset that overrides the scene default. Slice B adds tap-vs-drag distinction to `useDrag` (movement threshold 8 px, duration < 250 ms) and forwards an `onTap` prop through `Draggable`. Slice C introduces a small `useTapDetector` SDK helper used by non-draggable instruments (Coil, Bulb, Galvanometer). Slice D wires the bar magnet's `onTap`, auto-clears focus on scene change, and adds a `FocusResetButton` HUD pill.

**Tech Stack:** React 19, TypeScript, Zustand 5, `@react-three/fiber`, `@react-three/rapier`, Three.js. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-05-17-em-induction-focus-nav-design.md` (commit `0cd08a2`).

**Branch:** `feat/em-induction-focus-nav` (from `master` at commit `0cd08a2`).

---

## File Structure

10 files modified, 2 new files.

| File | Slice | Change |
|---|---|---|
| `src/sdk/scene/cameraStore.ts` | A | Add `FocusTarget` type, `focusTarget` state, `setFocusTarget` action. |
| `src/sdk/scene/CameraRig.tsx` | A | Add `focus-bulb` to `CameraPreset` type and POSES. Read `focusTarget` from store, map to `effectivePreset`, replace `preset` references inside the function. |
| `src/sdk/physics/useDrag.ts` | B | Add `onTap?: () => void` prop. Add tap-vs-drag refs + threshold logic. Defer drag-start side effects until movement threshold exceeded. |
| `src/sdk/object/Draggable.tsx` | B | Forward `onTap?` prop into `useDrag`. |
| `src/sdk/object/useTapDetector.ts` | C | NEW — `useTapDetector(onTap)` helper returning `{ onPointerDown, onPointerUp }`. |
| `src/labs/electromagnetic-induction/instruments/Coil.tsx` | C | Wrap mesh in `<group>` with tap handlers → `setFocusTarget('coil')`. |
| `src/labs/electromagnetic-induction/instruments/Bulb.tsx` | C | Wrap meshes in `<group>` with tap handlers → `setFocusTarget('bulb')`. |
| `src/labs/electromagnetic-induction/instruments/Galvanometer.tsx` | C | Wrap meshes with tap handlers → `setFocusTarget('galv')`. |
| `src/labs/electromagnetic-induction/objects/BarMagnet.tsx` | D | Pass `onTap={() => useCameraStore.getState().setFocusTarget('magnet')}` to `<Draggable>`. |
| `src/labs/electromagnetic-induction/scene/LabScene.tsx` | D | `useEffect` that clears `focusTarget` on scene change. Mount `<FocusResetButton />` in the bottom-right HUD row. |
| `src/labs/electromagnetic-induction/ui/FocusResetButton.tsx` | D | NEW — "🌄 Все" pill, visible only when focusTarget is non-null. |

---

## Pre-flight

- [ ] **Step 0a: Confirm clean tree on master**

Run: `git status`
Expected: `nothing to commit, working tree clean`. HEAD at `0cd08a2` on `master`.

- [ ] **Step 0b: Create feature branch**

Run: `git checkout -b feat/em-induction-focus-nav`
Expected: `Switched to a new branch 'feat/em-induction-focus-nav'`.

- [ ] **Step 0c: Baseline test run**

Run: `npm test -- --run`
Expected: `Tests 220 passed (220)`.

---

## Task 1 (Slice A): CameraStore + focus-bulb POSE + CameraRig override

**Files:**
- Modify: `src/sdk/scene/cameraStore.ts`
- Modify: `src/sdk/scene/CameraRig.tsx`

This task adds the foundational state and a new preset. After this task, the camera can be driven by `setFocusTarget(...)` from any consumer.

- [ ] **Step 1.1: Extend cameraStore.ts with focusTarget state**

Open `src/sdk/scene/cameraStore.ts`. Currently:

```ts
import { create } from 'zustand'

/**
 * Manual camera zoom factor applied on top of the active CameraRig preset.
 * 1.0 = preset default. Lower = closer (zoomed in). Higher = farther (out).
 */
type CameraStore = {
  zoomMul: number
  setZoomMul: (z: number) => void
  zoomBy: (factor: number) => void
  resetZoom: () => void
}

const MIN_ZOOM = 0.25
const MAX_ZOOM = 2.0

export const useCameraStore = create<CameraStore>((set) => ({
  zoomMul: 1,
  setZoomMul: (z) => set({ zoomMul: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z)) }),
  zoomBy: (factor) =>
    set((s) => ({ zoomMul: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, s.zoomMul * factor)) })),
  resetZoom: () => set({ zoomMul: 1 }),
}))
```

Replace the whole file content with:

```ts
import { create } from 'zustand'

/**
 * Per-lab user-controllable focus target. When non-null, CameraRig
 * overrides the scene-default preset and flies to the corresponding
 * focus-* pose. EM-induction's instruments dispatch `setFocusTarget(...)`
 * on tap; FocusResetButton clears it.
 */
export type FocusTarget = 'magnet' | 'coil' | 'bulb' | 'galv' | null

/**
 * Manual camera zoom factor applied on top of the active CameraRig preset.
 * 1.0 = preset default. Lower = closer (zoomed in). Higher = farther (out).
 */
type CameraStore = {
  zoomMul: number
  focusTarget: FocusTarget
  setZoomMul: (z: number) => void
  zoomBy: (factor: number) => void
  resetZoom: () => void
  setFocusTarget: (t: FocusTarget) => void
}

const MIN_ZOOM = 0.25
const MAX_ZOOM = 2.0

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

Three changes: exported `FocusTarget` type, new `focusTarget` field with default `null`, new `setFocusTarget` action.

- [ ] **Step 1.2: Add focus-bulb POSE in CameraRig.tsx**

Open `src/sdk/scene/CameraRig.tsx`. Find the `CameraPreset` type (around lines 9–19):

```ts
export type CameraPreset =
  | 'intro'
  | 'overview'      // existing default — kept for compatibility
  | 'workspace'     // front + slightly above
  | 'focus-scale'
  | 'focus-lever'
  | 'focus-dyn'
  | 'focus-coil'
  | 'focus-magnet'
  | 'focus-galv'
  | 'reveal'
```

Add `'focus-bulb'` between `'focus-galv'` and `'reveal'`:

```ts
export type CameraPreset =
  | 'intro'
  | 'overview'      // existing default — kept for compatibility
  | 'workspace'     // front + slightly above
  | 'focus-scale'
  | 'focus-lever'
  | 'focus-dyn'
  | 'focus-coil'
  | 'focus-magnet'
  | 'focus-galv'
  | 'focus-bulb'
  | 'reveal'
```

Then find the `POSES` record (around lines 26–37):

```ts
const POSES: Record<CameraPreset, Pose> = {
  intro:         { position: [0, 2.0, 2.4],   lookAt: [0, 0.85, 0]   },
  overview:      { position: [0, 1.5, 2.0],   lookAt: [0, 0.85, 0]   },
  workspace:     { position: [0, 1.5, 2.0],   lookAt: [0, 0.85, 0]   },
  'focus-scale': { position: [0.25, 1.5, 1.8], lookAt: [0.4, 0.9, 0] },
  'focus-lever': { position: [0.05, 1.5, 1.8], lookAt: [0.05, 0.9, 0] },
  'focus-dyn':   { position: [-0.25, 1.55, 1.8], lookAt: [-0.4, 1.05, 0] },
  'focus-coil':   { position: [-0.05, 1.35, 1.1], lookAt: [-0.05, 0.95, 0] },
  'focus-magnet': { position: [-0.30, 1.35, 1.1], lookAt: [-0.30, 0.95, 0] },
  'focus-galv':   { position: [0.30, 1.35, 1.1],  lookAt: [0.30, 0.95, 0]  },
  reveal:        { position: [0, 3.0, 3.2],   lookAt: [0, 1.0, 0]    },
}
```

Add a `'focus-bulb'` entry between `'focus-galv'` and `reveal`:

```ts
const POSES: Record<CameraPreset, Pose> = {
  intro:         { position: [0, 2.0, 2.4],   lookAt: [0, 0.85, 0]   },
  overview:      { position: [0, 1.5, 2.0],   lookAt: [0, 0.85, 0]   },
  workspace:     { position: [0, 1.5, 2.0],   lookAt: [0, 0.85, 0]   },
  'focus-scale': { position: [0.25, 1.5, 1.8], lookAt: [0.4, 0.9, 0] },
  'focus-lever': { position: [0.05, 1.5, 1.8], lookAt: [0.05, 0.9, 0] },
  'focus-dyn':   { position: [-0.25, 1.55, 1.8], lookAt: [-0.4, 1.05, 0] },
  'focus-coil':   { position: [-0.05, 1.35, 1.1], lookAt: [-0.05, 0.95, 0] },
  'focus-magnet': { position: [-0.30, 1.35, 1.1], lookAt: [-0.30, 0.95, 0] },
  'focus-galv':   { position: [0.30, 1.35, 1.1],  lookAt: [0.30, 0.95, 0]  },
  'focus-bulb':   { position: [0.55, 1.35, 1.1],  lookAt: [0.55, 0.95, 0]  },
  reveal:        { position: [0, 3.0, 3.2],   lookAt: [0, 1.0, 0]    },
}
```

The bulb is at world `[0.55, 0.85, 0]` (per LabScene's `BULB_WORLD`). Camera offset matches the other focus-* presets (`y=1.35, z=1.1` from the lookAt point).

- [ ] **Step 1.3: CameraRig reads focusTarget and overrides preset**

Still in `src/sdk/scene/CameraRig.tsx`. Find the `CameraRig` function signature and the existing `userZoomMul` line. Currently around lines 73–82:

```ts
export function CameraRig({ preset }: Props) {
  const { camera, gl } = useThree()
  const tweenStart = useRef<number | null>(null)
  const fromPos = useRef(new Vector3())
  const fromLook = useRef(new Vector3())
  const targetLook = useRef(new Vector3())
  const lastPreset = useRef<CameraPreset | null>(null)
  const userZoomMul = useCameraStore(s => s.zoomMul)
  const reducedMotion = useReducedMotion()
  const { breakpoint } = useViewport()
```

Add a focus-target selector + mapping immediately after `userZoomMul`:

```ts
export function CameraRig({ preset }: Props) {
  const { camera, gl } = useThree()
  const tweenStart = useRef<number | null>(null)
  const fromPos = useRef(new Vector3())
  const fromLook = useRef(new Vector3())
  const targetLook = useRef(new Vector3())
  const lastPreset = useRef<CameraPreset | null>(null)
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

- [ ] **Step 1.4: Replace `preset` with `effectivePreset` in three places**

Still in `CameraRig.tsx`. Find the `useEffect` that triggers the tween on preset change (around lines 118–128):

```ts
  // Start a tween whenever the active preset changes.
  useEffect(() => {
    if (lastPreset.current === preset) return
    fromPos.current.copy(camera.position)
    const dir = new Vector3()
    camera.getWorldDirection(dir)
    fromLook.current.copy(camera.position).add(dir)
    const target = POSES[preset]
    targetLook.current.set(...target.lookAt)
    tweenStart.current = performance.now()
    lastPreset.current = preset
  }, [preset, camera])
```

Replace ALL `preset` references in this block with `effectivePreset` (3 replacements: dep comparison, POSES lookup, ref assignment). The dependency array also updates:

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

Then find the `useFrame` callback (around lines 131–163). Its first line uses `preset`:

```ts
  useFrame(() => {
    const target = POSES[preset]
    const targetPos = applyZoom(target.position, target.lookAt, zoomMul)
    // ...rest unchanged...
  })
```

Replace `POSES[preset]` with `POSES[effectivePreset]`:

```ts
  useFrame(() => {
    const target = POSES[effectivePreset]
    const targetPos = applyZoom(target.position, target.lookAt, zoomMul)
    // ...rest unchanged...
  })
```

Everything else in the function stays.

- [ ] **Step 1.5: Type-check + test + build**

Run: `npx tsc --noEmit`
Expected: 0 errors.

Run: `npm test -- --run`
Expected: 220 tests passing.

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 1.6: Commit**

```bash
git add -A
git commit -m "feat(sdk): cameraStore focusTarget + focus-bulb POSE + CameraRig override"
```

---

## Task 2 (Slice B): SDK tap-vs-drag distinction

**Files:**
- Modify: `src/sdk/physics/useDrag.ts`
- Modify: `src/sdk/object/Draggable.tsx`

Add tap detection. Pointer events with movement < 8 px and duration < 250 ms count as a tap; the `onTap` callback fires. Otherwise the existing drag flow runs. Drag-start side effects (setBodyType, setSensor, setAngvel, target reset) are deferred until the movement threshold is exceeded, so a stationary tap leaves the body completely unchanged.

- [ ] **Step 2.1: Add tap-related constants in useDrag.ts**

Open `src/sdk/physics/useDrag.ts`. Find the existing constants block (around lines 10–18):

```ts
const SMOOTHING = 0.3
// Drag bounds — keep dragged objects within the table footprint so the user
// cannot accidentally drop something off the edge and lose it. Default values
// match the mass-measurement lab table (2.5m × 1.2m). For multi-lab use later,
// these can become a hook prop or context-driven config.
const DRAG_MIN_X = -1.15
const DRAG_MAX_X = 1.15
const DRAG_MIN_Z = -0.5
const DRAG_MAX_Z = 0.5
```

Add two more constants below them:

```ts
const SMOOTHING = 0.3
// Drag bounds — keep dragged objects within the table footprint so the user
// cannot accidentally drop something off the edge and lose it. Default values
// match the mass-measurement lab table (2.5m × 1.2m). For multi-lab use later,
// these can become a hook prop or context-driven config.
const DRAG_MIN_X = -1.15
const DRAG_MAX_X = 1.15
const DRAG_MIN_Z = -0.5
const DRAG_MAX_Z = 0.5
// Tap-vs-drag thresholds. A pointer-down + pointer-up sequence with cumulative
// screen-space movement under TAP_MOVE_THRESHOLD_PX and total duration under
// TAP_MAX_DURATION_MS counts as a tap → fires onTap?(). Anything more becomes
// a drag (existing flow). Used by EM-induction so the bar magnet can be
// tapped (focus camera) or dragged (move) without ambiguity.
const TAP_MOVE_THRESHOLD_PX = 8
const TAP_MAX_DURATION_MS = 250
```

- [ ] **Step 2.2: Add onTap to Props + destructure**

In the same file, find the `Props` type (currently lines 64–77):

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

Append an `onTap?` field:

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
  /** Optional tap handler. Fires on a quick stationary pointer-down/up
   *  (movement < 8 px, duration < 250 ms). Used by EM-induction so the
   *  bar magnet can be tapped to focus the camera without triggering a
   *  drag. Stationary taps leave the rigid body unchanged. */
  onTap?: () => void
}
```

Find the function signature (currently line 79):

```ts
export function useDrag({ rigidBody, bodyId, dragHeight = 1.0, dragCorridor }: Props) {
```

Replace with:

```ts
export function useDrag({ rigidBody, bodyId, dragHeight = 1.0, dragCorridor, onTap }: Props) {
```

- [ ] **Step 2.3: Add tap-tracking refs**

Still in `useDrag.ts`. The function body currently has these refs near the top (around lines 81–84):

```ts
  const { camera, gl } = useThree()
  const target = useRef(new Vector3())
  const isDragging = useRef(false)
  const pointerId = useRef<number | null>(null)
```

Add three more tap-tracking refs immediately after `pointerId`:

```ts
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
```

- [ ] **Step 2.4: Rewrite onPointerDown to defer drag-start side effects**

Still in `useDrag.ts`. Find the current `onPointerDown` (lines 97–114):

```ts
  const onPointerDown = (ev: ThreeEvent<PointerEvent>) => {
    // Filter: for mouse pointers, require an actual button press (prevents hover-induced drags)
    if (ev.pointerType === 'mouse' && (ev as unknown as { buttons: number }).buttons === 0) return
    if (!rigidBody.current) return
    ev.stopPropagation()
    isDragging.current = true
    pointerId.current = ev.pointerId
    rigidBody.current.setBodyType(RigidBodyType.KinematicPositionBased, true)
    rigidBody.current.setAngvel({ x: 0, y: 0, z: 0 }, true)
    // Make collider a sensor during drag so dragged body passes through other objects
    // without launching them (kinematic→dynamic collisions otherwise apply huge impulses).
    const n = rigidBody.current.numColliders()
    for (let i = 0; i < n; i++) {
      rigidBody.current.collider(i).setSensor(true)
    }
    target.current.copy(intersectPlane(ev))
    ;(ev.target as Element).setPointerCapture(ev.pointerId)
  }
```

Replace with this version that records tap-start state and DEFERS drag side effects:

```ts
  const onPointerDown = (ev: ThreeEvent<PointerEvent>) => {
    // Filter: for mouse pointers, require an actual button press (prevents hover-induced drags)
    if (ev.pointerType === 'mouse' && (ev as unknown as { buttons: number }).buttons === 0) return
    if (!rigidBody.current) return
    ev.stopPropagation()
    isDragging.current = true
    pointerId.current = ev.pointerId
    // Record tap-start state. Drag-start side effects (setBodyType, setSensor,
    // setAngvel, target reset) are DEFERRED until movement exceeds the tap
    // threshold. If the user releases within thresholds, this becomes a tap
    // and the rigid body stays unchanged.
    tapStartTime.current = performance.now()
    tapStartScreenX.current = ev.nativeEvent.clientX
    tapStartScreenY.current = ev.nativeEvent.clientY
    hasExceededThreshold.current = false
    ;(ev.target as Element).setPointerCapture(ev.pointerId)
  }
```

Note: pointer capture STILL happens immediately so pointer-up reaches us reliably. But setBodyType/setSensor/setAngvel are deferred.

- [ ] **Step 2.5: Rewrite onPointerMove to detect threshold + lazy-init drag**

Still in `useDrag.ts`. Find the current `onPointerMove` (lines 116–141):

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

Replace with:

```ts
  const onPointerMove = (ev: ThreeEvent<PointerEvent>) => {
    if (!isDragging.current || ev.pointerId !== pointerId.current) return
    // Check whether movement exceeds the tap threshold. If yes (and we
    // haven't already escalated this gesture), commit to drag now: fire
    // the deferred drag-start side effects.
    if (!hasExceededThreshold.current) {
      const dx = ev.nativeEvent.clientX - tapStartScreenX.current
      const dy = ev.nativeEvent.clientY - tapStartScreenY.current
      if (Math.abs(dx) >= TAP_MOVE_THRESHOLD_PX || Math.abs(dy) >= TAP_MOVE_THRESHOLD_PX) {
        hasExceededThreshold.current = true
        if (rigidBody.current) {
          rigidBody.current.setBodyType(RigidBodyType.KinematicPositionBased, true)
          rigidBody.current.setAngvel({ x: 0, y: 0, z: 0 }, true)
          const n = rigidBody.current.numColliders()
          for (let i = 0; i < n; i++) {
            rigidBody.current.collider(i).setSensor(true)
          }
          target.current.copy(intersectPlane(ev))
        }
      } else {
        // Still in the tap window — don't move the body yet.
        return
      }
    }
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

- [ ] **Step 2.6: Rewrite onPointerUp to detect tap and skip drag finalization when appropriate**

Still in `useDrag.ts`. Find the current `onPointerUp` (lines 143–170):

```ts
  const onPointerUp = (ev: ThreeEvent<PointerEvent>) => {
    if (ev.pointerId !== pointerId.current) return
    isDragging.current = false
    pointerId.current = null
    ;(ev.target as Element).releasePointerCapture(ev.pointerId)
    if (!rigidBody.current) return
    // Restore solid collider before resolving snap/drop
    const n = rigidBody.current.numColliders()
    for (let i = 0; i < n; i++) {
      rigidBody.current.collider(i).setSensor(false)
    }
    const t = rigidBody.current.translation()
    const dropPos = new Vector3(t.x, t.y, t.z)
    const snap = findSnapNear(dropPos, bodyId)
    if (!snap) {
      rigidBody.current.setBodyType(RigidBodyType.Dynamic, true)
      return
    }
    // Magnetic-pull tween: kinematic body walked from dropPos to snap.position over 300ms.
    setLastSnap(snap.id)
    animateMagneticSnap(rigidBody.current, dropPos, snap.position, 300, () => {
      if (!rigidBody.current) return
      snap.onAttach(rigidBody.current)
      if (!snap.keepKinematic) {
        rigidBody.current.setBodyType(RigidBodyType.Dynamic, true)
      }
    })
  }
```

Replace with:

```ts
  const onPointerUp = (ev: ThreeEvent<PointerEvent>) => {
    if (ev.pointerId !== pointerId.current) return
    const tapT = tapStartTime.current
    const wasTap =
      !hasExceededThreshold.current &&
      tapT !== null &&
      (performance.now() - tapT) < TAP_MAX_DURATION_MS
    isDragging.current = false
    pointerId.current = null
    tapStartTime.current = null
    ;(ev.target as Element).releasePointerCapture(ev.pointerId)
    if (wasTap) {
      // Stationary quick tap → fire onTap callback. The rigid body was
      // never converted to kinematic (drag-start side effects deferred),
      // so nothing else needs to be undone here.
      onTap?.()
      return
    }
    if (!rigidBody.current) return
    // Restore solid collider before resolving snap/drop
    const n = rigidBody.current.numColliders()
    for (let i = 0; i < n; i++) {
      rigidBody.current.collider(i).setSensor(false)
    }
    const t = rigidBody.current.translation()
    const dropPos = new Vector3(t.x, t.y, t.z)
    const snap = findSnapNear(dropPos, bodyId)
    if (!snap) {
      rigidBody.current.setBodyType(RigidBodyType.Dynamic, true)
      return
    }
    // Magnetic-pull tween: kinematic body walked from dropPos to snap.position over 300ms.
    setLastSnap(snap.id)
    animateMagneticSnap(rigidBody.current, dropPos, snap.position, 300, () => {
      if (!rigidBody.current) return
      snap.onAttach(rigidBody.current)
      if (!snap.keepKinematic) {
        rigidBody.current.setBodyType(RigidBodyType.Dynamic, true)
      }
    })
  }
```

Key changes vs the original:
- Detect tap BEFORE updating refs so we have the correct values.
- If `wasTap`, fire `onTap?.()` and return — skipping the snap/drag-finalization logic. Body stays in whatever state it was in (Dynamic before tap, snapped-kinematic if previously parked on a snap target — both correct).

- [ ] **Step 2.7: Forward onTap through Draggable.tsx**

Open `src/sdk/object/Draggable.tsx`. Find the `Props` type. Add an `onTap?` field next to the existing `dragCorridor?`:

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
  /** Optional tap callback. Fires on a quick stationary touch (no drag).
   *  Used by EM-induction so the bar magnet can be tapped to focus the
   *  camera while still being dragged normally. */
  onTap?: () => void
  children: ReactNode
}
```

Then find the function signature. Currently:

```ts
export function Draggable({ position, mass, shape, bodyId, enabled = true, dragHeight, dragCorridor, children }: Props) {
```

Replace with:

```ts
export function Draggable({ position, mass, shape, bodyId, enabled = true, dragHeight, dragCorridor, onTap, children }: Props) {
```

Then find the `useDrag` call inside the function body:

```ts
const { onPointerDown: rawDown, onPointerMove, onPointerUp: rawUp } = useDrag({ rigidBody: ref, bodyId, dragHeight, dragCorridor })
```

Add `onTap`:

```ts
const { onPointerDown: rawDown, onPointerMove, onPointerUp: rawUp } = useDrag({ rigidBody: ref, bodyId, dragHeight, dragCorridor, onTap })
```

- [ ] **Step 2.8: Type-check + test + build**

Run: `npx tsc --noEmit`
Expected: 0 errors.

Run: `npm test -- --run`
Expected: 220 tests passing (no test exercises the tap path; existing drag tests still cover the drag path).

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 2.9: Commit**

```bash
git add -A
git commit -m "feat(sdk): useDrag tap-vs-drag detection (movement threshold) + onTap prop"
```

---

## Task 3 (Slice C): useTapDetector helper + wire non-draggable instruments

**Files:**
- Create: `src/sdk/object/useTapDetector.ts`
- Modify: `src/labs/electromagnetic-induction/instruments/Coil.tsx`
- Modify: `src/labs/electromagnetic-induction/instruments/Bulb.tsx`
- Modify: `src/labs/electromagnetic-induction/instruments/Galvanometer.tsx`

Non-draggable instruments need their own tap detection (Draggable's tap is bundled with drag). A small helper avoids duplicating the threshold logic across three files.

- [ ] **Step 3.1: Create useTapDetector.ts**

Create `src/sdk/object/useTapDetector.ts` with this content:

```ts
import { useRef } from 'react'
import type { ThreeEvent } from '@react-three/fiber'

const TAP_MOVE_THRESHOLD_PX = 8
const TAP_MAX_DURATION_MS = 250

/**
 * Detects a tap (quick stationary pointer-down → pointer-up) on a mesh
 * or group. Returns `onPointerDown` and `onPointerUp` handlers to spread
 * onto the target.
 *
 * Used by non-draggable EM-induction instruments (Coil, Bulb,
 * Galvanometer) so the student can tap any of them to focus the camera.
 * Same tap heuristic as `useDrag` (8 px / 250 ms).
 */
export function useTapDetector(onTap: () => void) {
  const startTime = useRef<number | null>(null)
  const startX = useRef(0)
  const startY = useRef(0)

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    startTime.current = performance.now()
    startX.current = e.nativeEvent.clientX
    startY.current = e.nativeEvent.clientY
  }

  const onPointerUp = (e: ThreeEvent<PointerEvent>) => {
    const t = startTime.current
    if (t === null) return
    const dt = performance.now() - t
    const dx = Math.abs(e.nativeEvent.clientX - startX.current)
    const dy = Math.abs(e.nativeEvent.clientY - startY.current)
    startTime.current = null
    if (dt < TAP_MAX_DURATION_MS && dx < TAP_MOVE_THRESHOLD_PX && dy < TAP_MOVE_THRESHOLD_PX) {
      onTap()
    }
  }

  return { onPointerDown, onPointerUp }
}
```

- [ ] **Step 3.2: Wire Coil.tsx**

Open `src/labs/electromagnetic-induction/instruments/Coil.tsx`. Add two imports near the top with the existing imports:

```ts
import { useTapDetector } from '../../../sdk/object/useTapDetector'
import { useCameraStore } from '../../../sdk/scene/cameraStore'
```

Inside the `Coil` function (around the existing setup, after the `useEffect` blocks), add a tap detector:

```ts
  const setFocusTarget = useCameraStore(s => s.setFocusTarget)
  const tap = useTapDetector(() => setFocusTarget('coil'))
```

Then find the existing JSX return. Currently:

```tsx
  return (
    <group position={position}>
      <mesh geometry={geometry}>
        <meshStandardMaterial
          color="#b67333"
          metalness={0.85}
          roughness={0.25}
          envMapIntensity={1.0}
        />
        {active && <Outlines thickness={3} color="#0a84ff" />}
      </mesh>
    </group>
  )
```

Add the tap handlers to the outer `<group>`:

```tsx
  return (
    <group position={position} {...tap}>
      <mesh geometry={geometry}>
        <meshStandardMaterial
          color="#b67333"
          metalness={0.85}
          roughness={0.25}
          envMapIntensity={1.0}
        />
        {active && <Outlines thickness={3} color="#0a84ff" />}
      </mesh>
    </group>
  )
```

- [ ] **Step 3.3: Wire Bulb.tsx**

Open `src/labs/electromagnetic-induction/instruments/Bulb.tsx`. Add two imports:

```ts
import { useTapDetector } from '../../../sdk/object/useTapDetector'
import { useCameraStore } from '../../../sdk/scene/cameraStore'
```

Inside the `Bulb` function body, after the existing refs and before the `useFrame`, add:

```ts
  const setFocusTarget = useCameraStore(s => s.setFocusTarget)
  const tap = useTapDetector(() => setFocusTarget('bulb'))
```

Then find the JSX return. Currently:

```tsx
  return (
    <group position={position}>
      {/* Brass base */}
      <mesh position={[0, BASE_HEIGHT / 2, 0]} castShadow>
        ...
      </mesh>
      {/* Frosted glass sphere */}
      <mesh position={[0, BASE_HEIGHT + BULB_GLASS_R, 0]} castShadow>
        ...
      </mesh>
      {/* Point light inside the bulb */}
      <pointLight ... />
    </group>
  )
```

Spread `{...tap}` onto the outer `<group>`:

```tsx
  return (
    <group position={position} {...tap}>
      {/* ...existing children unchanged... */}
    </group>
  )
```

(Keep all existing children verbatim; only the outer group props change.)

- [ ] **Step 3.4: Wire Galvanometer.tsx**

Open `src/labs/electromagnetic-induction/instruments/Galvanometer.tsx`. Add two imports near the other imports:

```ts
import { useTapDetector } from '../../../sdk/object/useTapDetector'
import { useCameraStore } from '../../../sdk/scene/cameraStore'
```

Inside the `Galvanometer` function body (after the existing refs `displayedAngle`, `velocity`, etc., and before the `useFrame`), add:

```ts
  const setFocusTarget = useCameraStore(s => s.setFocusTarget)
  const tap = useTapDetector(() => setFocusTarget('galv'))
```

Then find the JSX return and add `{...tap}` to the outermost `<group>` (the one with `position={position}`). The Galvanometer's outer group might be implicit or in a fragment — check the actual JSX and add the spread to whichever element is the top-level `<group position={position}>`.

If the Galvanometer's top-level element is `<group position={position}>`, simply spread:

```tsx
  return (
    <group position={position} {...tap}>
      {/* ...existing children unchanged... */}
    </group>
  )
```

If the Galvanometer renders as multiple sibling meshes inside a fragment (no top-level group), wrap them in a `<group>` and add the tap handlers there. Use your judgment based on the file's actual structure.

- [ ] **Step 3.5: Type-check + test + build**

Run: `npx tsc --noEmit`
Expected: 0 errors.

Run: `npm test -- --run`
Expected: 220 tests passing.

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3.6: Commit**

```bash
git add -A
git commit -m "feat(em-induction): tap Coil/Bulb/Galvanometer to focus camera"
```

---

## Task 4 (Slice D): BarMagnet onTap + scene-change clear + FocusResetButton

**Files:**
- Modify: `src/labs/electromagnetic-induction/objects/BarMagnet.tsx`
- Modify: `src/labs/electromagnetic-induction/scene/LabScene.tsx`
- Create: `src/labs/electromagnetic-induction/ui/FocusResetButton.tsx`

- [ ] **Step 4.1: BarMagnet passes onTap**

Open `src/labs/electromagnetic-induction/objects/BarMagnet.tsx`. Add a new import alongside the existing imports:

```ts
import { useCameraStore } from '../../../sdk/scene/cameraStore'
```

Find the existing `<Draggable>` element. Currently:

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
      dragCorridor={{ center: COIL_CENTER, halfLength: CORRIDOR_HALF_LENGTH }}
    >
```

Add `onTap`:

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
      dragCorridor={{ center: COIL_CENTER, halfLength: CORRIDOR_HALF_LENGTH }}
      onTap={() => useCameraStore.getState().setFocusTarget('magnet')}
    >
```

`getState()` avoids re-rendering BarMagnet when `setFocusTarget` reference changes — same pattern as `SceneController`'s reads.

- [ ] **Step 4.2: Create FocusResetButton.tsx**

Create `src/labs/electromagnetic-induction/ui/FocusResetButton.tsx` with this content:

```tsx
import { Button } from '../../../sdk/ui/Button'
import { sound } from '../../../sdk/audio/SoundManager'
import { useCameraStore } from '../../../sdk/scene/cameraStore'

/**
 * Bottom-right HUD pill, visible only when the user has manually focused
 * on an instrument. Tap to clear the focus and return to the scene's
 * default camera preset. Plays a tick sound on click.
 */
export function FocusResetButton() {
  const focusTarget = useCameraStore(s => s.focusTarget)
  const setFocusTarget = useCameraStore(s => s.setFocusTarget)

  if (focusTarget === null) return null

  const handleClick = () => {
    sound.play('tick')
    setFocusTarget(null)
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

- [ ] **Step 4.3: LabScene clears focus on scene change + mounts FocusResetButton**

Open `src/labs/electromagnetic-induction/scene/LabScene.tsx`. Add an import near the other imports:

```ts
import { useCameraStore } from '../../../sdk/scene/cameraStore'
import { FocusResetButton } from '../ui/FocusResetButton'
```

Inside the `LabScene` function body, find the existing `useEffect` blocks. After the existing `setActiveInstrument('coil')` effect (or any other effect at that level), add a new effect that clears focus when the scene index changes:

```ts
  // Clear manual focus on scene change. The guided flow's scene-default
  // preset takes over; if the student wants a different focus, they tap
  // the instrument again.
  const setFocusTarget = useCameraStore(s => s.setFocusTarget)
  useEffect(() => {
    setFocusTarget(null)
  }, [idx, setFocusTarget])
```

Then find the bottom-right control row JSX. The current block (verify against the file as you go, current line numbers around 265–286):

```tsx
      <div
        style={
          isPhone
            ? { position: 'fixed', top: 110, right: 8, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 10 }
            : { position: 'fixed', bottom: safeAreaBottom(16), right: 16, display: 'flex', gap: 8, zIndex: 10 }
        }
      >
        <ZoomControls />
        <SoundToggle />
        <FieldToggleButton />
        <CoilTurnsButton />
        <MagnetStrengthButton />
        <Button
          variant="secondary"
          onClick={() => respawnObjects()}
          aria-label="Скинути предмети"
          title="Скинути предмети"
        >
          {isPhone ? '↻' : '↻ Скинути предмети'}
        </Button>
      </div>
```

Insert `<FocusResetButton />` immediately AFTER `<MagnetStrengthButton />` and BEFORE the Скинути предмети Button:

```tsx
      <div
        style={
          isPhone
            ? { position: 'fixed', top: 110, right: 8, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 10 }
            : { position: 'fixed', bottom: safeAreaBottom(16), right: 16, display: 'flex', gap: 8, zIndex: 10 }
        }
      >
        <ZoomControls />
        <SoundToggle />
        <FieldToggleButton />
        <CoilTurnsButton />
        <MagnetStrengthButton />
        <FocusResetButton />
        <Button
          variant="secondary"
          onClick={() => respawnObjects()}
          aria-label="Скинути предмети"
          title="Скинути предмети"
        >
          {isPhone ? '↻' : '↻ Скинути предмети'}
        </Button>
      </div>
```

`<FocusResetButton />` returns null when `focusTarget === null` so it occupies zero layout space when inactive.

- [ ] **Step 4.4: Type-check + test + build**

Run: `npx tsc --noEmit`
Expected: 0 errors.

Run: `npm test -- --run`
Expected: 220 tests passing.

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4.5: Commit**

```bash
git add -A
git commit -m "feat(em-induction): wire BarMagnet onTap + scene-change clear + FocusResetButton"
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
Expected: 220 tests passing, 0 failures.

- [ ] **Step 5.2: Sanity-check the diff**

Run: `git log --oneline master..HEAD`
Expected to show 4 commits in this order:
1. `feat(sdk): cameraStore focusTarget + focus-bulb POSE + CameraRig override`
2. `feat(sdk): useDrag tap-vs-drag detection (movement threshold) + onTap prop`
3. `feat(em-induction): tap Coil/Bulb/Galvanometer to focus camera`
4. `feat(em-induction): wire BarMagnet onTap + scene-change clear + FocusResetButton`

Run: `git diff master..HEAD --stat`
Expected: ~10 files changed (+2 new), ~135 lines net added.

- [ ] **Step 5.3: Push the branch**

Run: `git push -u origin feat/em-induction-focus-nav`
Expected: branch pushed to remote.

- [ ] **Step 5.4: Direct merge to master**

```bash
git checkout master
git merge --no-ff feat/em-induction-focus-nav -m "Merge feat/em-induction-focus-nav: tap-to-focus camera + reset pill"
git push origin master
```

Expected: master fast-forwards onto a merge commit; pushed; Vercel triggers prod deploy.

- [ ] **Step 5.5: User smoke-test (after Vercel deploys)**

On iPhone, open `science-lab-phi.vercel.app` → EM induction lab:
1. Tap the coil → camera flies to coil. "🌄 Все" pill appears in HUD.
2. Tap the bulb → camera flies to bulb.
3. Tap the galvanometer → camera flies to galv.
4. Tap the bar magnet without dragging → camera flies to magnet.
5. Drag the bar magnet > 8 px → drag works as before, no focus change.
6. Tap "🌄 Все" → camera returns to scene preset; pill disappears.
7. Advance scene via guided flow → focus auto-clears; pill disappears.
8. Open mass-measurement lab → drag balls/weights as before. No new "🌄 Все" pill (only EM induction lab mounts it).

---

## Self-Review Notes

**Spec coverage:**
- ✅ Slice A — Tasks 1.1 (state) + 1.2 (POSE) + 1.3–1.4 (override).
- ✅ Slice B — Tasks 2.1 (constants) + 2.2 (Props) + 2.3 (refs) + 2.4 (onPointerDown defers) + 2.5 (onPointerMove threshold + lazy init) + 2.6 (onPointerUp wasTap) + 2.7 (Draggable forwards).
- ✅ Slice C — Tasks 3.1 (helper) + 3.2 (Coil) + 3.3 (Bulb) + 3.4 (Galvanometer).
- ✅ Slice D — Tasks 4.1 (BarMagnet) + 4.2 (FocusResetButton) + 4.3 (LabScene clear + mount).
- ✅ Smoke-test list in Step 5.5 covers all 8 spec acceptance criteria.

**Placeholder scan:** No "TBD", "TODO", "fill in later". Every step has full code or full command with expected output. Task 3.4 says "use your judgment" on the Galvanometer's outer wrapper — this is acceptable because the spec doesn't dictate the JSX shape and a top-level `<group position={position}>` is the standard pattern (other instruments follow it). If the file deviates, wrap in a group.

**Type consistency:**
- `FocusTarget` defined in Task 1.1 as `'magnet' | 'coil' | 'bulb' | 'galv' | null`. Tasks 1.3, 3.2, 3.3, 3.4, 4.1 all pass exactly those string literals to `setFocusTarget(...)` — type-checks fine.
- `CameraPreset` extended with `'focus-bulb'` in Task 1.2. Task 1.3 maps `'bulb'` → `'focus-bulb'` — match.
- `useDrag.Props.onTap?: () => void` defined in Task 2.2. Task 2.7 forwards it. Task 4.1 passes `() => useCameraStore.getState().setFocusTarget('magnet')` — return type `void`, matches.

**No new tests:** All changes are interaction behaviour or state plumbing. The 220-test suite stays as a regression gate (existing drag tests still pass; tap path isn't exercised but is verified by the manual smoke-test).

**Branch parallelism:** This work is on top of fresh master (`0cd08a2`) which includes all prior merges. No conflicting open branches.

**Mass-measurement regression check:** Slice B (useDrag tap-vs-drag) affects all draggable consumers. Mass-measurement balls/weights don't pass `onTap`, so tap detection fires but `onTap?.()` is a no-op. Drag-start side effects are now deferred until 8 px movement — meaning a stationary tap-and-release leaves the body in its prior state instead of briefly converting to kinematic. This is INVISIBLE visually. Smoke-test step 5.5.8 explicitly verifies mass-measurement still works.
