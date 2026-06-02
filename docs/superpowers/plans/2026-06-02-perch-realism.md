# Perch Realism + Clarity Pass — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or the `Workflow` tool (ultracode) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax. Aesthetic constants (taper profile, fin/organ positions, light intensities) are **spike-tunable** — the Task 7 prod gate validates them.

**Goal:** Make the perch lab realistic *and* наочно — fusiform tapered body, richer skin, PBR wet sheen + contact shadows + lit cavity, real organ shapes, and always-on labels — without touching the architecture, phases, or drag-to-cut mechanic.

**Architecture:** Enrich-in-place. New pure `scene/shape.ts` (body taper math, tested). Enrich `PerchBody`, `Organs`, `Tray`, `PerchScene`, `PartLabel`; add `Labels.tsx`; nudge `content/parts.ts` positions. Body stays two z-split hemispheres (far wall + hinged flap) but each is tapered along X by `bodyProfile(t)` — sign of z never changes, so the split + hinge survive.

**Tech Stack:** React 19, @react-three/fiber 9, @react-three/drei 10, three 0.184, Zustand 5, Vitest 4, TS strict (`noUnusedLocals`).

---

## Branch & deploy strategy

- Branch **`feat/perch-realism`** off `master` (`b3fbd33`).
- **Spike gate (after Task 7):** controller fast-forwards the spike tip to `master`, pushes; user validates realism+clarity on prod before Phase B.
- **Finish (Task 11):** `merge --no-ff` → `master` → push.

## File structure

| File | Change | Task |
|---|---|---|
| `scene/shape.ts` (+`.test.ts`) | NEW — `bodyProfile(t)` (pure, tested) + `taperGeometry(geo)` | 1 |
| `scene/PerchBody.tsx` | tapered geometry + richer skin + PBR + muscle-lined flap + repositioned fins/head + cavity light | 2 |
| `scene/Tray.tsx` + `PerchScene.tsx` | rim light + `ContactShadows` | 3 |
| `scene/PartLabel.tsx` + `scene/Labels.tsx` (NEW) + `PerchScene.tsx` | ambient label variant + always-on labels | 4 |
| `scene/Organs.tsx` | PBR material + hero organs (gills/liver/swimBladder) | 5 |
| `scene/Organs.tsx` + `content/parts.ts` | remaining organs (heart/stomach/intestine/kidney) + spacing | 8 |
| `scene/PerchBody.tsx` | fin rays + head polish | 9 |

**Unchanged:** `state/PerchState.ts`, `scene/cut.ts`, `scene/PartShell.tsx`, `scene/Scalpel.tsx`, `scene/ExternalParts.tsx`, `index.tsx`, `ui/*`, route, the 3-phase flow + cut mechanic.

---

# PHASE A — Spike

### Task 0: Branch
```bash
cd "C:\Users\vdomo\OneDrive\Рабочий стол\3dwebsimulation"
git checkout master && git switch -c feat/perch-realism && git status -sb
```

---

### Task 1: `shape.ts` body-taper math + test (TDD)

**Files:** Create `src/labs/perch/scene/shape.ts`, `src/labs/perch/scene/shape.test.ts`

- [ ] **Step 1: failing test** — `src/labs/perch/scene/shape.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { bodyProfile } from './shape'

describe('bodyProfile', () => {
  it('is thin at snout, thinner at tail, peaks behind the head', () => {
    expect(bodyProfile(0)).toBeCloseTo(0.42, 2)
    expect(bodyProfile(1)).toBeCloseTo(0.12, 2)
    expect(bodyProfile(0.34)).toBeGreaterThan(bodyProfile(0))
    expect(bodyProfile(0.34)).toBeGreaterThan(bodyProfile(1))
  })
  it('peaks in the front third and stays within (0,1]', () => {
    let max = 0, argmax = 0
    for (let i = 0; i <= 100; i++) {
      const t = i / 100, v = bodyProfile(t)
      expect(v).toBeGreaterThan(0)
      expect(v).toBeLessThanOrEqual(1 + 1e-9)
      if (v > max) { max = v; argmax = t }
    }
    expect(max).toBeCloseTo(1, 2)
    expect(argmax).toBeGreaterThan(0.25)
    expect(argmax).toBeLessThan(0.45)
  })
  it('clamps out-of-range input', () => {
    expect(bodyProfile(-1)).toBe(bodyProfile(0))
    expect(bodyProfile(2)).toBe(bodyProfile(1))
  })
})
```

