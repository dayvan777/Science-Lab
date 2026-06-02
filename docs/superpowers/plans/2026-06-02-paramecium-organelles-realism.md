# Paramecium Organelles — Realism Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the paramecium lab's abstract organelle blobs with "textbook-in-3D" renderers — real shapes, function-revealing motion, and an in-scene name callout for the selected organelle.

**Architecture:** Hybrid. A shared `OrganelleShell` owns cross-cutting concerns (hover, select, cursor, dim/highlight policy) and hands a computed visual `state` to a small per-organelle renderer that owns only its shape + intrinsic motion. Pure animation math lives in `scene/organelles/motion.ts` and is unit-tested; all motion is gated by `useReducedMotion`.

**Tech Stack:** React 19, @react-three/fiber 9, @react-three/drei 10, three 0.184, Zustand 5, Vitest 4, TypeScript strict (`noUnusedLocals`).

---

## Branch & deploy strategy

- All work on branch **`feat/paramecium-organelles-realism`** off `master` (`92c8d56`).
- **Spike gate (after Task 5):** the controller fast-forwards/merges the spike tip to `master` and pushes so Vercel deploys it; the user validates the 2D→3D look on prod **before** Phase B continues. (Mirrors the anatomy/paramecium spike workflow.)
- **Finish (Task 14):** `merge --no-ff` → `master` → push.

## File structure (new folder `src/labs/paramecium/scene/organelles/`)

| File | Responsibility | Task |
|---|---|---|
| `motion.ts` | Pure math: `smoothstep`, `pumpScale`, `cyclosisPos`, `digestColor`, `fibSphere` (+ `fireEnvelope` in T8) | 1, 8 |
| `motion.test.ts` | Vitest unit tests for the pure math | 1, 8 |
| `OrganelleShell.tsx` | Shared selection/hover/cursor + visual `state`; mounts renderer | 2 |
| `GenericBlob.tsx` | Temporary fallback renderer (old sphere/cone look) — deleted in T10 | 2, 10 |
| `Trichocysts.tsx` | Dots (T2, moved) → firing darts on select (T9) | 2, 9 |
| `index.tsx` | `Organelles` component + `id→renderer` registry + `SelectedLabel` (T11) | 2, 11 |
| `ContractileVacuoles.tsx` | Sphere + radial canals + pump | 3 |
| `FoodVacuoles.tsx` | Cyclosis drift + digestion color + bacteria specks | 4 |
| `Macronucleus.tsx` | Granular sausage ellipsoid | 6 |
| `Micronucleus.tsx` | Small bright sphere | 7 |
| `OralGroove.tsx` | Funnel + on-select feeding | 8 |
| `AnalPore.tsx` | Rear notch + on-select expelled remnant | 10 |
| `OrganelleLabel.tsx` | drei `<Html>` pill + `<Line>` leader | 11 |

**Modified:** `scene/Organelles.tsx` (→ 1-line barrel, T2), `scene/Cilia.tsx` (thinner/wavier, T12), `scene/Cell.tsx` (pellicle CanvasTexture, T13).
**Unchanged:** `content/organelles.ts`, `state/ParameciumState.ts`, `ui/*`, `index.tsx`, route, subject entry.

**Import-depth cheat-sheet (from `scene/organelles/X.tsx`):** content `'../../content/organelles'` · state `'../../state/ParameciumState'` · life `'../life'` · reduced-motion `'../../../../sdk/a11y/useReducedMotion'` · motion `'./motion'`.

---

# PHASE A — Spike (build + deploy gate)

### Task 0: Create the branch

- [ ] **Step 1: Branch off master**

```bash
cd "C:\Users\vdomo\OneDrive\Рабочий стол\3dwebsimulation"
git checkout master
git switch -c feat/paramecium-organelles-realism
git status -sb   # Expected: ## feat/paramecium-organelles-realism, clean
```

---

### Task 1: `motion.ts` pure math + tests (TDD)

**Files:**
- Create: `src/labs/paramecium/scene/organelles/motion.ts`
- Test: `src/labs/paramecium/scene/organelles/motion.test.ts`

- [ ] **Step 1: Write the failing test**

`src/labs/paramecium/scene/organelles/motion.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { Color } from 'three'
import { smoothstep, pumpScale, cyclosisPos, digestColor, fibSphere } from './motion'
import { A, B, C } from '../life'

describe('smoothstep', () => {
  it('clamps and eases', () => {
    expect(smoothstep(0, 1, -1)).toBe(0)
    expect(smoothstep(0, 1, 2)).toBe(1)
    expect(smoothstep(0, 1, 0.5)).toBeCloseTo(0.5, 5)
  })
})

describe('pumpScale', () => {
  const P = 3.4
  it('rests near base at u=0 and is periodic', () => {
    expect(pumpScale(0, P)).toBeCloseTo(0.7, 5)
    expect(pumpScale(1.1, P)).toBeCloseTo(pumpScale(1.1 + P, P), 5)
  })
  it('peaks at the fill/contract boundary and bottoms after contraction', () => {
    expect(pumpScale(0.72 * P, P)).toBeCloseTo(1.15, 4)
    expect(pumpScale(0.86 * P, P)).toBeCloseTo(0.6, 4)
  })
  it('stays within bounds across the cycle', () => {
    for (let i = 0; i < 200; i++) {
      const v = pumpScale((i / 200) * P, P)
      expect(v).toBeGreaterThanOrEqual(0.6 - 1e-6)
      expect(v).toBeLessThanOrEqual(1.15 + 1e-6)
    }
  })
  it('phase shifts equal time shifts', () => {
    expect(pumpScale(0.3, P, 0.5)).toBeCloseTo(pumpScale(0.3 + 0.5 * P, P, 0), 5)
  })
})

describe('cyclosisPos', () => {
  it('returns a 3-tuple and is periodic', () => {
    const a = cyclosisPos(1, 0, 4)
    expect(a).toHaveLength(3)
    const b = cyclosisPos(1 + 18, 0, 4)
    a.forEach((v, k) => expect(v).toBeCloseTo(b[k], 5))
  })
  it('stays inside the cell ellipsoid', () => {
    for (let i = 0; i < 120; i++) {
      const [x, y, z] = cyclosisPos(i * 0.37, i % 4, 4)
      expect((x / A) ** 2 + (y / B) ** 2 + (z / C) ** 2).toBeLessThan(1)
    }
  })
  it('separates vacuoles by index', () => {
    expect(cyclosisPos(0, 0, 4)[0]).not.toBeCloseTo(cyclosisPos(0, 1, 4)[0], 3)
  })
})

describe('digestColor', () => {
  it('runs fresh→digested and clamps', () => {
    expect(digestColor(0).getHexString()).toBe(new Color('#a7c46a').getHexString())
    expect(digestColor(1).getHexString()).toBe(new Color('#5f4a2c').getHexString())
    expect(digestColor(-5).getHexString()).toBe(new Color('#a7c46a').getHexString())
    expect(digestColor(5).getHexString()).toBe(new Color('#5f4a2c').getHexString())
  })
  it('midpoint sits between the endpoints', () => {
    const fresh = new Color('#a7c46a'), dig = new Color('#5f4a2c'), m = digestColor(0.5)
    expect(m.r).toBeLessThan(fresh.r)
    expect(m.r).toBeGreaterThan(dig.r)
  })
})

describe('fibSphere', () => {
  it('returns n unit-length points', () => {
    const pts = fibSphere(30)
    expect(pts).toHaveLength(30)
    for (const [x, y, z] of pts) expect(Math.hypot(x, y, z)).toBeCloseTo(1, 6)
  })
  it('handles n=1', () => {
    expect(fibSphere(1)).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run it — expect failure**

Run: `npm test -- motion` → Expected: FAIL (`./motion` has no such exports).

- [ ] **Step 3: Implement `motion.ts`**

`src/labs/paramecium/scene/organelles/motion.ts`:

```ts
import { Color } from 'three'

