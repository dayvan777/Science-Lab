# EM Induction Phase 2 — Field Lines + Lenz Current Arrows Design

**Date:** 2026-05-14
**Status:** Approved-in-concept (Phase 2 of three; user said "по очереди" to all three after PhET-comparison research)
**Scope:** Second of three planned phases. Adds the *invisible physics made visible* — magnetic field lines emerging from the bar magnet's N pole, curving back into the S pole + small current-direction arrows on the coil that flip with EMF sign (Lenz's law visualization). Both controllable via a HUD toggle.

After this phase ships, the student sees WHY current is induced — the field is real and visible, the magnet drags it through the coil, and the coil's current arrows light up in the right direction.

## Non-goals (deferred to Phase 3)

- Adjustable number of coil turns (1 / 2 / 3 / 5).
- Adjustable magnet strength.
- Compass tool.

These are real PhET features but they're separate UI knobs and a Phase 3 slice keeps each phase atomic.

## Reference

PhET Faraday's Electromagnetic Lab is the canonical pedagogical reference. They render:
- 8 field lines on each side of the dipole (visible toggle).
- Current-direction arrows on the pickup coil that animate with current.
- The field magnitude at each grid point is also visualized via "field strength compass needles" — we DO NOT do this (compass tool is Phase 3).

The user's reference photos from textbooks show the same idea: lines emerging from N pole, curving through space, entering S pole.

---

## Architecture

### Design choices made for this spec

| Decision | Choice | Rationale |
|---|---|---|
| Field line geometry | **8 lines in a single plane** (the camera-facing XY plane), parented to the magnet so they move with it | Cleanest textbook look. 3D rotated copies (multiple planes) would be more accurate but visually busier and 2× the geometry. |
| Field line shape | **Parametric Bezier curves**, hand-tuned to look like a dipole | Mathematically-correct dipole-field shape requires elliptic integrals — overkill for visual purposes. Hand-tuned curves match textbook diagrams. |
| Current arrows | **6 small arrow-cone glyphs** spaced evenly along the helix's path. Direction tangent to the curve, sign-flipped by EMF | Static positions = simpler than animated particles. Opacity scales with `\|EMF\|/EMF_MAX` so they fade in when current flows. |
| Toggle | **Single button in the HUD** — "Показати поле" / "Сховати поле". Default: visible (ON) | Lets the student strip down to the bare instruments when distracted by visual noise. Persists in localStorage (existing pattern from CollapsibleGlassPanel). |
| Hide-during-scene-1 | The intro scene (Сцена 1: Знайомство) shows the equipment WITHOUT field lines so the student sees the apparatus clearly first. From Scene 2 onward, lines appear (toggle visible to override). | Pedagogical: equipment first, then the physics. |
| Field line colour | **Faint amber `rgba(255, 200, 80, 0.55)`** to read as "magnetic field" without competing with the red/blue magnet poles or the Apple-blue accents | Three.js `meshBasicMaterial` with `transparent: true` + `toneMapped: false` so glow survives bloom |
| Current arrow colour | **Apple-blue `#0a84ff` when current positive, soft-red `#ff7a60` when negative** | Two colours teach direction visually — different from the galvanometer's red needle (which uses a saturated red). |

### File layout (NEW)

```
src/labs/electromagnetic-induction/
├── instruments/
│   ├── FieldLines.tsx          # NEW — 8 curved tube geometries parented to the magnet
│   └── CurrentArrows.tsx       # NEW — 6 cone glyphs on the coil's helix path
├── state/
│   └── VisualState.ts          # NEW — Zustand store: { fieldVisible: boolean, setFieldVisible }
└── ui/
    └── FieldToggleButton.tsx   # NEW — pill button in the bottom-right control row
```

Plus modifications:
- `LabScene.tsx` — mount `<FieldLines/>` as a child of the magnet's `<Draggable>`, mount `<CurrentArrows/>` near the `<Coil/>`, add `<FieldToggleButton/>` to the control row, gate scene-1 visibility.

The new components are small (~50-80 lines each) and follow the pattern of `Wires.tsx` / `CoilStand.tsx` from previous phases.

### `<FieldLines/>` — the field visualization

**Props:**
```ts
type Props = {
  /** Bar magnet's body-id so the component can read its world transform. */
  magnetBodyId: string
  /** When false, the entire group is hidden via material opacity → 0. */
  visible: boolean
}
```

**Behaviour:**
- Reads magnet's `translation()` + `rotation()` from `findBodyByTag` each frame (cheap — only on each frame, no allocations once scratch refs are hoisted).
- Renders 8 closed curves around a virtual dipole, parented to the magnet's transform. Each curve is a `TubeGeometry` with 24 path segments × 4 radial segments = 96 triangles. 8 × 96 = 768 triangles total — negligible.
- The 8 lines are pre-built once at mount via `useMemo`. They occupy a "template" coordinate system where the magnet is centered at origin with N at -x, S at +x.
- Each line's curve is symmetric around the y-axis (the perpendicular bisector of the bar magnet).
- Per frame: copy the magnet's world transform onto a parent `<group>`.