- [ ] **Step 2: run → FAIL** — `npm test -- perch/scene/shape`.

- [ ] **Step 3: implement** — `src/labs/perch/scene/shape.ts`:

```ts
import { BufferGeometry, BufferAttribute } from 'three'
import { clamp01 } from './cut'

function smoothstep(e0: number, e1: number, x: number): number {
  if (e0 === e1) return x < e0 ? 0 : 1
  const t = clamp01((x - e0) / (e1 - e0))
  return t * t * (3 - 2 * t)
}

/** Fish girth profile along the body: t=0 snout … t=1 tail. Peaks just behind the head. */
export function bodyProfile(t: number): number {
  const tt = clamp01(t)
  const head = 0.42 + 0.58 * smoothstep(0, 0.30, tt)   // 0.42 → 1.0
  const tail = 1 - 0.88 * smoothstep(0.38, 1.0, tt)     // 1.0 → 0.12
  return head * tail
}

/** Taper a unit-sphere body half into a fusiform shape (scales y,z by bodyProfile(x)). In place. */
export function taperGeometry(geo: BufferGeometry): void {
  const pos = geo.getAttribute('position') as BufferAttribute
  for (let i = 0; i < pos.count; i++) {
    const f = bodyProfile((pos.getX(i) + 1) / 2)
    pos.setY(i, pos.getY(i) * f)
    pos.setZ(i, pos.getZ(i) * f)
  }
  pos.needsUpdate = true
  geo.computeVertexNormals()
}
```

- [ ] **Step 4: run → PASS** — `npm test -- perch/scene/shape`. Then `npm run typecheck` → clean.
- [ ] **Step 5: commit**
```bash
git add src/labs/perch/scene/shape.ts src/labs/perch/scene/shape.test.ts
git commit -m "feat(perch): body taper profile (bodyProfile) + tests"
```

---

### Task 2: Reshape `PerchBody` (tapered body + PBR + skin + flap lining + fins/head + cavity light)

**Files:** Modify `src/labs/perch/scene/PerchBody.tsx` (replace whole file).

- [ ] **Step 1: replace `src/labs/perch/scene/PerchBody.tsx` with:**