/** Smooth Hermite step: 0 below edge0, 1 above edge1, eased between. */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  if (edge0 === edge1) return x < edge0 ? 0 : 1
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

const PUMP_BASE = 0.7, PUMP_MAX = 1.15, PUMP_MIN = 0.6

/**
 * Contractile-vacuole scale over time: slow fill → fast contraction → recover.
 * Returns a scale multiplier in [PUMP_MIN, PUMP_MAX]. `phase` in turns (0..1).
 */
export function pumpScale(t: number, period = 3.4, phase = 0): number {
  const u = (((t / period + phase) % 1) + 1) % 1
  if (u < 0.72) return PUMP_BASE + (PUMP_MAX - PUMP_BASE) * smoothstep(0, 0.72, u)
  if (u < 0.86) return PUMP_MAX + (PUMP_MIN - PUMP_MAX) * smoothstep(0.72, 0.86, u)
  return PUMP_MIN + (PUMP_BASE - PUMP_MIN) * smoothstep(0.86, 1, u)
}

/**
 * Food-vacuole position on a tilted ring inside the cytoplasm (cyclosis).
 * Cell-local frame; bounded to stay inside the (A,B,C) ellipsoid.
 */
export function cyclosisPos(t: number, i: number, count: number, period = 18): [number, number, number] {
  const frac = (((t / period + i / Math.max(1, count)) % 1) + 1) % 1
  const a = frac * Math.PI * 2
  const rx = 0.7, ry = 0.34, tilt = 0.4
  const cx = 0.05, cy = -0.05, cz = 0
  const py0 = ry * Math.sin(a)
  return [cx + rx * Math.cos(a), cy + py0 * Math.cos(tilt), cz + py0 * Math.sin(tilt)]
}

const FRESH = new Color('#a7c46a')
const DIGESTED = new Color('#5f4a2c')

/** Food colour by digestion progress: fresh green (0) → digested brown (1). */
export function digestColor(progress: number): Color {
  const p = Math.min(1, Math.max(0, progress))
  return new Color().copy(FRESH).lerp(DIGESTED, p)
}

/** n roughly-even unit points on a sphere (fibonacci spiral). */
export function fibSphere(n: number): [number, number, number][] {
  const out: [number, number, number][] = []
  const golden = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < n; i++) {
    const y = n === 1 ? 0 : 1 - (i / (n - 1)) * 2
    const r = Math.sqrt(Math.max(0, 1 - y * y))
    const th = golden * i
    out.push([Math.cos(th) * r, y, Math.sin(th) * r])
  }
  return out
}
```

- [ ] **Step 4: Run — expect pass**

Run: `npm test -- motion` → Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/labs/paramecium/scene/organelles/motion.ts src/labs/paramecium/scene/organelles/motion.test.ts
git commit -m "feat(paramecium): organelle motion math (pump, cyclosis, digest, fib) + tests"
```

---

### Task 2: Shell refactor (behaviour-preserving)

Introduce the folder + shell + generic fallback + barrel so the lab renders **exactly as today** (all organelles via `GenericBlob`), ready for per-organelle swap-in.

**Files:**
- Create: `OrganelleShell.tsx`, `GenericBlob.tsx`, `Trichocysts.tsx`, `index.tsx` (all in `scene/organelles/`)
- Modify: `src/labs/paramecium/scene/Organelles.tsx` (→ barrel)
- Delete: nothing yet

- [ ] **Step 1: `OrganelleShell.tsx`**

```tsx
import { useState, type ComponentType } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { useCursor } from '@react-three/drei'
import type { OrganelleDef } from '../../content/organelles'
import { useParameciumState } from '../../state/ParameciumState'

export type OrganelleVisualState = {
  selected: boolean
  dimmed: boolean
  targetEmissive: number
  targetOpacity: number
}
export type OrganelleRenderer = ComponentType<{ def: OrganelleDef; state: OrganelleVisualState }>

/** Owns hover/select/cursor + the dim/highlight policy; hands `state` to a renderer. */
export function OrganelleShell({ def, Renderer }: { def: OrganelleDef; Renderer: OrganelleRenderer }) {
  const selectedId = useParameciumState(s => s.selectedOrganelleId)
  const select = useParameciumState(s => s.select)
  const viewMode = useParameciumState(s => s.viewMode)
  const [hovered, setHovered] = useState(false)
  useCursor(hovered && viewMode === 'cell')

  const isSelected = selectedId === def.id
  const anySelected = selectedId !== null
  const highlighted = hovered && !anySelected && viewMode === 'cell'
  const state: OrganelleVisualState = {
    selected: isSelected,
    dimmed: anySelected && !isSelected,
    targetEmissive: isSelected ? 0.55 : highlighted ? 0.28 : 0,
    targetOpacity: anySelected && !isSelected ? 0.22 : 0.95,
  }

  const onOver = (e: ThreeEvent<PointerEvent>) => { if (viewMode === 'cell') { e.stopPropagation(); setHovered(true) } }
  const onOut = () => setHovered(false)
  const onDown = (e: ThreeEvent<PointerEvent>) => { if (viewMode === 'cell') { e.stopPropagation(); select(def.id) } }

  return (
    <group onPointerOver={onOver} onPointerOut={onOut} onPointerDown={onDown}>
      <Renderer def={def} state={state} />
    </group>
  )
}
```

- [ ] **Step 2: `GenericBlob.tsx`** (current look, driven by `state`)

