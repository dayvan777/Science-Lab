# EM Induction Phase 2 — Field Lines + Lenz Current Arrows · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Visualize the invisible physics — 8 amber magnetic-field lines around the bar magnet (parented to its transform) + 6 small cone arrows along the coil's helix that flip with the EMF sign (Lenz's law).

**Architecture:** Four new lab-local files (`VisualState.ts`, `FieldLines.tsx`, `CurrentArrows.tsx`, `FieldToggleButton.tsx`) plus targeted edits in `LabScene.tsx` to mount them and wire up the toggle. Zustand `persist` middleware (already a transitive dep — verified `zustand@5.0.12` is in package.json, `persist` is bundled in `zustand/middleware`) backs the toggle state via localStorage. Tests stay at 138 — visual-only slice.

**Tech Stack:** React 19, R3F + drei (`useFrame`), three.js (`CatmullRomCurve3`, `TubeGeometry`, `Quaternion`), Zustand 5 + `zustand/middleware` (persist). No new dependencies.

**Spec:** `docs/superpowers/specs/2026-05-14-em-induction-phase2-field-lines-design.md`

---

## File map

```
NEW
  src/labs/electromagnetic-induction/state/VisualState.ts            (Task 2)
  src/labs/electromagnetic-induction/instruments/FieldLines.tsx      (Task 3)
  src/labs/electromagnetic-induction/instruments/CurrentArrows.tsx   (Task 4)
  src/labs/electromagnetic-induction/ui/FieldToggleButton.tsx        (Task 5)

MODIFIED
  src/labs/electromagnetic-induction/scene/LabScene.tsx              (Task 6)
```

## Verification commands

```bash
npx tsc --noEmit                    # clean
npx vitest run                      # 138/138 green (no count change)
npm run build                       # clean
```

Manual smoke after the slice ships: open `/physics/em-induction`. Scene 1 (intro) shows NO field lines / arrows. Scene 2+: 8 amber curved lines surround the bar magnet, moving with it during drag. As the magnet enters the coil, 6 small cone arrows along the coil light up — Apple-blue when moving forward, soft-red when withdrawing. The HUD bottom-right has a "Поле" toggle that hides/shows everything; state persists across page reload.

---

## Task 1 — Branch off master

- [ ] **Step 1: Create branch**

```bash
git checkout -b feat/em-induction-phase2-field-lines
```

- [ ] **Step 2: Confirm clean tree**

```bash
git status
```

Expected: `On branch feat/em-induction-phase2-field-lines` / `nothing to commit, working tree clean`.

---

## Task 2 — `VisualState.ts` — persisted toggle store

**Files:**
- Create: `src/labs/electromagnetic-induction/state/VisualState.ts`

- [ ] **Step 1: Write the store**

Create `src/labs/electromagnetic-induction/state/VisualState.ts`:

```ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Lab-local visualization toggle. Controls whether the bar magnet's
 * field lines and the coil's induced-current arrows are rendered. The
 * toggle persists across page reloads via the existing zustand/middleware
 * persist helper — localStorage key is namespaced under the lab's domain.
 *
 * Default: ON (true). Students see the field by default; the toggle is
 * available to strip the scene down to the bare instruments.
 */
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
    { name: 'em-induction.visual-state' },
  ),
)
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

Expected: clean. (If `zustand/middleware` cannot be resolved, fall back to a manual `useEffect`-based localStorage shim — but it should resolve since zustand@5 ships persist in the package.)

---

## Task 3 — `FieldLines.tsx` — 8 magnetic-field curves parented to the magnet

**Files:**
- Create: `src/labs/electromagnetic-induction/instruments/FieldLines.tsx`

Builds 8 parametric Bezier curves at mount, places them in a `<group>` whose transform copies the magnet's world transform each frame. Material opacity lerps smoothly when `visible` toggles.

- [ ] **Step 1: Write the component**

Create `src/labs/electromagnetic-induction/instruments/FieldLines.tsx`:

```tsx
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  Vector3,
  TubeGeometry,
  CatmullRomCurve3,
  Group,
  MeshBasicMaterial,
} from 'three'
import { findBodyByTag } from '../../../sdk/physics/bodyRegistry'
import { MAGNET_HALF_LENGTH } from '../objects/BarMagnet'