```tsx
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  Group, SphereGeometry, CanvasTexture, RepeatWrapping, DoubleSide, BackSide, Shape,
  MeshPhysicalMaterial, MeshStandardMaterial,
} from 'three'
import { usePerchState } from '../state/PerchState'
import { useReducedMotion } from '../../../sdk/a11y/useReducedMotion'
import { BODY, COLORS, dampAlpha } from './anatomy'
import { flapAngle } from './cut'
import { bodyProfile, taperGeometry } from './shape'

/** Olive→pale gradient + scale arcs + form bars + lateral line; zero asset files. */
function makeSkin(): CanvasTexture {
  const w = 256, h = 128
  const c = document.createElement('canvas'); c.width = w; c.height = h
  const ctx = c.getContext('2d')!
  const g = ctx.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0, COLORS.back); g.addColorStop(0.55, '#94a05e'); g.addColorStop(1, COLORS.belly)
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h)
  ctx.strokeStyle = 'rgba(60,75,30,0.20)'; ctx.lineWidth = 1
  for (let row = 0, y = 8; y < h * 0.82; y += 9, row++)
    for (let x = (row % 2 ? 5 : 0); x < w; x += 10) {
      ctx.beginPath(); ctx.arc(x, y + 6, 6, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke()
    }
  ctx.fillStyle = 'rgba(40,55,20,0.30)'
  for (let i = 0; i < 7; i++) ctx.fillRect(18 + i * 34, 0, 9, h * 0.72)
  ctx.strokeStyle = 'rgba(50,62,30,0.5)'; ctx.setLineDash([3, 4])
  ctx.beginPath(); ctx.moveTo(0, h * 0.42); ctx.lineTo(w, h * 0.40); ctx.stroke(); ctx.setLineDash([])
  const tex = new CanvasTexture(c); tex.wrapS = tex.wrapT = RepeatWrapping
  return tex
}

function Fin({ pts, position, rotation, color }: { pts: [number, number][]; position: [number, number, number]; rotation?: [number, number, number]; color: string }) {
  const geo = useMemo(() => {
    const s = new Shape(); s.moveTo(pts[0][0], pts[0][1])
    pts.slice(1).forEach(([x, y]) => s.lineTo(x, y)); s.closePath(); return s
  }, [pts])
  return (
    <mesh position={position} rotation={rotation}>
      <shapeGeometry args={[geo]} />
      <meshPhysicalMaterial color={color} side={DoubleSide} roughness={0.6} clearcoat={0.5} clearcoatRoughness={0.4} transparent opacity={0.96} />
    </mesh>
  )
}

/** Body half-height/width at a world-X, following the taper (for placing fins on the surface). */
const profAt = (wx: number) => bodyProfile((wx / BODY.L + 1) / 2)

export function PerchBody() {
  const reduced = useReducedMotion()
  const cutProgress = usePerchState(s => s.cutProgress)
  const flapRef = useRef<Group>(null)
  const bodyRef = useRef<Group>(null)
  const skin = useMemo(() => makeSkin(), [])

  const farGeo = useMemo(() => { const g = new SphereGeometry(1, 64, 44, Math.PI, Math.PI); taperGeometry(g); return g }, [])
  const flapGeo = useMemo(() => { const g = new SphereGeometry(1, 64, 44, 0, Math.PI); taperGeometry(g); return g }, [])
  const cavityGeo = useMemo(() => { const g = new SphereGeometry(1, 44, 30, Math.PI, Math.PI); taperGeometry(g); return g }, [])

  const skinMat = useMemo(() => new MeshPhysicalMaterial({ map: skin, roughness: 0.5, clearcoat: 0.55, clearcoatRoughness: 0.35, side: DoubleSide }), [skin])
  const flapMat = useMemo(() => new MeshPhysicalMaterial({ map: skin, roughness: 0.5, clearcoat: 0.55, clearcoatRoughness: 0.35, side: DoubleSide }), [skin])
  const liningMat = useMemo(() => new MeshStandardMaterial({ color: '#b07058', roughness: 0.85, side: BackSide }), [])
  const cavityMat = useMemo(() => new MeshStandardMaterial({ color: '#6e5a4c', roughness: 0.9, side: DoubleSide, emissive: '#2a1c14', emissiveIntensity: 0.3 }), [])

  useFrame((st, dt) => {
    const flap = flapRef.current
    if (flap) {
      const target = flapAngle(cutProgress)
      flap.rotation.x = reduced ? target : flap.rotation.x + (target - flap.rotation.x) * dampAlpha(dt, 9)
    }
    const body = bodyRef.current
    if (body) body.scale.setScalar(reduced ? 1 : 1 + Math.sin(st.clock.elapsedTime * 1.2) * 0.012)
  })

  const topY = (wx: number) => BODY.H * profAt(wx)
  const botY = (wx: number) => -BODY.H * profAt(wx)

  return (
    <group ref={bodyRef}>
      <mesh geometry={farGeo} scale={[BODY.L, BODY.H, BODY.W]} material={skinMat} />
      <mesh geometry={cavityGeo} scale={[BODY.L * 0.95, BODY.H * 0.94, BODY.W * 0.9]} material={cavityMat} />

      {/* near wall = FLAP (hinged at dorsal ridge) + inner muscle lining */}
      <group ref={flapRef} position={[0, BODY.H, 0]}>
        <mesh geometry={flapGeo} position={[0, -BODY.H, 0]} scale={[BODY.L, BODY.H, BODY.W]} material={flapMat} />
        <mesh geometry={flapGeo} position={[0, -BODY.H, 0]} scale={[BODY.L * 0.97, BODY.H * 0.97, BODY.W * 0.97]} material={liningMat} />
      </group>

      {/* soft interior light so organs read when the cavity is open */}
      <pointLight position={[0.2, 0, 0.28]} intensity={0.5} distance={2.6} decay={2} color="#ffe8cf" />

      {/* tail (forked) at the narrow peduncle */}
      <Fin pts={[[0, 0], [0.7, 0.42], [0.46, 0], [0.7, -0.42]]} position={[BODY.L * 0.98, 0, 0]} rotation={[Math.PI / 2, 0, 0]} color={COLORS.finOlive} />
      {/* dorsal fins follow the tapered back */}
      <Fin pts={[[0, 0], [0.18, 0.5], [0.5, 0.12], [0.7, 0]]} position={[-0.2, topY(-0.2) + 0.02, 0]} rotation={[Math.PI / 2, 0, 0]} color={COLORS.finOlive} />
      <Fin pts={[[0, 0], [0.22, 0.34], [0.5, 0]]} position={[0.7, topY(0.7) + 0.02, 0]} rotation={[Math.PI / 2, 0, 0]} color={COLORS.finOlive} />
      {/* anal + pelvic + pectoral (reddish) on the tapered belly/flank */}
      <Fin pts={[[0, 0], [0.18, -0.3], [0.42, 0]]} position={[0.7, botY(0.7) - 0.02, 0]} rotation={[Math.PI / 2, 0, 0]} color={COLORS.finRed} />
      <Fin pts={[[0, 0], [0.12, -0.28], [0.3, 0]]} position={[-0.5, botY(-0.5) - 0.02, 0.2]} rotation={[Math.PI / 2, 0, 0.3]} color={COLORS.finRed} />
      <Fin pts={[[0, 0], [0.26, -0.16], [0.28, 0.14]]} position={[-0.85, -0.1, BODY.W * profAt(-0.85) * 0.85]} rotation={[0, 0.5, -0.4]} color={COLORS.finRed} />

      {/* operculum (gill-cover plate) */}
      <mesh position={[-1.12, 0.05, BODY.W * profAt(-1.12) * 0.62]} rotation={[0, 0.5, 0]}>
        <boxGeometry args={[0.05, BODY.H * profAt(-1.12) * 1.5, 0.5]} />
        <meshPhysicalMaterial color={COLORS.operculum} roughness={0.45} clearcoat={0.5} />
      </mesh>
      {/* eye (clearcoat highlight) + pupil */}
      <mesh position={[-1.5, 0.16, BODY.W * profAt(-1.5) * 0.6]}>
        <sphereGeometry args={[0.12, 20, 16]} />
        <meshPhysicalMaterial color="#efe9d6" roughness={0.2} clearcoat={1} clearcoatRoughness={0.05} />
      </mesh>
      <mesh position={[-1.58, 0.16, BODY.W * profAt(-1.5) * 0.6 + 0.04]}>
        <sphereGeometry args={[0.06, 14, 12]} />
        <meshStandardMaterial color={COLORS.eye} />
      </mesh>
    </group>
  )
}
```