```tsx
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, Color, MeshStandardMaterial } from 'three'
import type { OrganelleDef } from '../../content/organelles'
import { useReducedMotion } from '../../../../sdk/a11y/useReducedMotion'
import { dampAlpha } from '../life'
import type { OrganelleVisualState } from './OrganelleShell'

export function GenericBlob({ def, state }: { def: OrganelleDef; state: OrganelleVisualState }) {
  const reduced = useReducedMotion()
  const ref = useRef<Group>(null)
  const mat = useMemo(() => new MeshStandardMaterial({
    color: def.color, roughness: 0.5, transparent: true, opacity: 0.9,
    emissive: new Color(def.color), emissiveIntensity: 0,
  }), [def.color])

  useFrame((s, dt) => {
    const a = reduced ? 1 : dampAlpha(dt, 8)
    mat.emissiveIntensity += (state.targetEmissive - mat.emissiveIntensity) * a
    mat.opacity += (state.targetOpacity - mat.opacity) * a
    const g = ref.current
    if (g) g.scale.setScalar(state.selected && !reduced ? 1 + Math.sin(s.clock.elapsedTime * 4) * 0.05 : 1)
  })

  return (
    <group ref={ref}>
      {(def.positions ?? []).map((p, i) => (
        <mesh key={i} position={p} scale={def.scale} material={mat}>
          {def.kind === 'funnel'
            ? <coneGeometry args={[def.radius ?? 0.18, 0.4, 20, 1, true]} />
            : <sphereGeometry args={[def.radius ?? 0.12, 24, 20]} />}
        </mesh>
      ))}
    </group>
  )
}
```

- [ ] **Step 3: `Trichocysts.tsx`** (move the current dots version verbatim, fixed import path)

```tsx
import { useMemo } from 'react'
import { useParameciumState } from '../../state/ParameciumState'

/** Sparse dots just under the pellicle; glow when trichocysts are selected. */
export function Trichocysts() {
  const selectedId = useParameciumState(s => s.selectedOrganelleId)
  const on = selectedId === 'trichocysts'
  const dots = useMemo(() => {
    const out: [number, number, number][] = []
    const golden = Math.PI * (3 - Math.sqrt(5))
    for (let i = 0; i < 60; i++) {
      const y = 1 - (i / 59) * 2, r = Math.sqrt(Math.max(0, 1 - y * y)), th = golden * i
      out.push([Math.cos(th) * r * 1.42, y * 0.71, Math.sin(th) * r * 0.57])
    }
    return out
  }, [])
  return (
    <group>
      {dots.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshStandardMaterial color="#dfeaf2" emissive={on ? '#5FE3D0' : '#000000'} emissiveIntensity={on ? 0.8 : 0} transparent opacity={on ? 0.95 : 0.45} />
        </mesh>
      ))}
    </group>
  )
}
```

- [ ] **Step 4: `index.tsx`** (registry + fallback)

```tsx
import { ORGANELLES, type OrganelleId } from '../../content/organelles'
import { OrganelleShell, type OrganelleRenderer } from './OrganelleShell'
import { GenericBlob } from './GenericBlob'
import { Trichocysts } from './Trichocysts'

const POINT_ORGANELLES = ORGANELLES.filter(o => o.kind !== 'layer')

/** id → specialized renderer. Anything not listed falls back to GenericBlob. */
const RENDERERS: Partial<Record<OrganelleId, OrganelleRenderer>> = {}

export function Organelles() {
  return (
    <>
      {POINT_ORGANELLES.map(def => (
        <OrganelleShell key={def.id} def={def} Renderer={RENDERERS[def.id] ?? GenericBlob} />
      ))}
      <Trichocysts />
    </>
  )
}
```

- [ ] **Step 5: Turn `scene/Organelles.tsx` into a barrel** (replace whole file)

```tsx
export { Organelles } from './organelles'
```

- [ ] **Step 6: Confirm nothing imported the old dead `OrganelleId` re-export**

Run: `git grep -n "from './Organelles'" src ; git grep -n 'from "../scene/Organelles"' src`
Expected: only `src/labs/paramecium/scene/Cell.tsx` importing `{ Organelles }`. If anything imports `OrganelleId` from `./Organelles`, repoint it to `../content/organelles`.

- [ ] **Step 7: Gate**

```bash
npm run typecheck   # Expected: no errors
npm test            # Expected: all green (incl. motion)
```

- [ ] **Step 8: Manual visual check**

`npm run dev`, open `/biology/paramecium`, dive in. The cell must look **identical to production** (generic blobs), selection/dim/cursor unchanged.

- [ ] **Step 9: Commit**

```bash
git add src/labs/paramecium/scene/organelles src/labs/paramecium/scene/Organelles.tsx
git commit -m "refactor(paramecium): OrganelleShell + registry (behaviour-preserving)"
```

---

### Task 3: `ContractileVacuoles` (sphere + canals + pump)

**Files:**
- Create: `src/labs/paramecium/scene/organelles/ContractileVacuoles.tsx`
- Modify: `src/labs/paramecium/scene/organelles/index.tsx`

- [ ] **Step 1: Create `ContractileVacuoles.tsx`**

```tsx
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, Color, MeshStandardMaterial, Vector3, Quaternion } from 'three'
import type { OrganelleDef } from '../../content/organelles'
import { useReducedMotion } from '../../../../sdk/a11y/useReducedMotion'
import { dampAlpha } from '../life'
import { pumpScale, fibSphere } from './motion'
import type { OrganelleVisualState } from './OrganelleShell'

const UP = new Vector3(0, 1, 0)

export function ContractileVacuoles({ def, state }: { def: OrganelleDef; state: OrganelleVisualState }) {
  const reduced = useReducedMotion()
  const positions = def.positions ?? []
  const r = def.radius ?? 0.18
  const groups = useRef<Group[]>([])

  const mat = useMemo(() => new MeshStandardMaterial({
    color: def.color, emissive: new Color(def.color), emissiveIntensity: 0,
    roughness: 0.3, metalness: 0, transparent: true, opacity: 0.95,
  }), [def.color])
  const canalMat = useMemo(() => new MeshStandardMaterial({
    color: '#6fb0e0', emissive: new Color('#6fb0e0'), emissiveIntensity: 0,
    roughness: 0.5, transparent: true, opacity: 0.8,
  }), [])
  const canals = useMemo(() => fibSphere(7).map(([x, y, z]) => {
    const d = new Vector3(x, y, z)
    return { pos: d.clone().multiplyScalar(r * 0.9), quat: new Quaternion().setFromUnitVectors(UP, d) }
  }), [r])

  useFrame((s, dt) => {
    const a = reduced ? 1 : dampAlpha(dt, 8)
    mat.emissiveIntensity += (state.targetEmissive - mat.emissiveIntensity) * a
    mat.opacity += (state.targetOpacity - mat.opacity) * a
    canalMat.emissiveIntensity += (state.targetEmissive * 0.6 - canalMat.emissiveIntensity) * a
    canalMat.opacity += (Math.min(state.targetOpacity, 0.8) - canalMat.opacity) * a
    const t = s.clock.elapsedTime
    positions.forEach((_, i) => {
      const g = groups.current[i]
      if (g) g.scale.setScalar(reduced ? 0.85 : pumpScale(t, 3.4, i * 0.5))
    })
  })

  return (
    <>
      {positions.map((p, i) => (
        <group key={i} position={p} ref={(el) => { if (el) groups.current[i] = el }}>
          <mesh material={mat}><sphereGeometry args={[r, 24, 18]} /></mesh>
          {canals.map((c, k) => (
            <mesh key={k} position={c.pos.toArray()} quaternion={c.quat} material={canalMat}>
              <cylinderGeometry args={[0.012, 0.012, r * 1.7, 6]} />
            </mesh>
          ))}
          <mesh position={[-r * 0.3, r * 0.32, r * 0.3]} material={mat}>
            <sphereGeometry args={[r * 0.32, 12, 10]} />
          </mesh>
        </group>
      ))}
    </>
  )
}
```

