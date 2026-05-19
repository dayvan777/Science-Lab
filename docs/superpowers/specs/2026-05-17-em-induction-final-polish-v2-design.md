# EM Induction Final Polish v2 — Design

**Date:** 2026-05-17
**Status:** Approved-in-concept (user said "пользуюсь суперпауэрсами для того, чтобы выполнить эту задачу" after design proposal)
**Scope:** Three follow-up polish items after the previous Final Polish PR:

1. **Galvanometer needle pivot at BOTTOM (speedometer-style).** Previous PR moved the pivot to the TOP and made the needle hang DOWN. User looked at the result and decided that the speedometer pattern — pivot at BOTTOM, needle pointing UP, tip sweeping across the scale arc — is what they actually want.

2. **Field arrow direction flip.** User reports that the directional cone arrows on the field lines are going the WRONG way externally. They should exit the N pole (red, left) and enter the S pole (blue, right) — classic dipole convention. The simplest, safest fix is to negate the tangent vector used to orient each cone; if that produces the right direction, ship.

3. **Click-on-arbitrary-point camera focus (Blender-style).** Currently a single tap focuses ONLY on instruments (coil, magnet, bulb, galvanometer). User wants to also tap on the table (or anywhere in the scene) and have the camera fly in close to that exact world point. Like Blender's "click-to-focus" workflow, but single-click not double-click.

User explicitly invoked the superpowers flow ("пользуюсь суперпауэрсами…") — this spec is the formal design step before the plan and execution.

## Non-goals

- No third magnet variant. The previous PR introduced the long + short pair; this PR doesn't touch magnet count.
- No new tests. The 220-test suite stays as regression gate.
- No new HUD pills.
- No pinch-zoom on touch (still intentionally disabled by `touch-action: none`).
- No drag-to-orbit camera. User asks for click-to-focus, not free orbit.
- No edits to the dial texture. The current galvanometer dial's scale runs around the bottom of the face (arc from -5 on the left to +5 on the right, with 0 at the bottom middle). Flipping the pivot to the bottom puts the needle's tip near the scale arc — matches the existing texture.

## Architecture

Three slices in one PR. Branch `feat/em-induction-final-polish-v2` from `master` at commit `1f21684`.

| Slice | File(s) | Net diff |
|---|---|---|
| A. Needle pivot at BOTTOM (revert + speedometer) | `Galvanometer.tsx` | ~10 lines |
| B. Field arrow direction flip | `FieldLines.tsx` | 1 line (`.negate()`) |
| C. Click-on-arbitrary-point free-focus | `useTapDetector.ts`, `cameraStore.ts`, `CameraRig.tsx`, `FocusResetButton.tsx`, `LabScene.tsx` | ~50 lines |

Total ~60 lines across 7 files. No new files.

---

## Slice A — Needle pivot at BOTTOM (speedometer)

### Problem

The previous PR put the pivot at the TOP of the face with the needle hanging DOWN. User's preference is the opposite: pivot at BOTTOM, needle pointing UP, tip sweeping the scale arc — like a speedometer.

### Fix — three changes in `Galvanometer.tsx`

**A.1** — flip the constant:

```ts
const NEEDLE_PIVOT_Y_LOCAL = -FACE_H / 2 + 0.005  // near the BOTTOM of the face (needle points up like a speedometer)
```

**A.2** — keep `needleRef` typed as `Group` (rotation on the group, NOT on the mesh). The wrapping-group pattern from the previous PR is correct; it just needs the pivot at the bottom and the mesh offset UP.

**A.3** — update the JSX. Mesh's position changes from `[0, -NEEDLE_LEN/2, 0]` (DOWN) to `[0, +NEEDLE_LEN/2, 0]` (UP). Rotation sign returns to `-r.current` so positive EMF still produces RIGHT deflection.

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

And the useFrame's rotation line:

```ts
if (needleRef.current) {
  needleRef.current.rotation.z = -r.current
}
```