- [ ] **Step 2: gate** — `npm run typecheck && npm test` → green.
- [ ] **Step 3: visual** — fusiform perch (deep behind head, tapering to a thin tail), wet sheen, fins sit on the tapered surface, eye glints, opened cavity shows a warm muscle-lined flap. *Tune taper/fin/eye constants until it reads right.*
- [ ] **Step 4: commit**
```bash
git add src/labs/perch/scene/PerchBody.tsx
git commit -m "feat(perch): fusiform tapered body + PBR skin + muscle-lined flap + cavity light"
```

---

### Task 3: Lighting — rim + contact shadows

**Files:** Modify `src/labs/perch/scene/Tray.tsx`, `src/labs/perch/scene/PerchScene.tsx`.

- [ ] **Step 1: add a rim light** — in `Tray.tsx`, after the existing two `directionalLight`s, add:
```tsx
      <directionalLight position={[-3, 4, -6]} intensity={0.7} color="#cfe8ff" />
```

- [ ] **Step 2: contact shadows** — in `PerchScene.tsx`, add the import and a `<ContactShadows>` inside `<Suspense>` just after `<Tray />`:
```tsx
import { OrbitControls, Environment as DreiEnvironment, Loader, ContactShadows } from '@react-three/drei'
// ...
          <Tray />
          <ContactShadows position={[0, -0.97, 0]} opacity={0.5} scale={11} blur={2.6} far={3.2} color="#04121a" />
```
(Replace the existing `import { OrbitControls, Environment as DreiEnvironment, Loader } from '@react-three/drei'` line with the one above that adds `ContactShadows`.)

- [ ] **Step 3: gate** — `npm run typecheck && npm test` → green.
- [ ] **Step 4: visual** — soft contact shadow grounds the fish on the tray; rim light separates it from the background.
- [ ] **Step 5: commit**
```bash
git add src/labs/perch/scene/Tray.tsx src/labs/perch/scene/PerchScene.tsx
git commit -m "feat(perch): rim light + contact shadows"
```

---

### Task 4: Always-on labels (ambient `PartLabel` + `Labels`)

**Files:** Modify `src/labs/perch/scene/PartLabel.tsx`; Create `src/labs/perch/scene/Labels.tsx`; Modify `src/labs/perch/scene/PerchScene.tsx`.