- [ ] **Step 2: Register** — in `index.tsx`, add the import and entry:

```tsx
import { ContractileVacuoles } from './ContractileVacuoles'
// ...
const RENDERERS: Partial<Record<OrganelleId, OrganelleRenderer>> = {
  contractileVacuoles: ContractileVacuoles,
}
```

- [ ] **Step 3: Gate** — `npm run typecheck && npm test` → green.
- [ ] **Step 4: Visual** — dev: two front/back vacuoles now pump out of phase; canals radiate; selection still dims/glows.
- [ ] **Step 5: Commit**

```bash
git add src/labs/paramecium/scene/organelles/ContractileVacuoles.tsx src/labs/paramecium/scene/organelles/index.tsx
git commit -m "feat(paramecium): contractile vacuoles — canals + pump"
```

---

### Task 4: `FoodVacuoles` (cyclosis + digestion + specks)

**Files:**
- Create: `src/labs/paramecium/scene/organelles/FoodVacuoles.tsx`
- Modify: `src/labs/paramecium/scene/organelles/index.tsx`

- [ ] **Step 1: Create `FoodVacuoles.tsx`**

```tsx
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, Color, MeshStandardMaterial } from 'three'
import type { OrganelleDef } from '../../content/organelles'
import { useReducedMotion } from '../../../../sdk/a11y/useReducedMotion'
import { dampAlpha } from '../life'
import { cyclosisPos, digestColor } from './motion'
import type { OrganelleVisualState } from './OrganelleShell'

const SPECKS: [number, number, number][] = [[-0.32, -0.18, 0.1], [0.26, 0.12, -0.05], [0.02, 0.36, 0.15]]

export function FoodVacuoles({ def, state }: { def: OrganelleDef; state: OrganelleVisualState }) {
  const reduced = useReducedMotion()
  const positions = def.positions ?? []
  const count = positions.length
  const r = def.radius ?? 0.13
  const groups = useRef<Group[]>([])

  const mats = useMemo(
    () => positions.map(() => new MeshStandardMaterial({
      color: def.color, emissive: new Color(def.color), emissiveIntensity: 0,
      roughness: 0.5, transparent: true, opacity: 0.95,
    })),
    [count, def.color], // eslint-disable-line react-hooks/exhaustive-deps
  )
  const speckMat = useMemo(() => new MeshStandardMaterial({ color: '#3f5a23', roughness: 0.7 }), [])
  const scratch = useMemo(() => new Color(), [])

  useFrame((s, dt) => {
    const a = reduced ? 1 : dampAlpha(dt, 8)
    const t = s.clock.elapsedTime
    mats.forEach((m, i) => {
      m.emissiveIntensity += (state.targetEmissive - m.emissiveIntensity) * a
      m.opacity += (state.targetOpacity - m.opacity) * a
      const prog = reduced ? i / Math.max(1, count) : ((t / 18 + i / Math.max(1, count)) % 1)
      m.color.copy(scratch.copy(digestColor(prog)))
      const g = groups.current[i]
      if (!g) return
      const pos = reduced ? positions[i] : cyclosisPos(t, i, count)
      g.position.set(pos[0], pos[1], pos[2])
    })
  })

  return (
    <>
      {positions.map((p, i) => (
        <group key={i} position={p} ref={(el) => { if (el) groups.current[i] = el }}>
          <mesh material={mats[i]}><sphereGeometry args={[r, 20, 16]} /></mesh>
          {SPECKS.map((sp, k) => (
            <mesh key={k} position={[sp[0] * r, sp[1] * r, sp[2] * r]} scale={[r * 0.22, r * 0.11, r * 0.11]} material={speckMat}>
              <sphereGeometry args={[1, 8, 6]} />
            </mesh>
          ))}
        </group>
      ))}
    </>
  )
}
```

- [ ] **Step 2: Register** — in `index.tsx`:

```tsx
import { FoodVacuoles } from './FoodVacuoles'
// ...
const RENDERERS: Partial<Record<OrganelleId, OrganelleRenderer>> = {
  contractileVacuoles: ContractileVacuoles,
  foodVacuoles: FoodVacuoles,
}
```

- [ ] **Step 3: Gate** — `npm run typecheck && npm test` → green.
- [ ] **Step 4: Visual** — food vacuoles drift along a loop, colour shifting green→brown, each with dark specks inside.
- [ ] **Step 5: Commit**

```bash
git add src/labs/paramecium/scene/organelles/FoodVacuoles.tsx src/labs/paramecium/scene/organelles/index.tsx
git commit -m "feat(paramecium): food vacuoles — cyclosis + digestion colour"
```

---

### Task 5: Spike gate (full gate + deploy + user validation)

- [ ] **Step 1: Full gate**

```bash
npm run typecheck   # no errors
npm test            # all green
npm run build       # tsc && vite build succeed
```

- [ ] **Step 2: Controller deploys spike & pauses**

> **Controller action (not a subagent):** fast-forward/merge the branch tip to `master` and `git push origin master` so Vercel deploys. Tell the user to open `science-lab-phi.vercel.app/biology/paramecium`, dive in, and confirm the contractile + food vacuoles read as "realistic *and* clear" in real 3D. **Do not start Phase B until the user approves.** If the user wants tweaks, adjust on the branch and re-deploy.

---

# PHASE B — Remaining organelles (after spike approval)

### Task 6: `Macronucleus` (granular sausage)

**Files:**
- Create: `src/labs/paramecium/scene/organelles/Macronucleus.tsx`
- Modify: `src/labs/paramecium/scene/organelles/index.tsx`

- [ ] **Step 1: Create `Macronucleus.tsx`**

