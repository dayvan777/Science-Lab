# EM Induction Lab — Polish Pass v2 Design

**Date:** 2026-05-13
**Status:** Approved (4 fixes confirmed by user after live smoke-test)
**Scope:** Second polish slice for the electromagnetic induction lab. Four fixes: reveal-screen navigation, fix wires sinking through the table + coil floating, fill out the scene visually, and make motion-triggers reliable. Single atomic commit. All changes lab-local plus one small SDK-shared piece (Link import) — no SDK contract changes.

---

## Goal

After the first polish pass (commit `0c0cd11`) shipped to master, user did a fresh live smoke-test on `/physics/em-induction` and reported four distinct issues. This spec addresses all four in one slice.

## Non-goals

- No changes to the lab content (the 5 scenes + MC questions stay).
- No SDK changes (no new completion rules, no new components).
- No new dependencies.
- No changes to the underlying physics formulas (`computeEMF`, `computeBulbBrightness`, `computeGalvanometerAngle` keep their signatures and numeric behaviour).
- No changes to the platform layer (routing, subjects, landing — all stay).

---

## Fix 1 — Navigation on the Reveal screen

**File:** `src/labs/electromagnetic-induction/ui/RevealScene.tsx`

The reveal currently shows three Faraday/Lenz conclusion lines and then dead-ends — student has no way back. Add two pill buttons at the bottom:

| Button | Action |
|---|---|
| `← На головну` | React Router `<Link to="/">`, returns to NOVA EVRIKA landing |
| `↻ Знову` | Calls `useLabState.getState().reset()` to restart the lab from intro |

Layout: a horizontal row, centered, with `gap: 16px`, appearing in the same `staggered fade-in` rhythm as the conclusion lines — fades in at stage 5 (after the last conclusion stage 4).

Button styling matches the existing landing-page glass-pill aesthetic — frosted white background for the primary "На головну", subtle ghost style for "Знову":

```tsx
// Primary — solid white pill
{
  background: 'rgba(255, 255, 255, 0.96)',
  color: '#1d1d1f',
  padding: '14px 28px',
  borderRadius: 100,
  fontSize: 13,
  fontWeight: 700,
  letterSpacing: '0.10em',
  textTransform: 'uppercase',
  fontFamily: '"Inter", system-ui, sans-serif',
  textDecoration: 'none',
  boxShadow: '0 8px 28px rgba(0, 0, 0, 0.4)',
}

// Ghost — outlined pill
{
  background: 'transparent',
  color: '#fff',
  padding: '14px 28px',
  borderRadius: 100,
  fontSize: 13,
  fontWeight: 700,
  letterSpacing: '0.10em',
  textTransform: 'uppercase',
  fontFamily: '"Inter", system-ui, sans-serif',
  border: '1px solid rgba(255, 255, 255, 0.30)',
  cursor: 'pointer',
}
```

The "Знову" button calls `useLabState.getState().reset()` which already exists in `state/LabState.ts` and resets phase → 'intro' + clears journal + bumps sessionId.

---

## Fix 2 — Stop wires sinking through table + add coil stand

### 2a — Wire sag reduction + Y clamping

**File:** `src/labs/electromagnetic-induction/instruments/Wires.tsx`

Current `makeWireCurve` applies a 15% sag → 5.5 cm dip below the table for the blue return wire. Two changes:

1. Reduce sag factor 15% → **5%** (`dist * 0.05` instead of `dist * 0.15`).
2. Clamp the midpoint Y to ≥ `TABLE_TOP_Y + 0.005` so the curve never goes under the table.

Replace the function:

```ts
const TABLE_TOP_Y = 0.85  // matches sdk/scene/Table.tsx surface height
const WIRE_MIN_Y = TABLE_TOP_Y + 0.005  // 5 mm above table surface

function makeWireCurve(start: Vector3, end: Vector3): CatmullRomCurve3 {
  const dist = start.distanceTo(end)
  const sag = dist * 0.05
  const mid = new Vector3().addVectors(start, end).multiplyScalar(0.5)
  mid.y = Math.max(WIRE_MIN_Y, mid.y - sag)
  const quarter1 = new Vector3().lerpVectors(start, mid, 0.5)
  quarter1.y = Math.max(WIRE_MIN_Y, quarter1.y - dist * 0.02)
  const quarter2 = new Vector3().lerpVectors(mid, end, 0.5)
  quarter2.y = Math.max(WIRE_MIN_Y, quarter2.y - dist * 0.02)
  return new CatmullRomCurve3([start, quarter1, mid, quarter2, end], false, 'catmullrom', 0.5)
}
```