**Curve shapes (8 lines):**
- Line 1 & 2: tight inner loops emerging from N tip, ~0.04 m max extent, curve back into S tip
- Lines 3 & 4: medium loops, ~0.10 m extent
- Lines 5 & 6: wide loops, ~0.20 m extent
- Lines 7 & 8: VERY wide loops, ~0.40 m extent, drift far before returning

Each pair is mirrored (one above the magnet, one below in the XY camera plane).

Line generation pseudocode (in `FieldLines.tsx` private helper):

```ts
function makeFieldLine(extent: number, mirror: boolean): CatmullRomCurve3 {
  const sign = mirror ? -1 : 1
  const yMax = extent * 0.6
  const xMax = extent
  // 5 control points: N tip → arc up & out → mid-top → arc back & in → S tip
  return new CatmullRomCurve3([
    new Vector3(-MAGNET_HALF_LENGTH, 0, 0),  // N tip (at -x in magnet-local)
    new Vector3(-xMax * 0.5, sign * yMax * 0.6, 0),
    new Vector3(0, sign * yMax, 0),
    new Vector3(xMax * 0.5, sign * yMax * 0.6, 0),
    new Vector3(MAGNET_HALF_LENGTH, 0, 0),   // S tip
  ], false, 'catmullrom', 0.5)
}
```

Field lines are built at MOUNT, geometries cached in `useMemo`, disposed on unmount (same pattern as `Wires.tsx`).

Opacity: when `visible === false`, the parent group's material `opacity` lerps to 0 over 250 ms (`useFrame` smoother), making the toggle feel responsive but not jarring.

### `<CurrentArrows/>` — Lenz visualization

**Props:**
```ts
type Props = {
  /** Coil's world centre (matches LabScene's COIL_WORLD). */
  coilWorld: [number, number, number]
  /** Coil length along its axis (= COIL_LENGTH from Coil.tsx). */
  coilLength: number
  /** Coil's outer radius. */
  coilOuterRadius: number
  /** When false, arrows are fully transparent. */
  visible: boolean
}
```

**Behaviour:**
- Subscribes to `useInductionReadings.getState().currentEMF` each frame inside `useFrame` (no selector — same pattern as `Galvanometer.tsx` / `Bulb.tsx`).
- Renders 6 small cone glyphs spaced evenly along the coil's helix path. Cones point TANGENT to the helix curve.
- Sign flip: when `currentEMF >= 0`, cones point in the +tangent direction; when negative, -tangent (180° rotation around their own y-axis).
- Opacity = `clamp(0, 1, |EMF| / EMF_MAX) * (visible ? 1 : 0)`. No current = invisible. Maximum current = fully opaque.
- Colour blends between Apple-blue (`#0a84ff` for positive EMF) and soft-red (`#ff7a60` for negative) via a `MeshStandardMaterial` `color.lerpColors()` call each frame on the material refs.

Arrow geometry: `coneGeometry args=[0.005, 0.012, 6]` — 6 mm radius, 12 mm long, 6 radial segments. Tiny cones positioned at 6 sample points along the helix path. Total geometry budget: 6 × ~24 triangles = 144 triangles.

### `<FieldToggleButton/>` — HUD control

A pill button that fits in the existing bottom-right control row (alongside ZoomControls / SoundToggle / "Скинути предмети"):

```tsx
import { useVisualState } from '../state/VisualState'

export function FieldToggleButton() {
  const fieldVisible = useVisualState(s => s.fieldVisible)
  const setFieldVisible = useVisualState(s => s.setFieldVisible)

  return (
    <Button
      variant="secondary"
      onClick={() => setFieldVisible(!fieldVisible)}
      title={fieldVisible ? 'Сховати магнітне поле' : 'Показати магнітне поле'}
      aria-label={fieldVisible ? 'Сховати магнітне поле' : 'Показати магнітне поле'}
    >
      {fieldVisible ? '⊟ Поле' : '⊞ Поле'}
    </Button>
  )
}
```

(Icons: `⊟` = collapsed/hidden, `⊞` = expandable/visible — matches existing CollapsibleGlassPanel conventions.)

### `VisualState` — small Zustand store

```ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type VisualState = {
  fieldVisible: boolean
  setFieldVisible: (v: boolean) => void
}

export const useVisualState = create<VisualState>()(
  persist(
    (set) => ({
      fieldVisible: true,
      setFieldVisible: (fieldVisible) => set({ fieldVisible }),
    }),
    { name: 'em-induction.visual-state' },  // localStorage key
  ),
)
```