```tsx
import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, MeshStandardMaterial } from 'three'
import type { OrganelleDef } from '../../content/organelles'
import { useReducedMotion } from '../../../../sdk/a11y/useReducedMotion'
import { dampAlpha } from '../life'
import { fibSphere } from './motion'
import type { OrganelleVisualState } from './OrganelleShell'

export function Macronucleus({ def, state }: { def: OrganelleDef; state: OrganelleVisualState }) {
  const reduced = useReducedMotion()
  const p = def.positions?.[0] ?? [0, 0, 0]
  const sc = def.scale ?? [1, 1, 1]
  const r = def.radius ?? 0.3

  const mat = useMemo(() => new MeshStandardMaterial({
    color: def.color, emissive: new Color(def.color), emissiveIntensity: 0,
    roughness: 0.45, transparent: true, opacity: 0.95,
  }), [def.color])
  const speckMat = useMemo(() => new MeshStandardMaterial({ color: '#b9853c', roughness: 0.7, transparent: true, opacity: 0.5 }), [])
  const specks = useMemo(() => fibSphere(44).map(([x, y, z], i) => {
    const rr = 0.45 + 0.5 * (((i * 7) % 10) / 10)
    return [x * rr, y * rr, z * rr] as [number, number, number]
  }), [])

  useFrame((_, dt) => {
    const a = reduced ? 1 : dampAlpha(dt, 8)
    mat.emissiveIntensity += (state.targetEmissive - mat.emissiveIntensity) * a
    mat.opacity += (state.targetOpacity - mat.opacity) * a
  })

  return (
    <group position={p} scale={sc}>
      <mesh material={mat}><sphereGeometry args={[r, 32, 24]} /></mesh>
      {specks.map((spk, k) => (
        <mesh key={k} position={[spk[0] * r, spk[1] * r, spk[2] * r]} material={speckMat}>
          <sphereGeometry args={[r * 0.07, 6, 6]} />
        </mesh>
      ))}
    </group>
  )
}
```

- [ ] **Step 2: Register** `macronucleus: Macronucleus` in `index.tsx` (+ import).
- [ ] **Step 3: Gate** — `npm run typecheck && npm test` → green.
- [ ] **Step 4: Commit**

```bash
git add src/labs/paramecium/scene/organelles/Macronucleus.tsx src/labs/paramecium/scene/organelles/index.tsx
git commit -m "feat(paramecium): granular macronucleus"
```

---

### Task 7: `Micronucleus` (small bright sphere)

**Files:**
- Create: `src/labs/paramecium/scene/organelles/Micronucleus.tsx`
- Modify: `index.tsx`

- [ ] **Step 1: Create `Micronucleus.tsx`**

```tsx
import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, MeshStandardMaterial } from 'three'
import type { OrganelleDef } from '../../content/organelles'
import { useReducedMotion } from '../../../../sdk/a11y/useReducedMotion'
import { dampAlpha } from '../life'
import type { OrganelleVisualState } from './OrganelleShell'

export function Micronucleus({ def, state }: { def: OrganelleDef; state: OrganelleVisualState }) {
  const reduced = useReducedMotion()
  const p = def.positions?.[0] ?? [0, 0, 0]
  const r = def.radius ?? 0.1
  const mat = useMemo(() => new MeshStandardMaterial({
    color: def.color, emissive: new Color(def.color), emissiveIntensity: 0,
    roughness: 0.4, transparent: true, opacity: 0.95,
  }), [def.color])

  useFrame((_, dt) => {
    const a = reduced ? 1 : dampAlpha(dt, 8)
    mat.emissiveIntensity += (state.targetEmissive - mat.emissiveIntensity) * a
    mat.opacity += (state.targetOpacity - mat.opacity) * a
  })

  return (
    <group position={p}>
      <mesh material={mat}><sphereGeometry args={[r, 20, 16]} /></mesh>
      <mesh position={[-r * 0.25, r * 0.25, r * 0.25]}>
        <sphereGeometry args={[r * 0.34, 10, 8]} />
        <meshStandardMaterial color="#f3dcb4" roughness={0.5} transparent opacity={0.7} />
      </mesh>
    </group>
  )
}
```

- [ ] **Step 2: Register** `micronucleus: Micronucleus` in `index.tsx`.
- [ ] **Step 3: Gate** — `npm run typecheck && npm test` → green.
- [ ] **Step 4: Commit**

```bash
git add src/labs/paramecium/scene/organelles/Micronucleus.tsx src/labs/paramecium/scene/organelles/index.tsx
git commit -m "feat(paramecium): micronucleus"
```

---

### Task 8: `OralGroove` (funnel + on-select feeding) + `fireEnvelope`

**Files:**
- Modify: `src/labs/paramecium/scene/organelles/motion.ts` (+ `motion.test.ts`)
- Create: `src/labs/paramecium/scene/organelles/OralGroove.tsx`
- Modify: `index.tsx`

- [ ] **Step 1: Add a failing test for `fireEnvelope`** (append to `motion.test.ts`)

```ts
import { fireEnvelope } from './motion'

describe('fireEnvelope', () => {
  it('is zero outside the window and peaks inside', () => {
    expect(fireEnvelope(-1)).toBe(0)
    expect(fireEnvelope(0)).toBe(0)
    expect(fireEnvelope(1.2)).toBe(0)
    expect(fireEnvelope(0.6, 1.2)).toBeCloseTo(1, 5) // u=0.5 → hold
  })
  it('ramps up then down within [0,1]', () => {
    for (let i = 0; i <= 20; i++) {
      const v = fireEnvelope((i / 20) * 1.2, 1.2)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
    }
  })
})
```

Run: `npm test -- motion` → Expected: FAIL (`fireEnvelope` undefined).

- [ ] **Step 2: Implement `fireEnvelope`** (append to `motion.ts`)

```ts
/** One-shot 0→1→0 envelope over [0,duration]; 0 outside. For on-select bursts. */
export function fireEnvelope(localT: number, duration = 1.2): number {
  if (localT <= 0 || localT >= duration) return 0
  const u = localT / duration
  if (u < 0.2) return smoothstep(0, 0.2, u)
  if (u < 0.55) return 1
  return 1 - smoothstep(0.55, 1, u)
}
```

Run: `npm test -- motion` → Expected: PASS.

- [ ] **Step 3: Create `OralGroove.tsx`**

