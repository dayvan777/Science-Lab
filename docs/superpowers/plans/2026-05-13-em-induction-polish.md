# EM Induction Polish — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Address two complaints from the user's live smoke-test — significant frame-rate drops and missing visible circuit wires — via four targeted perf fixes + a new `Wires.tsx` decoration component.

**Architecture:** All changes are local to `src/labs/electromagnetic-induction/`. No SDK, no platform, no test changes. Single atomic commit at the end. Targets: 60 FPS desktop, 30 FPS iPhone 14.

**Tech Stack:** React 19, R3F, three.js (`TubeGeometry`, `CatmullRomCurve3`), Zustand (selector→`getState()` swap). No new dependencies.

**Spec:** `docs/superpowers/specs/2026-05-13-em-induction-polish-design.md`

---

## File map

```
NEW
  src/labs/electromagnetic-induction/instruments/Wires.tsx          (Task 6)

MODIFIED
  src/labs/electromagnetic-induction/instruments/Coil.tsx           (Task 1)
  src/labs/electromagnetic-induction/instruments/Galvanometer.tsx   (Task 2)
  src/labs/electromagnetic-induction/instruments/Bulb.tsx           (Task 3)
  src/labs/electromagnetic-induction/physics/induction.ts           (Task 4)
  src/labs/electromagnetic-induction/scene/LabScene.tsx             (Tasks 5 + 7)
```

## Verification commands

```bash
npx tsc --noEmit                    # clean
npx vitest run                      # 138/138 still green
npm run build                       # clean
```

Manual perf smoke: open `npm run dev` in Chrome DevTools → Performance → record while completing Scenes 1–5. After fix: average FPS ≥ 60. Without DevTools meter, the lag should be invisible to the eye.

---

## Task 1 — Reduce Coil geometry + drop castShadow

**Files:**
- Modify: `src/labs/electromagnetic-induction/instruments/Coil.tsx`

- [ ] **Step 1: Reduce path SEGMENTS 256 → 96 and tube radial 8 → 6**

Open `src/labs/electromagnetic-induction/instruments/Coil.tsx`. Find the `buildCoilGeometry` function (~lines 19-35). Replace the `SEGMENTS` constant and the `TubeGeometry` constructor call:

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

Triangle count: `(96 × 2 path segments) × 6 radial = 1152` (was 8192 — 7× reduction).

- [ ] **Step 2: Remove `castShadow` from the coil mesh**

Same file, find the JSX (~lines 56-67):

```tsx
  return (
    <group position={position}>
      <mesh geometry={geometry} castShadow>
        <meshStandardMaterial
```

Remove the `castShadow` prop:

```tsx
  return (
    <group position={position}>
      <mesh geometry={geometry}>
        <meshStandardMaterial
```

