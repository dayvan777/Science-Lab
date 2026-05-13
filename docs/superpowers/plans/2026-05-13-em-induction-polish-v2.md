# EM Induction Polish v2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Four targeted fixes after the user's second live smoke-test — reveal navigation, stop wires sinking under the table, stop coil floating in mid-air, add lab clutter, and make the three motion triggers reliable.

**Architecture:** All edits are local to `src/labs/electromagnetic-induction/`. Two new lab-local files (`CoilStand.tsx`, `LabClutter.tsx`) + three modified files. No SDK, no platform, no test changes. Single atomic commit.

**Tech Stack:** React 19, R3F + drei (`RoundedBox`), three.js (`CatmullRomCurve3`, `TubeGeometry`), React Router 7 (`Link` already in use). No new dependencies.

**Spec:** `docs/superpowers/specs/2026-05-13-em-induction-polish-v2-design.md`

---

## File map

```
NEW
  src/labs/electromagnetic-induction/instruments/CoilStand.tsx       (Task 3)
  src/labs/electromagnetic-induction/instruments/LabClutter.tsx      (Task 4)

MODIFIED
  src/labs/electromagnetic-induction/ui/RevealScene.tsx              (Task 1)
  src/labs/electromagnetic-induction/instruments/Wires.tsx           (Task 2)
  src/labs/electromagnetic-induction/scene/LabScene.tsx              (Task 5)
```

## Verification commands

```bash
npx tsc --noEmit                    # clean
npx vitest run                      # 138/138 green
npm run build                       # clean
```

Manual smoke after the slice ships: open `/physics/em-induction`, run through all 5 scenes, then check the reveal nav buttons. Verify coil sits on wooden stands and wires don't dip below table.

---

## Task 1 — Reveal navigation buttons

**Files:**
- Modify: `src/labs/electromagnetic-induction/ui/RevealScene.tsx`

Add two glass-pill buttons (← На головну / ↻ Знову) that fade in at stage 5, AFTER the three conclusion lines (stages 2-4).

- [ ] **Step 1: Replace the entire file**

Write `src/labs/electromagnetic-induction/ui/RevealScene.tsx` with this exact content:

```tsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLabState } from '../state/LabState'

const CONCLUSIONS = [
  'Струм виникає лише при ЗМІНІ магнітного потоку.',
  'Швидше рух → більший струм (закон Фарадея).',
  'Зміна напрямку руху → зміна напрямку струму (закон Ленца).',
]

export function RevealScene() {
  const [stage, setStage] = useState(0)
  const reset = useLabState(s => s.reset)

  useEffect(() => {
    // Stages: 1=title, 2-4=conclusions one by one, 5=nav buttons.
    const timers = [400, 1500, 2600, 3700, 4600].map((ms, i) =>
      setTimeout(() => setStage(i + 1), ms),
    )
    return () => timers.forEach(clearTimeout)
  }, [])

  const navWrapStyle: React.CSSProperties = {
    display: 'flex',
    gap: 16,
    marginTop: 56,
    opacity: stage >= 5 ? 1 : 0,
    transform: stage >= 5 ? 'translateY(0)' : 'translateY(20px)',
    transition: 'opacity 600ms ease, transform 600ms ease',
  }

  const primaryPillStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '14px 28px',
    borderRadius: 100,
    background: 'rgba(255, 255, 255, 0.96)',
    color: '#1d1d1f',
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: '0.10em',
    textTransform: 'uppercase',
    textDecoration: 'none',
    fontFamily: '"Inter", system-ui, sans-serif',
    boxShadow: '0 8px 28px rgba(0, 0, 0, 0.4)',
  }

  const ghostPillStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '14px 28px',
    borderRadius: 100,
    background: 'transparent',
    color: '#fff',
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: '0.10em',
    textTransform: 'uppercase',
    fontFamily: '"Inter", system-ui, sans-serif',
    border: '1px solid rgba(255, 255, 255, 0.30)',
    cursor: 'pointer',
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#08080a',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      color: '#fff', padding: 32,
      fontFamily: '"Inter", system-ui, sans-serif',
    }}>
      {/* Glow backdrop */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `
          radial-gradient(ellipse 60% 35% at 90% 12%, rgba(255, 200, 70, 0.45) 0%, transparent 75%),
          radial-gradient(ellipse 55% 55% at 70% 60%, rgba(80, 220, 130, 0.40) 0%, transparent 80%),
          radial-gradient(ellipse 55% 70% at 5% 85%, rgba(10, 132, 255, 0.45) 0%, transparent 75%)
        `,
        filter: 'blur(60px)',
        pointerEvents: 'none',
      }} />

      <div style={{
        opacity: stage >= 1 ? 1 : 0,
        transform: stage >= 1 ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 600ms ease, transform 600ms ease',
        fontFamily: '"Saira", "Inter", sans-serif',
        fontSize: 36, fontWeight: 800, letterSpacing: -0.02,
        marginBottom: 40, textTransform: 'uppercase', textAlign: 'center',
      }}>
        Висновки
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 760, textAlign: 'center' }}>
        {CONCLUSIONS.map((text, i) => (
          <div key={i} style={{
            opacity: stage >= i + 2 ? 1 : 0,
            transform: stage >= i + 2 ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 600ms ease, transform 600ms ease',
            fontSize: 22, fontWeight: 500, color: 'rgba(255,255,255,0.9)',
            lineHeight: 1.5,
          }}>
            <span style={{ color: '#0a84ff', fontWeight: 700, marginRight: 8 }}>{i + 1}.</span>
            {text}
          </div>
        ))}
      </div>

      {/* Navigation — fade in at stage 5 (after the three conclusions). */}
      <div style={navWrapStyle}>
        <Link to="/" style={primaryPillStyle} aria-label="Назад на головну">
          ← На головну
        </Link>
        <button
          type="button"
          onClick={() => reset()}
          style={ghostPillStyle}
          aria-label="Знову пройти лабораторну"
        >
          ↻ Знову
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

Expected: clean.

---

## Task 2 — Wires sag reduction + Y clamp

**Files:**
- Modify: `src/labs/electromagnetic-induction/instruments/Wires.tsx`

Reduce sag factor from 15% to 5%. Clamp midpoint and quarter-point Y to ≥ `TABLE_TOP_Y + 0.005` (5 mm above table) so wires can never dip below the table surface.

- [ ] **Step 1: Replace `makeWireCurve` and add table constant**

Open `src/labs/electromagnetic-induction/instruments/Wires.tsx`. Find the constants block at the top (right after the BULB_* lines, ~line 22) and the `makeWireCurve` function (~lines 36-46). 

Add a new constants block ABOVE `type Props`:

```ts
// Wire-drape parameters. Spec v2 reduced sag from 15% → 5% after live
// smoke-test showed the blue return wire dipping ~5.5 cm below the table.
// Y-clamp ensures the curve never goes below WIRE_MIN_Y regardless of
// distance — keeps the drape readable even for long horizontal spans.
const TABLE_TOP_Y = 0.85          // matches sdk/scene/Table.tsx surface
const WIRE_MIN_Y = TABLE_TOP_Y + 0.005  // 5 mm above table

const WIRE_SAG_FACTOR = 0.05      // was 0.15 in polish v1
const WIRE_QUARTER_DIP = 0.02     // was 0.05 in polish v1
```

Replace the existing `makeWireCurve` function body with:

```ts
function makeWireCurve(start: Vector3, end: Vector3): CatmullRomCurve3 {
  const dist = start.distanceTo(end)
  const sag = dist * WIRE_SAG_FACTOR
  const mid = new Vector3().addVectors(start, end).multiplyScalar(0.5)
  mid.y = Math.max(WIRE_MIN_Y, mid.y - sag)
  const quarter1 = new Vector3().lerpVectors(start, mid, 0.5)
  quarter1.y = Math.max(WIRE_MIN_Y, quarter1.y - dist * WIRE_QUARTER_DIP)
  const quarter2 = new Vector3().lerpVectors(mid, end, 0.5)
  quarter2.y = Math.max(WIRE_MIN_Y, quarter2.y - dist * WIRE_QUARTER_DIP)
  return new CatmullRomCurve3([start, quarter1, mid, quarter2, end], false, 'catmullrom', 0.5)
}
```

Update the JSDoc comment above the function:

```ts
/**
 * Build a gentle catenary-like curve between two world points. Mid-point
 * is displaced downward by WIRE_SAG_FACTOR × distance, with two
 * intermediate control points nudged slightly below the straight line for
 * a natural drape. All three are clamped to ≥ WIRE_MIN_Y so the curve
 * never dips below the table surface. Returns a CatmullRomCurve3 of 5
 * points.
 */
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

