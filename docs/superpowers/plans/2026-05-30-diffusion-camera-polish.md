# Diffusion Lab — Camera / Lighting / Alignment Polish — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the diffusion lab a free-orbit camera, kill the glass blow-out (clearer scale), and align the «Далі» button under the MC pills — without affecting the other two labs.

**Architecture:** Swap the diffusion lab's fixed `CameraRig` + `PinchZoomController` for drei `OrbitControls` (rotate/zoom, constrained, centred on the box). Tune the blow-out in the diffusion scene (exposure, Environment intensity, glass, cube edges) plus an additive `bloom*` prop on the shared `PostFX`. Add an opt-in `fullWidth` to the shared `Button`. All shared-SDK edits keep current-behaviour defaults so `mass-measurement` / `electromagnetic-induction` are untouched.

**Tech Stack:** React 19, @react-three/fiber 9, @react-three/drei 10 (`OrbitControls`, `Environment`, `Edges`), three 0.184, @react-three/postprocessing 3, Vitest + @testing-library/react.

Spec: `docs/superpowers/specs/2026-05-30-diffusion-camera-polish-design.md`.

---

## Pre-flight

- [ ] **P1: Branch**

```bash
git checkout master
git checkout -b feat/diffusion-camera-polish
```

- [ ] **P2: Baseline green** (scoped run — the full suite's R3F/jsdom env flakes on collection)

```bash
npx tsc --noEmit
npx vitest run src/labs/brownian-diffusion src/sdk
```
Expected: tsc 0 errors; tests pass.

Conventions: Windows + Git Bash (forward-slash paths). `git add <specific files>`.

---

## Task 1: SDK `Button` — opt-in `fullWidth`

**Files:**
- Modify: `src/sdk/ui/Button.tsx`
- Test: `src/sdk/ui/__tests__/Button.test.tsx` (create)

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Button } from '../Button'

describe('Button fullWidth', () => {
  it('stretches to 100% when fullWidth', () => {
    const { getByRole } = render(<Button fullWidth onClick={() => {}}>X</Button>)
    expect(getByRole('button').style.width).toBe('100%')
  })
  it('does not set width by default', () => {
    const { getByRole } = render(<Button onClick={() => {}}>X</Button>)
    expect(getByRole('button').style.width).toBe('')
  })
})
```

- [ ] **Step 2: Run it — expect FAIL** (`fullWidth` not a prop yet)

```bash
npx vitest run src/sdk/ui/__tests__/Button.test.tsx
```

- [ ] **Step 3: Implement.** In `src/sdk/ui/Button.tsx`:

Add `fullWidth?: boolean` to the `Props` type (next to `disabled?`):
```tsx
  disabled?: boolean
  fullWidth?: boolean
```
Add it to the destructured params (next to `disabled`):
```tsx
  disabled,
  fullWidth,
```
Add one line to the inline `style` object (anywhere among the properties, e.g. right after `borderRadius: 12,`):
```tsx
        width: fullWidth ? '100%' : undefined,
```

- [ ] **Step 4: Run it — expect PASS**

```bash
npx vitest run src/sdk/ui/__tests__/Button.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/sdk/ui/Button.tsx src/sdk/ui/__tests__/Button.test.tsx
git commit -m "feat(sdk): Button fullWidth opt-in (default off)"
```

---

## Task 2: SDK `PostFX` — optional bloom props

**Files:**
- Modify: `src/sdk/scene/PostFX.tsx`

No unit test (the `EffectComposer`/`Bloom` pass is R3F-only and not unit-tested); the gate is `tsc` + that other labs still compile with `<PostFX/>`.

- [ ] **Step 1: Implement.** Replace the contents of `src/sdk/scene/PostFX.tsx` with:

```tsx
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'

type Props = {
  /** Bloom strength. Default 0.22 (unchanged for existing labs). */
  bloomIntensity?: number
  /** Luminance threshold above which pixels bloom. Default 0.92. */
  bloomThreshold?: number
}

