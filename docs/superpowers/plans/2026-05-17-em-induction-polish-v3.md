# EM Induction Polish v3 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the EM induction lab look and feel more like a real physics demo: elliptical field lines with directional arrows, a magnet that's twice as long, and a bulb that dims smoothly with thermal-inertia decay.

**Architecture:** Three independent slices in one PR. Slice A rewrites the field-line geometry (taller arcs) and adds 3 cone arrows per line oriented along the curve's tangent. Slice B is a one-line constant change in `BarMagnet.tsx`; the dependent files (corridor, FieldLines extents) update automatically through their existing imports. Slice C adds a per-frame low-pass filter on the bulb brightness and lowers its peak intensity.

**Tech Stack:** React 19, TypeScript, `@react-three/fiber`, Three.js (`CatmullRomCurve3`, `Quaternion`, `coneGeometry`, `MeshBasicMaterial`). No new dependencies.

**Spec:** `docs/superpowers/specs/2026-05-17-em-induction-polish-v3-design.md` (commit `97a91b0`).

**Branch:** `feat/em-induction-polish-v3` (from `master` at commit `97a91b0`).

---

## File Structure

3 files modified, 0 new files.

| File | Slice | Change |
|---|---|---|
| `src/labs/electromagnetic-induction/instruments/FieldLines.tsx` | A | Increase `yMax` factor 0.6 → 0.85. Add `ARROW_T_VALUES` constant. Build per-curve cone arrows oriented along tangents. Render cones inside the existing `<group ref={groupRef}>`. |
| `src/labs/electromagnetic-induction/objects/BarMagnet.tsx` | B | One line: `MAGNET_HALF_LENGTH = 0.045` → `0.09`. Comment updated. |
| `src/labs/electromagnetic-induction/instruments/Bulb.tsx` | C | Replace inline-style consumer with smoothing: `smoothBrightness` ref, `TIME_CONSTANT_MS`, `STIFFNESS`, `EMISSIVE_SCALE` constants. Lower `MAX_LIGHT_INTENSITY` to 1.8. Low-pass filter in `useFrame`. |

---

## Pre-flight

- [ ] **Step 0a: Confirm clean tree on master**

Run: `git status`
Expected: `nothing to commit, working tree clean`. HEAD at `97a91b0` on `master`.

- [ ] **Step 0b: Create feature branch**

Run: `git checkout -b feat/em-induction-polish-v3`
Expected: `Switched to a new branch 'feat/em-induction-polish-v3'`.

- [ ] **Step 0c: Baseline test run**

Run: `npm test -- --run`
Expected: `Tests 220 passed (220)`.

---

## Task 1 (Slice A): Elliptical field lines + arrow markers

**Files:**
- Modify: `src/labs/electromagnetic-induction/instruments/FieldLines.tsx`

This task does two things in one file: (1) makes the existing 8 curves more vertically extended (more elliptical-looking), and (2) adds 3 small cone arrows per curve, oriented along the curve's tangent so they point N→S externally.

- [ ] **Step 1.1: Increase yMax factor for more elliptical curves**

Open `src/labs/electromagnetic-induction/instruments/FieldLines.tsx`. Find the `makeFieldLine` function (around lines 49–64):

```ts
function makeFieldLine(extent: number, mirror: boolean): CatmullRomCurve3 {
  const sign = mirror ? -1 : 1
  const yMax = extent * 0.6
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

Change the `yMax` line to:

```ts
  const yMax = extent * 0.85