### Acceptance

1. Pivot dot (small black sphere) sits at the BOTTOM of the dial face, centred on x.
2. Red needle extends UPWARD from the pivot, tip near the scale arc.
3. Positive EMF (drag magnet right-to-left through coil at decent speed) → tip swings RIGHT toward "+5".
4. Negative EMF → tip swings LEFT toward "-5".
5. No motion → needle vertical, tip at "0".

---

## Slice B — Field arrow direction flip

### Problem

User reports the cone arrows on the field-line arcs are pointing the WRONG direction. They should externally trace N (red, left) → S (blue, right). Either the implementation has a sign mistake or the user's perception differs; either way the safest, smallest fix is to negate the tangent.

### Fix

In `src/labs/electromagnetic-induction/instruments/FieldLines.tsx`, find the `arrowTransforms` useMemo. Currently:

```ts
const tangent = curve.getTangent(t).normalize()
```

Replace with:

```ts
const tangent = curve.getTangent(t).normalize().negate()
```

This single change flips the cone's apex from pointing in `+tangent` direction to `-tangent` direction. After the flip, arrows should externally trace N → S. If smoke-test reveals they now go S → N (wrong direction the OTHER way), the implementer reverts the negate.

### Acceptance

1. With the field toggle on, observe the 8 amber arcs around the active magnet.
2. Each arc has 3 small amber cone arrows along it. The cone APEX (the pointy end) consistently points in the direction of N → S externally — i.e. away from the red pole and toward the blue pole.
3. Arrows on the upper-half arcs and the lower-half arcs all agree on direction (all "left-to-right" along the curve traversal).

---

## Slice C — Click-on-arbitrary-point free-focus

### Problem

Currently a tap focuses only on one of the four instruments (coil, magnet, bulb, galvanometer). User wants a Blender-style single-click anywhere in the scene → camera flies in close to that exact world point. Specifically: tap on the table surface anywhere, camera focuses there.

### Fix — five files

**C.1 — `useTapDetector.ts`** extends the callback signature to receive the pointer event:

```ts
export function useTapDetector(onTap: (e: ThreeEvent<PointerEvent>) => void) {
  // ...same body — only the type signature changes...
  const onPointerUp = (e: ThreeEvent<PointerEvent>) => {
    // ...same threshold checks...
    if (dt < TAP_MAX_DURATION_MS && dx < TAP_MOVE_THRESHOLD_PX && dy < TAP_MOVE_THRESHOLD_PX) {
      onTap(e)
    }
  }
}
```

Existing consumers (Coil, Bulb, Galvanometer) pass `() => setFocusTarget(...)`. JavaScript allows passing extra arguments to a function that ignores them, so these callbacks remain compatible — the event arg just gets dropped. Same for BarMagnet's `onTap={() => setFocusTarget('magnet')}` which goes through Draggable → useDrag (a separate code path, not this helper).

**C.2 — `cameraStore.ts`** gains a `freeFocusPoint` field:

```ts
import { Vector3 } from 'three'

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

export const useCameraStore = create<CameraStore>((set) => ({
  zoomMul: 1,
  focusTarget: null,
  freeFocusPoint: null,
  // ...existing actions...
  setFreeFocusPoint: (freeFocusPoint) => set({ freeFocusPoint }),
}))
```

**C.3 — `CameraRig.tsx`** uses `freeFocusPoint` as a dynamic pose source. When set, it wins over both `focusTarget` and the scene-default `preset`. Compute the pose dynamically:

```ts
const freeFocusPoint = useCameraStore(s => s.freeFocusPoint)

// Determine effective pose. Precedence:
//   1. freeFocusPoint (user clicked a point) — dynamic pose
//   2. focusTarget (user tapped an instrument) — fixed preset
//   3. preset prop (scene default) — fixed preset
const effectivePose: Pose = freeFocusPoint
  ? {
      position: [freeFocusPoint.x, freeFocusPoint.y + 0.4, freeFocusPoint.z + 1.1],
      lookAt: [freeFocusPoint.x, freeFocusPoint.y, freeFocusPoint.z],
    }
  : POSES[effectivePreset]
```

