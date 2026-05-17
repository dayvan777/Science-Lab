# EM Induction Focus Navigation — Design

**Date:** 2026-05-17
**Status:** Approved-in-concept (user said "ДА" after Approach proposal — tap-on-object with movement threshold to distinguish from drag)
**Scope:** Let the student tap any instrument in the 3D scene to fly the camera to it, and zoom in/out around the new lookAt. Adds a small "back to overview" pill that appears when focus is active.

## Background

User requested earlier: "хорошо, что можно было зазумиться по всему периметру нашего стола" — the ability to zoom in on any specific instrument (магнит / катушка / лампочка / гальванометр / весь стол), not just around the table centre. Mobile-v2 already widened the zoom range, but `useCameraStore` only has a `zoomMul` — the camera always orbits the scene-preset's `lookAt`, which is fixed near table center. So zoom-in just brings the table-center close; the bulb at +0.55 x is barely visible.

The natural UX is **tap an object → camera flies there**. This requires:
1. New state in `cameraStore`: a `focusTarget` flag that overrides the scene-default preset.
2. A new `focus-bulb` POSE in `CameraRig` (others already exist: `focus-coil`, `focus-magnet`, `focus-galv`).
3. Tap detection on each non-draggable instrument (Coil, Bulb, Galvanometer).
4. Tap-vs-drag distinction in the SDK's `useDrag` so the bar magnet can be tapped (focus) OR dragged (move). Movement-threshold pattern: pointer-up within 8 px and 250 ms → tap; otherwise drag.
5. A small "🌄 Все" reset pill in the HUD that returns to the scene-default preset, plus auto-reset on scene change.

After this lands, the student can:
- Tap the bulb → camera flies in close to the bulb. Tap "+" zoom button → even closer. Tap "🌄 Все" → back to overview.
- Tap-and-drag the magnet → drag works as before (no focus change).
- Tap the magnet without dragging → camera focuses on the magnet's current position.

## Non-goals

- No focus targets for the mass-measurement lab. Its instruments (scale, lever, dynamometer) keep their existing scene-driven presets. Only EM-induction gets tap-to-focus.
- No pinch-zoom gestures. `touch-action: none` (Touch+Responsive PR) intentionally disables them.
- No tap-on-empty-table to reset. The HUD pill handles that. (Keeps gesture semantics simple — empty-space taps stay no-ops.)
- No new tests. The 220-test suite stays as the regression gate. Existing tap-detection math is straightforward and exercised by the smoke-test.
- No changes to the EMF/physics formulas, snap targets, or field-line rendering.

## Architecture

Four independent slices in one PR. Branch `feat/em-induction-focus-nav` from `master` at commit `f4905fb`.

| Slice | File(s) | Net diff |
|---|---|---|
| A. CameraStore state + focus-bulb POSE + CameraRig override | `cameraStore.ts`, `CameraRig.tsx` | ~30 lines |
| B. SDK tap-vs-drag distinction | `useDrag.ts`, `Draggable.tsx` | ~30 lines |
| C. Tap handlers on non-draggable instruments | `Coil.tsx`, `Bulb.tsx`, `Galvanometer.tsx` + new SDK helper `useTapDetector.ts` | ~40 lines |
| D. Wiring (BarMagnet onTap, LabScene scene-change clear, FocusResetButton) | `BarMagnet.tsx`, `LabScene.tsx`, new `ui/FocusResetButton.tsx` | ~35 lines |

Total ~135 lines net, 6 modified files + 2 new files (`useTapDetector.ts`, `FocusResetButton.tsx`). All changes are EM-induction lab-local OR SDK-additive (new optional functionality, no behaviour change for existing consumers).

---

## Slice A — CameraStore state + focus-bulb POSE

### Problem

The camera always orbits the scene-default preset's `lookAt`. No mechanism exists to manually pick a different focus point.

### Fix — three changes

**A.1 — Extend `cameraStore.ts`** with a new `focusTarget` field:

```ts
export type FocusTarget = 'magnet' | 'coil' | 'bulb' | 'galv' | null

type CameraStore = {
  zoomMul: number
  focusTarget: FocusTarget
  setZoomMul: (z: number) => void
  zoomBy: (factor: number) => void
  resetZoom: () => void
  setFocusTarget: (t: FocusTarget) => void
}

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

Default `focusTarget: null` → scene-default behavior, no regression.

**A.2 — Add `focus-bulb` POSE** in `CameraRig.tsx`. The current Bulb position in EM-induction LabScene is `[0.55, 0.85, 0]`. New preset:

```ts
'focus-bulb':   { position: [0.55, 1.35, 1.1], lookAt: [0.55, 0.95, 0] },
```

Same camera "altitude" (y=1.35) and z-offset (z=1.1) as the other focus-* presets. Camera ~1.2 m from the bulb at a slight downward angle.

**A.3 — CameraRig override logic.** When `useCameraStore.focusTarget` is non-null, map it to the corresponding focus preset and use that instead of the prop-passed `preset`:

```ts
const focusTarget = useCameraStore(s => s.focusTarget)

const effectivePreset: CameraPreset =
  focusTarget === 'magnet' ? 'focus-magnet' :
  focusTarget === 'coil'   ? 'focus-coil'   :
  focusTarget === 'bulb'   ? 'focus-bulb'   :
  focusTarget === 'galv'   ? 'focus-galv'   :
  preset
```

Then everywhere the function uses `preset`, it uses `effectivePreset` instead. The existing tween logic re-triggers when `effectivePreset` changes — same behavior as scene-driven preset changes today.

### Acceptance

- `focusTarget = null` → behavior identical to before (scene-driven preset).
- `setFocusTarget('coil')` → camera tweens to focus-coil preset over 1.5 s with ease-in-out.
- `setFocusTarget(null)` → camera tweens back to the scene-default preset.

---

## Slice B — SDK tap-vs-drag distinction

### Problem

`useDrag.onPointerDown` immediately converts the body to kinematic-position-based and starts treating subsequent pointer moves as drag. There's no concept of "is this a tap or a drag?" — every touch starts a drag.

For the bar magnet, the user needs BOTH: tap-without-moving = focus on magnet, drag-with-moving = drag. The standard pattern: don't commit to "drag" until the pointer has moved beyond a threshold. Before that, it's still "could be a tap".

### Fix — two files

**B.1 — `useDrag.ts` gains tap detection** with these constants and refs:

```ts
const TAP_MOVE_THRESHOLD_PX = 8     // screen-space px before "this is a drag"
const TAP_MAX_DURATION_MS = 250     // beyond this duration = drag (or just a long press, treat as drag too)
```

New refs inside `useDrag`:
```ts
const tapStartTime = useRef<number | null>(null)
const tapStartScreenX = useRef(0)
const tapStartScreenY = useRef(0)
const hasExceededThreshold = useRef(false)
```

In `onPointerDown`: instead of immediately calling `setBodyType(KinematicPositionBased)`, just record the tap-start state and capture the pointer. Defer the drag-start side effects.

In `onPointerMove`: compute `Δ = max(|dx|, |dy|)` in screen pixels. If `Δ > TAP_MOVE_THRESHOLD_PX` and `hasExceededThreshold === false`, set `hasExceededThreshold = true` and run the drag-start side effects (setBodyType, setSensor, target.current.copy(intersectPlane(ev))). Then continue with the normal kinematic-translation update.

In `onPointerUp`:
- If `tapStartTime != null` AND `hasExceededThreshold === false` AND `(now - tapStartTime) < TAP_MAX_DURATION_MS`: this was a tap. Fire `onTap?.()`. Skip drag finalization.
- Otherwise: run the normal drag-end logic (snap detection, restore Dynamic body type, etc.).

Reset `tapStartTime = null` and `hasExceededThreshold = false` in either branch.

The new optional prop:

```ts
type Props = {
  rigidBody: RefObject<RapierRigidBody | null>
  bodyId?: string
  dragHeight?: number
  dragCorridor?: DragCorridor
  /** Optional tap handler. Fires on a quick stationary pointer-down/up (no
   *  movement beyond ~8 px, total duration < 250 ms). Used by EM-induction's
   *  bar magnet so the student can tap it to focus the camera without
   *  triggering a drag. */
  onTap?: () => void
}
```

**B.2 — `Draggable.tsx`** adds `onTap?: () => void` to its Props and forwards to `useDrag`.

### Risk

- Existing labs (mass-measurement: Apple/Baseball/TennisBall/Weights) don't pass `onTap`. The tap-vs-drag detection STILL fires for them — but `onTap?.()` is a no-op so nothing observable happens. They effectively just don't fire drag finalization on a stationary tap. Is that a regression? Let's check: today a user taps and immediately releases on an Apple → onPointerDown sets it kinematic, onPointerUp tries to snap or sets back to Dynamic. After the change: tap → nothing happens, body stays Dynamic. The Apple just doesn't pop into kinematic for an instant. This is INVISIBLE to the user (the kinematic conversion was for 0 ms). Safe.

- A drag that completes WITHIN 250 ms but moves >8 px is detected as a drag (movement-threshold path). Good — fast flicks are drags, slow stationary taps are taps.

### Acceptance

- Bar magnet tap without movement → fires `onTap`, no drag-start side effects (body stays Dynamic / kinematic-snapped).
- Bar magnet drag (start, move >8 px, release) → drag-start side effects run, snap detection runs, body type restored. Same as today.
- Mass-measurement balls/weights: tap on them → nothing observable. Drag → same as today.

---

## Slice C — Tap handlers on non-draggable instruments

### Problem

Coil, Bulb, Galvanometer are pure-visual `<mesh>`/`<group>` components with no pointer interaction. Need to add tap detection.

### Fix — extract a small SDK helper + wire it into each instrument

**C.1 — New SDK helper** `src/sdk/object/useTapDetector.ts`:

```ts
import { useRef } from 'react'
import type { ThreeEvent } from '@react-three/fiber'