/**
 * Light post-processing pass. Bloom for highlights/LCD glow, vignette
 * for compositional focus. Tone mapping is applied at the Canvas-level
 * via gl prop (ACESFilmicToneMapping) — not via a post pass for perf.
 *
 * Bloom is tunable per lab (defaults preserve the original look); the
 * diffusion lab passes gentler values so its glass box doesn't blow out.
 */
export function PostFX({ bloomIntensity = 0.22, bloomThreshold = 0.92 }: Props = {}) {
  return (
    <EffectComposer>
      <Bloom intensity={bloomIntensity} luminanceThreshold={bloomThreshold} luminanceSmoothing={0.05} mipmapBlur />
      <Vignette eskil={false} offset={0.3} darkness={0.6} />
    </EffectComposer>
  )
}
```

- [ ] **Step 2: Type-check** (other labs call `<PostFX/>` with no args → still valid)

```bash
npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/sdk/scene/PostFX.tsx
git commit -m "feat(sdk): PostFX optional bloomIntensity/bloomThreshold (defaults unchanged)"
```

---

## Task 3: HUD — full-width «Далі» button

**Files:**
- Modify: `src/labs/brownian-diffusion/ui/HUD.tsx`

- [ ] **Step 1: Implement.** In `src/labs/brownian-diffusion/ui/HUD.tsx`, find the unified «Далі» button block:

```tsx
        {/* Unified «Далі» button for every step */}
        {step && (
          <Button
            disabled={!satisfied}
            aria-label="Далі"
            onClick={() => {
              setGoalReached(false)
              useStepEngine.getState().setLastMCChoice(null)
              if (isLast) advanceScene()
              else useStepEngine.getState().advanceStep()
            }}
          >
            {label}
          </Button>
        )}
```

Replace it with (wrap in a top-margin div + pass `fullWidth` so it spans the panel under the MC pills):

```tsx
        {/* Unified «Далі» button for every step — full width to line up under the MC pills */}
        {step && (
          <div style={{ marginTop: 12 }}>
            <Button
              fullWidth
              disabled={!satisfied}
              aria-label="Далі"
              onClick={() => {
                setGoalReached(false)
                useStepEngine.getState().setLastMCChoice(null)
                if (isLast) advanceScene()
                else useStepEngine.getState().advanceStep()
              }}
            >
              {label}
            </Button>
          </div>
        )}
```

- [ ] **Step 2: Type-check + lab tests**

```bash
npx tsc --noEmit
npx vitest run src/labs/brownian-diffusion
```
Expected: 0 errors, tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/labs/brownian-diffusion/ui/HUD.tsx
git commit -m "fix(diffusion): full-width Далі button aligns under MC options"
```

---

## Task 4: `GlassBox` — gentler glass + crisp cube edges

**Files:**
- Modify (rewrite): `src/labs/brownian-diffusion/instruments/GlassBox.tsx`

R3F component — no unit test; gate is `tsc` + prod verify. The wall reflections currently mirror the bright studio environment into a hotspot (roughness was `0.1`); raise roughness + lower opacity so the glass reads clean, and add an edge outline so the cube extent (and molecule scale) is obvious.

- [ ] **Step 1: Implement.** Replace the contents of `src/labs/brownian-diffusion/instruments/GlassBox.tsx` with:

```tsx
import { Edges } from '@react-three/drei'

/**
 * A transparent glass cube on the lab table. Renders the 6 walls (5 if
 * `openTop`) as thin transparent boxes with subtle blue tint, plus a crisp
 * edge outline so the cube's extent reads at a glance. The cube's INTERIOR
 * (the AABB used by the particle engine) is exposed as `BOX_INTERIOR`.
 */
export const BOX_HALF = 0.10
export const BOX_INTERIOR = {
  min: { x: -BOX_HALF, y: -BOX_HALF, z: -BOX_HALF },
  max: { x:  BOX_HALF, y:  BOX_HALF, z:  BOX_HALF },
}

type Props = {
  /** Centre of the box, world-space. Y is centre, not base. */
  position: [number, number, number]
  /** If true, top wall is omitted. */
  openTop?: boolean
}

const WALL_THICK = 0.003
// Higher than the old 0.1 so the studio environment stops mirroring into a
// hard specular hotspot on the glass.
const WALL_ROUGH = 0.35

export function GlassBox({ position, openTop = false }: Props) {
  return (
    <group position={position}>
      {/* Bottom */}
      <mesh position={[0, -BOX_HALF, 0]}>
        <boxGeometry args={[2 * BOX_HALF, WALL_THICK, 2 * BOX_HALF]} />
        <meshStandardMaterial color="#88c4ff" transparent opacity={0.12} roughness={WALL_ROUGH} metalness={0} />
      </mesh>
      {/* Top */}
      {!openTop && (
        <mesh position={[0, BOX_HALF, 0]}>
          <boxGeometry args={[2 * BOX_HALF, WALL_THICK, 2 * BOX_HALF]} />
          <meshStandardMaterial color="#88c4ff" transparent opacity={0.08} roughness={WALL_ROUGH} />
        </mesh>
      )}
      {/* Left / Right (x) */}
      <mesh position={[-BOX_HALF, 0, 0]}>
        <boxGeometry args={[WALL_THICK, 2 * BOX_HALF, 2 * BOX_HALF]} />
        <meshStandardMaterial color="#88c4ff" transparent opacity={0.10} roughness={WALL_ROUGH} />
      </mesh>
      <mesh position={[BOX_HALF, 0, 0]}>
        <boxGeometry args={[WALL_THICK, 2 * BOX_HALF, 2 * BOX_HALF]} />
        <meshStandardMaterial color="#88c4ff" transparent opacity={0.10} roughness={WALL_ROUGH} />
      </mesh>
      {/* Front / Back (z) */}
      <mesh position={[0, 0, -BOX_HALF]}>
        <boxGeometry args={[2 * BOX_HALF, 2 * BOX_HALF, WALL_THICK]} />
        <meshStandardMaterial color="#88c4ff" transparent opacity={0.10} roughness={WALL_ROUGH} />
      </mesh>
      <mesh position={[0, 0, BOX_HALF]}>
        <boxGeometry args={[2 * BOX_HALF, 2 * BOX_HALF, WALL_THICK]} />
        <meshStandardMaterial color="#88c4ff" transparent opacity={0.10} roughness={WALL_ROUGH} />
      </mesh>
      {/* Crisp edge outline — makes the cube extent + molecule scale obvious */}
      <mesh>
        <boxGeometry args={[2 * BOX_HALF, 2 * BOX_HALF, 2 * BOX_HALF]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        <Edges threshold={15} color="#9ec5ff" />
      </mesh>
    </group>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/labs/brownian-diffusion/instruments/GlassBox.tsx
git commit -m "feat(diffusion): calmer glass + crisp cube edges for scale clarity"
```

---

## Task 5: `LabScene` — orbit camera + lighting

**Files:**
- Modify: `src/labs/brownian-diffusion/scene/LabScene.tsx`

The core change: replace the fixed `CameraRig` + `PinchZoomController` with constrained `OrbitControls`, wire the `+/−` buttons to it, keep responsive FOV, and dial down the blow-out (exposure + environment + bloom). R3F — gate is `tsc` + lab tests + prod verify.

- [ ] **Step 1: Update imports.** Apply these edits to the import block of `scene/LabScene.tsx`:

- `import { useCallback, useEffect, useRef, useState } from 'react'` → `import { useCallback, useEffect, useRef, useState, type ElementRef } from 'react'`
- `import { Canvas } from '@react-three/fiber'` → `import { Canvas, useThree } from '@react-three/fiber'`
- `import { ACESFilmicToneMapping } from 'three'` → `import { ACESFilmicToneMapping, MOUSE, TOUCH, PerspectiveCamera } from 'three'`
- `import { Environment } from '@react-three/drei'` → `import { Environment, OrbitControls } from '@react-three/drei'`
- DELETE `import { CameraRig } from '../../../sdk/scene/CameraRig'`
- DELETE `import { ZoomControls } from '../../../sdk/ui/ZoomControls'`
- DELETE `import { PinchZoomController } from '../../../sdk/scene/PinchZoomController'`