The existing tween useEffect needs to fire whenever the EFFECTIVE pose changes. Detect change via a stable key (e.g., a string fingerprint):

```ts
const effectivePoseKey = freeFocusPoint
  ? `free:${freeFocusPoint.x.toFixed(3)},${freeFocusPoint.y.toFixed(3)},${freeFocusPoint.z.toFixed(3)}`
  : effectivePreset

useEffect(() => {
  // existing tween logic, but compare with effectivePoseKey instead of effectivePreset
  // ...
}, [effectivePoseKey, camera])
```

And the per-frame `useFrame` uses `effectivePose` (not `POSES[effectivePreset]`):

```ts
useFrame(() => {
  const target = effectivePose
  const targetPos = applyZoom(target.position, target.lookAt, zoomMul)
  // ...existing tween + zoom logic...
})
```

The offset `(y+0.4, z+1.1)` matches the magnitude used by the existing focus-* presets — gives a comfortable close-up framing.

**C.4 — `FocusResetButton.tsx`** clears BOTH focus sources, and is visible when EITHER is non-null:

```tsx
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
  // ...rest unchanged...
}
```

**C.5 — `LabScene.tsx`** wraps `<Table />` with a tap-detector. On tap, capture the world hit point and dispatch `setFreeFocusPoint`:

```tsx
import { Vector3 } from 'three'
// ...
const tableTap = useTapDetector((e) => {
  // e.point is the world position of the raycast hit on the table mesh
  useCameraStore.getState().setFreeFocusPoint(e.point.clone())
})

// ...inside JSX:
<group {...tableTap}>
  <Table />
</group>
```

R3F's `ThreeEvent<PointerEvent>` includes `event.point` — the world-space hit position. We clone it so subsequent event lifecycle doesn't mutate the value we passed to the store.

**Scene-change reset:** the existing LabScene `useEffect` that clears `focusTarget` on idx change must also clear `freeFocusPoint`:

```ts
useEffect(() => {
  setFocusTarget(null)
  setFreeFocusPoint(null)
}, [idx, setFocusTarget, setFreeFocusPoint])
```

**Pointer-event conflict avoidance:** instrument taps (Coil, Bulb, Galvanometer, BarMagnet) call `e.stopPropagation()`? Currently they don't, but R3F's event raycasting picks the CLOSEST mesh. The table is BELOW the instruments at y=0.84, instruments sit at y=0.85+. So a tap on the magnet hits the magnet first, not the table. R3F's pointer system handles this automatically — the table-tap only fires when no closer mesh intercepted.

To be safe, instrument tap handlers can also call `e.stopPropagation()` inside their callback. Plan will note this; if smoke-test reveals double-firing, we add stopPropagation.

### Acceptance