- [ ] **Step 1: ambient variant** — replace `src/labs/perch/scene/PartLabel.tsx` with:

```tsx
import { Html, Line } from '@react-three/drei'
import type { PartDef } from '../content/parts'

export function PartLabel({ def, ambient = false }: { def: PartDef; ambient?: boolean }) {
  const a = def.position
  const end: [number, number, number] = [a[0] + 0.45, a[1] + 0.55, a[2] + 0.2]
  return (
    <group>
      <Line points={[a, end]} color={def.color} lineWidth={ambient ? 0.8 : 1.2} transparent opacity={ambient ? 0.4 : 0.8} />
      <Html position={end} center distanceFactor={7} zIndexRange={ambient ? [10, 0] : [20, 0]}>
        <div style={{
          pointerEvents: 'none', whiteSpace: 'nowrap', transform: 'translateY(-50%)',
          padding: ambient ? '2px 7px' : '3px 9px', borderRadius: 999,
          fontSize: ambient ? 11 : 13, fontWeight: 600, fontFamily: 'system-ui, sans-serif',
          color: '#06121a', background: def.color, opacity: ambient ? 0.62 : 1,
          boxShadow: ambient ? 'none' : '0 4px 14px -4px rgba(0,0,0,.5)',
        }}>{def.label}</div>
      </Html>
    </group>
  )
}
```

- [ ] **Step 2: create `src/labs/perch/scene/Labels.tsx`**

```tsx
import { PARTS } from '../content/parts'
import { usePerchState } from '../state/PerchState'
import { PartLabel } from './PartLabel'

/** Always-on labels for the current phase's parts; the selected one is full-strength. */
export function Labels() {
  const phase = usePerchState(s => s.phase)
  const selected = usePerchState(s => s.selectedPartId)
  if (phase === 'intro') return null
  const parts = PARTS.filter(p => p.phase === phase)
  return <>{parts.map(p => <PartLabel key={p.id} def={p} ambient={p.id !== selected} />)}</>
}
```

- [ ] **Step 3: swap in `PerchScene.tsx`** — remove the `SelectedLabel` helper and its `getPart`/`PartLabel` imports; import and mount `Labels` instead. Replace:
```tsx
import { usePerchState } from '../state/PerchState'
import { getPart } from '../content/parts'
import { PartLabel } from './PartLabel'
import { HUD } from '../ui/HUD'

function SelectedLabel() {
  const id = usePerchState(s => s.selectedPartId)
  if (!id) return null
  return <PartLabel def={getPart(id)} />
}
```
with:
```tsx
import { Labels } from './Labels'
import { HUD } from '../ui/HUD'
```
and change the mount `<SelectedLabel />` → `<Labels />`.