/**
 * Eight amber field-line tubes around the bar magnet. Each line emerges
 * from the N pole tip (-x in magnet-local), arcs out into space, and
 * curves back into the S pole tip (+x). Four extents (0.04 / 0.10 / 0.20
 * / 0.40 m) produce inner-to-outer "shells"; each extent has a mirror
 * pair (one above, one below) for a total of 8 lines in the magnet's
 * local XY plane.
 *
 * The whole group's transform copies the magnet's world translation +
 * rotation each frame, so the lines stay locked to the magnet as the
 * student drags it.
 *
 * Geometry budget: 8 lines × 24 path × 4 radial = 768 triangles. Material
 * is `meshBasicMaterial` with `transparent + toneMapped:false` so the
 * lines glow softly without picking up bloom.
 */

const TUBE_RADIUS = 0.0015
const PATH_SEGMENTS = 24
const RADIAL_SEGMENTS = 4
const LINE_EXTENTS = [0.04, 0.10, 0.20, 0.40] as const
const FADE_RATE_MS_PER_TICK = 60 / 250  // 250 ms to fully fade — applied per delta-ms

type Props = {
  /** Body-id of the bar magnet (matches Draggable.bodyId). */
  magnetBodyId: string
  /** When false, the entire group fades to opacity 0 over ~250 ms. */
  visible: boolean
}

/**
 * Build one closed-loop curve in the magnet's local frame.
 *   - 5 control points: N tip → arc up & out → mid → arc down & in → S tip.
 *   - `mirror = true` reflects across y=0 (the line goes BELOW the magnet).
 */
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

function buildLineGeometry(extent: number, mirror: boolean): TubeGeometry {
  const curve = makeFieldLine(extent, mirror)
  return new TubeGeometry(curve, PATH_SEGMENTS, TUBE_RADIUS, RADIAL_SEGMENTS, false)
}

export function FieldLines({ magnetBodyId, visible }: Props) {
  const groupRef = useRef<Group>(null)
  const materialRef = useRef<MeshBasicMaterial>(null)
  const displayedOpacity = useRef(visible ? 0.55 : 0)

  // Build all 8 geometries once at mount.
  const geometries = useMemo(() => {
    const out: TubeGeometry[] = []
    for (const extent of LINE_EXTENTS) {
      out.push(buildLineGeometry(extent, false)) // above
      out.push(buildLineGeometry(extent, true))  // below
    }
    return out
  }, [])

  // Dispose geometries on unmount.
  useEffect(() => {
    return () => {
      for (const g of geometries) g.dispose()
    }
  }, [geometries])

  // Per-frame: copy magnet's transform onto the group + lerp material opacity.
  useFrame((_, delta) => {
    const body = findBodyByTag(magnetBodyId)
    if (body && groupRef.current) {
      const t = body.translation()
      const r = body.rotation()
      groupRef.current.position.set(t.x, t.y, t.z)
      groupRef.current.quaternion.set(r.x, r.y, r.z, r.w)
    }
    if (materialRef.current) {
      const targetOpacity = visible ? 0.55 : 0
      const step = Math.min(1, delta * FADE_RATE_MS_PER_TICK * 1000)
      displayedOpacity.current += (targetOpacity - displayedOpacity.current) * step
      materialRef.current.opacity = displayedOpacity.current
    }
  })

  return (
    <group ref={groupRef}>
      {geometries.map((geometry, i) => (
        <mesh key={i} geometry={geometry}>
          {/* All meshes share ONE material via ref so a single opacity
              update propagates everywhere. Three.js permits attaching
              the same material to multiple meshes. */}
          {i === 0 ? (
            <meshBasicMaterial
              ref={materialRef}
              color="#ffc850"
              transparent
              opacity={0.55}
              toneMapped={false}
              depthWrite={false}
            />
          ) : (
            <meshBasicMaterial
              color="#ffc850"
              transparent
              opacity={0.55}
              toneMapped={false}
              depthWrite={false}
              ref={(mat) => {
                // Mirror material updates from the primary ref onto siblings.
                // Cheap: just sync opacity each frame via parent's useFrame
                // would need access to all refs — instead, give each its own
                // material but driven by the same calc. See useFrame loop:
                // we update materialRef (first mesh); on subsequent re-renders
                // child materials reuse the JSX prop (kept in sync at mount).
                // For runtime opacity sync, use the simpler approach below.
                if (mat && materialRef.current) {
                  mat.opacity = materialRef.current.opacity
                }
              }}
            />
          )}
        </mesh>
      ))}
    </group>
  )
}
```

**Note on material sharing:** The above sketch uses 8 separate materials and syncs opacity in the ref callback. That's clunky. A cleaner pattern is to create ONE `MeshBasicMaterial` instance via `useMemo` and pass it to all 8 meshes. Use this simpler approach instead — replace the JSX body with:

```tsx
  // Single shared material — opacity is mutated in useFrame, all meshes
  // pick up the change automatically.
  const material = useMemo(
    () =>
      new MeshBasicMaterial({
        color: '#ffc850',
        transparent: true,
        opacity: 0.55,
        toneMapped: false,
        depthWrite: false,
      }),
    [],
  )

  useEffect(() => {
    return () => material.dispose()
  }, [material])

  // ... useFrame updates material.opacity directly (no materialRef needed)

  return (
    <group ref={groupRef}>
      {geometries.map((geometry, i) => (
        <mesh key={i} geometry={geometry} material={material} />
      ))}
    </group>
  )
