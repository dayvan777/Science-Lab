# Dynamometer Mechanical Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dynamometer's abstract floating-cone needle with a rigidly-attached mechanical pointer, add a dual-range scale (0–1 N + 0–5 N) on a single backplate, and bump the device height by 1.5×. Final visual revision on the mass-measurement lab.

**Architecture:** Pure visual edits to a single instrument and its texture file. Geometry constants in `Dynamometer.tsx` are scaled and reorganised; the cone-needle is replaced by a `<group>` whose y-position tracks the existing `hookY` state — horizontal arm + red triangle tip + vertical rod down to the hook. `dialTexture.ts` is rewritten to render two scale strips on one canvas. `TARGET_POSITIONS['dynamometer-hook']` and the `focus-dyn` camera preset get small numeric updates for the new world y. Spring physics and step-engine contracts are untouched.

**Tech Stack:** React 19 + TypeScript 6, R3F + drei, Three.js (TubeGeometry/CatmullRom for the spring, MathUtils.clamp), Rapier (kinematic hook body). No new dependencies.

**Spec:** `docs/superpowers/specs/2026-05-10-dynamometer-mechanical-redesign-design.md`

---

## File map

```
MODIFIED
  src/labs/mass-measurement/textures/dialTexture.ts       (full rewrite — task 1)
  src/labs/mass-measurement/instruments/Dynamometer.tsx   (full rewrite — task 2)
  src/sdk/guided/GuidedOverlay.tsx                         (one-line update to TARGET_POSITIONS — task 3)
  src/sdk/scene/CameraRig.tsx                              (numerical nudge if needed — task 4, conditional)
```

No new files. No new tests.

## Verification commands

```bash
npx tsc --noEmit                    # must be clean
npx vitest run                      # 183 tests, must remain 183
npm run build                       # must succeed
```

---

## Task 1 — Rewrite dialTexture.ts for the dual scale

**Files:**
- Modify (full rewrite): `src/labs/mass-measurement/textures/dialTexture.ts`

The current texture renders a single 0–5 N column on a 128×512 canvas. The new texture renders TWO columns on a 256×512 canvas — left column 0–1 N (fine), right column 0–5 N (coarse). Both columns span the full vertical scale-zone (y = 40..472 px), so the same physical pointer y maps to a value on both columns.

- [ ] **Step 1: Replace the entire file content**

Replace the entire content of `src/labs/mass-measurement/textures/dialTexture.ts` with:

```ts
import { CanvasTexture } from 'three'

const W = 256
const H = 512

/**
 * Draws an analog dynamometer scale plate with TWO scale strips on one
 * canvas: left = 0–1 N (fine resolution), right = 0–5 N (coarse). Both
 * strips share the same vertical y-mapping so a physical pointer at any
 * height reads a value on both strips simultaneously.
 *
 * Layout (canvas-px coordinates, 256×512):
 *   y =  40  → "0" on both strips
 *   y = 472  → "1" on left, "5" on right
 *   x ∈ [0, 128] → left strip
 *   x ∈ [128, 256] → right strip
 *   ticks are anchored at the BLOCK's left edge (left strip's at x=0,
 *   right strip's at x=128); labels render to the right of their ticks.
 *
 * Real ranges:
 *   Left  fine scale: minor 0.05 N, medium 0.1 N, major 0.5 N (labels 0 / 0.5 / 1)
 *   Right coarse scale: minor 0.1 N, medium 0.5 N, major 1 N (labels 0…5)
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

  // Vertical separator between the two strips
  ctx.fillStyle = '#c8c8d0'
  ctx.fillRect(127, 8, 2, H - 16)

  // Title row at the top of each strip
  ctx.fillStyle = '#1d1d1f'
  ctx.font = 'bold 18px "SF Pro Display", "Inter", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('1 N', 64, 22)
  ctx.fillText('5 N', 192, 22)

  // Shared scale geometry — both strips use the same y range
  const TOP = 40
  const BOTTOM = 472
  const SPAN = BOTTOM - TOP  // 432 px
  const yForFraction = (f: number) => TOP + f * SPAN

  ctx.font = 'bold 26px "SF Pro Display", "Inter", sans-serif'
  ctx.textAlign = 'left'

  // ──────────────────────────────────────────────────────────────────
  // LEFT strip — 0 to 1 N
  // x range [0, 128]; ticks left-anchored at x=8; labels at x=44
  // ──────────────────────────────────────────────────────────────────
  // Minor ticks every 0.05 N (skipping 0.5 / 0.1 multiples drawn below)
  ctx.fillStyle = '#3a3a40'
  for (let n20 = 0; n20 <= 20; n20++) {
    if (n20 % 2 === 0) continue // 0.1-multiples handled below
    const y = yForFraction(n20 / 20)
    ctx.fillRect(8, y - 0.5, 8, 1)
  }
  // Medium ticks every 0.1 N (skipping 0.5-multiples drawn below)
  for (let n10 = 1; n10 <= 9; n10++) {
    if (n10 % 5 === 0) continue
    const y = yForFraction(n10 / 10)
    ctx.fillRect(8, y - 1, 12, 2)
  }
  // Major ticks at 0, 0.5, 1.0 with labels
  const leftLabels = ['0', '0,5', '1']
  for (let i = 0; i < 3; i++) {
    const y = yForFraction(i / 2)
    ctx.fillStyle = '#1d1d1f'
    ctx.fillRect(8, y - 1.5, 18, 3)
    ctx.fillText(leftLabels[i], 30, y)
  }

  // ──────────────────────────────────────────────────────────────────
  // RIGHT strip — 0 to 5 N
  // x range [128, 256]; ticks left-anchored at x=136; labels at x=172
  // ──────────────────────────────────────────────────────────────────
  // Minor ticks every 0.1 N (skipping 0.5-multiples)
  ctx.fillStyle = '#3a3a40'
  for (let n10 = 0; n10 <= 50; n10++) {
    if (n10 % 5 === 0) continue
    const y = yForFraction(n10 / 50)
    ctx.fillRect(136, y - 0.5, 8, 1)
  }
  // Medium ticks every 0.5 N (skipping integer marks)
  for (let n2 = 1; n2 <= 9; n2 += 2) {
    const y = yForFraction(n2 / 10)
    ctx.fillRect(136, y - 1, 12, 2)
  }
  // Major ticks at 0..5 N with labels
  for (let i = 0; i <= 5; i++) {
    const y = yForFraction(i / 5)
    ctx.fillStyle = '#1d1d1f'
    ctx.fillRect(136, y - 1.5, 18, 3)
    ctx.fillText(`${i}`, 158, y)
  }

  return new CanvasTexture(canvas)
}
```

- [ ] **Step 2: Verify**

Run:

```bash
npx tsc --noEmit
```

Expected: clean (no TS errors).

---

## Task 2 — Rewrite Dynamometer.tsx with mechanical pointer + new geometry

**Files:**
- Modify (full rewrite): `src/labs/mass-measurement/instruments/Dynamometer.tsx`

This is the body of the work. Geometry constants are scaled, the JSX is restructured: scale plate is now a wider backplate (the plane that hosts the new dual-scale texture); the floating cone needle is REPLACED by a `<group>` containing a horizontal arm + red triangle tip + thin rod, all moving with `hookY`. The hook itself ends up below the backplate, connected via the rod.

- [ ] **Step 1: Replace the entire file content**

Replace the entire content of `src/labs/mass-measurement/instruments/Dynamometer.tsx` with:

```tsx
import { useRef, useState, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, RapierRigidBody } from '@react-three/rapier'
import { Vector3, TubeGeometry, CatmullRomCurve3 } from 'three'
import { registerSnap } from '../../../sdk/physics/snapTargets'
import { getBodyMass, onDragStart } from '../../../sdk/physics/bodyRegistry'
import { Outlines, RoundedBox } from '@react-three/drei'
import { useReadings } from '../state/InstrumentReadings'
import { createDialTexture } from '../textures/dialTexture'
import { springStep } from '../../../sdk/animation'

// Physics — real spring constant for force ↔ extension mapping.
// SPRING_K = 50 N/m  →  0–5 N maps to 0–10 cm of spring extension.
const G = 9.81
const SPRING_K = 50

// Visual oscillation — separate spring-damper for the hook's "wobble" feel
const VISUAL_STIFFNESS = 80
const VISUAL_DAMPING = 7

// Geometry — all in lever-local coords, in metres. Scaled +50 % vs v0.1.2
// so the dual-scale backplate has comfortable spacing and the device looks
// like a real classroom dynamometer.
const STAND_H = 0.6
const SPRING_TOP_Y = 0.55
const HOOK_REST_Y = 0.35
const HOOK_AT_FIVE_N = 0.25
const SPRING_NATURAL_LEN = SPRING_TOP_Y - HOOK_REST_Y  // 0.20 m

const SPRING_HELIX_RADIUS = 0.014
const SPRING_TUBE_RADIUS = 0.0018
const SPRING_COILS = 14

// Where the spring/scale axis sits, relative to the stand at x=0
const ARM_X_OFFSET = 0.05

// Backplate (dual-scale): exactly covers the pointer's full vertical travel
const BACKPLATE_TOP_Y = HOOK_REST_Y                 // 0.35 — aligns with "0 N"
const BACKPLATE_BOTTOM_Y = HOOK_AT_FIVE_N           // 0.25 — aligns with "1 N" / "5 N"
const BACKPLATE_HEIGHT = BACKPLATE_TOP_Y - BACKPLATE_BOTTOM_Y  // 0.10 m
const BACKPLATE_CENTER_Y = (BACKPLATE_TOP_Y + BACKPLATE_BOTTOM_Y) / 2  // 0.30
const BACKPLATE_WIDTH = 0.10
const BACKPLATE_X = ARM_X_OFFSET - 0.06             // sits 6 cm left of the spring axis

// Mechanical pointer: rigid horizontal arm hanging off the spring's bottom,
// red triangle tip on the LEFT side that sweeps the backplate.
const POINTER_ARM_LEN = 0.05
const POINTER_ARM_THICKNESS = 0.003
const POINTER_TIP_LEN = 0.014
const POINTER_TIP_RADIUS = 0.005

// Thin rigid rod from pointer down to the hook (so the hook hangs BELOW
// the backplate without being obstructed by the scale).
const ROD_BELOW_POINTER_LEN = 0.13
const ROD_RADIUS = 0.0015

type Props = { position: [number, number, number]; active?: boolean }

/**
 * Build a TubeGeometry that follows a helix curve. We construct it once at
 * the spring's natural length and then scale Y at runtime to follow the hook.
 */
function buildSpringGeometry(): TubeGeometry {
  const points: Vector3[] = []
  const SEGMENTS = 96
  const length = SPRING_NATURAL_LEN
  for (let i = 0; i <= SEGMENTS; i++) {
    const t = i / SEGMENTS
    const angle = t * SPRING_COILS * Math.PI * 2
    // y starts at +length/2 (top) and ends at -length/2 (bottom)
    const y = length / 2 - t * length
    points.push(new Vector3(
      Math.cos(angle) * SPRING_HELIX_RADIUS,
      y,
      Math.sin(angle) * SPRING_HELIX_RADIUS,
    ))
  }
  const curve = new CatmullRomCurve3(points)
  return new TubeGeometry(curve, SEGMENTS * 2, SPRING_TUBE_RADIUS, 6, false)
}

export function Dynamometer({ position, active = false }: Props) {
  const hookRef = useRef<RapierRigidBody>(null)
  const [attached, setAttached] = useState<RapierRigidBody | null>(null)
  const [hookY, setHookY] = useState(HOOK_REST_Y)
  const hookVelocity = useRef(0)
  const setDynamometer = useReadings(s => s.setDynamometer)

  // Scale texture (drawn once)
  const scaleTexture = useMemo(() => createDialTexture(), [])
  const springGeometry = useMemo(() => buildSpringGeometry(), [])

  useEffect(() => {
    return () => {
      scaleTexture.dispose()
      springGeometry.dispose()
    }
  }, [scaleTexture, springGeometry])

  useFrame((_, delta) => {
    const hook = hookRef.current
    if (!hook) return
    const attachedMass = attached ? getBodyMass(attached) : 0
    const F = attachedMass * G
    setDynamometer(F)
    // Target hook Y — physical equilibrium under the current load
    const targetY = HOOK_REST_Y - F / SPRING_K
    // Spring-damper integration for visible oscillation when load changes
    const r = springStep({
      current: hookY,
      velocity: hookVelocity.current,
      target: targetY,
      stiffness: VISUAL_STIFFNESS,
      damping: VISUAL_DAMPING,
      dt: Math.min(delta, 0.033), // cap dt to avoid blow-up on tab refocus
    })
    hookVelocity.current = r.velocity
    setHookY(r.current)
    // Hook hangs at the BOTTOM of the rod, which is below the pointer (= r.current).
    const hookY_world = position[1] + r.current - ROD_BELOW_POINTER_LEN
    hook.setNextKinematicTranslation({
      x: position[0] + ARM_X_OFFSET,
      y: hookY_world,
      z: position[2],
    })

    if (attached) {
      if (attached.bodyType() !== 2) attached.setBodyType(2 /* KinematicPositionBased */, true)
      attached.setNextKinematicTranslation({
        x: position[0] + ARM_X_OFFSET,
        y: hookY_world - 0.03,
        z: position[2],
      })
    }
  })

  useEffect(() => {
    // Snap target tracks the hook, which now hangs ROD_BELOW_POINTER_LEN
    // below `hookY` (where the spring's bottom and the pointer sit).
    const hookWorldPos = new Vector3(
      position[0] + ARM_X_OFFSET,
      position[1] + hookY - ROD_BELOW_POINTER_LEN,
      position[2],
    )
    const unregister = registerSnap({
      id: 'dynamometer-hook',
      instrumentId: 'dynamometer',
      position: hookWorldPos,
      radius: 0.20,
      keepKinematic: true,
      onAttach: (body) => setAttached(body),
    })
    return unregister
  }, [position, hookY])

  // Release attached body when user starts dragging it
  useEffect(() => {
    return onDragStart((body) => {
      setAttached(prev => prev === body ? null : prev)
    })
  }, [])

  // Visual spring length and y-center
  const currentSpringLen = Math.max(0.04, SPRING_TOP_Y - hookY)
  const springYCenter = (SPRING_TOP_Y + hookY) / 2
  const springScaleY = currentSpringLen / SPRING_NATURAL_LEN

  return (
    <group position={position}>
      {/* Vertical stand — anodized matte black */}
      <RoundedBox
        args={[0.04, STAND_H, 0.04]}
        radius={0.005}
        smoothness={4}
        position={[0, STAND_H / 2, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#222226" metalness={0.7} roughness={0.4} envMapIntensity={0.8} />
        {active && <Outlines thickness={3} color="#0071e3" />}
      </RoundedBox>

      {/* Top horizontal arm */}
      <RoundedBox
        args={[0.16, 0.025, 0.04]}
        radius={0.005}
        smoothness={4}
        position={[ARM_X_OFFSET, STAND_H + 0.012, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#222226" metalness={0.7} roughness={0.4} envMapIntensity={0.8} />
      </RoundedBox>

      {/* Anchor cap where the spring attaches to the arm */}
      <mesh position={[ARM_X_OFFSET, STAND_H, 0]} castShadow>
        <cylinderGeometry args={[0.012, 0.012, 0.008, 16]} />
        <meshStandardMaterial color="#9aa0a8" metalness={0.95} roughness={0.15} envMapIntensity={1.2} />
      </mesh>

      {/* Coiled spring */}
      <mesh
        geometry={springGeometry}
        position={[ARM_X_OFFSET, springYCenter, 0]}
        scale={[1, springScaleY, 1]}
        castShadow
      >
        <meshStandardMaterial color="#c8c8d0" metalness={0.9} roughness={0.18} envMapIntensity={1.2} />
      </mesh>

      {/* Backplate — the dual-scale board sits behind/beside the spring,
          flush with the pointer's full travel range. */}
      <mesh position={[BACKPLATE_X, BACKPLATE_CENTER_Y, 0]}>
        <planeGeometry args={[BACKPLATE_WIDTH, BACKPLATE_HEIGHT]} />
        <meshBasicMaterial map={scaleTexture} />
      </mesh>

      {/* Mechanical pointer group — rigidly tracks the spring's bottom (hookY).
          Contains: horizontal arm extending toward the backplate, a sharp red
          triangle tip at its left end, and a thin rod descending to the hook. */}
      <group position={[ARM_X_OFFSET, hookY, 0]}>
        {/* Horizontal arm: from the spring axis (x=0 in group-local) to the
            backplate's right edge. Length POINTER_ARM_LEN ≈ |BACKPLATE_X|. */}
        <mesh position={[-POINTER_ARM_LEN / 2, 0, 0]} castShadow>
          <boxGeometry args={[POINTER_ARM_LEN, POINTER_ARM_THICKNESS, 0.005]} />
          <meshStandardMaterial color="#9aa0a8" metalness={0.7} roughness={0.35} envMapIntensity={0.9} />
        </mesh>

        {/* Red triangular tip — apex points along +X (toward the spring axis),
            base 14 mm to the left. So the visible "arrow" points from the
            scale toward the spring; the apex sits on the right edge of the
            backplate plane (at z = +0.001 to avoid z-fighting). */}
        <mesh
          position={[-POINTER_ARM_LEN, 0, 0.001]}
          rotation={[0, 0, -Math.PI / 2]}
        >
          <coneGeometry args={[POINTER_TIP_RADIUS, POINTER_TIP_LEN, 3]} />
          <meshStandardMaterial
            color="#ff3b30"
            emissive="#ff3b30"
            emissiveIntensity={0.7}
            toneMapped={false}
          />
        </mesh>

        {/* Thin rigid rod from the pointer arm DOWN to the hook (the rod's top
            is at the arm, the hook ring sits at the bottom). */}
        <mesh position={[0, -ROD_BELOW_POINTER_LEN / 2, 0]} castShadow>
          <cylinderGeometry args={[ROD_RADIUS, ROD_RADIUS, ROD_BELOW_POINTER_LEN, 8]} />
          <meshStandardMaterial color="#9aa0a8" metalness={0.7} roughness={0.35} envMapIntensity={0.9} />
        </mesh>
      </group>

      {/* Hook (kinematic — physics body for snap target). Now hangs BELOW
          the backplate, at hookY − ROD_BELOW_POINTER_LEN. */}
      <RigidBody
        ref={hookRef}
        type="kinematicPosition"
        colliders={false}
        position={[
          position[0] + ARM_X_OFFSET,
          position[1] + hookY - ROD_BELOW_POINTER_LEN,
          position[2],
        ]}
      >
        {/* Hook ring */}
        <mesh castShadow>
          <torusGeometry args={[0.014, 0.0028, 12, 24]} />
          <meshStandardMaterial color="#c8c8d0" metalness={0.95} roughness={0.15} envMapIntensity={1.2} />
        </mesh>
        {/* Hook stem (small cylinder above ring connecting to the rod above) */}
        <mesh position={[0, 0.012, 0]} castShadow>
          <cylinderGeometry args={[0.0015, 0.0015, 0.024, 8]} />
          <meshStandardMaterial color="#c8c8d0" metalness={0.95} roughness={0.15} envMapIntensity={1.2} />
        </mesh>
      </RigidBody>
    </group>
  )
}
```

