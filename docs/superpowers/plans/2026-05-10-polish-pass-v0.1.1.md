# Polish Pass v0.1.1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship 8 user-requested polish/feature items as v0.1.1 — visual fixes on the lever balance, an analog dynamometer dial, an object tray, mobile-responsive HUD, collapsible HUD panels, and a complete weight set so all three measurements balance exactly.

**Architecture:** Mostly visual polish edits to existing files. Two feature additions (mobile responsive HUD + collapsible panels) introduce two new SDK modules: `src/sdk/a11y/useViewport.ts` and `src/sdk/ui/CollapsibleGlassPanel.tsx`. One new lab component `ObjectTray.tsx` for the wooden ball-tray. No 3D-scene structure changes — only material/geometry/position tweaks within already-existing components.

**Tech Stack:** React 19, TypeScript, R3F + drei, Rapier physics, Zustand, Vitest. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-05-10-polish-pass-v0.1.1-design.md`

---

## File map

```
NEW
  src/sdk/a11y/useViewport.ts
  src/sdk/ui/CollapsibleGlassPanel.tsx
  src/labs/mass-measurement/scene/ObjectTray.tsx
  tests/lab/weights.test.ts

MODIFIED
  src/labs/mass-measurement/instruments/LeverBalance.tsx     (slices A, A)
  src/labs/mass-measurement/instruments/Dynamometer.tsx       (slice B)
  src/labs/mass-measurement/textures/dialTexture.ts            (slice B)
  src/labs/mass-measurement/objects/Weights.tsx                (slice A)
  src/labs/mass-measurement/scene/LabScene.tsx                 (slice A, C)
  src/labs/mass-measurement/ui/HUD.tsx                         (slices D, E)
```

## Slicing

Five slices, ship in order, commit at the end of each:

| Slice | Items from spec | Effort |
|---|---|---|
| **A** | Visual fixes — items 1, 2, 5, 8 | ~1.5 h |
| **B** | Analog dial + needle — item 3 | ~1.5 h |
| **C** | Object tray — item 4 | ~1 h |
| **D** | Mobile responsive HUD — item 6 | ~2.5 h |
| **E** | Collapsible HUD panels — item 7 | ~1.5 h |

Verification commands run at the end of every slice:

```bash
npx tsc --noEmit                    # must be clean
npx vitest run                      # 53 → 54 tests by end of slice A, stays at 54+ after
npm run build                       # must succeed
```

---

## Slice A — Visual fixes (items 1, 2, 5, 8)

### Task A.1 — Add weight-set validation test

**Files:**
- Create: `tests/lab/weights.test.ts`

This is the only TDD-friendly piece in the whole plan. Locks in the spec's invariant: every object must be balance-able exactly with the available weights.

- [ ] **Step 1: Read tests/lab/tasks.test.ts to mirror its style**

```bash
head -30 tests/lab/tasks.test.ts
```

- [ ] **Step 2: Write the failing test**

`tests/lab/weights.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { WEIGHTS } from '../../src/labs/mass-measurement/objects/Weights'

/**
 * Walk every subset of the WEIGHTS inventory; record which gram-totals
 * are reachable. The lab's three target masses (5 g ping-pong,
 * 145 g baseball, 250 g metal ball) must all be exactly reachable.
 */
function reachableTotals(weights: { mass: number }[]): Set<number> {
  let totals = new Set<number>([0])
  for (const w of weights) {
    const next = new Set<number>(totals)
    for (const t of totals) next.add(t + w.mass)
    totals = next
  }
  return totals
}

describe('Weights inventory', () => {
  it('exposes a non-empty WEIGHTS array', () => {
    expect(Array.isArray(WEIGHTS)).toBe(true)
    expect(WEIGHTS.length).toBeGreaterThan(0)
  })

  it('every weight has a positive integer mass in grams', () => {
    for (const w of WEIGHTS) {
      expect(Number.isInteger(w.mass)).toBe(true)
      expect(w.mass).toBeGreaterThan(0)
    }
  })

  it('can exactly balance the ping-pong ball (5 g)', () => {
    expect(reachableTotals(WEIGHTS).has(5)).toBe(true)
  })

  it('can exactly balance the baseball (145 g)', () => {
    expect(reachableTotals(WEIGHTS).has(145)).toBe(true)
  })

  it('can exactly balance the metal ball (250 g)', () => {
    expect(reachableTotals(WEIGHTS).has(250)).toBe(true)
  })
})
```

- [ ] **Step 3: Run test — verify it fails**

```bash
npx vitest run tests/lab/weights.test.ts
```

Expected: failure on `WEIGHTS` not exported (the constant is currently `const WEIGHTS` — module-private). The next task adds the export AND extends the array.

### Task A.2 — Extend Weights inventory + export it for the test

**Files:**
- Modify: `src/labs/mass-measurement/objects/Weights.tsx`

- [ ] **Step 1: Replace the WEIGHTS constant block**

Find this block (lines 5–14):

```tsx
// Sizes 1.8x real for demo visibility on a 2.5m table viewed from far
const WEIGHTS = [
  { mass: 1000, radius: 0.054, height: 0.090, label: '1 кг' },
  { mass: 500,  radius: 0.047, height: 0.072, label: '500 г' },
  { mass: 200,  radius: 0.040, height: 0.058, label: '200 г' },
  { mass: 100,  radius: 0.034, height: 0.050, label: '100 г' },
  { mass: 50,   radius: 0.029, height: 0.040, label: '50 г' },
  { mass: 20,   radius: 0.023, height: 0.032, label: '20 г' },
  { mass: 10,   radius: 0.020, height: 0.025, label: '10 г' },
]
```

Replace with:

```tsx
// Standard school lab weight set — 11 weights covering 1–1908 g in 1 g
// increments. Each weight has a unique `tag` (used as bodyId) so duplicate
// masses (e.g. two 20 g) can be distinguished by the physics layer.
// Sizes scaled for demo visibility on a 2.5 m table viewed from far.
export const WEIGHTS: ReadonlyArray<{
  mass: number     // grams
  radius: number   // metres
  height: number   // metres
  label: string    // visible label on the side of the cylinder
  tag: string      // unique identifier (bodyId)
}> = [
  { mass: 1000, radius: 0.054, height: 0.090, label: '1 кг',  tag: '1кг'    },
  { mass: 500,  radius: 0.047, height: 0.072, label: '500 г', tag: '500г'   },
  { mass: 200,  radius: 0.040, height: 0.058, label: '200 г', tag: '200г'   },
  { mass: 100,  radius: 0.034, height: 0.050, label: '100 г', tag: '100г'   },
  { mass: 50,   radius: 0.029, height: 0.040, label: '50 г',  tag: '50г'    },
  { mass: 20,   radius: 0.023, height: 0.032, label: '20 г',  tag: '20г-A'  },
  { mass: 20,   radius: 0.023, height: 0.032, label: '20 г',  tag: '20г-B'  },
  { mass: 10,   radius: 0.020, height: 0.025, label: '10 г',  tag: '10г'    },
  { mass: 5,    radius: 0.017, height: 0.020, label: '5 г',   tag: '5г'     },
  { mass: 2,    radius: 0.014, height: 0.016, label: '2 г',   tag: '2г'     },
  { mass: 1,    radius: 0.012, height: 0.014, label: '1 г',   tag: '1г'     },
]
```

- [ ] **Step 2: Use the unique tag for the bodyId and React key**

Inside the `<Draggable>` JSX (around line 41–46 in the original), find:

```tsx
            key={w.label}
            position={[x, y0 + w.height / 2, z]}
            mass={w.mass}
            shape={{ type: 'cuboid', halfExtents: [w.radius, w.height / 2, w.radius] }}
            bodyId={`weight-${w.label}`}