```tsx
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, Mesh, MeshStandardMaterial, DoubleSide } from 'three'
import type { OrganelleDef } from '../../content/organelles'
import { useReducedMotion } from '../../../../sdk/a11y/useReducedMotion'
import { dampAlpha } from '../life'
import { smoothstep } from './motion'
import type { OrganelleVisualState } from './OrganelleShell'

export function OralGroove({ def, state }: { def: OrganelleDef; state: OrganelleVisualState }) {
  const reduced = useReducedMotion()
  const p = def.positions?.[0] ?? [0, 0, 0]
  const r = def.radius ?? 0.18
  const preyRef = useRef<Mesh>(null)
  const budRef = useRef<Mesh>(null)
  const startRef = useRef<number | null>(null)

  const mat = useMemo(() => new MeshStandardMaterial({
    color: def.color, emissive: new Color(def.color), emissiveIntensity: 0,
    roughness: 0.5, transparent: true, opacity: 0.95, side: DoubleSide,
  }), [def.color])

  useFrame((s, dt) => {
    const a = reduced ? 1 : dampAlpha(dt, 8)
    mat.emissiveIntensity += (state.targetEmissive - mat.emissiveIntensity) * a
    mat.opacity += (state.targetOpacity - mat.opacity) * a
    const prey = preyRef.current, bud = budRef.current
    if (!prey || !bud) return
    if (!state.selected || reduced) { startRef.current = null; prey.visible = false; bud.visible = false; return }
    if (startRef.current === null) startRef.current = s.clock.elapsedTime
    const q = ((s.clock.elapsedTime - startRef.current) / 3) % 1
    prey.visible = q < 0.8
    const k = Math.min(1, q / 0.8)
    prey.position.set(p[0] - 0.5 + 0.5 * k, p[1] - 0.35 + 0.35 * k, p[2] + 0.25 - 0.25 * k)
    const bq = q > 0.78 ? smoothstep(0.78, 0.95, q) : 0
    bud.visible = bq > 0.01
    bud.scale.setScalar(0.12 * bq)
  })

  return (
    <group>
      <mesh position={p} rotation={[Math.PI, 0, 0]} material={mat}>
        <coneGeometry args={[r, 0.45, 22, 1, true]} />
      </mesh>
      <mesh ref={preyRef} visible={false}>
        <sphereGeometry args={[0.045, 10, 8]} />
        <meshStandardMaterial color="#3f5a23" roughness={0.7} />
      </mesh>
      <mesh ref={budRef} position={[p[0] + 0.15, p[1] + 0.2, p[2] - 0.1]} visible={false}>
        <sphereGeometry args={[1, 16, 12]} />
        <meshStandardMaterial color="#a7c46a" roughness={0.5} transparent opacity={0.9} />
      </mesh>
    </group>
  )
}
```

- [ ] **Step 4: Register** `oral: OralGroove` in `index.tsx`.
- [ ] **Step 5: Gate** — `npm run typecheck && npm test` → green.
- [ ] **Step 6: Visual** — selecting the mouth shows a speck swept in + a vacuole budding; reduced-motion shows the static funnel only.
- [ ] **Step 7: Commit**

```bash
git add src/labs/paramecium/scene/organelles/motion.ts src/labs/paramecium/scene/organelles/motion.test.ts src/labs/paramecium/scene/organelles/OralGroove.tsx src/labs/paramecium/scene/organelles/index.tsx
git commit -m "feat(paramecium): oral groove + feeding (fireEnvelope)"
```

---

### Task 9: `Trichocysts` firing upgrade

**Files:**
- Modify: `src/labs/paramecium/scene/organelles/Trichocysts.tsx` (replace whole file)

- [ ] **Step 1: Replace `Trichocysts.tsx`**

```tsx
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, Color, MeshStandardMaterial, Vector3, Quaternion } from 'three'
import { useParameciumState } from '../../state/ParameciumState'
import { useReducedMotion } from '../../../../sdk/a11y/useReducedMotion'
import { dampAlpha, A, B, C } from '../life'
import { fibSphere, fireEnvelope } from './motion'

const UP = new Vector3(0, 1, 0)

/** Dots just under the pellicle; on select, a subset fires threads outward. */
export function Trichocysts() {
  const selectedId = useParameciumState(s => s.selectedOrganelleId)
  const reduced = useReducedMotion()
  const on = selectedId === 'trichocysts'

  const points = useMemo(() => fibSphere(60).map(([x, y, z]) => ({
    pos: new Vector3(x * 1.42, y * 0.71, z * 0.57),
    nrm: new Vector3(x / A, y / B, z / C).normalize(),
  })), [])
  const darts = useMemo(() => points.filter((_, i) => i % 4 === 0), [points])

  const dotMat = useMemo(() => new MeshStandardMaterial({
    color: '#dfeaf2', emissive: new Color('#5FE3D0'), emissiveIntensity: 0, transparent: true, opacity: 0.45,
  }), [])
  const dartMat = useMemo(() => new MeshStandardMaterial({
    color: '#eafffb', emissive: new Color('#5FE3D0'), emissiveIntensity: 0.5, transparent: true, opacity: 0.85,
  }), [])
  const dartRefs = useRef<Group[]>([])
  const startRef = useRef<number | null>(null)

  useFrame((s, dt) => {
    const a = reduced ? 1 : dampAlpha(dt, 8)
    dotMat.emissiveIntensity += ((on ? 0.8 : 0) - dotMat.emissiveIntensity) * a
    dotMat.opacity += ((on ? 0.95 : 0.45) - dotMat.opacity) * a
    if (!on || reduced) { startRef.current = null; dartRefs.current.forEach(d => { if (d) d.scale.y = 0 }); return }
    if (startRef.current === null) startRef.current = s.clock.elapsedTime
    const localT = s.clock.elapsedTime - startRef.current
    dartRefs.current.forEach((d, i) => { if (d) d.scale.y = fireEnvelope((localT + i * 0.03) % 2.4, 1.2) })
  })

  return (
    <group>
      {points.map((pt, i) => (
        <mesh key={'dot' + i} position={pt.pos.toArray()} material={dotMat}>
          <sphereGeometry args={[0.03, 8, 8]} />
        </mesh>
      ))}
      {darts.map((pt, i) => (
        <group key={'dart' + i} position={pt.pos.toArray()} quaternion={new Quaternion().setFromUnitVectors(UP, pt.nrm)} ref={(el) => { if (el) dartRefs.current[i] = el }} scale={[1, 0, 1]}>
          <mesh material={dartMat} position={[0, 0.25, 0]}>
            <cylinderGeometry args={[0.006, 0.002, 0.5, 4]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}
```

- [ ] **Step 2: Gate** — `npm run typecheck && npm test` → green.
- [ ] **Step 3: Visual** — selecting trichocysts fires staggered threads; deselect/reduced → threads retract to zero.
- [ ] **Step 4: Commit**

```bash
git add src/labs/paramecium/scene/organelles/Trichocysts.tsx
git commit -m "feat(paramecium): trichocysts fire on select"
```

---

### Task 10: `AnalPore` + remove `GenericBlob` fallback