- [ ] **Step 2: Verify typecheck**

Run:

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 3: Verify build**

Run:

```bash
npm run build 2>&1 | tail -3
```

Expected: build succeeds (the pre-existing chunk-size warning is OK).

---

## Task 3 — Update TARGET_POSITIONS for the new hook world y

**Files:**
- Modify: `src/sdk/guided/GuidedOverlay.tsx` (one entry in the `TARGET_POSITIONS` table + its comment)

The hook now hangs ROD_BELOW_POINTER_LEN (0.13 m) below the spring's bottom (at lever-local y = HOOK_REST_Y = 0.35), so its world y at rest is `0.85 + 0.35 − 0.13 = 1.07`. Previously it was at `0.85 + 0.20 = 1.05` — a 2 cm bump.

- [ ] **Step 1: Patch the dynamometer-hook entry**

Run:

```bash
grep -n "dynamometer-hook" src/sdk/guided/GuidedOverlay.tsx
```

Find this block (in the TARGET_POSITIONS object, around lines 28–35 after the previous TARGET_POSITIONS refresh):

```tsx
//   Dynamometer at world [-0.55, 0.85, 0]   — hook rest at local y = 0.20  → world (−0.55, 1.05, 0)
```

Replace with:

```tsx
//   Dynamometer at world [-0.55, 0.85, 0]   — hook hangs at local y = 0.35 − 0.13 = 0.22 (HOOK_REST_Y minus ROD_BELOW_POINTER_LEN)  → world (−0.55, 1.07, 0)
```