(Zustand `persist` middleware is already a transitive dep — verify; if not, fall back to a manual `useEffect` that reads/writes `localStorage` like `CollapsibleGlassPanel` does.)

### `LabScene.tsx` changes

1. Import + mount `<FieldLines/>`, `<CurrentArrows/>`, `<FieldToggleButton/>`.
2. Pipe `visible` prop through to both new instruments: `visible = useVisualState(s => s.fieldVisible) && currentSceneIdx > 0` (off during Scene 1 intro).
3. Add `<FieldToggleButton/>` to the bottom-right control row inside the `<div>` that holds `ZoomControls / SoundToggle / Скинути`. Place AFTER `SoundToggle` and BEFORE `Скинути предмети`.

### Sound

Optional but tasteful: when the user toggles the field on/off, play the existing `tick` sound from the `SoundManager` catalog. One line: `sound.play('tick')` inside `FieldToggleButton.onClick`.

---

## File touch-list

| File | Change |
|---|---|
| `src/labs/electromagnetic-induction/instruments/FieldLines.tsx` | NEW |
| `src/labs/electromagnetic-induction/instruments/CurrentArrows.tsx` | NEW |
| `src/labs/electromagnetic-induction/state/VisualState.ts` | NEW |
| `src/labs/electromagnetic-induction/ui/FieldToggleButton.tsx` | NEW |
| `src/labs/electromagnetic-induction/scene/LabScene.tsx` | MODIFIED — mount 2 new instruments + 1 new button |

No tests for this phase — both new components are visual-only (rendering correctness is verified by smoke test, not unit tests). Test count stays at 138.

---

## Acceptance criteria

1. From Scene 2 onward, eight faint amber curved lines appear around the bar magnet, emerging from the N pole (red half) and curving back into the S pole (blue half). Lines move with the magnet during drag.
2. While the magnet is inside or near the coil and moving, six small arrow glyphs along the coil's helix path appear in Apple-blue (positive EMF) or soft-red (negative EMF). Arrows are fully transparent at zero EMF and fade in as the magnet moves.
3. A pill button "⊟ Поле" / "⊞ Поле" appears in the bottom-right control row. Clicking it toggles BOTH the field lines AND the current arrows. State persists across page reload via localStorage.
4. Scene 1 (intro) shows the equipment WITHOUT field lines or current arrows, regardless of the toggle state — they appear from Scene 2 onward.
5. Field lines and current arrows are correctly hidden in mobile breakpoint when the panel is collapsed (no z-fighting with HUD, no overlap).
6. Existing 138 tests stay green. `npx tsc --noEmit` clean. `npm run build` clean.
7. No perceivable performance regression (60 FPS desktop / 30 FPS phone target from earlier polish slice maintained — ~900 added triangles is well within budget).
8. Mass-measurement lab is unaffected (no SDK changes in this phase, only lab-local files + one LabScene edit).

---

## Risks

- **Field-line shape looks "wrong"** — hand-tuned Bezier curves don't match the exact dipole-field equation. Mitigation: smoke-test against a textbook diagram side-by-side; tweak the control point ratios (the `0.5 / 0.6` constants in `makeFieldLine`) until it reads as "dipole field". If unrealistic, fall back to Phase-2.1 with mathematically-correct field-line tracing via numerical integration (out of scope for this slice).

- **Current arrows tangent direction calculation** — tangent at point i along a helix curve is `curve.getTangent(t)`. For a left-handed vs right-handed coil, the +tangent direction differs. We don't currently track handedness explicitly — Phase 1 set up the helix with `Math.sin → y, Math.cos → z` along x, which produces one handedness. Verify visually that "positive EMF → arrows point one way" matches the user's intuition (entering from N pole on the left → current flows counterclockwise looking from +x).

- **Zustand `persist` middleware availability** — if not installed as a peer dep, the `VisualState` store falls back to manual localStorage. Test at implementation time; if missing, add the fallback pattern. Doesn't block the spec.

## Out of scope

- Adjustable turn count (Phase 3).
- Adjustable magnet strength (Phase 3).
- Compass tool (Phase 3 optional).
- 3D field-line rotation around magnet axis (we use 2D plane only — see "Design choices").
- Numerical field-line tracing (we use hand-tuned Bezier).
- Animated electron-flow particles (we use static cone glyphs).
- Field visualization for the electromagnet (a future Phase 4 if we go down that path).

---

## Self-review checklist

- [x] Every feature has concrete acceptance criteria.
- [x] No "TBD" / "TODO" / placeholder text.
- [x] Design choices explicit in a table — user can override them during spec review.
- [x] All new files have clear single responsibilities; no SDK additions.
- [x] LabScene.tsx changes are minimal (3 mounts + 1 button + 1 derived prop).
- [x] Performance budget accounted for (~900 added triangles + per-frame uniform updates).
- [x] Risks section flags 2 known unknowns (field shape accuracy, arrow tangent direction) without blocking ship.