**Files:**
- Create: `src/labs/paramecium/scene/organelles/AnalPore.tsx`
- Modify: `src/labs/paramecium/scene/organelles/index.tsx`
- Delete: `src/labs/paramecium/scene/organelles/GenericBlob.tsx`

- [ ] **Step 1: Create `AnalPore.tsx`**

```tsx
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, Mesh, MeshStandardMaterial } from 'three'
import type { OrganelleDef } from '../../content/organelles'
import { useReducedMotion } from '../../../../sdk/a11y/useReducedMotion'
import { dampAlpha } from '../life'
import type { OrganelleVisualState } from './OrganelleShell'

export function AnalPore({ def, state }: { def: OrganelleDef; state: OrganelleVisualState }) {
  const reduced = useReducedMotion()
  const p = def.positions?.[0] ?? [0, 0, 0]
  const r = def.radius ?? 0.08
  const remnantRef = useRef<Mesh>(null)
  const startRef = useRef<number | null>(null)

  const mat = useMemo(() => new MeshStandardMaterial({
    color: def.color, emissive: new Color(def.color), emissiveIntensity: 0,
    roughness: 0.6, transparent: true, opacity: 0.95,
  }), [def.color])

  useFrame((s, dt) => {
    const a = reduced ? 1 : dampAlpha(dt, 8)
    mat.emissiveIntensity += (state.targetEmissive - mat.emissiveIntensity) * a
    mat.opacity += (state.targetOpacity - mat.opacity) * a
    const rm = remnantRef.current
    if (!rm) return
    if (!state.selected || reduced) { startRef.current = null; rm.visible = false; return }
    if (startRef.current === null) startRef.current = s.clock.elapsedTime
    const q = ((s.clock.elapsedTime - startRef.current) / 2.6) % 1
    rm.visible = q < 0.85
    rm.position.set(p[0] + q * 0.5, p[1] - q * 0.1, p[2])
    ;(rm.material as MeshStandardMaterial).opacity = 0.8 * (1 - q)
  })

  return (
    <group>
      <mesh position={p} material={mat}><sphereGeometry args={[r, 14, 12]} /></mesh>
      <mesh ref={remnantRef} visible={false}>
        <sphereGeometry args={[0.035, 8, 6]} />
        <meshStandardMaterial color="#6b7a4a" roughness={0.7} transparent opacity={0.8} />
      </mesh>
    </group>
  )
}
```

- [ ] **Step 2: Finalize `index.tsx`** (all 6 point ids registered, fallback removed)

```tsx
import { ORGANELLES, type OrganelleId } from '../../content/organelles'
import { OrganelleShell, type OrganelleRenderer } from './OrganelleShell'
import { Trichocysts } from './Trichocysts'
import { ContractileVacuoles } from './ContractileVacuoles'
import { FoodVacuoles } from './FoodVacuoles'
import { Macronucleus } from './Macronucleus'
import { Micronucleus } from './Micronucleus'
import { OralGroove } from './OralGroove'
import { AnalPore } from './AnalPore'

const POINT_ORGANELLES = ORGANELLES.filter(o => o.kind !== 'layer')

const RENDERERS: Partial<Record<OrganelleId, OrganelleRenderer>> = {
  contractileVacuoles: ContractileVacuoles,
  foodVacuoles: FoodVacuoles,
  macronucleus: Macronucleus,
  micronucleus: Micronucleus,
  oral: OralGroove,
  analPore: AnalPore,
}

export function Organelles() {
  return (
    <>
      {POINT_ORGANELLES.map(def => {
        const Renderer = RENDERERS[def.id]
        return Renderer ? <OrganelleShell key={def.id} def={def} Renderer={Renderer} /> : null
      })}
      <Trichocysts />
    </>
  )
}
```

- [ ] **Step 3: Delete the fallback**

```bash
git rm src/labs/paramecium/scene/organelles/GenericBlob.tsx
git grep -n GenericBlob src   # Expected: no matches
```

- [ ] **Step 4: Gate** — `npm run typecheck && npm test` → green (no unused-import errors).
- [ ] **Step 5: Commit**

```bash
git add src/labs/paramecium/scene/organelles/AnalPore.tsx src/labs/paramecium/scene/organelles/index.tsx
git commit -m "feat(paramecium): anal pore + drop generic fallback"
```

---

# PHASE C — Clarity + polish

### Task 11: `OrganelleLabel` (in-scene callout) + `SelectedLabel`

**Files:**
- Create: `src/labs/paramecium/scene/organelles/OrganelleLabel.tsx`
- Modify: `src/labs/paramecium/scene/organelles/index.tsx`

- [ ] **Step 1: Create `OrganelleLabel.tsx`**

```tsx
import { Html, Line } from '@react-three/drei'
import type { OrganelleDef } from '../../content/organelles'
import { A, B, C } from '../life'

const LAYER_ANCHORS: Record<string, [number, number, number]> = {
  cilia: [0, B + 0.1, 0],
  pellicle: [A * 0.7, 0.2, 0],
  trichocysts: [0, B * 0.7, C * 0.7],
}

export function OrganelleLabel({ def }: { def: OrganelleDef }) {
  const anchor = def.positions?.[0] ?? LAYER_ANCHORS[def.id] ?? [0, 0, 0]
  const end: [number, number, number] = [anchor[0] + 0.4, anchor[1] + 0.5, anchor[2] + 0.15]
  return (
    <group>
      <Line points={[anchor, end]} color={def.color} lineWidth={1} transparent opacity={0.7} />
      <Html position={end} center distanceFactor={6} zIndexRange={[20, 0]}>
        <div style={{
          pointerEvents: 'none', whiteSpace: 'nowrap', transform: 'translateY(-50%)',
          padding: '3px 9px', borderRadius: 999, fontSize: 13, fontWeight: 600,
          fontFamily: 'system-ui, sans-serif', color: '#06121a',
          background: def.color, boxShadow: '0 4px 14px -4px rgba(0,0,0,.5)',
        }}>{def.label}</div>
      </Html>
    </group>
  )
}
```

- [ ] **Step 2: Add `SelectedLabel` to `index.tsx`** (works for point *and* layer organelles). Make three import changes, then add the component and mount it:

1. Change the content import to pull in `getOrganelle`:
   `import { ORGANELLES, getOrganelle, type OrganelleId } from '../../content/organelles'`
2. Add: `import { useParameciumState } from '../../state/ParameciumState'`
3. Add: `import { OrganelleLabel } from './OrganelleLabel'`

```tsx
function SelectedLabel() {
  const id = useParameciumState(s => s.selectedOrganelleId)
  const viewMode = useParameciumState(s => s.viewMode)
  if (!id || viewMode !== 'cell') return null
  return <OrganelleLabel def={getOrganelle(id)} />
}
```

Mount inside the `Organelles` fragment, after `<Trichocysts />`:

```tsx
      <Trichocysts />
      <SelectedLabel />
```