Expected: clean.

---

## Task 3 — `CoilStand` component

**Files:**
- Create: `src/labs/electromagnetic-induction/instruments/CoilStand.tsx`

Two dark wooden blocks at the coil's z-extents. Visually the coil rests on them, occluding the 6 cm gap between coil bottom (y=0.91) and table top (y=0.85).

- [ ] **Step 1: Write the component**

Create `src/labs/electromagnetic-induction/instruments/CoilStand.tsx`:

```tsx
import { RoundedBox } from '@react-three/drei'

/**
 * Two small wooden blocks at the coil's z-extents. The coil visually
 * rests on them, hiding the air gap that would otherwise leave the coil
 * floating 6 cm above the table.
 *
 * Geometry (lab-local, in metres):
 *   - Stand height: 0.06 m (= coil_center.y 0.95 − coil_outer_r 0.04 − table_top 0.85)
 *   - Stand depth (x): 0.05
 *   - Stand width (z): 0.025
 *   - Offset beyond coil ends: 0.005 m (5 mm peek)
 *
 * Material: dark walnut #2a1c10 to match the lab-clutter notebook and
 * read clearly as wood against the polished-metal galvanometer.
 */

export const STAND_HEIGHT = 0.06
const STAND_DEPTH = 0.05
const STAND_WIDTH = 0.025
const STAND_OFFSET_Z = 0.005

type Props = {
  /** World position of the coil's centre (matches LabScene's COIL_WORLD). */
  coilWorld: [number, number, number]
  /** Coil's length along z (imported from Coil.tsx in the caller). */
  coilLength: number
  /** Coil's outer radius (imported from Coil.tsx) — determines stand top y. */
  coilOuterRadius: number
}

export function CoilStand({ coilWorld, coilLength, coilOuterRadius }: Props) {
  const [cx, cy, cz] = coilWorld
  // Stand top y = coil bottom y. Stand center y = stand_top − height/2.
  const standTopY = cy - coilOuterRadius
  const standCenterY = standTopY - STAND_HEIGHT / 2

  return (
    <group>
      <RoundedBox
        args={[STAND_DEPTH, STAND_HEIGHT, STAND_WIDTH]}
        radius={0.003}
        smoothness={4}
        position={[cx, standCenterY, cz - coilLength / 2 - STAND_OFFSET_Z]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#2a1c10" roughness={0.75} envMapIntensity={0.25} />
      </RoundedBox>
      <RoundedBox
        args={[STAND_DEPTH, STAND_HEIGHT, STAND_WIDTH]}
        radius={0.003}
        smoothness={4}
        position={[cx, standCenterY, cz + coilLength / 2 + STAND_OFFSET_Z]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#2a1c10" roughness={0.75} envMapIntensity={0.25} />
      </RoundedBox>
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

## Task 4 — `LabClutter` component

**Files:**
- Create: `src/labs/electromagnetic-induction/instruments/LabClutter.tsx`

Three static decorative groups. No `<Draggable>`, no Rapier bodies — purely visual fillers to make the table feel like a real lab desk.

- [ ] **Step 1: Write the component**

Create `src/labs/electromagnetic-induction/instruments/LabClutter.tsx`:

```tsx
import { RoundedBox } from '@react-three/drei'

const NOTEBOOK_W = 0.14
const NOTEBOOK_D = 0.10
const NOTEBOOK_H = 0.008

const SPOOL_R = 0.025
const SPOOL_H = 0.030

const SPARE_MAGNET_L = 0.06
const SPARE_MAGNET_THICK = 0.024