- [ ] **Step 2: Add helpers + small components.** Insert this block right BEFORE `export function LabScene() {`:

```tsx
function fovForBreakpoint(bp: string): number {
  return bp === 'phone' ? 62 : bp === 'tablet' ? 56 : 50
}

/** In-canvas: keep the perspective FOV right for the current breakpoint. */
function CameraFov({ fov }: { fov: number }) {
  const { camera } = useThree()
  useEffect(() => {
    if (camera instanceof PerspectiveCamera && camera.fov !== fov) {
      camera.fov = fov
      camera.updateProjectionMatrix()
    }
  }, [camera, fov])
  return null
}

type OrbitRef = ElementRef<typeof OrbitControls>

/** Dolly the orbit camera by scaling its distance to the target, clamped to min/max. */
function dollyOrbit(orbit: OrbitRef | null, factor: number): void {
  if (!orbit) return
  const cam = orbit.object
  const offset = cam.position.clone().sub(orbit.target)
  const dist = Math.min(orbit.maxDistance, Math.max(orbit.minDistance, offset.length() * factor))
  offset.setLength(dist)
  cam.position.copy(orbit.target).add(offset)
  orbit.update()
}

/** +/- zoom buttons for the orbit camera (mirrors the SDK ZoomControls look). */
function OrbitZoom({ orbitRef, isPhone }: { orbitRef: React.RefObject<OrbitRef | null>; isPhone: boolean }) {
  const btn: React.CSSProperties = {
    background: 'rgba(20,20,24,0.72)', backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.08)', color: '#f5f5f7', borderRadius: 8,
    width: isPhone ? 48 : 40, height: isPhone ? 48 : 40, fontSize: isPhone ? 22 : 18, cursor: 'pointer',
  }
  return (
    <>
      <button style={btn} title="Наблизити" aria-label="Наблизити камеру" onClick={() => dollyOrbit(orbitRef.current, 0.85)}>+</button>
      <button style={btn} title="Віддалити" aria-label="Віддалити камеру" onClick={() => dollyOrbit(orbitRef.current, 1.18)}>−</button>
    </>
  )
}
```

- [ ] **Step 3: Add the orbit ref + FOV + target effect** inside `LabScene`, right after `const [renderKey, setRenderKey] = useState(0)`:

```tsx
  const orbitRef = useRef<OrbitRef>(null)
  const fov = fovForBreakpoint(breakpoint)

  // Centre the orbit camera on the box once mounted.
  useEffect(() => {
    const o = orbitRef.current
    if (o) { o.target.set(BOX_WORLD[0], BOX_WORLD[1], BOX_WORLD[2]); o.update() }
  }, [])
```

- [ ] **Step 4: Adjust the Canvas camera + exposure.** Find:

```tsx
        camera={{ position: [0, 1.5, 2.0], fov: 50 }}
        dpr={[1, 1.5]}
        shadows
        gl={{ toneMapping: ACESFilmicToneMapping, toneMappingExposure: 0.55 }}
```
Replace with (3/4 start pose + lower exposure):
```tsx
        camera={{ position: [0.55, 1.4, 0.95], fov: 50 }}
        dpr={[1, 1.5]}
        shadows
        gl={{ toneMapping: ACESFilmicToneMapping, toneMappingExposure: 0.45 }}
```

- [ ] **Step 5: Swap camera controls + dim the environment.** Find:

```tsx
        <CinematicLighting />
        <CameraRig preset="focus-box" />
        <PinchZoomController />
        <Environment preset="studio" background={false} resolution={64} />
```
Replace with:
```tsx
        <CinematicLighting />
        <OrbitControls
          ref={orbitRef}
          makeDefault
          enableDamping
          enablePan={false}
          minDistance={0.35}
          maxDistance={1.6}
          minPolarAngle={Math.PI * 0.12}
          maxPolarAngle={Math.PI * 0.52}
          mouseButtons={{ LEFT: MOUSE.ROTATE, MIDDLE: MOUSE.ROTATE, RIGHT: MOUSE.PAN }}
          touches={{ ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_PAN }}
        />
        <CameraFov fov={fov} />
        <Environment preset="studio" background={false} resolution={64} environmentIntensity={0.4} />
```