(The coil's shadow on the table from the wireframe-helix looked artefactual anyway, and skipping it removes the geometry from the shadow-map pass.)

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit
```

Expected: clean.

---

## Task 2 — `Galvanometer.tsx`: selector → `getState()` in useFrame

**Files:**
- Modify: `src/labs/electromagnetic-induction/instruments/Galvanometer.tsx`

- [ ] **Step 1: Drop the selector at component-body level**

Find line 23:

```ts
  const targetAngle = useInductionReadings(s => s.galvanometerAngle)
```

Delete this line (the value is now read inside `useFrame`).

- [ ] **Step 2: Read via `getState()` inside `useFrame`**

Find the `useFrame` callback (~lines 33-49). Replace its body:

```tsx
  useFrame((_, delta) => {
    // PERF: read from store via getState() instead of selector — avoids
    // a Zustand subscription that would re-render this component every
    // frame when readings change (~60Hz). The component renders once at
    // mount; per-frame updates are applied directly to the needle's
    // rotation ref. If you need a value that DRIVES a re-render
    // (e.g. an isComplete flag), put it in LabState, not InductionReadings.
    const targetAngle = useInductionReadings.getState().galvanometerAngle
    const r = springStep({
      current: displayedAngle.current,
      velocity: velocity.current,
      target: targetAngle,
      stiffness: NEEDLE_STIFFNESS,
      damping: NEEDLE_DAMPING,
      dt: Math.min(delta, 0.033),
    })
    displayedAngle.current = r.current
    velocity.current = r.velocity
    if (needleRef.current) {
      needleRef.current.rotation.z = -r.current
    }
  })
```

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit
```

Expected: clean.

---

## Task 3 — `Bulb.tsx`: selector → `getState()` in useFrame

**Files:**
- Modify: `src/labs/electromagnetic-induction/instruments/Bulb.tsx`

- [ ] **Step 1: Drop the selector at component-body level**

Find line 13:

```ts
  const brightness = useInductionReadings(s => s.bulbBrightness)
```

Delete this line.

- [ ] **Step 2: Read via `getState()` inside `useFrame`**

Find the `useFrame` callback (~lines 17-25). Replace its body:

```tsx
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

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit
```

Expected: clean.

---

## Task 4 — `induction.ts`: hoist `_scratchOffset` Vector3

**Files:**
- Modify: `src/labs/electromagnetic-induction/physics/induction.ts`

- [ ] **Step 1: Add a module-level scratch Vector3 and mutate it in-place**

Find `computeEMF` (~lines 48-59). Add the scratch instance ABOVE the function and refactor:

```ts
// PERF: module-level scratch Vector3 reused by computeEMF. Avoids one
// allocation per call (~60/sec while the lab is active → noticeable GC
// pressure). The function is only called from a single useFrame, so
// concurrent mutation is not a concern.
const _scratchOffset = new Vector3()

export function computeEMF(magnetPos: Vector3, magnetVel: Vector3): number {
  _scratchOffset.subVectors(magnetPos, COIL_CENTER)
  const distance = _scratchOffset.length()
  if (distance > INFLUENCE_RADIUS) return 0
  // Proximity factor: 1 at the centre, smoothly tapering to 0 at the edge
  const t = distance / INFLUENCE_RADIUS
  const proximity = 1 - t * t
  // Velocity component along coil axis (positive = entering from -z, negative = leaving)
  const velAlongAxis = magnetVel.dot(COIL_AXIS)
  const emf = EMF_GAIN * velAlongAxis * proximity
  return Math.max(-EMF_MAX, Math.min(EMF_MAX, emf))
}
```

- [ ] **Step 2: Verify physics tests still pass**

```bash
npx vitest run tests/labs/em-induction.test.ts | tail -3
```

Expected: 10/10 pass.

---

## Task 5 — `LabScene.tsx`: useRef-scoped scratch Vector3s in `SceneController`

**Files:**
- Modify: `src/labs/electromagnetic-induction/scene/LabScene.tsx`

Two `new Vector3()` allocations per frame inside `SceneController`'s `useFrame` (lines 64-65). Move them to component-instance-scoped `useRef`s.

- [ ] **Step 1: Add scratch refs to `SceneController`**

Find the `SceneController` function definition (~line 43). After the existing refs (`wasInside`, `stationarySinceMs`, `nearSinceMs`), add two scratch Vector3 refs:

```tsx
function SceneController() {
  const advanceStep = useStepEngine(s => s.advanceStep)
  const currentSceneIdx = useLabState(s => s.currentSceneIndex)
  const currentStepIdx = useStepEngine(s => s.currentStepIndex)
  const setReadings = useInductionReadings(s => s.setReadings)
  const wasInside = useRef(false)
  const stationarySinceMs = useRef<number | null>(null)
  const nearSinceMs = useRef<number | null>(null)
  // PERF: scratch Vector3 refs reused every frame inside useFrame.
  // Module-level globals would also work; useRef scopes them to this
  // component so future contributors can't accidentally cross-mutate.
  const scratchPos = useRef(new Vector3())
  const scratchVel = useRef(new Vector3())
```

- [ ] **Step 2: Mutate via `.set()` instead of `new Vector3(...)` in `useFrame`**

In the same file, find the `useFrame` body (~lines 59-73). Replace:

```tsx
    const body = findBodyByTag(BAR_MAGNET_BODY_ID)
    if (!body) return
    const t = body.translation()
    const v = body.linvel()
    const pos = new Vector3(t.x, t.y, t.z)
    const vel = new Vector3(v.x, v.y, v.z)
    const emf = computeEMF(pos, vel)
    setReadings({
      currentEMF: emf,
      bulbBrightness: computeBulbBrightness(emf),
      galvanometerAngle: computeGalvanometerAngle(emf),
      magnetSpeed: vel.length(),
      magnetWorldZ: t.z,
    })
```

with:

```tsx
    const body = findBodyByTag(BAR_MAGNET_BODY_ID)
    if (!body) return
    const t = body.translation()
    const v = body.linvel()
    scratchPos.current.set(t.x, t.y, t.z)
    scratchVel.current.set(v.x, v.y, v.z)
    const emf = computeEMF(scratchPos.current, scratchVel.current)
    setReadings({
      currentEMF: emf,
      bulbBrightness: computeBulbBrightness(emf),
      galvanometerAngle: computeGalvanometerAngle(emf),
      magnetSpeed: scratchVel.current.length(),
      magnetWorldZ: t.z,
    })
```

- [ ] **Step 3: Replace remaining downstream `pos` / `vel` refs**

Same `useFrame`, further down (~lines 81-84):

```tsx
    const distance = pos.distanceTo(COIL_CENTER)
    const inside = distance <= INFLUENCE_RADIUS
    const nowMs = clock.getElapsedTime() * 1000
    const speed = vel.length()
```

Replace with:

```tsx
    const distance = scratchPos.current.distanceTo(COIL_CENTER)
    const inside = distance <= INFLUENCE_RADIUS
    const nowMs = clock.getElapsedTime() * 1000
    const speed = scratchVel.current.length()
```

(The `speed` value is computed in two places now — once via `scratchVel.current.length()` for `magnetSpeed` and once for the motion-trigger check. That's fine — `.length()` is cheap once the allocation is gone. Could also hoist to one variable, but the readability cost is bigger than the perf gain.)

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit
```

Expected: clean.

---

## Task 6 — `Wires.tsx`: 3 TubeGeometry curves forming the circuit

**Files:**
- Create: `src/labs/electromagnetic-induction/instruments/Wires.tsx`

A decorative component that renders three drape-curved insulated wires connecting Coil → Galvanometer → Bulb → Coil. The endpoint coordinates are computed from each instrument's world position + its local geometry constants (terminal post offsets, base side offsets, coil end-z offsets).

- [ ] **Step 1: Write the component**

Create `src/labs/electromagnetic-induction/instruments/Wires.tsx`:

```tsx
import { useMemo, useEffect } from 'react'
import { Vector3, TubeGeometry, CatmullRomCurve3 } from 'three'
import { COIL_LENGTH, COIL_OUTER_RADIUS } from './Coil'

const WIRE_TUBE_RADIUS = 0.0025
const WIRE_RADIAL_SEGS = 6
const WIRE_PATH_SEGS = 32

// Galvanometer local terminal offsets — duplicated here as inline constants
// rather than re-exported from Galvanometer.tsx, because exporting them
// would invite cross-file coupling for what's effectively visual metadata.
// If Galvanometer's geometry changes, update these in sync.
const GALV_FACE_W = 0.13          // Galvanometer.tsx:12
const GALV_HOUSING_D = 0.06       // Galvanometer.tsx:11
const GALV_TERMINAL_X = GALV_FACE_W * 0.30   // 0.039 m from centre
const GALV_TERMINAL_Y_LOCAL = 0.012
const GALV_TERMINAL_Z = GALV_HOUSING_D / 2 + 0.005  // 0.035 m in front

const BULB_BASE_HEIGHT = 0.020    // Bulb.tsx:7
const BULB_GLASS_R = 0.025        // Bulb.tsx:6
const BULB_BASE_Y_LOCAL = BULB_BASE_HEIGHT / 2  // mid-base height
const BULB_ATTACH_OFFSET_Z = BULB_GLASS_R * 0.4  // ~1 cm

type Props = {
  coilWorld: [number, number, number]
  galvanometerWorld: [number, number, number]
  bulbWorld: [number, number, number]
}

/**
 * Build a gentle catenary-like curve between two world points. Mid-point is
 * displaced downward by 15% of the start-to-end distance, with two
 * intermediate control points nudged slightly below the straight line for a
 * natural drape. Returns a CatmullRomCurve3 of 5 points.
 */
function makeWireCurve(start: Vector3, end: Vector3): CatmullRomCurve3 {
  const dist = start.distanceTo(end)
  const sag = dist * 0.15
  const mid = new Vector3().addVectors(start, end).multiplyScalar(0.5)
  mid.y -= sag
  const quarter1 = new Vector3().lerpVectors(start, mid, 0.5)
  quarter1.y -= dist * 0.05
  const quarter2 = new Vector3().lerpVectors(mid, end, 0.5)
  quarter2.y -= dist * 0.05
  return new CatmullRomCurve3([start, quarter1, mid, quarter2, end], false, 'catmullrom', 0.5)
}

function buildTube(curve: CatmullRomCurve3): TubeGeometry {
  return new TubeGeometry(curve, WIRE_PATH_SEGS, WIRE_TUBE_RADIUS, WIRE_RADIAL_SEGS, false)
}

export function Wires({ coilWorld, galvanometerWorld, bulbWorld }: Props) {
  const coilCentre = new Vector3(...coilWorld)
  const galvCentre = new Vector3(...galvanometerWorld)
  const bulbCentre = new Vector3(...bulbWorld)

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

  // Galvanometer terminal posts (world)
  const galvLeftTerminal = new Vector3(
    galvCentre.x - GALV_TERMINAL_X,
    galvCentre.y + GALV_TERMINAL_Y_LOCAL,
    galvCentre.z + GALV_TERMINAL_Z,
  )
  const galvRightTerminal = new Vector3(
    galvCentre.x + GALV_TERMINAL_X,
    galvCentre.y + GALV_TERMINAL_Y_LOCAL,
    galvCentre.z + GALV_TERMINAL_Z,
  )

  // Bulb base attach points — two opposite sides of the brass base
  const bulbAttachFront = new Vector3(
    bulbCentre.x,
    bulbCentre.y + BULB_BASE_Y_LOCAL,
    bulbCentre.z + BULB_ATTACH_OFFSET_Z,
  )
  const bulbAttachBack = new Vector3(
    bulbCentre.x,
    bulbCentre.y + BULB_BASE_Y_LOCAL,
    bulbCentre.z - BULB_ATTACH_OFFSET_Z,
  )

  // Build the three tube geometries once — only rebuild if instrument
  // positions actually change (they don't, after mount, but useMemo costs
  // nothing here).
  const { geomRed1, geomRed2, geomBlue } = useMemo(() => ({
    geomRed1: buildTube(makeWireCurve(coilRightEnd, galvLeftTerminal)),
    geomRed2: buildTube(makeWireCurve(galvRightTerminal, bulbAttachFront)),
    geomBlue: buildTube(makeWireCurve(bulbAttachBack, coilLeftEnd)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [coilCentre.x, coilCentre.y, coilCentre.z, galvCentre.x, galvCentre.y, galvCentre.z, bulbCentre.x, bulbCentre.y, bulbCentre.z])

  // Dispose geometries on unmount to free GPU memory.
  useEffect(() => {
    return () => {
      geomRed1.dispose()
      geomRed2.dispose()
      geomBlue.dispose()
    }
  }, [geomRed1, geomRed2, geomBlue])

  return (
    <group>
      <mesh geometry={geomRed1} receiveShadow>
        <meshStandardMaterial color="#cc4030" metalness={0.2} roughness={0.5} envMapIntensity={0.3} />
      </mesh>
      <mesh geometry={geomRed2} receiveShadow>
        <meshStandardMaterial color="#cc4030" metalness={0.2} roughness={0.5} envMapIntensity={0.3} />
      </mesh>
      <mesh geometry={geomBlue} receiveShadow>
        <meshStandardMaterial color="#3060cc" metalness={0.2} roughness={0.5} envMapIntensity={0.3} />
      </mesh>
    </group>
  )
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

Expected: clean.

---

## Task 7 — Mount `<Wires/>` in `LabScene.tsx`

**Files:**
- Modify: `src/labs/electromagnetic-induction/scene/LabScene.tsx`

- [ ] **Step 1: Import the new component**

At the top of `LabScene.tsx`, alongside the existing instrument imports (`Coil`, `Galvanometer`, `Bulb`), add:

```tsx
import { Wires } from '../instruments/Wires'
```

- [ ] **Step 2: Mount `<Wires/>` inside the `<Physics>` block**

Inside `<Physics key={resetKey} ...>` (lines 183-190), AFTER `<Bulb/>` and BEFORE `<BarMagnet/>`, add the `<Wires/>` component:

```tsx
        <Physics key={resetKey} gravity={[0, -9.81, 0]} timeStep={1 / 60}>
          <Table />
          <Coil position={COIL_WORLD} active={true} />
          <Galvanometer position={GALVANOMETER_WORLD} />
          <Bulb position={BULB_WORLD} />
          <Wires
            coilWorld={COIL_WORLD}
            galvanometerWorld={GALVANOMETER_WORLD}
            bulbWorld={BULB_WORLD}
          />
          <BarMagnet position={MAGNET_TRAY_WORLD} enabled={phase === 'in-progress'} />
          <SceneController />
        </Physics>
```

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit
npm run build 2>&1 | tail -3
```

Expected: typecheck clean, build succeeds.

---

## Task 8 — Final verify + single atomic commit

- [ ] **Step 1: Full verification**

```bash
npx tsc --noEmit
npx vitest run | tail -3
npm run build 2>&1 | tail -3
```

Expected: typecheck clean, **138/138** tests pass, build succeeds.

- [ ] **Step 2: Commit**

```bash
git add src/labs/electromagnetic-induction/instruments/Coil.tsx \
        src/labs/electromagnetic-induction/instruments/Galvanometer.tsx \
        src/labs/electromagnetic-induction/instruments/Bulb.tsx \
        src/labs/electromagnetic-induction/instruments/Wires.tsx \
        src/labs/electromagnetic-induction/physics/induction.ts \
        src/labs/electromagnetic-induction/scene/LabScene.tsx
git commit -m "perf+feat(em-induction): kill frame drops + visible circuit wires

Two real complaints from live smoke-test, four bottlenecks fixed +
the long-promised wires.

PERF (four targeted fixes):
- Coil TubeGeometry path SEGMENTS 256→96, radial 8→6 → 8192→1152
  triangles (7× reduction); also dropped castShadow (helix shadow was
  artefactual and doubled the geometry cost in the shadow pass).
- Galvanometer + Bulb were subscribing via Zustand selectors
  (useInductionReadings(s => s.x)), which re-rendered them every
  frame because setReadings runs at 60Hz. Switched to
  useInductionReadings.getState() inside their existing useFrame loops
  — 120 React reconciliations/sec → 0. Inline comments document the
  pattern for future contributors.
- computeEMF allocated a new Vector3 each call. Hoisted to a
  module-level _scratchOffset reused via subVectors in place.
- LabScene's SceneController allocated 2 new Vector3s every frame for
  the magnet's pos + vel. Moved to useRef-scoped scratchPos/scratchVel
  and mutated via .set().

WIRES (new component):
- New Wires.tsx renders 3 TubeGeometry curves connecting Coil →
  Galvanometer → Bulb → Coil as a closed circuit. Two red insulated
  cables (#cc4030) on the outgoing path, one blue (#3060cc) on the
  return. ~576 triangles total — negligible cost.
- Gentle catenary drape via CatmullRomCurve3 with 15 % vertical sag.
- Endpoints computed from each instrument's local geometry constants
  (coil ends at ±COIL_LENGTH/2 along z, galvanometer terminal posts at
  ±FACE_W*0.30, bulb base sides at ±GLASS_R*0.4).

No SDK changes, no state changes, no test changes — 138/138 still
green. Targets: 60 FPS desktop, 30 FPS iPhone 14."
```

- [ ] **Step 3: Verify clean tree**

```bash
git status
```

Expected: `nothing to commit, working tree clean`.

---

## Self-review

**Spec coverage:**

- §Performance fix 1 (coil geometry + shadow) → Task 1 ✓
- §Performance fix 2 (selector → getState for Galvanometer) → Task 2 ✓
- §Performance fix 3 (same for Bulb) → Task 3 ✓
- §Performance fix 4 / Vector3 hoisting (induction.ts) → Task 4 ✓
- §Performance fix 4 / Vector3 hoisting (LabScene.SceneController) → Task 5 ✓
- §Visible circuit wires → Task 6 (new Wires.tsx) + Task 7 (mount it) ✓
- §Acceptance criteria 1, 2, 7, 8 (FPS targets, integration intact, tests/build clean) → Task 8 verification ✓
- §Acceptance criteria 3 (coil visually intact at 96×6) → mentioned in Task 1 commentary, manual smoke ✓
- §Acceptance criteria 4, 5, 6 (wires visible, colours match, no intersections) → Task 6's curve geometry + Task 7 mount ✓

**Placeholder scan:** every step has concrete file paths, complete code, exact commands. No "TBD" / "similar to" / "implement later".

**Type consistency:**
- `Wires.tsx` props (Task 6): `coilWorld`, `galvanometerWorld`, `bulbWorld` — all `[number, number, number]`. Task 7 passes the existing module-level constants `COIL_WORLD`, `GALVANOMETER_WORLD`, `BULB_WORLD` from `LabScene.tsx`, all of which match.
- `useInductionReadings.getState()` returns the same store shape selectors did — `galvanometerAngle: number` and `bulbBrightness: number` exist in `state/InductionReadings.ts`. Verified by Zustand's typing (the getState's return type is the store's state type).
- `scratchPos.current.set(t.x, t.y, t.z)` matches Three.js `Vector3.set(x: number, y: number, z: number)` signature.
- `_scratchOffset.subVectors(magnetPos, COIL_CENTER)` matches `Vector3.subVectors(a: Vector3, b: Vector3): this` signature.
- `COIL_LENGTH` and `COIL_OUTER_RADIUS` are already `export`ed from Coil.tsx (lines 6 and 8) — Wires.tsx imports them safely.

No fixes needed.