```

(everything else in the function stays the same). This makes the arcs ~40% taller relative to the magnet, matching the reference image's more rounded look.

- [ ] **Step 1.2: Add the ARROW_T_VALUES and cone geometry constants**

In the same file, find the existing top-of-file constants (around lines 30–35):

```ts
const TUBE_RADIUS = 0.0015
const PATH_SEGMENTS = 24
const RADIAL_SEGMENTS = 4
const LINE_EXTENTS = [0.04, 0.10, 0.20, 0.40] as const
const FIELD_OPACITY = 0.55
const FADE_STIFFNESS = 4   // 1 / (250ms / 1000) = 4 — opacity converges in ~250ms
```

Add three new constants right below them:

```ts
const ARROW_T_VALUES = [0.2, 0.5, 0.8] as const   // parameter values along each curve
const ARROW_RADIUS = TUBE_RADIUS * 1.6              // ~2.4 mm — visible at scene scale
const ARROW_HEIGHT = TUBE_RADIUS * 4                 // ~6 mm
const ARROW_RADIAL_SEGMENTS = 6                      // low-poly cones; 24 cones × ~24 tris ≈ 576 triangles total
```

- [ ] **Step 1.3: Add Quaternion to the three imports**

Still at the top of the file, find the three import block:

```ts
import {
  Vector3,
  TubeGeometry,
  CatmullRomCurve3,
  Group,
  MeshBasicMaterial,
} from 'three'
```

Add `Quaternion` and `ConeGeometry`:

```ts
import {
  Vector3,
  TubeGeometry,
  CatmullRomCurve3,
  ConeGeometry,
  Group,
  MeshBasicMaterial,
  Quaternion,
} from 'three'
```

- [ ] **Step 1.4: Build arrow geometry + transforms inside the component**

Find the `FieldLines` function body (starts around line 68: `export function FieldLines({ magnetBodyId, visible, opacityScale }: Props) {`). Right after the existing `geometries` `useMemo` block (currently around lines 71–78), add a new `useMemo` that builds the per-curve arrow transforms AND a shared `coneGeometry`.

The new code, placed immediately after the existing `geometries = useMemo(...)` block:

```ts
  // Pre-compute arrow transforms once per mount. Each line gets 3 arrows
  // at evenly-spaced parameter values. Cone is oriented along the curve's
  // tangent at that point so the apex points N→S externally.
  const arrowTransforms = useMemo(() => {
    const out: Array<{ position: Vector3; quaternion: Quaternion }> = []
    const up = new Vector3(0, 1, 0)  // coneGeometry default axis
    for (const extent of LINE_EXTENTS) {
      for (const mirror of [false, true]) {
        const curve = makeFieldLine(extent, mirror)
        for (const t of ARROW_T_VALUES) {
          const position = curve.getPoint(t)
          const tangent = curve.getTangent(t).normalize()
          const quaternion = new Quaternion().setFromUnitVectors(up, tangent)
          out.push({ position, quaternion })
        }
      }
    }
    return out
  }, [])

  // Single shared cone geometry — disposed alongside the tubes.
  const arrowGeometry = useMemo(
    () => new ConeGeometry(ARROW_RADIUS, ARROW_HEIGHT, ARROW_RADIAL_SEGMENTS),
    [],
  )
```

- [ ] **Step 1.5: Dispose the new arrow geometry on unmount**

Still in `FieldLines.tsx`, find the existing cleanup `useEffect` (currently around lines 94–99):

```ts
  useEffect(() => {
    return () => {
      for (const g of geometries) g.dispose()
      material.dispose()
    }
  }, [geometries, material])
```

Replace it with:

```ts
  useEffect(() => {
    return () => {
      for (const g of geometries) g.dispose()
      arrowGeometry.dispose()
      material.dispose()
    }
  }, [geometries, arrowGeometry, material])
```

- [ ] **Step 1.6: Render the cones inside the group**

Find the existing JSX return (currently around lines 114–120):

```tsx
  return (
    <group ref={groupRef}>
      {geometries.map((geometry, i) => (
        <mesh key={i} geometry={geometry} material={material} />
      ))}
    </group>
  )
```

Add a second mapping that renders the cones using `arrowTransforms` and the shared `arrowGeometry`:

```tsx
  return (
    <group ref={groupRef}>
      {geometries.map((geometry, i) => (
        <mesh key={`tube-${i}`} geometry={geometry} material={material} />
      ))}
      {arrowTransforms.map((tr, i) => (
        <mesh
          key={`arrow-${i}`}
          geometry={arrowGeometry}
          material={material}
          position={tr.position}
          quaternion={tr.quaternion}
        />
      ))}
    </group>
  )
```

Note: changed `key={i}` to `key={`tube-${i}`}` to keep keys unique between the two sibling lists. Each arrow uses the shared `arrowGeometry` — no per-cone allocation. The shared `material` is the same opacity-modulated material used by the tubes, so arrows fade in/out together and respect `opacityScale`.

- [ ] **Step 1.7: Type-check + test + build**

Run: `npx tsc --noEmit`
Expected: 0 errors.

Run: `npm test -- --run`
Expected: 220 tests passing.

Run: `npm run build`
Expected: build succeeds (pre-existing chunk-size warning unchanged).

- [ ] **Step 1.8: Commit**

```bash
git add -A
git commit -m "feat(em-induction): elliptical field lines + N→S arrow markers"
```

---

## Task 2 (Slice B): Bar magnet 2× longer

**Files:**
- Modify: `src/labs/electromagnetic-induction/objects/BarMagnet.tsx`

One constant change. Everything downstream — the drag corridor, the field-line N/S tip positions, the visual mesh sizes, the physics cuboid extents — all derive from this one constant via imports or inline arithmetic. So a one-line bump cascades automatically.

- [ ] **Step 2.1: Bump MAGNET_HALF_LENGTH**

Open `src/labs/electromagnetic-induction/objects/BarMagnet.tsx`. Find line 5:

```ts
export const MAGNET_HALF_LENGTH = 0.045  // total length 9 cm
```

Replace with:

```ts
export const MAGNET_HALF_LENGTH = 0.09   // total length 18 cm
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
git commit -m "feat(em-induction): bar magnet 2× longer (9cm → 18cm)"
```

---

## Task 3 (Slice C): Bulb inertia + dimmer

**Files:**
- Modify: `src/labs/electromagnetic-induction/instruments/Bulb.tsx`

Replace the direct mapping of `bulbBrightness → light/emissive` with a low-pass filter that gives the bulb a ~150 ms thermal time constant. Also lower the peak intensity so the bulb doesn't overwhelm the scene.

- [ ] **Step 3.1: Update constants at top of Bulb.tsx**

Open `src/labs/electromagnetic-induction/instruments/Bulb.tsx`. Find the existing constants (currently lines 6–8):

```ts
const BULB_GLASS_R = 0.025
const BASE_HEIGHT = 0.020
const MAX_LIGHT_INTENSITY = 2.5
```

Replace with:

```ts
const BULB_GLASS_R = 0.025
const BASE_HEIGHT = 0.020
const MAX_LIGHT_INTENSITY = 1.8                  // peak point-light intensity (dimmed from 2.5)
const EMISSIVE_SCALE = 2.0                       // peak emissive intensity on the glass material
const TIME_CONSTANT_MS = 150                     // thermal inertia (≈ real incandescent filament)
const STIFFNESS = 1000 / TIME_CONSTANT_MS        // per-second decay coefficient (= 6.67)
```

- [ ] **Step 3.2: Add the smoothBrightness ref + replace useFrame body**

Still in `Bulb.tsx`, find the existing component body (the section starting `export function Bulb({ position }: Props) {`). The current body, focusing on the part that needs to change (lightRef + useFrame, currently lines 13–28):

```ts
export function Bulb({ position }: Props) {
  const lightRef = useRef<PointLight>(null)
  const glassMatRef = useRef<MeshStandardMaterial>(null)

  // Update light + emissive every frame via refs — avoids React re-render churn.
  // PERF: read from store via getState() instead of selector — same reasoning
  // as Galvanometer.tsx. Per-frame state changes don't trigger this component
  // to reconcile.
  useFrame(() => {
    const brightness = useInductionReadings.getState().bulbBrightness
    if (lightRef.current) {
      lightRef.current.intensity = brightness * MAX_LIGHT_INTENSITY
    }
    if (glassMatRef.current) {
      glassMatRef.current.emissiveIntensity = brightness * 2.5
    }
  })
```

Replace with:

```ts
export function Bulb({ position }: Props) {
  const lightRef = useRef<PointLight>(null)
  const glassMatRef = useRef<MeshStandardMaterial>(null)
  // Smoothed brightness — exponentially lerps toward the store's instantaneous
  // bulbBrightness with a 150ms time constant. Frame-rate-independent.
  const smoothBrightness = useRef(0)

  // Update light + emissive every frame via refs — avoids React re-render churn.
  // PERF: read from store via getState() instead of selector — same reasoning
  // as Galvanometer.tsx. Per-frame state changes don't trigger this component
  // to reconcile.
  useFrame((_, delta) => {
    const target = useInductionReadings.getState().bulbBrightness
    const step = Math.min(1, delta * STIFFNESS)
    smoothBrightness.current += (target - smoothBrightness.current) * step
    if (lightRef.current) {
      lightRef.current.intensity = smoothBrightness.current * MAX_LIGHT_INTENSITY
    }
    if (glassMatRef.current) {
      glassMatRef.current.emissiveIntensity = smoothBrightness.current * EMISSIVE_SCALE
    }
  })
```

Two changes:
1. Added `smoothBrightness` ref (initialized to 0 → bulb starts dark).
2. `useFrame` callback now receives `delta` (seconds) and applies an exponential lerp toward `target`. `step = min(1, delta * STIFFNESS)` clamps the step so very large frame gaps (e.g. tab switch) snap to target instead of overshooting. With `STIFFNESS = 6.67` and 60 fps delta = 0.0167s, `step ≈ 0.111` per frame — gives ~63% convergence after 9 frames (150 ms).

Inline `2.5` for emissive replaced by the new `EMISSIVE_SCALE = 2.0` constant.

- [ ] **Step 3.3: Type-check + test + build**

Run: `npx tsc --noEmit`
Expected: 0 errors.

Run: `npm test -- --run`
Expected: 220 tests passing.

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3.4: Commit**

```bash
git add -A
git commit -m "feat(em-induction): bulb gains thermal inertia + dimmer peak"
```

---

## Task 4: Final verification + push + direct merge to master

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
1. `feat(em-induction): elliptical field lines + N→S arrow markers`
2. `feat(em-induction): bar magnet 2× longer (9cm → 18cm)`
3. `feat(em-induction): bulb gains thermal inertia + dimmer peak`

Run: `git diff master..HEAD --stat`
Expected: 3 files changed, ~40 lines net added.

- [ ] **Step 4.3: Push the branch**

Run: `git push -u origin feat/em-induction-polish-v3`
Expected: branch pushed to remote.

- [ ] **Step 4.4: Direct merge to master**

```bash
git checkout master
git merge --no-ff feat/em-induction-polish-v3 -m "Merge feat/em-induction-polish-v3: elliptical lines + longer magnet + bulb inertia"
git push origin master
```

Expected: master fast-forwards onto a merge commit; pushed; Vercel triggers prod deploy.

- [ ] **Step 4.5: User smoke-test (after Vercel deploys)**

On iPhone (or any browser), open `science-lab-phi.vercel.app` → EM induction lab:
1. Field lines are taller/more elliptical-looking; each line has 3 small amber arrows visibly pointing N→S externally.
2. Bar magnet is twice as long as before.
3. Move the magnet through the coil quickly, then stop. The bulb glows during the motion and **fades out smoothly over ~300 ms** instead of going dark instantly.
4. At peak brightness the bulb is softer than before — does not wash out the scene.
5. Toggle "⊟ Поле" off — lines + arrows fade out together. Toggle on — fade in together.
6. Open the mass-measurement lab. Drag balls/weights. No behavioural change.

---

## Self-Review Notes

**Spec coverage:**
- ✅ Slice A — Tasks 1.1 (yMax factor) + 1.2–1.6 (cone arrows + dispose + render).
- ✅ Slice B — Task 2 (one-line constant change).
- ✅ Slice C — Task 3 (inertia + dimmer + new constants).
- ✅ Cascade verification for Slice B: `MAGNET_HALF_LENGTH` is consumed by `BarMagnet.tsx` itself (halfExtents, mesh positions), by `BarMagnet.tsx`'s `CORRIDOR_HALF_LENGTH`, and by `FieldLines.tsx`'s `makeFieldLine` (N/S tip x-coords). All consume via import, so changing the constant in one place updates everywhere.

**Placeholder scan:** No "TBD" / "TODO" / "fill in later". Every step has full code or full commands.

**Type consistency:**
- `ARROW_T_VALUES` is `readonly [number, number, number]` (via `as const`). Iterated with `for (const t of ARROW_T_VALUES)` — `t` is `0.2 | 0.5 | 0.8` literal, passes fine to `curve.getPoint(t: number)`.
- `ARROW_RADIUS`, `ARROW_HEIGHT`, `ARROW_RADIAL_SEGMENTS` are all numbers, passed to `new ConeGeometry(radius: number, height: number, radialSegments?: number)`.
- `Quaternion.setFromUnitVectors(from, to)` accepts two normalized Vector3 — `up` is unit by construction, `tangent.normalize()` ensures the second is too.
- `useFrame` callback signature in `Bulb.tsx` was `() => void`, becomes `(_, delta) => void` — `_` discards the state arg, `delta` is the frame interval in seconds (R3F convention).

**No new tests:** All changes are visual or numeric-constant. The 220-test suite covers physics math (computeEMF, etc.) — that's the only testable surface, and it's untouched.

**Branch parallelism:** This work is on top of fresh master (`97a91b0`) which already contains all the prior merges (Phase 3 + Touch+Responsive + Mobile-v2 + field-lines-scene-1 + coil-physics). No conflicting open branches.

**Out of scope confirmed:** Focus navigation (PR2) is NOT touched here. `useCameraStore` is not modified, no new POSES presets, no HUD pill buttons for focus targets.