And find the entry:

```tsx
  'dynamometer-hook':      [-0.55, 1.05, 0.00],
```

Replace with:

```tsx
  'dynamometer-hook':      [-0.55, 1.07, 0.00],
```

- [ ] **Step 2: Verify**

Run:

```bash
npx tsc --noEmit
```

Expected: clean.

---

## Task 4 — Verify (and if needed, nudge) the focus-dyn camera preset

**Files:**
- Modify (conditional): `src/sdk/scene/CameraRig.tsx`

The dynamometer is now ~20 cm taller. The `focus-dyn` preset is currently `{ position: [-0.25, 1.5, 1.8], lookAt: [-0.4, 0.9, 0] }` — let's check whether the new top of the device (world y ≈ 0.85 + 0.6 = 1.45) still fits in frame and whether the lookAt point should lift to keep the spring centred.

Reasoning:
- Camera at world y = 1.5, lookAt at world y = 0.9 → optical axis pitched ~down. Frame vertical centre ≈ 1.2.
- Dynamometer extents in world y now: hook bottom ≈ 1.05, top of stand ≈ 1.45. Vertical centre of the body ≈ 1.25.
- The current lookAt y = 0.9 is below the body's centre. Frame puts the device in the upper third — still readable but a bit low. Lifting `lookAt[1]` from `0.9` to `1.05` centres the spring in frame.