- [ ] **Step 4: gate** — `npm run typecheck && npm test` → green (watch for now-unused `usePerchState`/`getPart` imports — they're removed above).
- [ ] **Step 5: visual** — in the internal phase every organ shows a faint label; the selected one pops. (External phase shows the 9 part labels — judge clutter at the gate; Task 8 can dial external back to on-select if needed.)
- [ ] **Step 6: commit**
```bash
git add src/labs/perch/scene/PartLabel.tsx src/labs/perch/scene/Labels.tsx src/labs/perch/scene/PerchScene.tsx
git commit -m "feat(perch): always-on ambient labels (bright on select)"
```

---

### Task 5: Hero organs (PBR + gills/liver/swimBladder)

**Files:** Modify `src/labs/perch/scene/Organs.tsx`.

- [ ] **Step 1: replace `src/labs/perch/scene/Organs.tsx` with** (PBR material; gills as filament combs, lobed liver, sheeny swim bladder; the other four keep current shapes for now):

```tsx
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, MeshPhysicalMaterial, Group } from 'three'
import type { PartDef } from '../content/parts'
import { PARTS } from '../content/parts'
import { useReducedMotion } from '../../../sdk/a11y/useReducedMotion'
import { dampAlpha } from './anatomy'
import { PartShell, type PartVisualState, type PartRenderer } from './PartShell'

const ORGAN_PARTS = PARTS.filter(p => p.phase === 'internal')

function OrganMesh({ def, state }: { def: PartDef; state: PartVisualState }) {
  const reduced = useReducedMotion()
  const ref = useRef<Group>(null)
  const wet = def.id === 'swimBladder'
  const mat = useMemo(() => new MeshPhysicalMaterial({
    color: def.color, emissive: new Color(def.color), emissiveIntensity: 0,
    roughness: wet ? 0.18 : 0.5, clearcoat: wet ? 1 : 0.5, clearcoatRoughness: wet ? 0.1 : 0.4,
    transparent: true, opacity: 0.97,
  }), [def.color, wet])

  useFrame((s, dt) => {
    const a = reduced ? 1 : dampAlpha(dt, 8)
    mat.emissiveIntensity += (state.targetEmissive - mat.emissiveIntensity) * a
    mat.opacity += (state.targetOpacity - mat.opacity) * a
    if (ref.current && def.id === 'gills') ref.current.rotation.z = reduced ? 0 : Math.sin(s.clock.elapsedTime * 1.5) * 0.06
  })

  const p = def.position
  switch (def.id) {
    case 'gills':
      return (
        <group ref={ref} position={[p[0], p[1], p[2]]}>
          {[0, 1, 2, 3].map(i => (
            <mesh key={i} position={[0, -i * 0.085, 0]} rotation={[0, 0, -0.2]} material={mat}>
              <torusGeometry args={[0.15, 0.022, 8, 20, Math.PI * 1.1]} />
            </mesh>
          ))}
        </group>
      )
    case 'liver': // 3 lobes
      return (
        <group position={[p[0], p[1], p[2]]}>
          <mesh material={mat}><sphereGeometry args={[0.2, 18, 14]} /></mesh>
          <mesh position={[0.16, -0.04, 0.04]} material={mat}><sphereGeometry args={[0.14, 16, 12]} /></mesh>
          <mesh position={[-0.13, -0.05, -0.03]} material={mat}><sphereGeometry args={[0.12, 16, 12]} /></mesh>
        </group>
      )
    case 'swimBladder':
      return (
        <mesh position={p} scale={[2.5, 0.72, 0.72]} material={mat}>
          <sphereGeometry args={[0.3, 32, 22]} />
        </mesh>
      )
    case 'heart':
      return <mesh position={p} material={mat}><sphereGeometry args={[0.17, 18, 14]} /></mesh>
    case 'stomach':
      return <mesh position={p} scale={[1.2, 1.4, 0.8]} material={mat}><sphereGeometry args={[0.2, 16, 14]} /></mesh>
    case 'intestine':
      return <mesh position={p} material={mat}><torusKnotGeometry args={[0.16, 0.05, 64, 8, 2, 3]} /></mesh>
    case 'kidney':
      return <mesh position={p} scale={[3.2, 0.5, 0.4]} material={mat}><sphereGeometry args={[0.16, 18, 12]} /></mesh>
    default:
      return <mesh position={p} material={mat}><sphereGeometry args={[0.16, 16, 12]} /></mesh>
  }
}

const Renderer: PartRenderer = OrganMesh

export function Organs() {
  return <>{ORGAN_PARTS.map(def => <PartShell key={def.id} def={def} Renderer={Renderer} />)}</>
}
```

- [ ] **Step 2: gate** — `npm run typecheck && npm test` → green.
- [ ] **Step 3: visual** — gills read as red filament combs, liver is lobed, swim bladder is a glossy silvery sac; all wet-shaded.
- [ ] **Step 4: commit**
```bash
git add src/labs/perch/scene/Organs.tsx
git commit -m "feat(perch): PBR organs + realistic gills/liver/swim-bladder"
```

---

### Task 6: Spike self-check

- [ ] **Step 1: full gate** — `npm run typecheck` · `npm test` · `npm run build` all succeed.
- [ ] **Step 2: commit any tuning** made during the visual checks of Tasks 2–5 (one `polish(perch): spike tuning` commit if needed).

---

### Task 7: Spike gate (deploy + user validation)

- [ ] **Step 1:** Controller fast-forwards `master` to the spike tip, `git push origin master`. User opens `science-lab-phi.vercel.app/biology/perch` and confirms the fish + cavity read **realistic *and* clear**. **Do not start Phase B until approved.** Tune on the branch + redeploy on request.

---

# PHASE B — Remaining organs + fin/head polish (ultracode Workflow)

### Task 8: Remaining organs (heart/stomach/intestine/kidney) + spacing

**Files:** Modify `src/labs/perch/scene/Organs.tsx`, `src/labs/perch/content/parts.ts`.

- [ ] **Step 1: upgrade the four cases** in `Organs.tsx`'s `switch` — replace exactly these four `case` blocks:

```tsx
    case 'heart': // two-lobe + outflow bulb
      return (
        <group position={[p[0], p[1], p[2]]}>
          <mesh material={mat}><sphereGeometry args={[0.15, 18, 14]} /></mesh>
          <mesh position={[0.06, 0.12, 0]} scale={[0.7, 0.9, 0.7]} material={mat}><sphereGeometry args={[0.1, 14, 12]} /></mesh>
        </group>
      )
    case 'stomach': // J-sac
      return (
        <group position={[p[0], p[1], p[2]]} rotation={[0, 0, 0.5]}>
          <mesh scale={[1, 1.5, 0.85]} material={mat}><sphereGeometry args={[0.16, 18, 14]} /></mesh>
          <mesh position={[0.13, -0.16, 0]} scale={[0.7, 0.7, 0.7]} material={mat}><sphereGeometry args={[0.13, 14, 12]} /></mesh>
        </group>
      )
    case 'intestine': // coiled tube (geometry built once at module scope)
      return <mesh position={p} geometry={COIL_GEO} material={mat} />
    case 'kidney':
      return <mesh position={p} scale={[3.4, 0.42, 0.34]} material={mat}><sphereGeometry args={[0.16, 18, 12]} /></mesh>
```

- [ ] **Step 2: add the coil geometry** — change the `three` import line at the top of `Organs.tsx` from `import { Color, MeshPhysicalMaterial, Group } from 'three'` to:

```tsx
import { Color, MeshPhysicalMaterial, Group, TubeGeometry, CatmullRomCurve3, Vector3 } from 'three'
```

and add this at module scope (after the imports, before `OrganMesh`) — built once, reused by the `intestine` case:

```tsx
/** A short coiled intestine tube, built once. */
const COIL_GEO = (() => {
  const pts: Vector3[] = []
  for (let i = 0; i <= 28; i++) {
    const a = (i / 28) * Math.PI * 3.2
    pts.push(new Vector3(Math.cos(a) * 0.16, (i / 28 - 0.5) * 0.14, Math.sin(a) * 0.13))
  }
  return new TubeGeometry(new CatmullRomCurve3(pts), 48, 0.045, 8, false)
})()
```

- [ ] **Step 3: nudge positions for spacing** in `src/labs/perch/content/parts.ts` — so the seven organs don't overlap in the open cavity. Update the `position` of the internal parts to:
  - `gills` `[-1.15, 0.05, 0.18]`
  - `heart` `[-0.92, -0.5, 0.12]`
  - `liver` `[-0.5, -0.42, 0.12]`
  - `swimBladder` `[0.25, 0.5, 0.06]`
  - `stomach` `[-0.05, -0.46, 0.12]`
  - `intestine` `[0.5, -0.5, 0.12]`
  - `kidney` `[0.25, 0.6, 0.0]`
  (Only the `position` arrays change; labels + facts unchanged. The parts test asserts counts/ids/facts, so it stays green.)

- [ ] **Step 4: gate** — `npm run typecheck && npm test` → green.
- [ ] **Step 5: commit**
```bash
git add src/labs/perch/scene/Organs.tsx src/labs/perch/content/parts.ts
git commit -m "feat(perch): realistic heart/stomach/intestine/kidney + organ spacing"
```

---

### Task 9: Fin rays + external-label tuning

**Files:** Modify `src/labs/perch/scene/PerchBody.tsx` (fin rays), and `src/labs/perch/scene/Labels.tsx` if external labels are cluttered.

- [ ] **Step 1: fin rays** — bake faint ray lines into the fin look. In `PerchBody.tsx`, give `Fin` an optional `rays` array and draw thin dark lines. Replace the `Fin` component with:

```tsx
function Fin({ pts, position, rotation, color, rays }: { pts: [number, number][]; position: [number, number, number]; rotation?: [number, number, number]; color: string; rays?: [number, number, number, number][] }) {
  const geo = useMemo(() => {
    const s = new Shape(); s.moveTo(pts[0][0], pts[0][1])
    pts.slice(1).forEach(([x, y]) => s.lineTo(x, y)); s.closePath(); return s
  }, [pts])
  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <shapeGeometry args={[geo]} />
        <meshPhysicalMaterial color={color} side={DoubleSide} roughness={0.6} clearcoat={0.5} clearcoatRoughness={0.4} transparent opacity={0.96} />
      </mesh>
      {(rays ?? []).map(([x1, y1, x2, y2], i) => (
        <mesh key={i} position={[(x1 + x2) / 2, (y1 + y2) / 2, 0.001]} rotation={[0, 0, Math.atan2(y2 - y1, x2 - x1)]}>
          <planeGeometry args={[Math.hypot(x2 - x1, y2 - y1), 0.006]} />
          <meshBasicMaterial color="#46522f" transparent opacity={0.5} side={DoubleSide} />
        </mesh>
      ))}
    </group>
  )
}
```
Then add `rays` to the two dorsal fins, e.g. the spiny dorsal:
```tsx
        rays={[[0.08, 0.06, 0.18, 0.46], [0.24, 0.04, 0.32, 0.30], [0.4, 0.04, 0.46, 0.16]]}
```
and a couple of rays for the tail and soft dorsal (keep it subtle).

- [ ] **Step 2 (conditional): external labels** — if the 9 always-on external labels read cluttered, gate them to selected-only in `Labels.tsx` by changing the body to:
```tsx
  if (phase === 'intro') return null
  const parts = PARTS.filter(p => p.phase === phase)
  return <>{parts.map(p => {
    if (phase === 'external' && p.id !== selected) return null
    return <PartLabel key={p.id} def={p} ambient={p.id !== selected} />
  })}</>
```
(Decide based on the look. If external always-on is fine, skip this step.)

- [ ] **Step 3: gate** — `npm run typecheck && npm test` → green.
- [ ] **Step 4: commit**
```bash
git add src/labs/perch/scene/PerchBody.tsx src/labs/perch/scene/Labels.tsx
git commit -m "polish(perch): fin rays + external-label tuning"
```

---

# PHASE C — Finish

### Task 10: Full gate + final review

- [ ] **Step 1: full gate** — `npm run typecheck` · `npm test` · `npm run build` succeed.
- [ ] **Step 2: final review** — controller dispatches a final reviewer (most capable model) over `git diff b3fbd33..HEAD -- src/labs/perch`: taper preserves the flap split + hinge; reduced-motion still complete; no shared-material leaks; labels cover all parts; PBR/lighting not tanking perf (check the perch chunk size); `noUnusedLocals` clean.
- [ ] **Step 3: browser smoke** — `/biology/perch`: realistic fish, drag-cut opens to a lit cavity with shaped, spaced, labeled organs; «Зашити»; reduced-motion; phone.

### Task 11: Finish the branch

- [ ] REQUIRED SUB-SKILL `superpowers:finishing-a-development-branch`: `merge --no-ff` → `master`, push (confirm with user), delete branch.

---

## Self-review notes (author)

- **Spec coverage:** fusiform body via `bodyProfile` taper (T1–2) ✓; richer skin (T2) ✓; PBR wet sheen (T2, T5) ✓; muscle-lined flap (T2) ✓; lit cavity (T2 point light + T2 cavity emissive) ✓; rim + contact shadows (T3) ✓; always-on labels (T4) ✓; hero organs (T5) + remaining organs + spacing (T8) ✓; fins+head detail (T2 reposition + T9 rays) ✓; pure `bodyProfile` test (T1) ✓; spike gate (T7) ✓; ultracode Workflow (Phase B fans out: T8 organs vs T9 fins/labels touch different files → parallel-safe) ✓.
- **Type consistency:** `bodyProfile`/`taperGeometry`/`clamp01` signatures match the test + `cut.ts` import; `PartLabel` gains optional `ambient` (default false) so existing call sites stay valid; `Labels` replaces `SelectedLabel`; `OrganMesh` switch ids match `parts.ts` ids; `MeshPhysicalMaterial` swapped for `MeshStandardMaterial` consistently in `PerchBody`/`Organs`.
- **Reduced-motion:** unchanged `useFrame`s (flap, breathing, gills) keep their `reduced` gates; everything new (geometry, PBR, lights, labels, contact shadows) is static.
- **Parallel-safety (ultracode):** Phase B T8 (`Organs.tsx`, `parts.ts`) and T9 (`PerchBody.tsx`, `Labels.tsx`) touch disjoint files → safe to run as parallel Workflow stages; the spike (Phase A) is sequential because tasks share `PerchScene.tsx`/`PerchBody.tsx`.