1. Tap anywhere on the empty table → camera flies in close to that exact point, framing it from above-front. `🌄 Все` reset pill appears.
2. Tap on an instrument (coil/magnet/bulb/galv) → existing instrument-focus behaviour (no change). Reset pill appears.
3. Tap "🌄 Все" → camera returns to scene-default preset. Both `focusTarget` and `freeFocusPoint` cleared. Reset pill disappears.
4. Scene change (guided flow advance) → both focuses clear; scene's default preset takes over.
5. Drag a magnet (movement > 8 px) → drag works, no focus change.
6. Mass-measurement lab → unaffected (it doesn't wrap Table in a tap detector).

---

## File touch-list

| File | Slice | Change |
|---|---|---|
| `src/labs/electromagnetic-induction/instruments/Galvanometer.tsx` | A | `NEEDLE_PIVOT_Y_LOCAL` → bottom of face. Mesh `position` → UP. `rotation.z` sign → `-r.current`. Comment updated. |
| `src/labs/electromagnetic-induction/instruments/FieldLines.tsx` | B | Negate tangent in `arrowTransforms` useMemo. |
| `src/sdk/object/useTapDetector.ts` | C | Callback signature `(e: ThreeEvent<PointerEvent>) => void`. Existing consumers compatible. |
| `src/sdk/scene/cameraStore.ts` | C | Add `freeFocusPoint: Vector3 \| null` + `setFreeFocusPoint` action. |
| `src/sdk/scene/CameraRig.tsx` | C | Read `freeFocusPoint`. Compute dynamic pose. Tween useEffect keyed on a string fingerprint. useFrame uses effectivePose. |
| `src/labs/electromagnetic-induction/ui/FocusResetButton.tsx` | C | Conditional render on EITHER focus. Click clears BOTH. |
| `src/labs/electromagnetic-induction/scene/LabScene.tsx` | C | Wrap `<Table />` with tap-detector. Scene-change effect also clears `freeFocusPoint`. |

7 files modified, 0 new files. ~60 lines net.

## Testing strategy

No new unit tests. The 220-test suite stays as regression gate. Smoke-test (user on iPhone after Vercel deploys):

1. Galvanometer needle anchored at BOTTOM of face. Tip points UP. Positive EMF → tip RIGHT.
2. Field arrows point from N (red) to S (blue) externally on all 8 arcs.
3. Tap on empty table → camera zooms in to that point. Reset pill appears.
4. Tap on instrument → instrument focus (unchanged).
5. Reset pill clears both kinds of focus.
6. Scene change clears focus.
7. Drag magnet → drag works, no focus change.
8. Mass-measurement lab → no behavior change.

## Risks

- **Slice B negate** may flip arrows in the WRONG direction (if the original was already correct). Smoke-test catches this immediately; revert by removing `.negate()`.
- **Slice C pointer-event ordering** — if a tap on the magnet ALSO triggers the table tap (event bubbling), the user gets unexpected free-focus instead of instrument-focus. R3F raycast picks the closest mesh, so this shouldn't happen — but if it does, add `e.stopPropagation()` to instrument tap handlers. Plan notes this.
- **Slice C `freeFocusPoint` fingerprint** — using a string like `"free:0.500,0.850,0.200"` to detect changes is robust for normal camera operation. If two different clicks produce coordinates differing only beyond 3 decimal places (sub-millimetre precision), the tween would skip. Acceptable — tap is human-scale.
- **Slice A rotation sign** — back to `-r.current` (original convention). The pivot dot and the JSX wrapping group are kept (good additions from the previous PR); only the orientation flips. Smoke-test confirms positive EMF → right deflection.

## Out of scope

- Free-orbit camera control (drag to orbit).
- Pinch-to-zoom on touch.
- Click-to-focus on the mass-measurement lab (it doesn't wrap its Table).
- Multi-target focus chains (e.g. "click to add to focus path").
- Z-buffering issues with the pivot sphere overlapping the needle (currently the sphere is small enough that it's hidden by the needle's base at zero EMF — acceptable).

## Self-review checklist

- [x] Acceptance criteria are concrete for all three slices.
- [x] No "TBD" / "TODO" / placeholder.
- [x] Slice A precisely reverses Slice C from the previous PR's needle-pivot change, keeping the group-as-pivot pattern + pivot dot.
- [x] Slice B's revert path is documented (remove `.negate()`).
- [x] Slice C's precedence is explicit: `freeFocusPoint` > `focusTarget` > scene `preset`.
- [x] FocusResetButton clears BOTH focus sources.
- [x] Scene-change clear extended to BOTH focus sources.
- [x] R3F event raycasting handles instrument-vs-table tap conflict.
- [x] No new tests; 220-suite as gate.
- [x] Mass-measurement lab non-regression noted.