- [ ] **Step 1: Read CameraRig.tsx and locate the preset**

Run:

```bash
grep -n "focus-dyn" src/sdk/scene/CameraRig.tsx
```

Expected to find the entry in a presets table:

```tsx
  'focus-dyn':   { position: [-0.25, 1.5, 1.8], lookAt: [-0.4, 0.9, 0] },
```

- [ ] **Step 2: Update the preset**

Replace the entry with:

```tsx
  'focus-dyn':   { position: [-0.25, 1.55, 1.8], lookAt: [-0.4, 1.05, 0] },
```

(Camera y +0.05 and lookAt y +0.15 — recentres the now-taller body.)

- [ ] **Step 3: Verify typecheck**

Run:

```bash
npx tsc --noEmit
```

Expected: clean.

---

## Task 5 — Final verification + single commit

- [ ] **Step 1: Full verification**

Run:

```bash
npx tsc --noEmit
npx vitest run | tail -3
npm run build 2>&1 | tail -3
```

Expected:
- `tsc`: clean.
- `vitest`: 183/183 tests pass (no count change — no tests added/removed).
- `build`: succeeds (pre-existing chunk-size warning is OK).

- [ ] **Step 2: Commit (single atomic commit)**

```bash
git add src/labs/mass-measurement/textures/dialTexture.ts \
        src/labs/mass-measurement/instruments/Dynamometer.tsx \
        src/sdk/guided/GuidedOverlay.tsx \
        src/sdk/scene/CameraRig.tsx
git commit -m "feat(dynamometer): mechanical pointer + dual scale (final lab revision)

Real-mechanical redesign of the dynamometer per the textbook reference
photo. Three changes in one slice:

1. Geometry +50%: STAND_H 0.4 → 0.6, hook_rest_y 0.2 → 0.35,
   hook_at_5N 0.10 → 0.25. The instrument now stands tall enough that
   the dual scale fits with comfortable spacing and pointer travel
   maps cleanly to a 10 cm vertical range.

2. Mechanical pointer replaces the floating cone needle. A <group>
   tracks the spring's bottom (hookY) each frame; it contains:
     - a horizontal metal arm (5 cm) extending from the spring axis
       to the backplate;
     - a sharp red triangular tip (14 mm) at the arm's left end —
       this is what reads the value;
     - a thin rigid rod (13 cm) descending to the hook.
   The hook now hangs BELOW the scale plate, the way real dynamometers
   work. Snap-target world position recomputed to match.

3. Dual scale on the backplate. dialTexture.ts rewritten to render
   two strips on a 256x512 canvas:
     - left  0–1 N: minor 0.05 N, medium 0.1 N, major 0.5 N (labels
       0 / 0,5 / 1) — for the ping-pong ball at ~0.05 N which was
       unreadable on the old 5 N scale;
     - right 0–5 N: minor 0.1 N, medium 0.5 N, major 1 N (labels 0–5)
       — for the apple (1.45 N) and baseball (2.45 N).
   Both strips share the same y-mapping, so the same physical pointer
   reads consistent values on both — a built-in consistency check.

Side-effect updates: TARGET_POSITIONS['dynamometer-hook'] world y
1.05 → 1.07 (hook moved 2 cm down via the rod); focus-dyn camera
preset lifted slightly (camera y 1.5 → 1.55, lookAt y 0.9 → 1.05) so
the now-taller body stays centred.

No state, content, or step-engine contract changes. Spring physics
(SPRING_K = 50 N/m, 0–10 cm extension for 0–5 N) untouched. Test
suite stays at 183/183."
```