- [ ] **Step 3: Gate** — `npm run typecheck && npm test` → green.
- [ ] **Step 4: Visual** — selecting any organelle shows a coloured pill + leader line beside it; clearing selection or returning to the drop removes it.
- [ ] **Step 5: Commit**

```bash
git add src/labs/paramecium/scene/organelles/OrganelleLabel.tsx src/labs/paramecium/scene/organelles/index.tsx
git commit -m "feat(paramecium): in-scene organelle label callout"
```

---

### Task 12: Refine `Cilia` (thinner, wavier)

**Files:**
- Modify: `src/labs/paramecium/scene/Cilia.tsx`

- [ ] **Step 1: Slimmer, longer cone geometry** — replace line 52:

```tsx
      <coneGeometry args={[0.018, 0.13, 5]} />
```
with
```tsx
      <coneGeometry args={[0.009, 0.17, 6]} />
```

- [ ] **Step 2: Wavier beat + softer material** — replace the beat line (inside `useFrame`):

```tsx
      if (!reduced) dummy.rotateX(Math.sin(t * 6 + data.ph[i] * 3) * 0.5)
```
with
```tsx
      if (!reduced) dummy.rotateX(Math.sin(t * 6 + data.ph[i] * 3) * 0.6 + Math.sin(t * 3 + data.ph[i]) * 0.12)
```

and the material opacity (in the `useMemo`) from `opacity: 0.85` to `opacity: 0.8`.

- [ ] **Step 3: Gate** — `npm run typecheck && npm test` → green.
- [ ] **Step 4: Visual** — cilia read as fine hairs with a gentler metachronal wave.
- [ ] **Step 5: Commit**

```bash
git add src/labs/paramecium/scene/Cilia.tsx
git commit -m "polish(paramecium): finer, wavier cilia"
```

---

### Task 13: Pellicle cortex pattern (procedural CanvasTexture)

**Files:**
- Modify: `src/labs/paramecium/scene/Cell.tsx`

- [ ] **Step 1: Add a texture factory + overlay mesh.** At the top of `Cell.tsx`, extend the three import and add a helper:

```tsx
import { Group, Vector3, MeshPhysicalMaterial, MeshStandardMaterial, Color, DoubleSide, CanvasTexture, RepeatWrapping } from 'three'
```

```tsx
/** Faint rhombic cortex pattern drawn at runtime (zero asset files). */
function makePellicleTexture(): CanvasTexture {
  const s = 256
  const c = document.createElement('canvas')
  c.width = c.height = s
  const ctx = c.getContext('2d')!
  ctx.clearRect(0, 0, s, s)
  ctx.strokeStyle = 'rgba(191,238,226,0.9)'
  ctx.lineWidth = 2
  const step = 32
  for (let i = -s; i < s * 2; i += step) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + s, s); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i - s, s); ctx.stroke()
  }
  const tex = new CanvasTexture(c)
  tex.wrapS = tex.wrapT = RepeatWrapping
  tex.repeat.set(6, 3)
  return tex
}
```

- [ ] **Step 2: Build the texture once + an overlay material**, inside `Cell()` next to `bodyMat`:

```tsx
  const pellicleTex = useMemo(() => makePellicleTexture(), [])
  const pellicleMat = useMemo(() => new MeshStandardMaterial({
    color: '#bfeee2', emissive: new Color('#5FE3D0'), emissiveIntensity: 0.15,
    transparent: true, opacity: 0.12, alphaMap: pellicleTex,
    depthWrite: false, side: DoubleSide,
  }), [pellicleTex])
```

(`MeshStandardMaterial` is already added to the three import in Step 1.)

- [ ] **Step 3: Mount the overlay** just after the body `<mesh>…</mesh>` (a hair inside the membrane):

```tsx
      <mesh scale={[A * 0.99, B * 0.99, C * 0.99]} material={pellicleMat}>
        <sphereGeometry args={[1, 64, 48]} />
      </mesh>
```

- [ ] **Step 4: Gate** — `npm run typecheck && npm test` → green.
- [ ] **Step 5: Visual** — the cell surface shows a faint diagonal cortex weave; glass still reads as translucent.
- [ ] **Step 6: Commit**

```bash
git add src/labs/paramecium/scene/Cell.tsx
git commit -m "polish(paramecium): procedural pellicle cortex pattern"
```

---

# PHASE D — Finish

### Task 14: Full gate, final review, finish branch

- [ ] **Step 1: Full gate**

```bash
npm run typecheck   # no errors
npm test            # all green (motion tests + existing suite)
npm run build       # tsc && vite build succeed
```

- [ ] **Step 2: Final whole-implementation review** — controller dispatches a final code-reviewer subagent (most capable model) over the full diff `master..feat/paramecium-organelles-realism`, checking: every motion path reduced-motion-gated; no shared-material mutation leaks; pointer/cursor still cell-view-gated; label shows for all 9 ids; `noUnusedLocals` clean; no dead `GenericBlob`/`OrganelleId` references.

- [ ] **Step 3: Browser smoke** — `/biology/paramecium`: dive in → each organelle reads as its real self; vacuoles pump, food cycles+browns, mouth feeds & trichocysts fire on select, labels appear; "← Краплина" + reduced-motion both behave.

- [ ] **Step 4: Finish** — REQUIRED SUB-SKILL `superpowers:finishing-a-development-branch`: `merge --no-ff` → `master`, push, delete branch. (Confirm push with the user, per standing rule.)

---

## Self-review notes (author)

- **Spec coverage:** style B per-organelle shapes (T3,4,6,7,8,9,10) ✓; 4 motions — pump (T3), cyclosis+digest (T4), trichocyst fire (T9), oral feed (T8) ✓; in-scene labels A (T11) ✓; cilia refine (T12) ✓; pellicle texture (T13) ✓; pure-math tests (T1,T8) ✓; reduced-motion gating in every renderer's `useFrame` ✓; spike gate (T5) ✓.
- **Type consistency:** `OrganelleVisualState { selected, dimmed, targetEmissive, targetOpacity }` and `OrganelleRenderer` defined once in `OrganelleShell.tsx`, imported by every renderer; `motion.ts` signatures match their tests.
- **Per-task gate independence:** each task's `index.tsx` import set matches exactly what that task *uses* — `getOrganelle` is added in T11 (where `SelectedLabel` first needs it), not earlier, so every task passes `noUnusedLocals` on its own. `Trichocysts` is registered as a layer component in T2 and only its internals change in T9 (registry untouched).
- **Reduced-motion:** every renderer's `useFrame` early-returns or substitutes a rest pose when `reduced` — pump (T3), cyclosis+digest (T4), oral feed (T8), trichocyst fire (T9), anal remnant (T10), cilia beat (T12, pre-existing gate).