- [ ] **Step 6: Gentler bloom.** Find `        <PostFX />` and replace with:

```tsx
        <PostFX bloomIntensity={0.1} bloomThreshold={0.96} />
```

- [ ] **Step 7: Rewire the zoom buttons.** There are TWO `<ZoomControls />` usages (mobile block + desktop block). Replace EACH with:

```tsx
            <OrbitZoom orbitRef={orbitRef} isPhone={breakpoint === 'phone'} />
```
(Indentation will differ slightly between the two blocks — match the surrounding lines.)

- [ ] **Step 8: Type-check + lab tests**

```bash
npx tsc --noEmit
npx vitest run src/labs/brownian-diffusion
```
Expected: 0 errors; tests pass (no test exercises the camera; this confirms nothing else broke).

- [ ] **Step 9: Commit**

```bash
git add src/labs/brownian-diffusion/scene/LabScene.tsx
git commit -m "feat(diffusion): free-orbit camera + calmer lighting (no blow-out)"
```

---

## Task 6: Verify & finish

- [ ] **Step 1: Full gate**

```bash
npx tsc --noEmit
npx vitest run src/labs/brownian-diffusion src/sdk
npm run build
```
Expected: tsc 0 errors; tests pass; build succeeds (pre-existing chunk-size warning is fine).

- [ ] **Step 2: Browser smoke (user, on prod after deploy — preview renders hidden so R3F can't be checked here).** Open `/physics/brownian-diffusion` and confirm:
  - [ ] Drag (LEFT or MIDDLE mouse) rotates the camera around the box; you can view it from any side; you can't go under the table or flip over the top.
  - [ ] Wheel / pinch / the `+` `−` buttons zoom in and out (clamped — box never lost).
  - [ ] The glass no longer blows out to white; the cube's edges are visible and the molecule scale reads clearly.
  - [ ] In a narrow window, the «Далі» / «Обери правильну відповідь…» button spans the panel and lines up under the MC pills.
  - [ ] Missions still progress (Далі-gating intact); mobile bottom-sheet controls still work. No console errors.

- [ ] **Step 3: Finish.** The controller invokes `superpowers:finishing-a-development-branch` to merge `feat/diffusion-camera-polish` into `master` (`--no-ff`); push deploys prod. Tune the lighting/camera numbers from the user's prod screenshot if anything still reads off, before final merge.

---

## Self-review

**Spec coverage:**
- §1 orbit camera → Task 5 (OrbitControls, constraints, 3/4 start, responsive FOV, zoom wiring). ✓
- §2 lighting/blow-out → Task 5 (exposure 0.45, `environmentIntensity` 0.4, bloom 0.1/0.96) + Task 4 (glass roughness/opacity, cube edges) + Task 2 (PostFX props). ✓
- §3 alignment → Task 1 (`Button.fullWidth`) + Task 3 (HUD uses it). ✓
- §4 file map → Tasks 1–5 match (Button, PostFX, HUD, GlassBox, LabScene). ✓
- §5 testing → Button RTL test (Task 1); tsc + scoped lab/sdk vitest; build; user prod smoke (Task 6). ✓
- §6 non-goals → CameraRig/PinchZoomController/CinematicLighting untouched (diffusion stops importing the first two); other labs untouched; SDK edits additive. ✓

**Type consistency:** `fullWidth` defined in Task 1 used in Task 3; `bloomIntensity`/`bloomThreshold` defined in Task 2 used in Task 5; `OrbitRef`/`dollyOrbit`/`OrbitZoom`/`CameraFov`/`fovForBreakpoint` all defined in Task 5 Step 2 and used in Steps 3/5/7; `MOUSE`/`TOUCH`/`PerspectiveCamera`/`useThree`/`OrbitControls`/`ElementRef` all added to imports in Step 1. ✓

**Placeholder scan:** every code step has full code; numeric tuning values are explicit starting points (the spec flags them as prod-tunable), not placeholders. ✓