const TAP_MOVE_THRESHOLD_PX = 8
const TAP_MAX_DURATION_MS = 250

/**
 * Detects a tap (quick stationary pointer-down + pointer-up) on a mesh or group.
 * Returns `onPointerDown` and `onPointerUp` handlers to spread onto the target.
 *
 * Used by non-draggable instruments (Coil, Bulb, Galvanometer) so the student
 * can tap them to focus the camera. Same tap heuristic as `useDrag` (8 px, 250 ms).
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

**C.2 — Coil, Bulb, Galvanometer** each get a small wiring update. Their top-level `<group>` (or one wrapped around the existing content) receives the tap-detector handlers and dispatches `setFocusTarget(...)`.

For Coil (`Coil.tsx`):
```tsx
const setFocusTarget = useCameraStore(s => s.setFocusTarget)
const tap = useTapDetector(() => setFocusTarget('coil'))
// inside the existing <group position={position}>:
<group {...tap}>
  <mesh geometry={geometry}>{/* existing material */}</mesh>
</group>
```

Same for Bulb (`onTap` → `setFocusTarget('bulb')`) and Galvanometer (`onTap` → `setFocusTarget('galv')`).

### Acceptance

- Tap the coil mesh → camera focuses on coil.
- Tap the bulb mesh → camera focuses on bulb.
- Tap the galvanometer → camera focuses on galvanometer.
- Drag-style interaction over these (e.g. accidentally swiping while reading hint) → no focus change.

---

## Slice D — Wiring + Reset button + scene-change auto-clear

### Problem

We need to (1) hook the magnet's `onTap` to fire `setFocusTarget('magnet')`, (2) provide a visible way to clear focus, and (3) clear focus automatically when the scene advances (so the student isn't stuck in a manual focus state through a transition that has its own preset).

### Fix — three pieces

**D.1 — `BarMagnet.tsx`** passes `onTap` to `<Draggable>`:

```tsx
import { useCameraStore } from '../../../sdk/scene/cameraStore'

// inside the function:
<Draggable
  ...existing props...
  onTap={() => useCameraStore.getState().setFocusTarget('magnet')}
>
```

`getState()` avoids re-render churn — same pattern as `SceneController`'s reads.

**D.2 — `LabScene.tsx`** auto-clears focus on scene index change:

```tsx
const setFocusTarget = useCameraStore(s => s.setFocusTarget)

useEffect(() => {
  setFocusTarget(null)
}, [idx, setFocusTarget])
```

So when guided flow advances Scene 1 → Scene 2, focus resets to the new scene's default preset.

**D.3 — `FocusResetButton.tsx`** is a new tiny HUD pill:

```tsx
import { Button } from '../../../sdk/ui/Button'
import { sound } from '../../../sdk/audio/SoundManager'
import { useCameraStore } from '../../../sdk/scene/cameraStore'