- [ ] **Step 3: Verify clean working tree**

Run:

```bash
git status
```

Expected: `nothing to commit, working tree clean`.

---

## Self-review

**Spec coverage:**
- Reference / mechanical pointer description → Task 2 (`<group position={[ARM_X_OFFSET, hookY, 0]}>` with arm + tip + rod) ✓
- Geometry table (STAND_H, SPRING_TOP_Y, HOOK_REST_Y, HOOK_AT_FIVE_N, BACKPLATE_TOP/BOTTOM/HEIGHT, POINTER_ARM_LEN, ROD_BELOW_POINTER_LEN) → Task 2 step 1 (constants block at top of new file) ✓
- Backplate (dual scale) layout — left 0–1 N / right 0–5 N, both spanning full height → Task 1 (canvas 256×512, `yForFraction(f)` shared between strips) ✓
- Spring physics unchanged → Task 2 keeps SPRING_K, SPRING_NATURAL_LEN math, springStep integration ✓
- Hook hangs below the backplate via a rod → Task 2 (`hookY - ROD_BELOW_POINTER_LEN`) ✓
- TARGET_POSITIONS update → Task 3 ✓
- Camera framing check → Task 4 ✓
- Acceptance criteria 1–8 → covered by Task 2 (mechanical pointer + clamp), Task 1 (label positions), Task 5 (typecheck + tests + build) ✓

**Placeholder scan:** every step has concrete file paths, complete code, and exact commands. No "TBD" / "implement later" / "similar to Task N" / "add appropriate handling".

**Type consistency:**
- `BACKPLATE_TOP_Y / _BOTTOM_Y / _HEIGHT / _CENTER_Y / _WIDTH / _X` consistently named and used both in JSX and constants block.
- `POINTER_ARM_LEN / POINTER_ARM_THICKNESS / POINTER_TIP_LEN / POINTER_TIP_RADIUS / ROD_BELOW_POINTER_LEN / ROD_RADIUS` all defined at module level, used in JSX.
- `hookY` (state) used identically in: `useFrame` integration, snap target effect, pointer group y, hook RigidBody position. Always offset by `ROD_BELOW_POINTER_LEN` when computing hook world y.
- TARGET_POSITIONS entry value `1.07` matches `0.85 + 0.35 − 0.13 = 1.07`. Camera lookAt y = 1.05 sits ~2 cm below the device's vertical centre (1.25) — that's intentional, the focal point is the spring/scale region, not the hook.

No issues found.