type Props = {
  /** World position of the notebook (front of the table, near magnet tray). */
  notebookWorld: [number, number, number]
  /** World position of the copper wire spool. */
  spoolWorld: [number, number, number]
  /** World position of the spare bar magnet (decorative — no drag). */
  spareMagnetWorld: [number, number, number]
}

/**
 * Three decorative props sitting on the lab table — purely visual, no
 * physics. Adds the "lived-in lab desk" feel after the user reported the
 * stage looked sparse.
 *
 *   1. Notebook — dark-blue closed book with a thin paper-coloured stripe
 *      along the page edge, slightly rotated for a natural look.
 *   2. Copper wire spool — a brass-toned cylinder with darker end caps,
 *      echoing the coil material.
 *   3. Spare bar magnet — a non-draggable lookalike of the playable magnet,
 *      sitting at rest for visual decoration only.
 */
export function LabClutter({ notebookWorld, spoolWorld, spareMagnetWorld }: Props) {
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

      {/* Copper wire spool — cylinder + two darker end caps */}
      <group position={spoolWorld}>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[SPOOL_R, SPOOL_R, SPOOL_H, 24]} />
          <meshStandardMaterial color="#b67333" metalness={0.75} roughness={0.30} envMapIntensity={0.7} />
        </mesh>
        <mesh position={[0, SPOOL_H / 2 + 0.001, 0]} castShadow>
          <cylinderGeometry args={[SPOOL_R * 1.05, SPOOL_R * 1.05, 0.003, 24]} />
          <meshStandardMaterial color="#3a2a1a" roughness={0.85} />
        </mesh>
        <mesh position={[0, -SPOOL_H / 2 - 0.001, 0]} castShadow>
          <cylinderGeometry args={[SPOOL_R * 1.05, SPOOL_R * 1.05, 0.003, 24]} />
          <meshStandardMaterial color="#3a2a1a" roughness={0.85} />
        </mesh>
      </group>

      {/* Spare bar magnet — visual only, NOT a Draggable.
          Oriented along z so it doesn't look like a duplicate of the
          playable magnet (which is along x). */}
      <group position={spareMagnetWorld} rotation={[0, Math.PI / 2, 0]}>
        <mesh position={[-SPARE_MAGNET_L / 4, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[SPARE_MAGNET_L / 2, SPARE_MAGNET_THICK, SPARE_MAGNET_THICK]} />
          <meshStandardMaterial color="#ff3b30" metalness={0.6} roughness={0.4} envMapIntensity={0.5} />
        </mesh>
        <mesh position={[SPARE_MAGNET_L / 4, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[SPARE_MAGNET_L / 2, SPARE_MAGNET_THICK, SPARE_MAGNET_THICK]} />
          <meshStandardMaterial color="#0a84ff" metalness={0.6} roughness={0.4} envMapIntensity={0.5} />
        </mesh>
      </group>
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

## Task 5 — `LabScene.tsx`: mount new components + rewrite motion triggers

**Files:**
- Modify: `src/labs/electromagnetic-induction/scene/LabScene.tsx`

Two distinct changes in the same file: mount `<CoilStand/>` + `<LabClutter/>`, and rewrite the three motion-trigger blocks for reliability.

- [ ] **Step 1: Add imports**

Open `src/labs/electromagnetic-induction/scene/LabScene.tsx`. Find the existing imports block (~lines 17-26). Add the two new imports next to the `Coil` / `Galvanometer` lines, and import `COIL_LENGTH` + `COIL_OUTER_RADIUS` from `Coil`:

```tsx
import { Coil, COIL_LENGTH, COIL_OUTER_RADIUS } from '../instruments/Coil'
import { Galvanometer } from '../instruments/Galvanometer'
import { Bulb } from '../instruments/Bulb'
import { Wires } from '../instruments/Wires'
import { CoilStand } from '../instruments/CoilStand'
import { LabClutter } from '../instruments/LabClutter'
```

Verify `Coil.tsx` already exports `COIL_LENGTH` and `COIL_OUTER_RADIUS` — it does (lines 6 and 8).

- [ ] **Step 2: Add world-position constants for the clutter**

Find the existing world-position constants block (~lines 28-31). Add three new lines below:

```tsx
const COIL_WORLD: [number, number, number] = [COIL_CENTER.x, COIL_CENTER.y, COIL_CENTER.z]
const GALVANOMETER_WORLD: [number, number, number] = [0.30, 0.85, 0]
const BULB_WORLD: [number, number, number] = [0.55, 0.85, 0]
const MAGNET_TRAY_WORLD: [number, number, number] = [-0.40, 0.94, 0.30]

// Decorative clutter positions — chosen so they don't overlap any
// interactive object and don't intersect the camera's focus-coil framing.
const NOTEBOOK_WORLD: [number, number, number] = [-0.55, 0.86, 0.30]
const SPOOL_WORLD: [number, number, number] = [0.10, 0.86, -0.35]
const SPARE_MAGNET_WORLD: [number, number, number] = [0.55, 0.86, -0.30]
```

- [ ] **Step 3: Mount `<CoilStand/>` and `<LabClutter/>` inside `<Physics>`**

Find the existing `<Physics>` block (~lines 183-191). Add `<CoilStand/>` right BEFORE the existing `<Coil/>`, and `<LabClutter/>` right AFTER `<Wires/>` but BEFORE `<BarMagnet/>`:

```tsx
        <Physics key={resetKey} gravity={[0, -9.81, 0]} timeStep={1 / 60}>
          <Table />
          <CoilStand coilWorld={COIL_WORLD} coilLength={COIL_LENGTH} coilOuterRadius={COIL_OUTER_RADIUS} />
          <Coil position={COIL_WORLD} active={true} />
          <Galvanometer position={GALVANOMETER_WORLD} />
          <Bulb position={BULB_WORLD} />
          <Wires
            coilWorld={COIL_WORLD}
            galvanometerWorld={GALVANOMETER_WORLD}
            bulbWorld={BULB_WORLD}
          />
          <LabClutter
            notebookWorld={NOTEBOOK_WORLD}
            spoolWorld={SPOOL_WORLD}
            spareMagnetWorld={SPARE_MAGNET_WORLD}
          />
          <BarMagnet position={MAGNET_TRAY_WORLD} enabled={phase === 'in-progress'} />
          <SceneController />
        </Physics>
```

- [ ] **Step 4: Rewrite motion-trigger logic in `SceneController`**

Find the `SceneController` function and its `useFrame` callback. Replace the existing ref declarations (`wasInside`, `stationarySinceMs`, `nearSinceMs`) with new accumulator refs, and the three trigger blocks with accumulator-based logic.

First, update the refs block at the top of `SceneController` (~lines 48-50). Replace:

```tsx
  const wasInside = useRef(false)
  const stationarySinceMs = useRef<number | null>(null)
  const nearSinceMs = useRef<number | null>(null)
```

with:

```tsx
  // Accumulator-based timers — milliseconds spent in the relevant state.
  // Polish v2 swap: `nearAccumulatedMs` no longer resets when the magnet
  // momentarily leaves the influence radius, fixing the "sometimes the MC
  // question doesn't appear" bug.
  const nearAccumulatedMs = useRef(0)
  const stationaryAccumulatedMs = useRef(0)
  const wasInside = useRef(false)
```

Update the reset effect (~lines 53-57) to reset the new refs:

```tsx
  // Reset trigger-state on scene change
  useEffect(() => {
    wasInside.current = false
    nearAccumulatedMs.current = 0
    stationaryAccumulatedMs.current = 0
  }, [currentSceneIdx, currentStepIdx])
```

Now update the `useFrame` signature to destructure `delta` (currently only `{ clock }`):

```tsx
  useFrame(({ clock }, delta) => {
```

Inside the `useFrame` body, find the motion-trigger if/else chain (`~lines 86-115`). Replace the entire block with the new accumulator logic:

```tsx
    const deltaMs = delta * 1000

    if (step.motionTrigger === 'magnet-near-coil') {
      // Polish v2: accumulate time inside; do NOT reset on momentary exit.
      // Triggers after 600 ms cumulative — far more reliable than the old
      // 1500 ms continuous check.
      if (inside) {
        nearAccumulatedMs.current += deltaMs
      }
      if (nearAccumulatedMs.current >= 600) {
        advanceStep()
        nearAccumulatedMs.current = 0
      }
    } else if (step.motionTrigger === 'magnet-leaving-coil') {
      // Polish v2: dropped the speed > 0.05 gate. Even slow withdrawal
      // now counts. Trigger fires once on the first frame after entering
      // and then leaving the influence radius.
      if (inside) {
        wasInside.current = true
      } else if (wasInside.current) {
        advanceStep()
        wasInside.current = false
      }
    } else if (step.motionTrigger === 'magnet-stationary-in-coil') {
      // Polish v2: speed gate widened 0.04 → 0.08 (absorbs Rapier jitter),
      // continuous threshold shortened 2000 → 1500 ms. Still resets on
      // motion OR exit — the pedagogy specifically asks the student to
      // place the magnet inside and leave it alone.
      if (inside && speed < 0.08) {
        stationaryAccumulatedMs.current += deltaMs
      } else {
        stationaryAccumulatedMs.current = 0
      }
      if (stationaryAccumulatedMs.current >= 1500) {
        advanceStep()
        stationaryAccumulatedMs.current = 0
      }
    }
```

The full `useFrame` block after the edit should look like:

```tsx
  useFrame(({ clock }, delta) => {
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

    // ---------- Step advance ----------
    const scene = SCENES[currentSceneIdx]
    if (!scene) return
    const step = scene[currentStepIdx]
    if (!step) return

    const distance = scratchPos.current.distanceTo(COIL_CENTER)
    const inside = distance <= INFLUENCE_RADIUS
    const nowMs = clock.getElapsedTime() * 1000
    const speed = scratchVel.current.length()
    const deltaMs = delta * 1000

    if (step.motionTrigger === 'magnet-near-coil') {
      if (inside) {
        nearAccumulatedMs.current += deltaMs
      }
      if (nearAccumulatedMs.current >= 600) {
        advanceStep()
        nearAccumulatedMs.current = 0
      }
    } else if (step.motionTrigger === 'magnet-leaving-coil') {
      if (inside) {
        wasInside.current = true
      } else if (wasInside.current) {
        advanceStep()
        wasInside.current = false
      }
    } else if (step.motionTrigger === 'magnet-stationary-in-coil') {
      if (inside && speed < 0.08) {
        stationaryAccumulatedMs.current += deltaMs
      } else {
        stationaryAccumulatedMs.current = 0
      }
      if (stationaryAccumulatedMs.current >= 1500) {
        advanceStep()
        stationaryAccumulatedMs.current = 0
      }
    }

    // ---------- SDK rule advance ----------
    // For steps without a motionTrigger, run the SDK's standard predicate.
    if (!step.motionTrigger) {
      const engineState = useStepEngine.getState()
      const ctx = {
        draggingBodyId: engineState.draggingBodyId,
        lastSnapTargetId: engineState.lastSnapTargetId,
        digitalScaleGrams: 0,
        dynamometerNewtons: 0,
        leverBalanceTilt: 0,
        leverLeftPanGrams: 0,
        leverRightPanGrams: 0,
        lastMCChoice: engineState.lastMCChoice,
        readingStableSinceMs: engineState.readingStableSinceMs,
        nowMs,
        inputFocused: engineState.inputFocused,
        submittedSinceMs: 0,
      }
      if (isStepComplete(step.complete, ctx)) {
        advanceStep()
        if (step.complete.kind === 'mc-selected') {
          engineState.setLastMCChoice(null)
        }
      }
    }
  })
```

The "SDK rule advance" block at the bottom is unchanged from the existing code — only the motion-trigger block above it was rewritten.

- [ ] **Step 5: Verify**

```bash
npx tsc --noEmit
```

Expected: clean.

---

## Task 6 — Final verify + single atomic commit

- [ ] **Step 1: Full verification**

```bash
npx tsc --noEmit
npx vitest run | tail -3
npm run build 2>&1 | tail -3
```

Expected: typecheck clean, **138/138 tests pass** (no test changes in this slice), build succeeds.

- [ ] **Step 2: Commit**

```bash
git add src/labs/electromagnetic-induction/ui/RevealScene.tsx \
        src/labs/electromagnetic-induction/instruments/Wires.tsx \
        src/labs/electromagnetic-induction/instruments/CoilStand.tsx \
        src/labs/electromagnetic-induction/instruments/LabClutter.tsx \
        src/labs/electromagnetic-induction/scene/LabScene.tsx
git commit -m "fix(em-induction): polish v2 — nav + stand + clutter + reliable triggers

Four fixes after the user's second live smoke-test of /physics/em-induction.

1. RevealScene navigation. Two glass-pill buttons fade in at stage 5
   after the three conclusion lines: '← На головну' (Link to /) and
   '↻ Знову' (calls useLabState.reset). Restores exit path from the
   previously dead-end finished phase.

2. Wires + coil sit correctly on the table. Reduced sag factor 15% →
   5% and clamp curve points Y ≥ table_top + 5 mm — wires no longer
   dip below the table surface. New CoilStand.tsx renders two dark
   wooden blocks (0.05 × 0.06 × 0.025, color #2a1c10) at the coil's
   z-extents; the coil visually rests on them, hiding the 6 cm air
   gap that had it floating.

3. Lab desk feels populated. New LabClutter.tsx adds three static
   decorative props: dark-blue notebook with a thin paper stripe in
   front of the magnet tray, brass-coloured wire spool behind the
   galvanometer, spare bar magnet behind the bulb. All purely
   visual — no Draggable, no Rapier bodies.

4. Motion triggers now reliable. SceneController's three step-advance
   conditions rewritten as accumulator-based:
   - magnet-near-coil: 1500 ms continuous → 600 ms cumulative
     (no longer resets on momentary exit — the main culprit)
   - magnet-leaving-coil: dropped speed > 0.05 gate; any exit after
     entry advances
   - magnet-stationary-in-coil: speed gate 0.04 → 0.08 to absorb
     Rapier jitter, threshold 2000 ms → 1500 ms

useFrame signature gained delta arg to convert frame time → ms for
the accumulators.

No SDK changes, no platform changes, no test changes. 138/138 tests
stay green."
```

- [ ] **Step 3: Verify clean tree**

```bash
git status
```

Expected: `nothing to commit, working tree clean`.

---

## Self-review

**Spec coverage:**

- §Fix 1 (Reveal navigation, two buttons fade in stage 5) → Task 1 ✓
- §Fix 2a (Wires sag 5% + Y clamp) → Task 2 ✓
- §Fix 2b (Coil stand component) → Task 3 ✓
- §Fix 3 (Lab clutter — notebook, wire spool, spare magnet) → Task 4 ✓
- §Fix 4 (Three motion triggers rewritten) → Task 5 step 4 ✓
- §Acceptance criteria 1-7 → covered by Tasks 1-5 implementations
- §Acceptance criterion 8 (tests/build/typecheck still green) → Task 6 step 1 ✓

**Placeholder scan:** every step has concrete file paths, complete code blocks, exact commands. No "TBD" / "implement later" / "similar to".

**Type consistency:**
- `CoilStand` props (Task 3): `coilWorld: [number, number, number]`, `coilLength: number`, `coilOuterRadius: number`. Task 5 step 3 passes `COIL_WORLD` (matching), `COIL_LENGTH` (existing export, `number`), `COIL_OUTER_RADIUS` (existing export, `number`). ✓
- `LabClutter` props (Task 4): three world-position triples. Task 5 step 3 passes the three module-level constants from step 2, all `[number, number, number]`. ✓
- `useFrame(({ clock }, delta) => ...)` Task 5 step 4 — R3F's `useFrame` callback signature is `(state: RootState, delta: number) => void`. ✓
- `useLabState.reset()` Task 1 — already exists in `state/LabState.ts` (line 47); selector pattern `useLabState(s => s.reset)` already in use elsewhere. ✓
- `Link` from `react-router-dom` Task 1 — already a dependency (used by `SubjectPill.tsx`, `ComingSoonPage.tsx`, etc.). ✓
- `WIRE_MIN_Y` and `WIRE_SAG_FACTOR` constants (Task 2) — referenced inside `makeWireCurve` of the same file. ✓

No fixes needed.