### 2b — Coil stand

**File NEW:** `src/labs/electromagnetic-induction/instruments/CoilStand.tsx`

The coil currently floats 6 cm above the table (`COIL_CENTER.y = 0.95`, `COIL_OUTER_RADIUS = 0.04`, so coil bottom at y=0.91, table at 0.85 → 6 cm gap). Add two **U-shaped wooden supports** at the coil's ends — small dark-wood blocks with U-cutouts holding the coil up like a real lab setup.

Each support is a rectangular wooden block with a half-circle cutout on top matching the coil's outer radius. Position: at the coil's z-extents (±COIL_LENGTH/2) ± a tiny outward nudge so the supports peek beyond the coil ends.

Visual: dark walnut `#2a1c10`, roughness 0.75, slightly rounded edges via `RoundedBox`. Dimensions:
- Block height: 0.058 m (= coil center y 0.95 − table top 0.85 − overlap of 0.008 m)
- Block depth (along x): 0.05 m
- Block width (along z): 0.022 m
- U-cutout radius: 0.04 m (= `COIL_OUTER_RADIUS`)

For the cutout effect: subtract a horizontal cylinder from the top of the block. Cheap fake: render a `<RoundedBox/>` as the block and a dark colored `<mesh><cylinderGeometry/></mesh>` on top (rotated horizontally, aligned with coil axis) as a "cradle". The coil visually rests on the cradle.

Actually simpler and cleaner: render each support as TWO boxes — a horizontal base + a vertical post on each side of the coil — forming a "U" shape. Boxes only, no CSG. Layout:

```
[ vertical post ][ coil rests on the gap between posts ][ vertical post ]
                   ↑                                       ↑
                  these are the two posts of ONE stand
```

Hmm that's 4 posts for 2 stands. Let me simplify further:

**Pattern: each support is a single block with a cylindrical "saddle" indentation** rendered as a darker color band on top. No real cutout — visual only. Specifically:
- Each support = single `RoundedBox` of size `[depth=0.05, height=0.058, width=0.025]`.
- Position both supports at the coil's z-ends, ±(`COIL_LENGTH/2 + 0.005`) so they peek out 5 mm beyond coil.
- Top centerline of each block aligns with `COIL_CENTER.y − COIL_OUTER_RADIUS` (= 0.91 m world).
- Render a small darker `<RoundedBox>` ON TOP of each support to look like a half-cylinder cradle: simpler is a small dark indentation rendered as a slim plane in front.

For pragmatism: skip the cradle indentation altogether — a simple solid wooden block ≈ school lab "coil stand". The visual story (block holds coil up) is clear without precision-modeling a U-cutout.

### Coil position adjustment

The coil itself stays at `COIL_CENTER = (-0.05, 0.95, 0)` so it visually sits ON the stands at `y = 0.91` (their tops). Make the stands' tops align with coil bottom:
- Stand top y = `COIL_CENTER.y - COIL_OUTER_RADIUS` = `0.95 - 0.04` = `0.91`
- Stand center y = `(table_top + stand_top) / 2` = `(0.85 + 0.91) / 2` = `0.88`
- Stand height = `stand_top - table_top` = `0.91 - 0.85` = `0.06`

Final values:

```ts
// CoilStand.tsx
export const STAND_HEIGHT = 0.06
const STAND_DEPTH = 0.05   // x-dimension
const STAND_WIDTH = 0.025  // z-dimension
const STAND_OFFSET_Z = 0.005  // peek 5 mm beyond coil ends

type Props = {
  coilWorld: [number, number, number]  // matches LabScene's COIL_WORLD
  coilLength: number  // imported from Coil.tsx
}

export function CoilStand({ coilWorld, coilLength }: Props) {
  const [cx, cy, cz] = coilWorld
  const standY = cy - 0.04 - STAND_HEIGHT / 2  // 0.88 — middle of stand
  return (
    <group>
      <RoundedBox
        args={[STAND_DEPTH, STAND_HEIGHT, STAND_WIDTH]}
        radius={0.003}
        smoothness={4}
        position={[cx, standY, cz - coilLength / 2 - STAND_OFFSET_Z]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#2a1c10" roughness={0.75} envMapIntensity={0.25} />
      </RoundedBox>
      <RoundedBox
        args={[STAND_DEPTH, STAND_HEIGHT, STAND_WIDTH]}
        radius={0.003}
        smoothness={4}
        position={[cx, standY, cz + coilLength / 2 + STAND_OFFSET_Z]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#2a1c10" roughness={0.75} envMapIntensity={0.25} />
      </RoundedBox>
    </group>
  )
}
```