```

Replace with:

```tsx
            key={w.tag}
            position={[x, y0 + w.height / 2, z]}
            mass={w.mass}
            shape={{ type: 'cuboid', halfExtents: [w.radius, w.height / 2, w.radius] }}
            bodyId={`weight-${w.tag}`}
```

This keeps the `weight-` prefix used by `findSnapNear`'s "weights can always snap to lever-balance" rule.

- [ ] **Step 3: Run the test — verify it passes**

```bash
npx vitest run tests/lab/weights.test.ts
```

Expected: 5/5 pass.

- [ ] **Step 4: Run full test suite**

```bash
npx vitest run
```

Expected: 58/58 pass (53 pre-existing + 5 new).

### Task A.3 — Tighten weight spacing in LabScene

**Files:**
- Modify: `src/labs/mass-measurement/scene/LabScene.tsx`

11 weights at the previous spacing of 0.13 m would span 1.30 m, exceeding the table's 1.20 m depth. Reduce spacing to 0.085 m (10 weights × 0.085 = 0.85 m span, fits comfortably).

- [ ] **Step 1: Find the `<Weights>` JSX**

Run:

```bash
grep -n "<Weights" src/labs/mass-measurement/scene/LabScene.tsx
```

- [ ] **Step 2: Replace the spacing prop**

Change `spacing={0.13}` (or whatever it currently is) to `spacing={0.085}`. The full element should look like:

```tsx
          <Weights
            startPosition={[1.05, 0.90, -0.42]}
            spreadAxis="z"
            spacing={0.085}
            weightsEnabled={activeInstrumentId === 'lever-balance'}
          />
```

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit
```

Expected: clean.

### Task A.4 — Remove chrome torus rings from lever pans (item 1)

**Files:**
- Modify: `src/labs/mass-measurement/instruments/LeverBalance.tsx`

- [ ] **Step 1: Delete the PAN_RIM_TUBE constant**

Find:

```tsx
const PAN_RIM_TUBE = 0.004
```

Delete this line.

- [ ] **Step 2: Delete the two rim torus meshes**

Find both occurrences (one in the left pan group, one in the right pan group) of:

```tsx
          <mesh position={[0, PAN_DEPTH / 2, 0]} castShadow>
            <torusGeometry args={[PAN_R, PAN_RIM_TUBE, 12, 48]} />
            <meshStandardMaterial color="#a8aab2" metalness={0.75} roughness={0.32} envMapIntensity={0.55} />
          </mesh>
```

Delete both blocks. The pan groups now contain only the bowl mesh (the truncated cone) and nothing else.

- [ ] **Step 3: Verify typecheck**

```bash
npx tsc --noEmit
```

Expected: clean.

### Task A.5 — Bigger red indicator + static equilibrium tick (item 2)

**Files:**
- Modify: `src/labs/mass-measurement/instruments/LeverBalance.tsx`

- [ ] **Step 1: Find and resize the existing red cone arrow**

Find this block (around line 258–262):

```tsx
        {/* Indicator arrow (red cone pointing down from beam center) */}
        <mesh position={[0, -BEAM_T / 2 - 0.05, 0]}>
          <coneGeometry args={[0.006, 0.07, 4]} />
          <meshStandardMaterial color="#ff3b30" emissive="#ff3b30" emissiveIntensity={0.4} />
        </mesh>
```

Replace with:

```tsx
        {/* Indicator arrow — large red cone pointing down from beam center.
            Rotates with the beam; alignment with the static tick on the
            column below indicates equilibrium. */}
        <mesh position={[0, -BEAM_T / 2 - 0.075, 0]}>
          <coneGeometry args={[0.010, 0.110, 4]} />
          <meshStandardMaterial color="#ff3b30" emissive="#ff3b30" emissiveIntensity={0.6} />
        </mesh>
```

Cone size 6 × 70 mm → 10 × 110 mm. Position offset adjusted so the cone's tip stays clear of the beam.

- [ ] **Step 2: Add the static equilibrium tick on the column**

The column currently lives OUTSIDE the rotating beam group. Find the column block (the `<RoundedBox args={[COL_W, COL_H, COL_W]} ...>`) — it sits at lever-local y = `BASE_H + COL_H / 2`.

Immediately AFTER the column's `</RoundedBox>`, add a small static tick:

```tsx
      {/* Static equilibrium reference tick — when the beam is level, the
          red cone above aligns with this white tick on the column. */}
      <mesh position={[0, PIVOT_HEIGHT_LOCAL - 0.06, COL_W / 2 + 0.001]}>
        <boxGeometry args={[0.003, 0.030, 0.003]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} />
      </mesh>
```

Position decoded:
- x = 0 (centered on the column)
- y = `PIVOT_HEIGHT_LOCAL - 0.06` (just below the pivot, inside the cone's vertical reach)
- z = `COL_W / 2 + 0.001` (front face of the column, +1 mm so it doesn't z-fight)

Geometry: 3 mm × 30 mm × 3 mm vertical pill, white emissive.

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit
```

Expected: clean.

### Task A.6 — Move blue Outlines from base to LEFT pan (item 5)

**Files:**
- Modify: `src/labs/mass-measurement/instruments/LeverBalance.tsx`

- [ ] **Step 1: Remove Outlines from base block**

Find the base block:

```tsx
      <RoundedBox args={[BASE_W, BASE_H, BASE_D]} radius={0.005} smoothness={4}
        position={[0, BASE_H / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#2a2a30" metalness={0.55} roughness={0.55} envMapIntensity={0.4} />
        {active && <Outlines thickness={3} color="#0071e3" />}
      </RoundedBox>
```

Remove `{active && <Outlines thickness={3} color="#0071e3" />}` from inside the base RoundedBox.

- [ ] **Step 2: Add conditional Outlines to the LEFT pan body**

Find the LEFT pan group (after Task A.4 it should look like):

```tsx
        {/* LEFT side — V hanger (two diagonal rods) + pan */}
        ...rod elements...
        <group position={[-BEAM_LEN / 2, -HANGER_H - PAN_DEPTH / 2, 0]}>
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[PAN_R, PAN_BOTTOM_R, PAN_DEPTH, 48]} />
            <meshStandardMaterial color="#878a92" metalness={0.65} roughness={0.5} envMapIntensity={0.45} />
          </mesh>
        </group>
```

Modify the `<mesh>` inside the left pan group so the `<Outlines>` appears as a child only when the lever is active AND the left pan is empty:

```tsx
        <group position={[-BEAM_LEN / 2, -HANGER_H - PAN_DEPTH / 2, 0]}>
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[PAN_R, PAN_BOTTOM_R, PAN_DEPTH, 48]} />
            <meshStandardMaterial color="#878a92" metalness={0.65} roughness={0.5} envMapIntensity={0.45} />
            {active && leftItems.current.length === 0 && <Outlines thickness={3} color="#0a84ff" />}
          </mesh>
        </group>
```

`leftItems` is the existing `useRef<RapierRigidBody[]>` already declared in the component. Reading `leftItems.current.length` inside the JSX is safe (it re-renders when `recompute()` updates state, which happens whenever items are added/removed).

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit
```

Expected: clean.

### Task A.7 — Slice A verification + commit

- [ ] **Step 1: Full verification**

```bash
npx tsc --noEmit
npx vitest run | tail -3
npm run build 2>&1 | tail -3
```

Expected: typecheck clean, 58/58 tests pass, build succeeds.

- [ ] **Step 2: Commit slice A**

```bash
git add src/labs/mass-measurement/objects/Weights.tsx \
        src/labs/mass-measurement/instruments/LeverBalance.tsx \
        src/labs/mass-measurement/scene/LabScene.tsx \
        tests/lab/weights.test.ts
git commit -m "feat(slice-A): visual fixes + complete weight set (items 1, 2, 5, 8)

- Item 1: removed chrome torus rim rings on the lever pans (PAN_RIM_TUBE
  constant + two torusGeometry meshes deleted) — pans now read as solid
  metal dishes.
- Item 2: red indicator cone resized 6x70 mm → 10x110 mm with emissive
  intensity 0.4 → 0.6; added a 3x30 mm white emissive equilibrium tick
  on the front face of the column just below the pivot, providing a
  static reference for level.
- Item 5: blue <Outlines> moved from the base block (where the user
  never drops anything) to the LEFT pan body, conditional on the
  lever-balance task being active AND the pan still being empty.
- Item 8: extended weight inventory from 7 to 11 entries (added second
  20 g, plus 5 g, 2 g, 1 g) with unique tag fields so duplicate masses
  get distinct bodyIds. Spacing reduced 0.13 → 0.085 m. Now ping-pong
  (5 g), baseball (145 g) and metal ball (250 g) can each be balanced
  exactly. Five new vitest cases lock in the invariant."
```

---

## Slice B — Analog dial with graduations + needle (item 3)

### Task B.1 — Rewrite dialTexture for graduated 0–5 N scale

**Files:**
- Modify: `src/labs/mass-measurement/textures/dialTexture.ts`

- [ ] **Step 1: Replace the file's body**

Replace the entire content of `src/labs/mass-measurement/textures/dialTexture.ts` with:

```ts
import { CanvasTexture } from 'three'

const W = 128
const H = 512

/**
 * Draws an analog dynamometer scale plate (0 N at the top, 5 N at the bottom).
 * Major graduations every 1 N (with numeric label), medium every 0.5 N,
 * minor every 0.1 N. The needle is a separate 3D mesh in Dynamometer.tsx —
 * this texture only renders the static scale.
 *
 * Layout (canvas-px coordinates, 128×512):
 *   y = 40   → 0 N   (top of usable scale)
 *   y = 472  → 5 N   (bottom of usable scale)
 *   ticks anchored on the LEFT side, labels to their right.
 */
export function createDialTexture(): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  // Off-white plate background
  ctx.fillStyle = '#f5f5f7'
  ctx.fillRect(0, 0, W, H)
  ctx.strokeStyle = '#c8c8d0'
  ctx.lineWidth = 2
  ctx.strokeRect(2, 2, W - 4, H - 4)

  // Title band at the very top
  ctx.fillStyle = '#1d1d1f'
  ctx.font = 'bold 22px "SF Pro Display", "Inter", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('N', W / 2, 22)

  // Scale geometry
  const TOP = 40
  const BOTTOM = 472
  const SPAN = BOTTOM - TOP  // 432 px for 5 N
  const yForN = (n: number) => TOP + (n / 5) * SPAN

  // Minor ticks every 0.1 N
  ctx.fillStyle = '#3a3a40'
  for (let n10 = 0; n10 <= 50; n10++) {
    if (n10 % 5 === 0) continue // skip — major/medium drawn below
    const y = yForN(n10 / 10)
    ctx.fillRect(28, y - 0.5, 8, 1)
  }

  // Medium ticks every 0.5 N (skipping integer marks)
  for (let n2 = 1; n2 <= 9; n2 += 2) {
    const y = yForN(n2 / 2)
    ctx.fillRect(24, y - 1, 14, 2)
  }

  // Major ticks every 1 N + numeric label
  ctx.font = 'bold 28px "SF Pro Display", "Inter", sans-serif'
  ctx.textAlign = 'left'
  for (let i = 0; i <= 5; i++) {
    const y = yForN(i)
    ctx.fillStyle = '#1d1d1f'
    ctx.fillRect(20, y - 1.5, 22, 3)
    ctx.fillText(`${i}`, 56, y)
  }

  return new CanvasTexture(canvas)
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

Expected: clean.

### Task B.2 — Add red needle mesh in Dynamometer

**Files:**
- Modify: `src/labs/mass-measurement/instruments/Dynamometer.tsx`

- [ ] **Step 1: Locate the scale-plate mesh**

Find this block (it's the LAST mesh inside `<group position={position}>`):

```tsx
      {/* Scale plate (procedural 0-5 N dial) */}
      <mesh position={[-0.04, STAND_H * 0.6, 0]}>
        <planeGeometry args={[0.06, 0.24]} />
        <meshBasicMaterial map={scaleTexture} />
      </mesh>
```

The scale plate is a 0.06 m × 0.24 m plane centred at `(-0.04, STAND_H * 0.6, 0)`. So its top edge is at y = `STAND_H * 0.6 + 0.12` and its bottom edge at y = `STAND_H * 0.6 - 0.12`. With `STAND_H = 0.4`, the top is at y = 0.36 and bottom at y = 0.12. The needle should slide between these as the hook moves between `HOOK_REST_Y = 0.2` (= 0 N) and `HOOK_REST_Y - 5/SPRING_K = 0.2 - 0.1 = 0.1` (= 5 N).

Note: `SPRING_K = 50` → `F / SPRING_K = N / 50` metres of extension. Force range 0…5 N → extension 0…0.10 m. So the hook moves from y = 0.20 (no load) to y = 0.10 (5 N load). The needle should track this directly: needle y = `hookY` is correct because hookY linearly maps 0…5 N to 0.20…0.10.

But the SCALE PLATE'S 0-N tick is at the TOP of the plate (y_plate = 0.36 in lever-local) and 5-N tick at the BOTTOM (y_plate = 0.12). Do the tick positions coincide with the hook's y range? Plate top 0.36 vs hook-at-zero 0.20 → there's a 0.16 m offset. We need to map hookY (which sits in 0.10–0.20 range as load varies 5–0 N) to the plate's tick positions (which sit in 0.12–0.36 range).

Cleanest fix: the texture's TOP-OF-SCALE corresponds to 0 N (no load), which corresponds to hookY = 0.20. The texture's BOTTOM-OF-SCALE corresponds to 5 N, hookY = 0.10. So we want needle_y = `hookY * 2.4 - 0.12` so that hookY=0.20 → needle_y=0.36 (plate top) and hookY=0.10 → needle_y=0.12 (plate bottom). Let's express this cleanly:

```ts
const SCALE_TOP_Y = 0.36
const SCALE_BOTTOM_Y = 0.12
const HOOK_AT_ZERO_N = 0.20
const HOOK_AT_FIVE_N = 0.10
const needleY = SCALE_TOP_Y + (hookY - HOOK_AT_ZERO_N) * (SCALE_BOTTOM_Y - SCALE_TOP_Y) / (HOOK_AT_FIVE_N - HOOK_AT_ZERO_N)
// simplifies to: needleY = SCALE_TOP_Y + (HOOK_AT_ZERO_N - hookY) * 2.4
```

- [ ] **Step 2: Add the needle mesh after the scale plate**

After the scale-plate `<mesh>...</mesh>` block, add:

```tsx
      {/* Red needle pointing horizontally from the scale plate to the spring.
          Slides up/down with the hook. Student reads the value where the
          needle aligns with a graduation. */}
      <mesh
        position={[
          -0.04 + 0.04,  // needle's tip lines up with the right edge of the scale plate
          (() => {
            const SCALE_TOP_Y = 0.36
            const SCALE_BOTTOM_Y = 0.12
            const HOOK_AT_ZERO_N = 0.20
            return SCALE_TOP_Y + (HOOK_AT_ZERO_N - hookY) * (SCALE_BOTTOM_Y - SCALE_TOP_Y) / (0.10 - HOOK_AT_ZERO_N)
          })(),
          0.001,  // just in front of the scale plate
        ]}
        rotation={[0, 0, -Math.PI / 2]}
      >
        <coneGeometry args={[0.005, 0.024, 3]} />
        <meshStandardMaterial color="#ff3b30" emissive="#ff3b30" emissiveIntensity={0.7} />
      </mesh>
```

The cone is rotated -90° around Z so its apex points to the RIGHT (into the scale plate). The base of the cone (24 mm long) extends to the left. This produces a horizontal red triangle whose tip indicates the current value.

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit
npm run build 2>&1 | tail -3
```

Expected: typecheck clean, build succeeds.

### Task B.3 — Slice B verification + commit

- [ ] **Step 1: Full verification**

```bash
npx tsc --noEmit
npx vitest run | tail -3
```

Expected: typecheck clean, 58/58 tests pass.

- [ ] **Step 2: Commit slice B**

```bash
git add src/labs/mass-measurement/textures/dialTexture.ts \
        src/labs/mass-measurement/instruments/Dynamometer.tsx
git commit -m "feat(slice-B): analog dynamometer dial + needle (item 3)

dialTexture.ts rewritten with explicit 128x512 layout: major graduations
every 1 N (with bold numeric label 0..5), medium every 0.5 N, minor every
0.1 N. Title 'N' in a band at the top.

Dynamometer.tsx adds a horizontal red triangular needle whose tip aligns
with the current value on the scale. Position computed each frame from
the hook's y (which already reflects spring extension under load), so
the needle moves smoothly with the spring-damper oscillation.

Student reads off the value visually instead of relying on the digital
HUD reading."
```

---

## Slice C — Object tray (item 4)

### Task C.1 — Create ObjectTray component

**Files:**
- Create: `src/labs/mass-measurement/scene/ObjectTray.tsx`

- [ ] **Step 1: Write the new component**

`src/labs/mass-measurement/scene/ObjectTray.tsx`:

```tsx
import { RigidBody, CuboidCollider } from '@react-three/rapier'

const TRAY_W = 0.85
const TRAY_D = 0.20
const TRAY_H = 0.025

const INDENTATION_DEPTH = 0.012

/**
 * Three indentations along the tray's centre line (one per ball type).
 * Positions are tray-local (origin at the tray's centre).
 */
const INDENTATIONS: { x: number; radius: number }[] = [
  { x: -0.30, radius: 0.05  },  // ping-pong (radius 0.04)
  { x:  0.00, radius: 0.055 },  // metal ball (radius 0.045)
  { x:  0.30, radius: 0.085 },  // baseball  (radius 0.075)
]

type Props = { position: [number, number, number] }

/**
 * Wooden tray with three round indentations — visual home for the three
 * lab objects. Single fixed cuboid collider; the indentations are visual
 * recesses only (Rapier doesn't support concave colliders cheaply, and
 * for the lab's pedagogy a flat collider that the balls rest on is fine).
 */
export function ObjectTray({ position }: Props) {
  return (
    <RigidBody type="fixed" colliders={false} position={position}>
      {/* Solid collider for the tray slab */}
      <CuboidCollider args={[TRAY_W / 2, TRAY_H / 2, TRAY_D / 2]} />

      {/* Tray slab body */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[TRAY_W, TRAY_H, TRAY_D]} />
        <meshStandardMaterial color="#2a1c10" roughness={0.7} envMapIntensity={0.25} />
      </mesh>

      {/* Visual indentations — disc darker than the tray top, sitting just
          above the tray top surface so they're visible without z-fighting. */}
      {INDENTATIONS.map((it, i) => (
        <mesh
          key={i}
          position={[it.x, TRAY_H / 2 - INDENTATION_DEPTH / 2 + 0.0005, 0]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[it.radius * 0.7, it.radius, 32]} />
          <meshStandardMaterial color="#1a0e06" roughness={0.85} envMapIntensity={0.15} side={2} />
        </mesh>
      ))}
    </RigidBody>
  )
}
```

- [ ] **Step 2: Verify standalone build**

```bash
npx tsc --noEmit
```

Expected: clean.

### Task C.2 — Mount tray + reposition balls in LabScene

**Files:**
- Modify: `src/labs/mass-measurement/scene/LabScene.tsx`

- [ ] **Step 1: Add the import**

Near the top of the file, alongside the other scene imports, add:

```tsx
import { ObjectTray } from './ObjectTray'
```

- [ ] **Step 2: Mount the tray and update ball spawn positions**

Find the three ball entries:

```tsx
          <TennisBall position={[-0.3, 0.93, 0.35]} ... />
          <Apple      position={[ 0,   0.93, 0.35]} ... />
          <Baseball   position={[ 0.3, 0.97, 0.35]} ... />
```

Replace them (and add the tray BEFORE the balls so it's already settled when balls spawn) with:

```tsx
          {/* Wooden tray sits on the table at z = 0.40 (slightly forward of
              the previous ball-row z = 0.35) with its top surface at
              y = 0.85 + 0.025 = 0.875. Balls spawn just above the tray's
              top surface (each ball's centre = tray top + ball radius). */}
          <ObjectTray position={[0, 0.85 + 0.025 / 2, 0.40]} />
          <TennisBall position={[-0.30, 0.875 + 0.040 + 0.005, 0.40]} enabled={activeObjectId === 'tennis-ball'} />
          <Apple      position={[ 0.00, 0.875 + 0.045 + 0.005, 0.40]} enabled={activeObjectId === 'apple'} />
          <Baseball   position={[ 0.30, 0.875 + 0.075 + 0.005, 0.40]} enabled={activeObjectId === 'baseball'} />
```

The `+ 0.005` is a 5 mm float so balls don't z-fight with the tray on first physics step — they settle naturally onto the indentations within a frame.

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit
npx vitest run | tail -3
npm run build 2>&1 | tail -3
```

Expected: typecheck clean, 58/58 tests pass, build succeeds.

### Task C.3 — Slice C commit

- [ ] **Step 1: Commit**

```bash
git add src/labs/mass-measurement/scene/ObjectTray.tsx \
        src/labs/mass-measurement/scene/LabScene.tsx
git commit -m "feat(slice-C): wooden object tray with three indentations (item 4)

New ObjectTray component (0.85 x 0.025 x 0.20 m) with a single fixed
cuboid collider and three visual ring indentations sized to each ball:
ping-pong (R 0.05), metal ball (R 0.055), baseball (R 0.085).

The indentations are render-only ringGeometry meshes (Rapier concave
colliders are expensive and unnecessary here — the balls rest on the
flat tray top with normal physics; the rings just signal where each
object 'lives' visually).

Material: dark walnut #2a1c10, roughness 0.7. Reads as part of the
table family without competing with the polished metal of the
instruments."
```

---

## Slice D — Mobile responsive HUD (item 6)

### Task D.1 — useViewport hook

**Files:**
- Create: `src/sdk/a11y/useViewport.ts`

- [ ] **Step 1: Write the hook**

`src/sdk/a11y/useViewport.ts`:

```ts
import { useEffect, useState } from 'react'

export type Breakpoint = 'desktop' | 'tablet' | 'phone'

/**
 * Reactive viewport size + named breakpoint.
 *
 *   desktop : ≥ 900 px wide
 *   tablet  : 600..899 px (also matches phones in landscape)
 *   phone   : < 600 px (phones in portrait)
 *
 * Listens to window resize. Server-safe (returns sane defaults when
 * window is undefined, e.g. during SSR/test rendering).
 */
export function useViewport(): { width: number; height: number; breakpoint: Breakpoint } {
  const [size, setSize] = useState(() => readViewport())

  useEffect(() => {
    if (typeof window === 'undefined') return
    const onResize = () => setSize(readViewport())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return size
}

function readViewport(): { width: number; height: number; breakpoint: Breakpoint } {
  if (typeof window === 'undefined') {
    return { width: 1280, height: 800, breakpoint: 'desktop' }
  }
  const width = window.innerWidth
  const height = window.innerHeight
  const breakpoint: Breakpoint =
    width >= 900 ? 'desktop' :
    width >= 600 ? 'tablet'  :
    'phone'
  return { width, height, breakpoint }
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

Expected: clean.

### Task D.2 — HUD layouts per breakpoint

**Files:**
- Modify: `src/labs/mass-measurement/ui/HUD.tsx`

- [ ] **Step 1: Read the current HUD**

```bash
wc -l src/labs/mass-measurement/ui/HUD.tsx
```

The file is ~250 lines with three fixed-position panels and an input bar. We'll keep all the data wiring identical — only the OUTER position/dimensions of each panel change per breakpoint.

- [ ] **Step 2: Add the import**

Near the top of `HUD.tsx`:

```tsx
import { useViewport } from '../../../sdk/a11y/useViewport'
```

- [ ] **Step 3: Read breakpoint inside the component**

Inside the `HUD()` function, near the other hook calls, add:

```tsx
  const { breakpoint } = useViewport()
```

- [ ] **Step 4: Compute panel styles per breakpoint**

After the existing `let liveLabel = '' ...; if (current.instrumentId === ...) {...}` block, add a layout-decision block:

```tsx
  // Layout per breakpoint — only the outer position/sizing differs.
  const layout = (() => {
    if (breakpoint === 'phone') {
      return {
        // Top pill stays small at top-centre.
        topPill: { top: 8, padding: '6px 14px', fontSize: 12 } as const,
        // Task panel becomes a bottom drawer (above the input bar).
        taskPanel: {
          left: 8, right: 8, bottom: 96, top: undefined,
          width: 'auto', maxHeight: '40vh', padding: 14,
        } as const,
        // Journal moves above the task panel as a compact strip — only the group headers visible.
        journalPanel: {
          left: 8, right: 8, bottom: undefined, top: 56,
          width: 'auto', maxHeight: 120, padding: 10, fontSize: 12,
        } as const,
        // Input bar pinned to the bottom edge.
        inputBar: { left: 8, right: 8, bottom: 8, padding: '10px 14px' } as const,
      }
    }
    if (breakpoint === 'tablet') {
      return {
        topPill: { top: 12, padding: '8px 18px', fontSize: 13 } as const,
        taskPanel: {
          top: 64, left: 12, width: 320, padding: 16, bottom: undefined, right: undefined, maxHeight: undefined,
        } as const,
        journalPanel: {
          top: 64, right: 12, width: 280, padding: 14, bottom: undefined, left: undefined, maxHeight: '60vh',
        } as const,
        inputBar: { left: '50%', right: undefined, bottom: 12, padding: '12px 20px' } as const,
      }
    }
    // desktop (default)
    return {
      topPill: { top: 16, padding: '8px 20px', fontSize: 13 } as const,
      taskPanel: {
        top: 80, left: 16, width: 360, padding: 20, bottom: undefined, right: undefined, maxHeight: undefined,
      } as const,
      journalPanel: {
        top: 80, right: 16, width: 320, padding: 16, bottom: undefined, left: undefined, maxHeight: '70vh',
      } as const,
      inputBar: { left: '50%', right: undefined, bottom: 16, padding: '14px 24px' } as const,
    }
  })()
```

- [ ] **Step 5: Replace the three panel `style` objects with merged layout values**

Find the top pill panel:

```tsx
      <GlassPanel
        variant="strong"
        style={{
          position: 'fixed', top: 16, left: '50%',
          transform: 'translateX(-50%)',
          padding: '8px 20px', borderRadius: 100,
          fontSize: 13, fontWeight: 500,
          zIndex: 10,
          color: '#1d1d1f',
        }}
      >
```

Replace with:

```tsx
      <GlassPanel
        variant="strong"
        style={{
          position: 'fixed', left: '50%',
          transform: 'translateX(-50%)',
          borderRadius: 100,
          fontWeight: 500,
          zIndex: 10,
          color: '#1d1d1f',
          ...layout.topPill,
        }}
      >
```

Find the task panel `<GlassPanel variant="strong" ... position: 'fixed', top: 80, left: 16, width: 360, padding: 20 ...>` and replace with merged layout:

```tsx
      <GlassPanel
        variant="strong"
        role="region"
        aria-labelledby="hud-current-task-label"
        style={{
          position: 'fixed', zIndex: 10, color: '#1d1d1f',
          overflow: 'auto',
          ...layout.taskPanel,
        }}
      >
```

Find the journal panel `<GlassPanel variant="strong" ... position: 'fixed', top: 80, right: 16, width: 320, padding: 16, maxHeight: '70vh', overflow: 'auto' ...>` and replace with:

```tsx
      <GlassPanel
        variant="strong"
        role="region"
        aria-labelledby="hud-journal-label"
        style={{
          position: 'fixed', zIndex: 10, color: '#1d1d1f', overflow: 'auto',
          ...layout.journalPanel,
        }}
      >
```

Find the input-bar panel `<GlassPanel variant="strong" ... position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)', padding: '14px 24px' ...>` and replace with:

```tsx
      <GlassPanel
        variant="strong"
        style={{
          position: 'fixed', transform: layout.inputBar.left === '50%' ? 'translateX(-50%)' : undefined,
          zIndex: 10, color: '#1d1d1f',
          ...layout.inputBar,
        }}
      >
```

- [ ] **Step 6: Verify**

```bash
npx tsc --noEmit
npx vitest run | tail -3
npm run build 2>&1 | tail -3
```

Expected: typecheck clean, 58/58 tests pass, build succeeds.

### Task D.3 — Manual smoke test

- [ ] **Step 1: Run dev server and resize browser**

```bash
npm run dev
```

Open `http://localhost:5173/` in a browser. Use DevTools device-emulation:

- iPhone SE (375×667 portrait) — phone breakpoint
- iPad (768×1024 portrait) — tablet breakpoint
- 1440×900 desktop

Verify in each:
- All three panels remain reachable (top-task, journal, input).
- Glass treatment + accents survive the layout change.
- Touch targets ≥ 44×44 px.

- [ ] **Step 2: Stop the dev server (Ctrl+C)**

### Task D.4 — Slice D commit

```bash
git add src/sdk/a11y/useViewport.ts src/labs/mass-measurement/ui/HUD.tsx
git commit -m "feat(slice-D): mobile-responsive HUD (item 6)

useViewport hook returns { width, height, breakpoint } where breakpoint
is 'desktop' (>= 900px), 'tablet' (600-899px) or 'phone' (< 600px).
Listens to window resize.

HUD reads the breakpoint and switches between three layouts:
- desktop: existing layout (top-left task, top-right journal, bottom
  centre input).
- tablet: narrower panels (320 / 280 px) at top-left/right.
- phone: top-pinned compact journal strip, bottom drawer for the
  current task, input bar at the bottom edge.

The data sources (useLabState, useReadings, useStepEngine, TASK_STEPS)
are identical across breakpoints — only outer style props change."
```

---

## Slice E — Collapsible HUD panels (item 7)

### Task E.1 — CollapsibleGlassPanel component

**Files:**
- Create: `src/sdk/ui/CollapsibleGlassPanel.tsx`

- [ ] **Step 1: Write the wrapper component**

`src/sdk/ui/CollapsibleGlassPanel.tsx`:

```tsx
import { CSSProperties, ReactNode, useEffect, useState } from 'react'
import { GlassPanel } from './GlassPanel'

type Props = {
  /** Stable id used to persist collapsed state to localStorage. */
  storageKey: string
  /** Short label shown on the collapsed pill (sr-only when an icon is given). */
  label: string
  /** Optional icon shown on the collapsed pill. Defaults to '⊟'. */
  collapsedIcon?: string
  /** Default collapsed state on first mount (overridden by localStorage). */
  defaultCollapsed?: boolean
  /** Outer panel style (when expanded). */
  style?: CSSProperties
  /** Inline style for the collapsed pill — override position to keep it
   *  in the same corner as the expanded panel. */
  collapsedStyle?: CSSProperties
  /** ARIA region label id (the element with this id labels the panel). */
  'aria-labelledby'?: string
  children: ReactNode
}

/**
 * GlassPanel wrapper with a collapse-to-pill button in the top-right corner.
 *
 *   ┌──────────────────────┐               ⊟ (small pill)
 *   │  panel content...    │   ─click─►    or expand again with one click
 *   │  ...                 │
 *   └──────────────────────┘
 *
 * Collapsed state persists to localStorage under `lab.collapse.<storageKey>`.
 */
export function CollapsibleGlassPanel({
  storageKey,
  label,
  collapsedIcon = '⊟',
  defaultCollapsed = false,
  style,
  collapsedStyle,
  children,
  'aria-labelledby': ariaLabelledBy,
}: Props) {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof localStorage === 'undefined') return defaultCollapsed
    const raw = localStorage.getItem(`lab.collapse.${storageKey}`)
    if (raw === '1') return true
    if (raw === '0') return false
    return defaultCollapsed
  })

  useEffect(() => {
    if (typeof localStorage === 'undefined') return
    try { localStorage.setItem(`lab.collapse.${storageKey}`, collapsed ? '1' : '0') } catch {}
  }, [collapsed, storageKey])

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        aria-label={`Розгорнути ${label}`}
        title={`Розгорнути ${label}`}
        style={{
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(60px) saturate(200%)',
          border: '1px solid rgba(255,255,255,0.25)',
          color: '#1d1d1f',
          borderRadius: 100,
          width: 44,
          height: 44,
          fontSize: 18,
          cursor: 'pointer',
          position: 'fixed',
          zIndex: 10,
          ...collapsedStyle,
        }}
      >
        <span aria-hidden="true">{collapsedIcon}</span>
        <span className="sr-only">{label}</span>
      </button>
    )
  }

  return (
    <GlassPanel
      variant="strong"
      role="region"
      aria-labelledby={ariaLabelledBy}
      style={{
        position: 'fixed',
        zIndex: 10,
        color: '#1d1d1f',
        ...style,
      }}
    >
      <button
        onClick={() => setCollapsed(true)}
        aria-label={`Згорнути ${label}`}
        title={`Згорнути ${label}`}
        style={{
          position: 'absolute',
          top: 8, right: 8,
          background: 'transparent',
          border: 'none',
          color: '#6e6e73',
          fontSize: 16,
          width: 32, height: 32,
          cursor: 'pointer',
          borderRadius: 8,
        }}
      >
        ‹‹
      </button>
      {children}
    </GlassPanel>
  )
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

Expected: clean.

### Task E.2 — Wire collapsible into HUD's two main panels

**Files:**
- Modify: `src/labs/mass-measurement/ui/HUD.tsx`

- [ ] **Step 1: Add the import**

```tsx
import { CollapsibleGlassPanel } from '../../../sdk/ui/CollapsibleGlassPanel'
```

- [ ] **Step 2: Replace the task panel `<GlassPanel>` with `<CollapsibleGlassPanel>`**

Find the task panel (around line 105 after slice D's edits):

```tsx
      <GlassPanel
        variant="strong"
        role="region"
        aria-labelledby="hud-current-task-label"
        style={{
          position: 'fixed', zIndex: 10, color: '#1d1d1f',
          overflow: 'auto',
          ...layout.taskPanel,
        }}
      >
```

Replace with:

```tsx
      <CollapsibleGlassPanel
        storageKey="task-panel"
        label="панель завдання"
        defaultCollapsed={breakpoint === 'phone'}
        aria-labelledby="hud-current-task-label"
        style={{ overflow: 'auto', ...layout.taskPanel }}
        collapsedStyle={{ top: layout.taskPanel.top ?? 64, left: 8 }}
      >
```

The matching closing tag stays as `</GlassPanel>` BUT must be renamed to `</CollapsibleGlassPanel>`. Use Edit to rename the closing tag in this region.

- [ ] **Step 3: Replace the journal panel similarly**

Find:

```tsx
      <GlassPanel
        variant="strong"
        role="region"
        aria-labelledby="hud-journal-label"
        style={{
          position: 'fixed', zIndex: 10, color: '#1d1d1f', overflow: 'auto',
          ...layout.journalPanel,
        }}
      >
```

Replace with:

```tsx
      <CollapsibleGlassPanel
        storageKey="journal-panel"
        label="журнал"
        defaultCollapsed={breakpoint === 'phone'}
        aria-labelledby="hud-journal-label"
        style={{ overflow: 'auto', ...layout.journalPanel }}
        collapsedStyle={{ top: layout.journalPanel.top ?? 64, right: 8 }}
      >
```

Rename the matching closing `</GlassPanel>` to `</CollapsibleGlassPanel>`.

- [ ] **Step 4: Top pill and input bar STAY as plain `<GlassPanel>`**

These are too small / too essential to collapse — leave them.

- [ ] **Step 5: Verify**

```bash
npx tsc --noEmit
npx vitest run | tail -3
npm run build 2>&1 | tail -3
```

Expected: typecheck clean, 58/58 tests pass, build succeeds.

### Task E.3 — Manual smoke test

- [ ] **Step 1: Run dev server**

```bash
npm run dev
```

In the browser:
- Click the `‹‹` button on the task panel — panel should disappear, replaced by a small `⊟` pill in the same corner.
- Click the pill — panel re-expands.
- Reload the page — collapsed state persists.
- Repeat for the journal panel.
- On phone breakpoint (DevTools 375 px wide): both panels start collapsed.

- [ ] **Step 2: Stop dev server (Ctrl+C)**

### Task E.4 — Slice E commit

```bash
git add src/sdk/ui/CollapsibleGlassPanel.tsx \
        src/labs/mass-measurement/ui/HUD.tsx
git commit -m "feat(slice-E): collapsible HUD panels (item 7)

CollapsibleGlassPanel SDK component wraps GlassPanel with a small
'<<' button in the top-right corner. Click collapses the panel into
a 44x44 pill (with an icon and an sr-only label) in the same corner;
click the pill expands again. State persists to localStorage under
'lab.collapse.<storageKey>'.

HUD's two main panels (task panel + journal panel) opt in. Default
collapsed=true on phone breakpoint so the 3D scene is unobstructed
on small screens. Top pill and input bar stay as plain GlassPanel
(too small / too essential to collapse)."
```

---

## Final verification + push

### Task F.1 — Whole-suite verification

- [ ] **Step 1**

```bash
npx tsc --noEmit
npx vitest run | tail -3
npm run build 2>&1 | tail -3
```

Expected: typecheck clean, 58/58 tests pass, build succeeds.

- [ ] **Step 2: Push all five slices**

```bash
git push origin master
```

GitHub Actions CI will run typecheck + tests + build on the push. Vercel will auto-deploy. After ~1 minute the live URL https://science-lab-phi.vercel.app/ reflects v0.1.1.

### Task F.2 — Tag v0.1.1 + GitHub release notes

```bash
git tag -a v0.1.1 -m "v0.1.1 — Polish pass

Eight user-driven refinements:
1. Removed chrome torus rims on lever-balance pans
2. Bigger red indicator + static equilibrium tick on the column
3. Analog dynamometer dial with 0–5 N graduations + red needle
4. Wooden tray with three indentations for the balls
5. Blue Outlines on lever balance moved from base to active LEFT pan
6. Mobile-responsive HUD (desktop / tablet / phone breakpoints)
7. Collapsible HUD panels (collapse-to-pill, localStorage persisted)
8. Complete weight set (11 weights) so 5 g, 145 g, 250 g balance exactly

53 → 58 tests. Spec: docs/superpowers/specs/2026-05-10-polish-pass-v0.1.1-design.md"

git push origin v0.1.1
```

---

## Self-review

**Spec coverage:**
- Item 1 (remove rims) → Task A.4 ✓
- Item 2 (bigger indicator + tick) → Task A.5 ✓
- Item 3 (analog dial + needle) → Tasks B.1, B.2 ✓
- Item 4 (tray) → Tasks C.1, C.2 ✓
- Item 5 (move Outlines) → Task A.6 ✓
- Item 6 (mobile responsive) → Tasks D.1, D.2 ✓
- Item 7 (collapsible panels) → Tasks E.1, E.2 ✓
- Item 8 (full weight set) → Tasks A.1, A.2, A.3 ✓

**Placeholder scan:** every task has concrete file paths, code, and commands. No "TBD" / "implement later" / "similar to Task N".

**Type consistency:** the `WEIGHTS` array in Task A.2 has a new `tag` field; Task A.2 step 2 uses `w.tag` for both `key` and `bodyId`, consistent. `CollapsibleGlassPanel` props in E.1 match its usage in E.2 (storageKey, label, defaultCollapsed, style, collapsedStyle, aria-labelledby). `useViewport`'s return shape (D.1) matches its consumer (D.2 step 3 destructures `breakpoint`).

**One ambiguity flagged inline:** Task B.2 step 2 contains a small math derivation embedded in the JSX as an IIFE; an alternative is to extract a helper `needleY = needleYForHook(hookY)` for clarity. Either approach is acceptable; the IIFE version keeps the change to a single file.

No fixes needed.