/**
 * Bottom-right HUD pill, shown only when the user has manually focused on
 * an instrument. Tap to clear the focus and return to the scene's default
 * camera preset.
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

Mounted in EM-induction's `LabScene.tsx` bottom-right control row, adjacent to the other pills.

### Acceptance

- Tap an instrument → camera focuses; reset pill appears in HUD.
- Tap reset pill → camera returns to scene-default preset; reset pill disappears.
- Guided flow advances scene → focus auto-clears; reset pill disappears without manual tap.

---

## File touch-list

| File | Slice | Change |
|---|---|---|
| `src/sdk/scene/cameraStore.ts` | A | Add `FocusTarget` type, `focusTarget` state, `setFocusTarget` action. |
| `src/sdk/scene/CameraRig.tsx` | A | Add `focus-bulb` POSE. Read `focusTarget` from store, map to `effectivePreset`, use everywhere `preset` is used. |
| `src/sdk/physics/useDrag.ts` | B | Add `onTap?` prop, tap-vs-drag refs + threshold logic in onPointerDown/Move/Up. |
| `src/sdk/object/Draggable.tsx` | B | Forward `onTap?` prop. |
| `src/sdk/object/useTapDetector.ts` | C | NEW — small `useTapDetector(onTap)` helper for non-draggable instruments. |
| `src/labs/electromagnetic-induction/instruments/Coil.tsx` | C | Wire tap handler → `setFocusTarget('coil')`. |
| `src/labs/electromagnetic-induction/instruments/Bulb.tsx` | C | Wire tap handler → `setFocusTarget('bulb')`. |
| `src/labs/electromagnetic-induction/instruments/Galvanometer.tsx` | C | Wire tap handler → `setFocusTarget('galv')`. |
| `src/labs/electromagnetic-induction/objects/BarMagnet.tsx` | D | Pass `onTap={() => setFocusTarget('magnet')}` to `<Draggable>`. |
| `src/labs/electromagnetic-induction/scene/LabScene.tsx` | D | Add useEffect that clears focusTarget on scene index change. Mount FocusResetButton in bottom-right row. |
| `src/labs/electromagnetic-induction/ui/FocusResetButton.tsx` | D | NEW — small "🌄 Все" pill that appears when focus is active. |

10 files modified, 2 new files. ~135 lines net diff.

## Testing strategy

No new unit tests. The 220-test suite stays as regression gate. Smoke-test (user, on Vercel preview after deploy):

1. Open EM induction lab. Default view = overview (Scene 1) or focus-coil (Scene 2+).
2. Tap the bulb → camera zooms in to bulb. Reset pill "🌄 Все" appears in bottom-right.
3. Tap the coil → camera transitions to coil.
4. Tap the galvanometer → camera transitions to galvanometer.
5. Tap the bar magnet without moving → camera focuses on magnet's current position. Reset pill visible.
6. Tap "🌄 Все" → returns to scene preset; reset pill disappears.
7. Drag the bar magnet from tray into the coil → drag works as before. No focus change.
8. Advance scene via the guided flow (or scene-counter) → focus auto-clears.

## Risks

- **Slice B tap-vs-drag change in SDK** affects ALL draggable consumers, not just BarMagnet. Mass-measurement balls/weights now do nothing on a stationary tap (instead of brief kinematic-conversion-then-back). Should be invisible visually. Smoke-test mass-measurement before merging.
- **Tap heuristic on phone**: 8 px threshold = ~3 mm on a typical phone. Could be too tight (finger jitters). If smoke-test shows false-drag detections, bump to 12 px.
- **Two consumers of `useCameraStore.focusTarget` (CameraRig + FocusResetButton)**: both subscribe via selector. React re-render only when `focusTarget` actually changes — fine.
- **Race between scene-change clear and immediate user tap**: scene change → setFocusTarget(null), user taps a different scene's bulb → setFocusTarget('bulb'). Two state writes in same tick, last one wins. Acceptable; in practice these don't collide because scene advancement is rare and slow.

## Out of scope

- Mass-measurement focus navigation. Future PR could extend if needed.
- Pinch-to-zoom gestures.
- Tap-on-empty-table to reset (HUD pill handles it).
- Focus on the lab's secondary objects (wires, coil stand, lab clutter). Only the four interactive instruments get focus targets.
- Animation of the reset pill's appearance/disappearance — uses React conditional rendering, instant.
- Sound effect on focus tap (not requested; `tick` plays on reset button only).

## Self-review checklist

- [x] Acceptance criteria are concrete for each slice.
- [x] No "TBD" / "TODO".
- [x] SDK changes (`useDrag.onTap`, `useTapDetector`) are additive and don't break existing consumers (Mass-measurement, Phase 3 BarMagnet drag-corridor).
- [x] Tap heuristic (8 px / 250 ms) is borrowed standard, used in both `useDrag` and `useTapDetector` consistently.
- [x] Auto-clear logic explicit: scene change clears focus.
- [x] HUD pill visibility logic explicit: only shown when focusTarget is non-null.
- [x] No new tests; rationale stated.
- [x] PR1 (Polish v3) already merged; this work is on top.