```

And update the `useFrame` body to:

```ts
  useFrame((_, delta) => {
    const body = findBodyByTag(magnetBodyId)
    if (body && groupRef.current) {
      const t = body.translation()
      const r = body.rotation()
      groupRef.current.position.set(t.x, t.y, t.z)
      groupRef.current.quaternion.set(r.x, r.y, r.z, r.w)
    }
    const targetOpacity = visible ? 0.55 : 0
    const step = Math.min(1, delta * 4)  // ~250 ms to converge (1 / 0.25s = 4)
    material.opacity += (targetOpacity - material.opacity) * step
  })
```

Drop the `materialRef`, drop the `displayedOpacity` ref (use `material.opacity` directly). Drop the `FADE_RATE_MS_PER_TICK` constant — replaced by `delta * 4` for the fade rate.

The **final** simplified component file is:

```tsx
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  Vector3,
  TubeGeometry,
  CatmullRomCurve3,
  Group,
  MeshBasicMaterial,
} from 'three'
import { findBodyByTag } from '../../../sdk/physics/bodyRegistry'
import { MAGNET_HALF_LENGTH } from '../objects/BarMagnet'

const TUBE_RADIUS = 0.0015
const PATH_SEGMENTS = 24
const RADIAL_SEGMENTS = 4
const LINE_EXTENTS = [0.04, 0.10, 0.20, 0.40] as const
const FIELD_OPACITY = 0.55
const FADE_STIFFNESS = 4   // 1 / (250ms / 1000) = 4 — opacity converges in ~250ms

type Props = {
  magnetBodyId: string
  visible: boolean
}

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