Mount in `LabScene.tsx` near the existing `<Coil/>` line:

```tsx
<CoilStand coilWorld={COIL_WORLD} coilLength={COIL_LENGTH} />
<Coil position={COIL_WORLD} active={true} />
```

`COIL_LENGTH` is already exported from `Coil.tsx`.

---

## Fix 3 — Fill out the scene visually

**File NEW:** `src/labs/electromagnetic-induction/instruments/LabClutter.tsx`

The user said: "all objects look small on this huge table". Two ways to add fullness:
A. Tighten camera (zoom in)
B. Add decorative objects

We chose **B** during brainstorm. Add three small decorative objects on the table:

1. **Notebook** — closed book in front of the magnet tray, slightly tilted. Dimensions ~10×14×0.8 cm. Dark blue cover (#1a3060) with a thin paper-coloured page-edge stripe.
2. **Copper wire spool** — small cylindrical reel about 5 cm diameter × 3 cm tall, parked behind the galvanometer. Bronzy material to echo the coil.
3. **Spare magnet on its own tray** — duplicate visual of `BarMagnet` (NOT a `<Draggable>`, just static decoration) placed at the back-right of the table, near the bulb.

Layout (lab-local world coords):
- Notebook: `[-0.55, 0.86, 0.30]` (slightly higher than table, in front of magnet tray)
- Wire spool: `[0.10, 0.86, -0.35]` (behind the galvanometer)
- Spare magnet display: `[0.55, 0.86, -0.30]` (behind the bulb, parallel to z-axis)

These are **decorative-only** — no physics, no drag, no Rapier bodies. Just `<mesh>` components inside the lab scene root.

```tsx
// LabClutter.tsx (sketch — full code in plan)
import { RoundedBox } from '@react-three/drei'

const NOTEBOOK_W = 0.14
const NOTEBOOK_D = 0.10
const NOTEBOOK_H = 0.008
const SPOOL_R = 0.025
const SPOOL_H = 0.030
const SPARE_MAGNET_L = 0.06

type Props = {
  notebookWorld: [number, number, number]
  spoolWorld: [number, number, number]
  spareMagnetWorld: [number, number, number]
}

export function LabClutter({ notebookWorld, spoolWorld, spareMagnetWorld }: Props) {
  return (
    <group>
      {/* Notebook (dark blue with paper stripe) */}
      <RoundedBox
        args={[NOTEBOOK_W, NOTEBOOK_H, NOTEBOOK_D]}
        radius={0.001}
        smoothness={2}
        position={notebookWorld}
        rotation={[0, Math.PI / 12, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#1a3060" roughness={0.7} envMapIntensity={0.3} />
      </RoundedBox>
      {/* Page-edge stripe — thin lighter sliver on top of the notebook */}
      <mesh
        position={[notebookWorld[0], notebookWorld[1] + 0.0045, notebookWorld[2]]}
        rotation={[0, Math.PI / 12, 0]}
      >
        <boxGeometry args={[NOTEBOOK_W * 0.98, 0.0008, NOTEBOOK_D * 0.98]} />
        <meshStandardMaterial color="#e0d8c0" roughness={0.9} />
      </mesh>

      {/* Copper wire spool — short cylinder with two end caps */}
      <group position={spoolWorld}>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[SPOOL_R, SPOOL_R, SPOOL_H, 24]} />
          <meshStandardMaterial color="#b67333" metalness={0.75} roughness={0.30} envMapIntensity={0.7} />
        </mesh>
        {/* Lighter end caps */}
        <mesh position={[0, SPOOL_H / 2 + 0.001, 0]} castShadow>
          <cylinderGeometry args={[SPOOL_R * 1.05, SPOOL_R * 1.05, 0.003, 24]} />
          <meshStandardMaterial color="#3a2a1a" roughness={0.85} />
        </mesh>
        <mesh position={[0, -SPOOL_H / 2 - 0.001, 0]} castShadow>
          <cylinderGeometry args={[SPOOL_R * 1.05, SPOOL_R * 1.05, 0.003, 24]} />
          <meshStandardMaterial color="#3a2a1a" roughness={0.85} />
        </mesh>
      </group>

      {/* Spare bar magnet — static (no Draggable) */}
      <group position={spareMagnetWorld} rotation={[0, Math.PI / 2, 0]}>
        {/* N half (red) */}
        <mesh position={[-SPARE_MAGNET_L / 4, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[SPARE_MAGNET_L / 2, 0.024, 0.024]} />
          <meshStandardMaterial color="#ff3b30" metalness={0.6} roughness={0.4} />
        </mesh>
        {/* S half (blue) */}
        <mesh position={[SPARE_MAGNET_L / 4, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[SPARE_MAGNET_L / 2, 0.024, 0.024]} />
          <meshStandardMaterial color="#0a84ff" metalness={0.6} roughness={0.4} />
        </mesh>
      </group>
    </group>
  )
}
```

Mount inside `<Physics>` in `LabScene.tsx`:

```tsx
<LabClutter
  notebookWorld={[-0.55, 0.86, 0.30]}
  spoolWorld={[0.10, 0.86, -0.35]}
  spareMagnetWorld={[0.55, 0.86, -0.30]}
/>
```

(Note: these positions are inside the Physics block but `LabClutter` doesn't use any Rapier — purely visual. Fine.)

---

## Fix 4 — Reliable motion triggers

**File:** `src/labs/electromagnetic-induction/scene/LabScene.tsx`

The current `magnet-near-coil` trigger requires the magnet to be **continuously** inside `INFLUENCE_RADIUS` (0.18 m) for 1500 ms. Any momentary slip out resets the timer. This is why "иногда срабатывает, иногда нет".

### Logic changes

Replace the three trigger blocks (currently `~lines 86-115`) with accumulator-based logic.

```tsx
// New refs (replace the existing wasInside / stationarySinceMs / nearSinceMs)
const nearAccumulatedMs = useRef(0)
const stationaryAccumulatedMs = useRef(0)
const wasInside = useRef(false)

// In useFrame, after computing `inside`, `nowMs`, `speed`, `delta` (already exists):
// — note: useFrame's second arg is `delta` (seconds). Multiply by 1000.

const deltaMs = (...) // already available — see existing useFrame signature

if (step.motionTrigger === 'magnet-near-coil') {
  // Accumulate frames spent inside — does NOT reset on exit. Triggers
  // as soon as the magnet has been inside for >= 600 ms cumulative.
  if (inside) {
    nearAccumulatedMs.current += deltaMs
  }
  if (nearAccumulatedMs.current >= 600) {
    advanceStep()
    nearAccumulatedMs.current = 0
  }
} else if (step.motionTrigger === 'magnet-leaving-coil') {
  // Magnet had to be inside at some point, then leave. Speed gate
  // removed — even slow withdrawal counts.
  if (inside) wasInside.current = true
  else if (wasInside.current) {
    advanceStep()
    wasInside.current = false
  }
} else if (step.motionTrigger === 'magnet-stationary-in-coil') {
  // Inside AND not moving for >= 1500 ms cumulative (slightly less strict).
  // Speed gate widened 0.04 → 0.08 to absorb Rapier jitter on rest.
  if (inside && speed < 0.08) {
    stationaryAccumulatedMs.current += deltaMs
  } else {
    // Reset on motion OR exit — this DOES need a reset because the
    // pedagogy specifically asks for stationary inside.
    stationaryAccumulatedMs.current = 0
  }
  if (stationaryAccumulatedMs.current >= 1500) {
    advanceStep()
    stationaryAccumulatedMs.current = 0
  }
}
```

The reset effect (currently `~lines 53-57`) also needs updating to reset the new refs:

```tsx
useEffect(() => {
  wasInside.current = false
  nearAccumulatedMs.current = 0
  stationaryAccumulatedMs.current = 0
}, [currentSceneIdx, currentStepIdx])
```

### Surfacing `deltaMs` in useFrame

`useFrame` provides `delta` (seconds) as its second argument. Currently the EM lab's `useFrame` only destructures `{ clock }` — add `delta`:

```tsx
useFrame(({ clock }, delta) => {
  // ...
  const deltaMs = delta * 1000
  // ...
})
```

### Time thresholds summary

| Trigger | Was | Now |
|---|---|---|
| `magnet-near-coil` | 1500 ms continuous | **600 ms cumulative** |
| `magnet-leaving-coil` | speed > 0.05 + exit | **just exit (after entering)** |
| `magnet-stationary-in-coil` | 2000 ms continuous, speed < 0.04 | **1500 ms continuous, speed < 0.08** |

---

## File touch-list

| File | Change |
|---|---|
| `src/labs/electromagnetic-induction/ui/RevealScene.tsx` | Add 2 nav buttons (← На головну / ↻ Знову) at stage 5 |
| `src/labs/electromagnetic-induction/instruments/Wires.tsx` | Sag 15% → 5% + Y clamp ≥ TABLE_TOP + 0.005 |
| `src/labs/electromagnetic-induction/instruments/CoilStand.tsx` | NEW — 2 wooden blocks under coil ends |
| `src/labs/electromagnetic-induction/instruments/LabClutter.tsx` | NEW — notebook + wire spool + spare magnet |
| `src/labs/electromagnetic-induction/scene/LabScene.tsx` | Mount `<CoilStand/>` + `<LabClutter/>`; rewrite three motion-trigger blocks |

Existing tests stay at 138/138 (no test changes — perf functions and step rules unchanged).

---

## Acceptance criteria

1. After completing all 5 scenes, the reveal scene displays the three conclusion lines AND two pill buttons (← На головну / ↻ Знову). Clicking "На головну" navigates to `/`. Clicking "Знову" resets the lab to its intro screen.
2. Both red and blue wires stay **above** the table top throughout their drape. Visual check: no wire segment dips below `y = 0.85`.
3. The coil visibly rests on two dark wooden U-supports at its ends. Stands cast shadows on the table.
4. The table looks "populated": notebook in front of the magnet tray, copper spool behind the galvanometer, spare bar magnet behind the bulb.
5. **Motion trigger 1 (near-coil)**: bringing the magnet inside the coil's influence radius for 600 ms cumulative time (NOT continuous) advances the step. Tested by bringing the magnet in/out repeatedly — should still advance.
6. **Motion trigger 2 (leaving-coil)**: pulling the magnet out of the coil after entering advances the step regardless of speed.
7. **Motion trigger 3 (stationary-in-coil)**: placing the magnet inside the coil and releasing it advances the step after ~1.5 s. Rapier jitter must not prevent advance.
8. Existing 138 tests stay green. `npx tsc --noEmit` clean. `npm run build` clean.

---

## Risks

- **Stand position calculation** — the two stands are at `z = COIL_CENTER.z ± (COIL_LENGTH / 2 + STAND_OFFSET_Z)`. If `COIL_LENGTH` changes in future, the stands need to follow. Mitigation: import `COIL_LENGTH` from `Coil.tsx` and pass through props (already specified).

- **Wire min-y clamp** — clamping the midpoint Y can flatten the curve when start/end Y are close to the table. Visual check during smoke-test: the wires should still drape, not look stick-straight. If they're too flat, lower `WIRE_MIN_Y` to `0.852` (just barely above table).

- **Accumulator triggers can fire too early** — if 600 ms cumulative fires before student has actually "brought the magnet to the coil" intentionally, the MC question appears prematurely. 600 ms was chosen because @ 60 FPS that's 36 frames inside — meaningful presence, not a fly-by. If smoke-test shows it's too eager, bump to 900 ms.

- **Stationary trigger reset condition** — resets accumulator on exit OR motion. Could be slightly punishing if magnet wobbles between 0.07 and 0.09 m/s while "stationary". Mitigation: speed gate already widened to 0.08; if still problematic, raise to 0.12.

- **Decorative spare magnet vs. real bar magnet** — student might try to drag the spare. It's a plain `<group>` of meshes with no `Draggable` wrapper, so drag-events won't fire on it. Risk-free but worth a quick check.

## Out of scope

- Animating the lab clutter (no notebook flipping pages, no wire spool rotating).
- Adding sound effects on motion triggers.
- Reworking the coil's wire texture / look beyond reducing the segment count (done in v1 polish).
- Tightening the camera preset (rejected — adding clutter instead).
- Adding a fourth scene about second-coil-with-more-turns (rejected — scope creep).

---

## Self-review checklist

- [x] Every fix has a concrete code change + matching acceptance criterion.
- [x] No "TBD" / "TODO" / placeholder text.
- [x] Time thresholds are explicit numbers, not "shorter".
- [x] Decorative components are explicitly marked as non-physics (`<group>` with `<mesh>`, no `<RigidBody>`, no `<Draggable>`).
- [x] File touch-list maps to file map across all four fixes.
- [x] Risk section flags the "smoke-test may require re-tuning thresholds" — documented but not blocking.