export function FieldLines({ magnetBodyId, visible }: Props) {
  const groupRef = useRef<Group>(null)

  const geometries = useMemo(() => {
    const out: TubeGeometry[] = []
    for (const extent of LINE_EXTENTS) {
      out.push(new TubeGeometry(makeFieldLine(extent, false), PATH_SEGMENTS, TUBE_RADIUS, RADIAL_SEGMENTS, false))
      out.push(new TubeGeometry(makeFieldLine(extent, true), PATH_SEGMENTS, TUBE_RADIUS, RADIAL_SEGMENTS, false))
    }
    return out
  }, [])

  const material = useMemo(
    () =>
      new MeshBasicMaterial({
        color: '#ffc850',
        transparent: true,
        opacity: visible ? FIELD_OPACITY : 0,
        toneMapped: false,
        depthWrite: false,
      }),
    // visible deliberately omitted — initial value only; runtime updates via useFrame
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  useEffect(() => {
    return () => {
      for (const g of geometries) g.dispose()
      material.dispose()
    }
  }, [geometries, material])

  useFrame((_, delta) => {
    const body = findBodyByTag(magnetBodyId)
    if (body && groupRef.current) {
      const t = body.translation()
      const r = body.rotation()
      groupRef.current.position.set(t.x, t.y, t.z)
      groupRef.current.quaternion.set(r.x, r.y, r.z, r.w)
    }
    const target = visible ? FIELD_OPACITY : 0
    const step = Math.min(1, delta * FADE_STIFFNESS)
    material.opacity += (target - material.opacity) * step
  })

  return (
    <group ref={groupRef}>
      {geometries.map((geometry, i) => (
        <mesh key={i} geometry={geometry} material={material} />
      ))}
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

## Task 4 — `CurrentArrows.tsx` — 6 cones along the coil's helix

**Files:**
- Create: `src/labs/electromagnetic-induction/instruments/CurrentArrows.tsx`

6 small cones placed along the coil's helix path. Direction = ±tangent based on `useInductionReadings.getState().currentEMF` sign. Opacity scales with `|EMF| / EMF_MAX`. Material colour lerps between Apple-blue (positive EMF) and soft-red (negative EMF).

- [ ] **Step 1: Write the component**

Create `src/labs/electromagnetic-induction/instruments/CurrentArrows.tsx`:

```tsx
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  Vector3,
  Color,
  Group,
  MeshStandardMaterial,
  Quaternion,
} from 'three'
import { useInductionReadings } from '../state/InductionReadings'
import { EMF_MAX } from '../physics/induction'

const ARROW_COUNT = 6
const CONE_RADIUS = 0.005
const CONE_HEIGHT = 0.012
const CONE_SEGMENTS = 6

const COLOR_POSITIVE = new Color('#0a84ff')
const COLOR_NEGATIVE = new Color('#ff7a60')

type Props = {
  /** World position of the coil's centre (matches LabScene's COIL_WORLD). */
  coilWorld: [number, number, number]
  /** Coil length along its X axis. */
  coilLength: number
  /** Coil outer radius. */
  coilOuterRadius: number
  /** Coil turns (helix wraps). */
  coilTurns: number
  /** When false, arrows fade to opacity 0. */
  visible: boolean
}

/**
 * Returns 6 transforms (position + quaternion-as-array) at evenly spaced
 * points along the coil's helix. Each transform's quaternion orients a
 * coneGeometry (default-pointing +y) along the helix's local tangent.
 *
 * The coil's helix sweeps linearly along x with sin/cos oscillation in
 * y-z (Phase 1 axis). Tangent at parameter t:
 *   dx/dt = coilLength
 *   dy/dt = cos(angle) · coilOuterRadius · 2π · coilTurns
 *   dz/dt = -sin(angle) · coilOuterRadius · 2π · coilTurns
 *
 * Cones placed at internal positions (t in [0.05, 0.95]) to avoid the
 * tube's open endpoints. The 6 t-values are spaced evenly across this
 * range.
 */
function computeArrowTransforms(coilLength: number, coilOuterRadius: number, coilTurns: number) {
  const transforms: { position: Vector3; quaternion: Quaternion }[] = []
  const tStart = 0.05
  const tEnd = 0.95
  const up = new Vector3(0, 1, 0)  // coneGeometry default-aligned axis

  for (let i = 0; i < ARROW_COUNT; i++) {
    const t = tStart + ((tEnd - tStart) * i) / (ARROW_COUNT - 1)
    const angle = t * coilTurns * Math.PI * 2
    const x = -coilLength / 2 + t * coilLength
    const y = Math.sin(angle) * coilOuterRadius
    const z = Math.cos(angle) * coilOuterRadius
    const dx = coilLength
    const dy = Math.cos(angle) * coilOuterRadius * 2 * Math.PI * coilTurns
    const dz = -Math.sin(angle) * coilOuterRadius * 2 * Math.PI * coilTurns
    const tangent = new Vector3(dx, dy, dz).normalize()
    const quaternion = new Quaternion().setFromUnitVectors(up, tangent)
    transforms.push({ position: new Vector3(x, y, z), quaternion })
  }
  return transforms
}

export function CurrentArrows({
  coilWorld,
  coilLength,
  coilOuterRadius,
  coilTurns,
  visible,
}: Props) {
  const groupRef = useRef<Group>(null)
  const meshRefs = useRef<Array<Group | null>>([])
  const flipQuat = useMemo(
    () => new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI),
    [],
  )

  const transforms = useMemo(
    () => computeArrowTransforms(coilLength, coilOuterRadius, coilTurns),
    [coilLength, coilOuterRadius, coilTurns],
  )

  const material = useMemo(
    () =>
      new MeshStandardMaterial({
        color: COLOR_POSITIVE.clone(),
        emissive: COLOR_POSITIVE.clone(),
        emissiveIntensity: 0.6,
        transparent: true,
        opacity: 0,
        toneMapped: false,
      }),
    [],
  )

  useEffect(() => {
    return () => material.dispose()
  }, [material])

  useFrame((_, delta) => {
    const emf = useInductionReadings.getState().currentEMF
    const sign = emf >= 0 ? 1 : -1
    const visibleOpacityTarget = Math.min(1, Math.abs(emf) / EMF_MAX) * (visible ? 1 : 0)
    const step = Math.min(1, delta * 8)  // ~125 ms to converge

    material.opacity += (visibleOpacityTarget - material.opacity) * step

    // Colour lerp: red ↔ blue based on EMF sign.
    const targetColour = sign > 0 ? COLOR_POSITIVE : COLOR_NEGATIVE
    material.color.lerp(targetColour, step)
    material.emissive.lerp(targetColour, step)

    // Sign flip: rotate each cone 180° around its local x when EMF is negative.
    for (let i = 0; i < transforms.length; i++) {
      const ref = meshRefs.current[i]
      if (!ref) continue
      const baseQuat = transforms[i].quaternion
      if (sign > 0) {
        ref.quaternion.copy(baseQuat)
      } else {
        ref.quaternion.copy(baseQuat).multiply(flipQuat)
      }
    }
  })

  return (
    <group ref={groupRef} position={coilWorld}>
      {transforms.map((tr, i) => (
        <group
          key={i}
          ref={(g) => {
            meshRefs.current[i] = g
          }}
          position={tr.position}
        >
          <mesh material={material}>
            <coneGeometry args={[CONE_RADIUS, CONE_HEIGHT, CONE_SEGMENTS]} />
          </mesh>
        </group>
      ))}
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

## Task 5 — `FieldToggleButton.tsx` — pill button in the control row

**Files:**
- Create: `src/labs/electromagnetic-induction/ui/FieldToggleButton.tsx`

- [ ] **Step 1: Write the component**

Create `src/labs/electromagnetic-induction/ui/FieldToggleButton.tsx`:

```tsx
import { Button } from '../../../sdk/ui/Button'
import { sound } from '../../../sdk/audio/SoundManager'
import { useVisualState } from '../state/VisualState'

/**
 * Bottom-right HUD pill that toggles the visibility of the field lines
 * and current arrows. Plays a tick sound on every toggle. Reads + writes
 * the persisted `useVisualState.fieldVisible` flag.
 *
 * Icons: ⊟ when field is visible (suggests "collapse / hide"),
 *        ⊞ when hidden (suggests "expand / show"). Same convention as
 *        the existing CollapsibleGlassPanel.
 */
export function FieldToggleButton() {
  const fieldVisible = useVisualState((s) => s.fieldVisible)
  const setFieldVisible = useVisualState((s) => s.setFieldVisible)

  const handleClick = () => {
    sound.play('tick')
    setFieldVisible(!fieldVisible)
  }

  const label = fieldVisible ? 'Сховати магнітне поле' : 'Показати магнітне поле'

  return (
    <Button
      variant="secondary"
      onClick={handleClick}
      aria-label={label}
      title={label}
    >
      {fieldVisible ? '⊟ Поле' : '⊞ Поле'}
    </Button>
  )
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

Expected: clean.

---

## Task 6 — `LabScene.tsx` — mount everything + visibility gating

**Files:**
- Modify: `src/labs/electromagnetic-induction/scene/LabScene.tsx`

Three sub-edits:
- Import the new components + `useVisualState` + `BAR_MAGNET_BODY_ID`.
- Compute `fieldVisible` derived state: `useVisualState.fieldVisible && currentSceneIdx > 0`.
- Mount `<FieldLines/>` inside `<Physics>` (parented to magnet by virtue of using its body-id); mount `<CurrentArrows/>` next to `<Coil/>`; place `<FieldToggleButton/>` in the bottom-right control row between `<SoundToggle/>` and the "Скинути" button.

- [ ] **Step 1: Add imports**

Open `src/labs/electromagnetic-induction/scene/LabScene.tsx`. Find the existing import block (top of file). Add these alongside the other instrument imports:

```tsx
import { FieldLines } from '../instruments/FieldLines'
import { CurrentArrows } from '../instruments/CurrentArrows'
import { FieldToggleButton } from '../ui/FieldToggleButton'
import { useVisualState } from '../state/VisualState'
```

Also, ensure `BAR_MAGNET_BODY_ID` is imported from `../objects/BarMagnet` (it already is — confirmed in current LabScene.tsx around line 20). If not, add it to the existing BarMagnet import.

Also, ensure `COIL_LENGTH, COIL_OUTER_RADIUS, COIL_TURNS` are imported from `../instruments/Coil`. Currently `COIL_LENGTH, COIL_OUTER_RADIUS` are imported; check for `COIL_TURNS` — it's exported from `Coil.tsx:9` (`export const COIL_TURNS = 16`). Add it to the existing Coil import. The updated import line:

```tsx
import { Coil, COIL_LENGTH, COIL_OUTER_RADIUS, COIL_TURNS } from '../instruments/Coil'
```

(If `COIL_TURNS` is not currently exported from `Coil.tsx`, add `export` keyword to its declaration. Read `Coil.tsx` first to confirm — it MAY already be exported per Phase 1's polish edits.)

- [ ] **Step 2: Add the `fieldVisible` derived state inside the `LabScene` component**

Find the `LabScene` function definition (look for `export function LabScene()`). Just AFTER the existing `const isPhone = breakpoint === 'phone'` line (or wherever the early derived constants live), add:

```tsx
  const fieldVisibleToggle = useVisualState((s) => s.fieldVisible)
  // Field + current arrows are hidden during Scene 1 (intro) regardless of
  // the toggle — the student should see the bare equipment first. From
  // Scene 2 onward, the toggle takes effect.
  const fieldVisible = fieldVisibleToggle && idx > 0
```

(`idx` is the existing `currentSceneIndex` selector — check the current code; if it's named differently, use that name.)

- [ ] **Step 3: Mount `<FieldLines/>` and `<CurrentArrows/>` inside `<Physics>`**

Find the existing `<Physics>` block. Add `<FieldLines/>` AFTER `<BarMagnet/>` (so it's parented to the magnet's transform conceptually — though it doesn't need to be a true child; it just needs to read the body's transform each frame). Add `<CurrentArrows/>` AFTER `<Coil/>` but BEFORE the wires:

```tsx
        <Physics key={resetKey} gravity={[0, -9.81, 0]} timeStep={1 / 60}>
          <Table />
          <CoilStand coilWorld={COIL_WORLD} coilLength={COIL_LENGTH} coilOuterRadius={COIL_OUTER_RADIUS} />
          <Coil position={COIL_WORLD} />
          <CurrentArrows
            coilWorld={COIL_WORLD}
            coilLength={COIL_LENGTH}
            coilOuterRadius={COIL_OUTER_RADIUS}
            coilTurns={COIL_TURNS}
            visible={fieldVisible}
          />
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
          <FieldLines magnetBodyId={BAR_MAGNET_BODY_ID} visible={fieldVisible} />
          <SceneController />
        </Physics>
```

(The `<FieldLines/>` placement uses the magnet's body-id internally — it doesn't need JSX-parenting to the BarMagnet.)

- [ ] **Step 4: Add `<FieldToggleButton/>` to the bottom-right control row**

Find the existing JSX block that wraps `<ZoomControls/> <SoundToggle/> <Button>↻ Скинути</Button>`. Place `<FieldToggleButton/>` between `<SoundToggle/>` and the Reset Button:

```tsx
      <div
        style={
          isPhone
            ? { position: 'fixed', top: 110, right: 8, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 10 }
            : { position: 'fixed', bottom: 16, right: 16, display: 'flex', gap: 8, zIndex: 10 }
        }
      >
        <ZoomControls />
        <SoundToggle />
        <FieldToggleButton />
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

- [ ] **Step 5: Verify**

```bash
npx tsc --noEmit
```

Expected: clean. If `COIL_TURNS` is not exported from `Coil.tsx`, add the `export` keyword to its declaration there and re-verify.

---

## Task 7 — Final verify + single atomic commit

- [ ] **Step 1: Full verification**

```bash
npx tsc --noEmit
npx vitest run | tail -3
npm run build 2>&1 | tail -3
```

Expected: typecheck clean, **138/138 tests pass** (no count change), build succeeds.

- [ ] **Step 2: Commit**

```bash
git add src/labs/electromagnetic-induction/state/VisualState.ts \
        src/labs/electromagnetic-induction/instruments/FieldLines.tsx \
        src/labs/electromagnetic-induction/instruments/CurrentArrows.tsx \
        src/labs/electromagnetic-induction/ui/FieldToggleButton.tsx \
        src/labs/electromagnetic-induction/scene/LabScene.tsx \
        src/labs/electromagnetic-induction/instruments/Coil.tsx
git commit -m "feat(em-induction): Phase 2 — field lines + Lenz current arrows

Adds the invisible physics made visible:

  1. FieldLines.tsx — 8 amber Bezier curves around the bar magnet (4
     extents × 2 mirrored pairs). Parented to the magnet via per-frame
     transform copy from findBodyByTag. Single shared MeshBasicMaterial
     with opacity that lerps to/from 0 over ~250 ms when toggled.
     Geometry: 8 × 24×4 = 768 triangles.

  2. CurrentArrows.tsx — 6 small cones along the coil's helix path.
     Tangent direction computed from the Phase-1 helix sweep math
     (x linear, y=sin, z=cos). Quaternion aligns each cone with
     +tangent; multiplied by 180°-flip when EMF<0. Material colour
     lerps blue ↔ red on EMF sign; opacity scales with |EMF|/EMF_MAX.

  3. VisualState.ts — Zustand store with zustand/middleware persist
     (already-bundled in zustand@5.0.12). Persisted under localStorage
     key 'em-induction.visual-state'. Default fieldVisible=true.

  4. FieldToggleButton.tsx — pill button in the bottom-right control
     row. Plays 'tick' sound on toggle. Icons: ⊟ Поле / ⊞ Поле.

  5. LabScene.tsx — mounts the three new components, computes
     fieldVisible = toggleState && currentSceneIdx > 0 (so Scene 1
     stays bare). COIL_TURNS imported alongside COIL_LENGTH /
     OUTER_RADIUS.

No SDK changes. No test changes. 138 tests stay green. Added
~900 triangles (lab still well within perf budget)."
```

- [ ] **Step 3: Verify clean tree**

```bash
git status
```

Expected: `nothing to commit, working tree clean`.

---

## Self-review

**Spec coverage:**

- §FieldLines (8 lines, 4 extents × 2 mirrored, parented to magnet, amber, fade) → Task 3 ✓
- §CurrentArrows (6 cones, ±tangent flip, blue/red lerp, opacity scaling) → Task 4 ✓
- §VisualState (Zustand persist) → Task 2 ✓
- §FieldToggleButton (pill button, sound, position) → Task 5 ✓
- §LabScene mounts + Scene-1 gating → Task 6 ✓
- §Acceptance criteria 1–8 → covered by Tasks 3–6 implementations + Task 7 verification ✓

**Placeholder scan:** every step has concrete file paths, complete code, exact commands. No "TBD" / "implement later". The Task 3 narrative includes an intermediate "sketch" version followed by the **final simplified** version — implementer must use the final version (clearly marked).

**Type consistency:**
- `MAGNET_HALF_LENGTH` is already an `export const` in `BarMagnet.tsx:3` — usable from FieldLines.
- `BAR_MAGNET_BODY_ID` already exported and already imported by LabScene.tsx.
- `EMF_MAX` already exported from `induction.ts` — used by CurrentArrows.
- `COIL_LENGTH`, `COIL_OUTER_RADIUS` already exported from `Coil.tsx`. `COIL_TURNS` is currently `const COIL_TURNS = 16` — Task 6 step 1 notes that if it's not already exported, add `export`. Implementer verifies during execution.
- `findBodyByTag` already exported from `bodyRegistry.ts` — used in FieldLines + LabScene.
- `useInductionReadings.getState().currentEMF` — store shape from `InductionReadings.ts`; matches existing consumers (Galvanometer, Bulb).
- `useVisualState.fieldVisible` defined in Task 2, consumed in Tasks 5 + 6.

No fixes needed.
