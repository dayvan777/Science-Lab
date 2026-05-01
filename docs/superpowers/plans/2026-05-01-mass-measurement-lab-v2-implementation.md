# Mass Measurement Lab v2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the working v1 MVP into a premium "Apple Studio" interactive lab with persistent guided mode that walks the student through every task without any external instruction.

**Architecture:** Incremental polish on top of the v1 codebase. Preserve all v1 logic (LabState, tasks, snapTargets, useDrag, InstrumentReadings, tests). Add new visual layer (StudioBackdrop, Lighting, PostProcessing), procedural assets, redesigned UI components (GlassPanel, TouchNumberKeypad, new HUD/Intro/Summary), and a new `src/guided/` subsystem (TaskSteps, StepEngine, GuidedOverlay, primitives) that auto-detects micro-step completion via existing stores.

**Tech Stack:** React 19 + TypeScript 6 + Vite 8 + R3F 9 + drei 10 + rapier 2 + Zustand 5 + html-to-image. Adding: `@react-three/postprocessing` (required for DOF/SSAO/bloom). Optional: `framer-motion` (only if CSS animations prove insufficient for spring transitions).

**Spec:** [`docs/superpowers/specs/2026-05-01-mass-measurement-lab-v2-design.md`](../specs/2026-05-01-mass-measurement-lab-v2-design.md)

**Estimated total:** 4-5 weeks focused work, 31 tasks across 6 phases.

---

## File structure changes

### Removed
- `src/scene/Table.tsx` — Apple Studio uses ground plane only

### Modified (rewritten/heavily updated)
- `src/scene/Lighting.tsx` — 3-point soft + HDRI for PBR only
- `src/scene/LabScene.tsx` — adds StudioBackdrop, PostProcessing, GuidedOverlay
- `src/scene/CameraRig.tsx` — wired to active-task auto-focus
- `src/scene/instruments/DigitalScale.tsx` — procedural rebuild
- `src/scene/instruments/Dynamometer.tsx` — procedural rebuild w/ helix spring
- `src/scene/instruments/LeverBalance.tsx` — procedural polish
- `src/scene/objects/TennisBall.tsx` / `Baseball.tsx` — canvas seam textures
- `src/scene/objects/Apple.tsx` — AI GLB or procedural displacement
- `src/scene/objects/Weights.tsx` — canvas labels
- `src/lab/HUD.tsx` — Apple HIG glassmorphism
- `src/lab/IntroScreen.tsx` — cinematic reveal
- `src/lab/SummaryScreen.tsx` — animated reveal
- `src/ui/Button.tsx` — Apple HIG style
- `src/ui/NumberInput.tsx` — replaced/wraps TouchNumberKeypad

### New files
```
src/scene/StudioBackdrop.tsx
src/scene/PostProcessing.tsx
src/scene/textures/
  lcdTexture.ts
  dialTexture.ts
  labelTexture.ts
  feltTexture.ts
  seamTexture.ts
src/guided/
  TaskSteps.ts
  StepEngine.ts
  GuidedOverlay.tsx
  GuidedHUD.tsx
  primitives/
    Arrow3D.tsx
    GlowRing.tsx
    HighlightOutline.tsx
    PulseEffect.tsx
src/ui/
  GlassPanel.tsx
  TouchNumberKeypad.tsx
src/perf/
  adaptiveQuality.ts
```

### New dependencies
- `@react-three/postprocessing` ^3.x (required)
- `framer-motion` ^11 (deferred — only add if Phase 5 reveals CSS gaps)

---

## Phase 1 — Visual Foundation (Tasks 1-5)

### Task 1: Install postprocessing dependency

**Files:**
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Install**

```bash
cd "C:/Users/vdomo/OneDrive/Рабочий стол/3dwebsimulation"
npm install @react-three/postprocessing
```

- [ ] **Step 2: Verify build still passes**

```bash
npm run typecheck
npm run build
```

Both should pass. If postprocessing requires peer dep changes, install with `--legacy-peer-deps` and document in commit.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @react-three/postprocessing for DOF/SSAO/bloom"
```

---

### Task 2: Studio backdrop (replace table with ground plane)

**Files:**
- Create: `src/scene/StudioBackdrop.tsx`
- Modify: `src/scene/LabScene.tsx` (remove Table render, add StudioBackdrop)

- [ ] **Step 1: Implement StudioBackdrop**

Create `src/scene/StudioBackdrop.tsx`:

```tsx
import { RigidBody } from '@react-three/rapier'

const FLOOR_Y = 0
const FLOOR_SIZE = 30  // very large infinite-feel plane

export function StudioBackdrop() {
  return (
    <>
      {/* Ground plane (collidable, receives shadows) */}
      <RigidBody type="fixed" colliders="cuboid" position={[0, FLOOR_Y - 0.05, 0]}>
        <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[FLOOR_SIZE, FLOOR_SIZE]} />
          <meshStandardMaterial color="#cdcdd2" roughness={0.7} metalness={0} />
        </mesh>
      </RigidBody>
      {/* Sky gradient — large vertical plane behind the camera */}
      <mesh position={[0, 5, -8]} rotation={[0, 0, 0]}>
        <planeGeometry args={[40, 20]} />
        <shaderMaterial
          transparent
          uniforms={{
            topColor: { value: [0.98, 0.98, 0.97] },     // #fafafa
            midColor: { value: [0.91, 0.91, 0.93] },     // #e8e8ed
            bottomColor: { value: [0.80, 0.80, 0.82] },  // #cdcdd2
          }}
          vertexShader={`
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `}
          fragmentShader={`
            uniform vec3 topColor;
            uniform vec3 midColor;
            uniform vec3 bottomColor;
            varying vec2 vUv;
            void main() {
              vec3 color = mix(bottomColor, midColor, smoothstep(0.0, 0.5, vUv.y));
              color = mix(color, topColor, smoothstep(0.5, 1.0, vUv.y));
              gl_FragColor = vec4(color, 1.0);
            }
          `}
        />
      </mesh>
    </>
  )
}
```

- [ ] **Step 2: Update LabScene — remove Table import and render**

Modify `src/scene/LabScene.tsx`:
1. Remove `import { Table } from './Table'`
2. Remove `<Table />` from the Physics block
3. Add `import { StudioBackdrop } from './StudioBackdrop'` and render `<StudioBackdrop />` inside `<Physics>` (replaces Table).
4. Update Canvas background: change `background: '#2a2a2a'` to `background: '#fafafa'` for clean intro frames before scene loads.

- [ ] **Step 3: Update object spawn Y positions**

Since the table is gone, objects must rest on floor (y=0) instead of tabletop (y=0.85). Update spawn positions in LabScene:

```tsx
<TennisBall position={[-1.05, 0.1, 0]} />
<Apple position={[-1.05, 0.1, 0.18]} />
<Baseball position={[-1.05, 0.1, -0.18]} />
<Dynamometer position={[-0.55, 0, 0]} active={...} />
<LeverBalance position={[0.05, 0, 0]} active={...} />
<DigitalScale position={[0.75, 0, 0]} active={...} />
<Weights startPosition={[0.05, 0.01, 0.4]} />
```

- [ ] **Step 4: Verify**

```bash
npm run typecheck
npm run build
```

Both should pass. Open dev server, click "Почати" — expect: gradient sky, light-gray floor, instruments and objects sitting on floor.

- [ ] **Step 5: Commit**

```bash
git add src/scene/StudioBackdrop.tsx src/scene/LabScene.tsx
git commit -m "feat(scene): replace table with Apple Studio backdrop (gradient + ground plane)"
```

> **Note:** `Table.tsx` file remains in source for now — will be deleted in cleanup task.

---

### Task 3: Apple Studio lighting

**Files:**
- Modify: `src/scene/Lighting.tsx`

- [ ] **Step 1: Replace Lighting**

Replace contents of `src/scene/Lighting.tsx`:

```tsx
import { Environment } from '@react-three/drei'

export function Lighting() {
  return (
    <>
      {/* HDRI for PBR reflections only — not as background */}
      <Environment preset="studio" background={false} environmentIntensity={0.5} />

      {/* Key — large soft area light, top-front-right */}
      <directionalLight
        position={[3, 5, 3]}
        intensity={2.5}
        color="#ffffff"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-3}
        shadow-camera-right={3}
        shadow-camera-top={3}
        shadow-camera-bottom={-3}
        shadow-camera-near={0.1}
        shadow-camera-far={20}
        shadow-bias={-0.0005}
      />

      {/* Fill — softer, opposite side */}
      <directionalLight
        position={[-3, 3, 3]}
        intensity={0.8}
        color="#f0f4ff"
      />

      {/* Rim — back light to separate from background */}
      <directionalLight
        position={[0, 4, -4]}
        intensity={0.6}
        color="#ffffff"
      />

      {/* Subtle ambient (HDRI does most of fill) */}
      <ambientLight intensity={0.15} />
    </>
  )
}
```

- [ ] **Step 2: Verify**

```bash
npm run typecheck
npm run build
```

Open dev server. Expect: bright clean lighting on objects, soft shadows under each, subtle highlights on metal materials. No dramatic dark areas.

- [ ] **Step 3: Commit**

```bash
git add src/scene/Lighting.tsx
git commit -m "feat(scene): Apple Studio lighting (3-point soft + HDRI for PBR)"
```

---

### Task 4: Post-processing pipeline

**Files:**
- Create: `src/scene/PostProcessing.tsx`
- Modify: `src/scene/LabScene.tsx`

- [ ] **Step 1: Implement PostProcessing**

Create `src/scene/PostProcessing.tsx`:

```tsx
import { EffectComposer, DepthOfField, N8AO, Bloom, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode, BlendFunction } from 'postprocessing'

type Props = {
  focusDistance?: number  // 0-1 normalized; computed from camera distance to active instrument
  enabled?: boolean
}

export function PostProcessing({ focusDistance = 0.7, enabled = true }: Props) {
  if (!enabled) return null
  return (
    <EffectComposer multisampling={2}>
      <DepthOfField
        focusDistance={focusDistance}
        focalLength={0.05}
        bokehScale={2}
        height={480}
      />
      <N8AO halfRes intensity={0.6} aoRadius={0.3} distanceFalloff={0.5} />
      <Bloom intensity={0.3} luminanceThreshold={0.95} luminanceSmoothing={0.2} mipmapBlur />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette eskil={false} offset={0.15} darkness={0.4} blendFunction={BlendFunction.NORMAL} />
    </EffectComposer>
  )
}
```

- [ ] **Step 2: Wire into LabScene**

Modify `src/scene/LabScene.tsx`. Add `import { PostProcessing } from './PostProcessing'` and place `<PostProcessing />` inside `<Canvas>` AFTER all 3D content but BEFORE closing `</Canvas>`:

```tsx
<Canvas ...>
  <Lighting />
  <CameraRig preset={preset} />
  <Physics ...>
    {/* ... */}
  </Physics>
  <PostProcessing />
</Canvas>
```

Also change Canvas FOV in the camera prop: `camera={{ position: [0, 1.5, 2.0], fov: 35 }}` (was 50, now 35 for telephoto compression).

- [ ] **Step 3: Verify**

```bash
npm run typecheck
npm run build
```

Open dev server. Expect: subtle ambient occlusion in corners, gentle vignette around edges, depth-of-field blur on far/near edges, slight bloom on bright reflections.

If FPS drops noticeably (<40 on dev machine), that's expected on first iteration — adaptive quality comes in Task 29.

- [ ] **Step 4: Commit**

```bash
git add src/scene/PostProcessing.tsx src/scene/LabScene.tsx
git commit -m "feat(scene): post-processing pipeline (DOF, SSAO, bloom, tone mapping, vignette)"
```

---

### Task 5: PBR material tuning pass

**Files:**
- Modify: `src/scene/instruments/DigitalScale.tsx`, `Dynamometer.tsx`, `LeverBalance.tsx`
- Modify: `src/scene/objects/TennisBall.tsx`, `Apple.tsx`, `Baseball.tsx`, `Weights.tsx`

- [ ] **Step 1: Update materials per spec table**

Walk through each instrument/object and update `<meshStandardMaterial>` props to match Section 4 PBR table:

For metal housings (DigitalScale housing, Dynamometer stand, LeverBalance stand):
```tsx
<meshStandardMaterial color="#3a3a3d" metalness={0.85} roughness={0.25} envMapIntensity={1.5} />
```

For weights:
```tsx
<meshStandardMaterial color={w.color} metalness={0.7} roughness={0.45} envMapIntensity={1.2} />
```

For tennis ball:
```tsx
<meshStandardMaterial color="#d8e043" roughness={0.85} metalness={0} />
```

For baseball:
```tsx
<meshStandardMaterial color="#f5f5f0" roughness={0.6} metalness={0} />
```

For apple:
```tsx
<meshStandardMaterial color="#c0392b" roughness={0.4} metalness={0} />
```

Replace each `<meshStandardMaterial>` line per file.

- [ ] **Step 2: Verify**

```bash
npm run typecheck
npm run build
```

Open dev server. Materials should now show realistic reflections from HDRI environment.

- [ ] **Step 3: Commit**

```bash
git add src/scene/instruments/*.tsx src/scene/objects/*.tsx
git commit -m "feat(scene): PBR material tuning per Apple Studio spec"
```

---

## Phase 2 — Procedural Assets (Tasks 6-13)

### Task 6: Extract canvas-texture factories

**Files:**
- Create: `src/scene/textures/lcdTexture.ts`
- Create: `src/scene/textures/dialTexture.ts`
- Modify: `src/scene/instruments/DigitalScale.tsx` (use factory)
- Modify: `src/scene/instruments/Dynamometer.tsx` (use factory)

- [ ] **Step 1: Create LCD texture factory**

Create `src/scene/textures/lcdTexture.ts`:

```ts
import { CanvasTexture } from 'three'

export function createLcdTexture(): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 96
  return new CanvasTexture(canvas)
}

export function drawLcd(texture: CanvasTexture, valueGrams: number) {
  const canvas = texture.image as HTMLCanvasElement
  const ctx = canvas.getContext('2d')!
  // Background: realistic green-gray LCD
  ctx.fillStyle = '#a8c4a8'
  ctx.fillRect(0, 0, 256, 96)
  // Subtle grid pattern (LCD pixel feel)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.04)'
  for (let x = 0; x < 256; x += 4) ctx.fillRect(x, 0, 1, 96)
  // Value
  ctx.fillStyle = '#1a1a1a'
  ctx.font = 'bold 56px "Courier New", monospace'
  ctx.textAlign = 'right'
  ctx.fillText(`${Math.round(valueGrams)} g`, 240, 70)
  texture.needsUpdate = true
}
```

- [ ] **Step 2: Create dial texture factory**

Create `src/scene/textures/dialTexture.ts`:

```ts
import { CanvasTexture } from 'three'

/**
 * Creates a dynamometer scale plate showing 0-5 N with tick marks.
 * Drawn once on init; doesn't change.
 */
export function createDialTexture(): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 96
  canvas.height = 384
  const ctx = canvas.getContext('2d')!
  // Off-white background
  ctx.fillStyle = '#f5f5f7'
  ctx.fillRect(0, 0, 96, 384)
  // Subtle border
  ctx.strokeStyle = '#d0d0d5'
  ctx.lineWidth = 2
  ctx.strokeRect(2, 2, 92, 380)
  // Title "N" at top
  ctx.fillStyle = '#1d1d1f'
  ctx.font = 'bold 22px "SF Pro Display", "Inter", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('N', 48, 28)
  // Major ticks (every 1 N) and minor (every 0.1 N)
  ctx.font = 'bold 18px "SF Pro Display", "Inter", sans-serif'
  ctx.textAlign = 'right'
  for (let i = 0; i <= 5; i++) {
    const y = 50 + (i / 5) * 320
    ctx.fillRect(20, y - 1.5, 28, 3)  // major tick
    ctx.fillText(`${i}`, 80, y + 6)
  }
  for (let i = 0.5; i < 5; i += 1) {
    const y = 50 + (i / 5) * 320
    ctx.fillRect(28, y - 1, 14, 2)  // minor tick
  }
  return new CanvasTexture(canvas)
}
```

- [ ] **Step 3: Update DigitalScale to use factory**

In `src/scene/instruments/DigitalScale.tsx`, replace the inline canvas creation with:

```tsx
import { createLcdTexture, drawLcd } from '../textures/lcdTexture'

// In component:
const lcdTexture = useMemo(() => createLcdTexture(), [])

// In useEffect (replace existing draw block):
useEffect(() => {
  drawLcd(lcdTexture, reading)
}, [reading, lcdTexture])
```

- [ ] **Step 4: Update Dynamometer to use dial factory**

In `src/scene/instruments/Dynamometer.tsx`, replace the inline scale texture creation:

```tsx
import { createDialTexture } from '../textures/dialTexture'

// Replace existing scaleTexture useMemo:
const scaleTexture = useMemo(() => createDialTexture(), [])
```

- [ ] **Step 5: Verify**

```bash
npm run typecheck
npm run test
npm run build
```

All should pass; existing 17 tests still green.

- [ ] **Step 6: Commit**

```bash
git add src/scene/textures/ src/scene/instruments/DigitalScale.tsx src/scene/instruments/Dynamometer.tsx
git commit -m "refactor(textures): extract canvas-texture factories to scene/textures/"
```

---

### Task 7: Procedural digital scale rebuild

**Files:**
- Modify: `src/scene/instruments/DigitalScale.tsx`

The v1 digital scale already uses procedural geometry. This task polishes it: rounded box housing, brand label, premium tare button.

- [ ] **Step 1: Add brand label texture**

Create `src/scene/textures/labelTexture.ts`:

```ts
import { CanvasTexture } from 'three'

export function createBrandLabel(text: string, w = 256, h = 64): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = 'rgba(0, 0, 0, 0)'
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = '#888'
  ctx.font = 'bold 18px "SF Pro Display", "Inter", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.letterSpacing = '2px'
  ctx.fillText(text, w / 2, h / 2)
  return new CanvasTexture(canvas)
}
```

- [ ] **Step 2: Polish DigitalScale visuals**

In `src/scene/instruments/DigitalScale.tsx`, replace the housing mesh block with rounded-box version + brand label:

```tsx
import { RoundedBox } from '@react-three/drei'
import { createBrandLabel } from '../textures/labelTexture'

// In component:
const brandTexture = useMemo(() => createBrandLabel('LAB SCALE'), [])

// In JSX, replace the simple boxGeometry housing with:
<RoundedBox args={[PLATFORM_W * 1.1, HOUSING_H, PLATFORM_D * 1.1]} radius={0.005} smoothness={4}
  position={[0, HOUSING_H / 2, 0]} castShadow>
  <meshStandardMaterial color="#3a3a3d" metalness={0.85} roughness={0.25} envMapIntensity={1.5} />
  {active && <Outlines thickness={3} color="#0071e3" />}
</RoundedBox>

{/* Brand label on front */}
<mesh position={[0, HOUSING_H / 2 - 0.012, PLATFORM_D / 2 * 1.1 + 0.002]}>
  <planeGeometry args={[0.06, 0.012]} />
  <meshBasicMaterial map={brandTexture} transparent />
</mesh>
```

Update tare button — make it a glowing red dome:

```tsx
<mesh
  position={[LCD_W / 2 + 0.018, HOUSING_H / 2, PLATFORM_D / 2 * 1.1 + 0.001]}
  onClick={onTare}
>
  <sphereGeometry args={[0.006, 12, 8]} />
  <meshStandardMaterial color="#ff3b30" emissive="#ff3b30" emissiveIntensity={0.3} roughness={0.3} />
</mesh>
```

- [ ] **Step 3: Verify and commit**

```bash
npm run typecheck && npm run build
git add src/scene/textures/labelTexture.ts src/scene/instruments/DigitalScale.tsx
git commit -m "feat(instruments): polish digital scale (rounded box housing + brand + glow tare)"
```

---

### Task 8: Procedural dynamometer with helix spring

**Files:**
- Modify: `src/scene/instruments/Dynamometer.tsx`

- [ ] **Step 1: Add helix spring component**

Create a memoized helix curve and use TubeGeometry. Inside Dynamometer.tsx, before return:

```tsx
import { TubeGeometry, CatmullRomCurve3, Vector3 } from 'three'

const SPRING_RADIUS = 0.012
const SPRING_TURNS = 14
const SPRING_TUBE_RADIUS = 0.0018

function makeHelixGeometry(length: number) {
  const points: Vector3[] = []
  const steps = 200
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const angle = t * SPRING_TURNS * Math.PI * 2
    const y = t * length
    points.push(new Vector3(Math.cos(angle) * SPRING_RADIUS, y, Math.sin(angle) * SPRING_RADIUS))
  }
  const curve = new CatmullRomCurve3(points)
  return new TubeGeometry(curve, steps, SPRING_TUBE_RADIUS, 8, false)
}

// In component, after existing state:
const springLength = SPRING_TOP_Y - hookY
const springGeometry = useMemo(() => makeHelixGeometry(springLength), [springLength])

useEffect(() => {
  return () => { springGeometry.dispose() }
}, [springGeometry])
```

- [ ] **Step 2: Replace simple cylinder with TubeGeometry mesh**

Replace the existing `<mesh>` for the spring (the cylinder block) with:

```tsx
<mesh position={[0.05, hookY, 0]} geometry={springGeometry} castShadow>
  <meshStandardMaterial color="#c0c0c5" metalness={0.9} roughness={0.15} envMapIntensity={1.5} />
</mesh>
```

- [ ] **Step 3: Fallback if helix performance is bad**

If FPS noticeably drops or geometry shows artifacts, comment out the helix block and fall back to a simple stretched cylinder (the existing v1 approach). Document in commit message.

- [ ] **Step 4: Polish stand + arm**

Replace the stand and horizontal arm meshes with rounded versions:

```tsx
<RoundedBox args={[0.04, STAND_H, 0.04]} radius={0.005} smoothness={4} position={[0, STAND_H / 2, 0]} castShadow>
  <meshStandardMaterial color="#3a3a3d" metalness={0.85} roughness={0.25} envMapIntensity={1.5} />
  {active && <Outlines thickness={3} color="#0071e3" />}
</RoundedBox>

<RoundedBox args={[0.16, 0.025, 0.04]} radius={0.005} smoothness={4} position={[0.05, STAND_H + 0.012, 0]} castShadow>
  <meshStandardMaterial color="#3a3a3d" metalness={0.85} roughness={0.25} envMapIntensity={1.5} />
</RoundedBox>
```

- [ ] **Step 5: Verify and commit**

```bash
npm run typecheck && npm run build
git add src/scene/instruments/Dynamometer.tsx
git commit -m "feat(instruments): procedural helix spring + polished dynamometer stand"
```

---

### Task 9: Polish lever balance procedurally

**Files:**
- Modify: `src/scene/instruments/LeverBalance.tsx`

- [ ] **Step 1: Replace primitives with rounded versions and better materials**

In `src/scene/instruments/LeverBalance.tsx`:

For stand:
```tsx
<RoundedBox args={[0.04, STAND_H, 0.04]} radius={0.005} smoothness={4} position={[0, STAND_H / 2, 0]} castShadow>
  <meshStandardMaterial color="#3a3a3d" metalness={0.85} roughness={0.25} envMapIntensity={1.5} />
</RoundedBox>
```

For beam: replace box with a slimmer profile + rounded ends:
```tsx
<RoundedBox args={[BEAM_LEN, BEAM_T, 0.024]} radius={0.003} smoothness={4} castShadow>
  <meshStandardMaterial color="#aaa" metalness={0.7} roughness={0.3} envMapIntensity={1.5} />
  {active && <Outlines thickness={3} color="#0071e3" />}
</RoundedBox>
```

For pans — replace cylinder with shallow concave shape (use a flatter cylinder + rim):
```tsx
{/* Pan body */}
<mesh castShadow>
  <cylinderGeometry args={[PAN_R, PAN_R * 0.85, PAN_DEPTH * 0.6, 32]} />
  <meshStandardMaterial color="#888" metalness={0.6} roughness={0.4} envMapIntensity={1.4} />
</mesh>
{/* Pan rim */}
<mesh position={[0, PAN_DEPTH * 0.3, 0]} castShadow>
  <torusGeometry args={[PAN_R * 0.95, 0.003, 8, 32]} />
  <meshStandardMaterial color="#aaa" metalness={0.8} roughness={0.2} />
</mesh>
```

For indicator arrow — make it more prominent (longer, painted red):
```tsx
<mesh position={[0, -BEAM_T / 2 - 0.05, 0]} castShadow>
  <coneGeometry args={[0.006, 0.07, 4]} />
  <meshStandardMaterial color="#ff3b30" />
</mesh>
```

- [ ] **Step 2: Add center pivot decoration**

Above the existing stand, add a small hinge decoration:
```tsx
<mesh position={[0, STAND_H, 0]} castShadow>
  <cylinderGeometry args={[0.01, 0.01, 0.05, 16]} rotation={[Math.PI/2, 0, 0]} />
  <meshStandardMaterial color="#3a3a3d" metalness={0.9} roughness={0.2} />
</mesh>
```

- [ ] **Step 3: Verify and commit**

```bash
npm run typecheck && npm run build
git add src/scene/instruments/LeverBalance.tsx
git commit -m "feat(instruments): polish lever balance (rounded beam + concave pans + red needle)"
```

---

### Task 10: Procedural weights with engraved labels

**Files:**
- Create: `src/scene/textures/weightLabel.ts`
- Modify: `src/scene/objects/Weights.tsx`

- [ ] **Step 1: Create weight label texture factory**

Create `src/scene/textures/weightLabel.ts`:

```ts
import { CanvasTexture } from 'three'

export function createWeightLabel(text: string): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 128
  const ctx = canvas.getContext('2d')!
  // Background: subtle gradient to suggest engraved metal
  const grad = ctx.createLinearGradient(0, 0, 0, 128)
  grad.addColorStop(0, '#5a5a5d')
  grad.addColorStop(0.5, '#404043')
  grad.addColorStop(1, '#5a5a5d')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 256, 128)
  // Engraved-look text (white with shadow)
  ctx.fillStyle = '#1a1a1d'
  ctx.font = 'bold 56px "SF Pro Display", "Inter", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 128, 70)
  // Highlight to suggest engraving (offset by 1px)
  ctx.fillStyle = '#dddde0'
  ctx.fillText(text, 127, 65)
  return new CanvasTexture(canvas)
}
```

- [ ] **Step 2: Update Weights to use labels**

In `src/scene/objects/Weights.tsx`, change the WEIGHTS array to include label and use the texture:

```tsx
import { useMemo } from 'react'
import { createWeightLabel } from '../textures/weightLabel'
import { Draggable } from './Draggable'

const WEIGHTS = [
  { mass: 1000, radius: 0.030, height: 0.05, label: '1 кг' },
  { mass: 500,  radius: 0.026, height: 0.040, label: '500 г' },
  { mass: 200,  radius: 0.022, height: 0.032, label: '200 г' },
  { mass: 100,  radius: 0.019, height: 0.028, label: '100 г' },
  { mass: 50,   radius: 0.016, height: 0.022, label: '50 г' },
  { mass: 20,   radius: 0.013, height: 0.018, label: '20 г' },
  { mass: 10,   radius: 0.011, height: 0.014, label: '10 г' },
]

type Props = { startPosition: [number, number, number] }

export function Weights({ startPosition }: Props) {
  const [x0, y0, z0] = startPosition
  const labelTextures = useMemo(() => WEIGHTS.map(w => createWeightLabel(w.label)), [])

  return (
    <>
      {WEIGHTS.map((w, i) => {
        const x = x0 + (i - 3) * 0.06
        return (
          <Draggable
            key={w.label}
            position={[x, y0 + w.height / 2, z0]}
            mass={w.mass}
            shape={{ type: 'cuboid', halfExtents: [w.radius, w.height / 2, w.radius] }}
          >
            {/* Body — slight conical taper for premium look */}
            <mesh castShadow>
              <cylinderGeometry args={[w.radius * 0.95, w.radius, w.height * 0.85, 24]} />
              <meshStandardMaterial color="#5a5a5d" metalness={0.7} roughness={0.45} envMapIntensity={1.2} />
            </mesh>
            {/* Top knob */}
            <mesh position={[0, w.height * 0.45, 0]} castShadow>
              <cylinderGeometry args={[w.radius * 0.4, w.radius * 0.6, w.height * 0.15, 16]} />
              <meshStandardMaterial color="#5a5a5d" metalness={0.7} roughness={0.45} />
            </mesh>
            {/* Label on side */}
            <mesh position={[0, 0, w.radius + 0.001]}>
              <planeGeometry args={[w.radius * 1.4, w.height * 0.5]} />
              <meshBasicMaterial map={labelTextures[i]} transparent />
            </mesh>
          </Draggable>
        )
      })}
    </>
  )
}
```

- [ ] **Step 3: Verify and commit**

```bash
npm run typecheck && npm run build
git add src/scene/textures/weightLabel.ts src/scene/objects/Weights.tsx
git commit -m "feat(objects): procedural weights with engraved labels and conical taper"
```

---

### Task 11: Tennis ball + baseball with seam textures

**Files:**
- Create: `src/scene/textures/feltTexture.ts`
- Create: `src/scene/textures/seamTexture.ts`
- Modify: `src/scene/objects/TennisBall.tsx`
- Modify: `src/scene/objects/Baseball.tsx`

- [ ] **Step 1: Create felt + seam texture factories**

Create `src/scene/textures/feltTexture.ts`:

```ts
import { CanvasTexture, RepeatWrapping } from 'three'

export function createFeltTexture(): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#d8e043'
  ctx.fillRect(0, 0, 256, 256)
  // Felt noise (random small dots)
  for (let i = 0; i < 8000; i++) {
    const x = Math.random() * 256
    const y = Math.random() * 256
    const alpha = Math.random() * 0.3
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
    ctx.fillRect(x, y, 1, 1)
  }
  // Curved seam line (white)
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(128, 128, 90, Math.PI * 0.2, Math.PI * 0.8)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(128, 128, 90, Math.PI * 1.2, Math.PI * 1.8)
  ctx.stroke()
  const texture = new CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = RepeatWrapping
  return texture
}
```

Create `src/scene/textures/seamTexture.ts`:

```ts
import { CanvasTexture, RepeatWrapping } from 'three'

export function createBaseballSeamTexture(): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 256
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#f5f5f0'
  ctx.fillRect(0, 0, 512, 256)
  // Red curved stitches (figure-8 seam pattern)
  ctx.strokeStyle = '#c0392b'
  ctx.lineWidth = 3
  ctx.lineCap = 'round'
  for (let x = 0; x < 512; x += 12) {
    const t = x / 512
    const y = 128 + Math.sin(t * Math.PI * 2) * 60
    ctx.beginPath()
    ctx.moveTo(x - 4, y - 6)
    ctx.lineTo(x + 4, y + 6)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(x - 4, y + 6)
    ctx.lineTo(x + 4, y - 6)
    ctx.stroke()
  }
  const texture = new CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = RepeatWrapping
  return texture
}
```

- [ ] **Step 2: Update TennisBall.tsx**

```tsx
import { useMemo } from 'react'
import { createFeltTexture } from '../textures/feltTexture'
import { Draggable } from './Draggable'

const RADIUS = 0.0335
const MASS_GRAMS = 58

type Props = { position: [number, number, number] }

export function TennisBall({ position }: Props) {
  const feltTexture = useMemo(() => createFeltTexture(), [])
  return (
    <Draggable position={position} mass={MASS_GRAMS} shape={{ type: 'ball', radius: RADIUS }}>
      <mesh castShadow>
        <sphereGeometry args={[RADIUS, 32, 24]} />
        <meshStandardMaterial map={feltTexture} roughness={0.85} metalness={0} />
      </mesh>
    </Draggable>
  )
}
```

- [ ] **Step 3: Update Baseball.tsx**

```tsx
import { useMemo } from 'react'
import { createBaseballSeamTexture } from '../textures/seamTexture'
import { Draggable } from './Draggable'

const RADIUS = 0.0365
const MASS_GRAMS = 145

type Props = { position: [number, number, number] }

export function Baseball({ position }: Props) {
  const seamTexture = useMemo(() => createBaseballSeamTexture(), [])
  return (
    <Draggable position={position} mass={MASS_GRAMS} shape={{ type: 'ball', radius: RADIUS }}>
      <mesh castShadow>
        <sphereGeometry args={[RADIUS, 32, 24]} />
        <meshStandardMaterial map={seamTexture} roughness={0.6} metalness={0} />
      </mesh>
    </Draggable>
  )
}
```

- [ ] **Step 4: Verify and commit**

```bash
npm run typecheck && npm run build
git add src/scene/textures/feltTexture.ts src/scene/textures/seamTexture.ts src/scene/objects/TennisBall.tsx src/scene/objects/Baseball.tsx
git commit -m "feat(objects): canvas seam textures for tennis ball and baseball"
```

---

### Task 12: Apple — procedural displacement (skip AI for now)

**Files:**
- Modify: `src/scene/objects/Apple.tsx`

Per spec Plan B: skip AI generation, use procedural displaced sphere with stem.

- [ ] **Step 1: Create procedural apple**

Replace `src/scene/objects/Apple.tsx`:

```tsx
import { Draggable } from './Draggable'

const RADIUS = 0.04
const MASS_GRAMS = 180

type Props = { position: [number, number, number] }

export function Apple({ position }: Props) {
  return (
    <Draggable position={position} mass={MASS_GRAMS} shape={{ type: 'ball', radius: RADIUS }}>
      <group>
        {/* Body — slight vertical squash */}
        <mesh castShadow scale={[1, 0.95, 1]}>
          <sphereGeometry args={[RADIUS, 32, 24]} />
          <meshStandardMaterial color="#c0392b" roughness={0.4} metalness={0} envMapIntensity={1.5} />
        </mesh>
        {/* Stem */}
        <mesh position={[0, RADIUS * 0.95, 0]} castShadow>
          <cylinderGeometry args={[0.002, 0.0025, 0.012, 6]} />
          <meshStandardMaterial color="#5a3a1a" roughness={0.8} />
        </mesh>
        {/* Single leaf */}
        <mesh position={[0.005, RADIUS * 0.95 + 0.005, 0]} rotation={[0, 0, Math.PI * 0.2]} castShadow>
          <coneGeometry args={[0.005, 0.012, 4]} />
          <meshStandardMaterial color="#27ae60" roughness={0.6} />
        </mesh>
      </group>
    </Draggable>
  )
}
```

- [ ] **Step 2: Verify and commit**

```bash
npm run typecheck && npm run build
git add src/scene/objects/Apple.tsx
git commit -m "feat(objects): procedural apple with stem and leaf (no AI dependency)"
```

---

### Task 13: Delete obsolete Table.tsx

**Files:**
- Delete: `src/scene/Table.tsx`

- [ ] **Step 1: Delete the file**

```bash
cd "C:/Users/vdomo/OneDrive/Рабочий стол/3dwebsimulation"
rm src/scene/Table.tsx
```

- [ ] **Step 2: Verify nothing references it**

```bash
grep -r "from.*scene/Table" src/ tests/
```

Should return zero matches.

- [ ] **Step 3: Verify build + commit**

```bash
npm run typecheck && npm run build && npm run test
git add -A
git commit -m "chore: remove obsolete Table.tsx (Apple Studio uses ground plane)"
```

---

## Phase 3 — UI Redesign (Tasks 14-19)

### Task 14: GlassPanel reusable component

**Files:**
- Create: `src/ui/GlassPanel.tsx`

- [ ] **Step 1: Create component**

```tsx
import { CSSProperties, ReactNode } from 'react'

type Props = {
  children: ReactNode
  style?: CSSProperties
  variant?: 'default' | 'subtle' | 'strong'
}

export function GlassPanel({ children, style, variant = 'default' }: Props) {
  const variants: Record<string, CSSProperties> = {
    default: {
      background: 'rgba(255, 255, 255, 0.7)',
      backdropFilter: 'blur(40px) saturate(180%)',
      border: '1px solid rgba(255, 255, 255, 0.18)',
    },
    subtle: {
      background: 'rgba(255, 255, 255, 0.5)',
      backdropFilter: 'blur(20px) saturate(150%)',
      border: '1px solid rgba(255, 255, 255, 0.12)',
    },
    strong: {
      background: 'rgba(255, 255, 255, 0.85)',
      backdropFilter: 'blur(60px) saturate(200%)',
      border: '1px solid rgba(255, 255, 255, 0.25)',
    },
  }

  return (
    <div
      style={{
        ...variants[variant],
        borderRadius: 16,
        boxShadow:
          '0 1px 2px rgba(0,0,0,0.04), 0 8px 16px rgba(0,0,0,0.08), 0 30px 60px -10px rgba(0,0,0,0.15)',
        color: '#1d1d1f',
        ...style,
      }}
    >
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Verify build, commit**

```bash
npm run typecheck && npm run build
git add src/ui/GlassPanel.tsx
git commit -m "feat(ui): GlassPanel reusable Apple-style glassmorphism container"
```

---

### Task 15: Apple HIG Button rewrite

**Files:**
- Modify: `src/ui/Button.tsx`

- [ ] **Step 1: Replace Button**

```tsx
import { ReactNode, MouseEvent } from 'react'

type Props = {
  onClick: () => void
  variant?: 'primary' | 'secondary'
  children: ReactNode
  disabled?: boolean
}

export function Button({ onClick, variant = 'primary', children, disabled }: Props) {
  const isPrimary = variant === 'primary'
  return (
    <button
      onClick={(e: MouseEvent) => { e.preventDefault(); if (!disabled) onClick() }}
      disabled={disabled}
      style={{
        background: isPrimary ? (disabled ? '#a0a0a8' : '#0071e3') : 'rgba(255, 255, 255, 0.7)',
        backdropFilter: isPrimary ? undefined : 'blur(20px)',
        color: isPrimary ? '#fff' : (disabled ? '#a0a0a8' : '#0071e3'),
        border: isPrimary ? 'none' : '1px solid rgba(0, 113, 227, 0.2)',
        borderRadius: 12,
        padding: '14px 32px',
        fontSize: 16,
        fontWeight: 600,
        minHeight: 56,
        minWidth: 120,
        cursor: disabled ? 'not-allowed' : 'pointer',
        touchAction: 'manipulation',
        boxShadow: isPrimary
          ? '0 1px 2px rgba(0,0,0,0.1), 0 4px 12px rgba(0,113,227,0.3)'
          : '0 1px 2px rgba(0,0,0,0.05)',
        transition: 'transform 150ms cubic-bezier(0.34, 1.56, 0.64, 1), background 200ms ease',
        fontFamily: '"SF Pro Display", "Inter", system-ui, sans-serif',
      }}
      onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.96)' }}
      onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
    >
      {children}
    </button>
  )
}
```

- [ ] **Step 2: Verify build, commit**

```bash
npm run typecheck && npm run build
git add src/ui/Button.tsx
git commit -m "feat(ui): Apple HIG Button with continuous corners + spring press animation"
```

---

### Task 16: TouchNumberKeypad + NumberInput rewrite

**Files:**
- Create: `src/ui/TouchNumberKeypad.tsx`
- Modify: `src/ui/NumberInput.tsx`

- [ ] **Step 1: Create TouchNumberKeypad**

```tsx
import { useState, useEffect } from 'react'
import { GlassPanel } from './GlassPanel'

type Props = {
  initialValue?: string
  onConfirm: (value: number) => void
  onCancel: () => void
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✓']

export function TouchNumberKeypad({ initialValue = '', onConfirm, onCancel }: Props) {
  const [text, setText] = useState(initialValue)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
      if (e.key === 'Enter') confirm()
      if (e.key >= '0' && e.key <= '9') setText(t => t + e.key)
      if (e.key === 'Backspace') setText(t => t.slice(0, -1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [text])

  const handleKey = (key: string) => {
    if (key === '⌫') setText(t => t.slice(0, -1))
    else if (key === '✓') confirm()
    else setText(t => t + key)
  }

  const confirm = () => {
    const v = parseFloat(text.replace(',', '.'))
    if (Number.isFinite(v) && v >= 0) onConfirm(v)
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onCancel}
    >
      <GlassPanel
        variant="strong"
        style={{ padding: 24, minWidth: 340 }}
      >
        <div onClick={(e) => e.stopPropagation()}>
          <div style={{
            background: '#fff', color: '#1d1d1f',
            padding: '16px 20px', borderRadius: 12,
            fontSize: 36, fontWeight: 700, fontFamily: 'monospace',
            textAlign: 'right', marginBottom: 16, minHeight: 56,
          }}>
            {text || '0'}
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 8,
          }}>
            {KEYS.map((k) => (
              <button
                key={k}
                onClick={() => handleKey(k)}
                style={{
                  height: 72, fontSize: 24, fontWeight: 500,
                  border: 'none', borderRadius: 12,
                  background: k === '✓' ? '#0071e3' : 'rgba(255,255,255,0.85)',
                  color: k === '✓' ? '#fff' : '#1d1d1f',
                  cursor: 'pointer',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                  fontFamily: '"SF Pro Display", "Inter", system-ui',
                }}
              >
                {k}
              </button>
            ))}
          </div>
        </div>
      </GlassPanel>
    </div>
  )
}
```

- [ ] **Step 2: Update NumberInput to use keypad**

Replace `src/ui/NumberInput.tsx`:

```tsx
import { useState } from 'react'
import { TouchNumberKeypad } from './TouchNumberKeypad'

type Props = {
  unit: 'g' | 'N'
  onSubmit: (value: number) => void
}

export function NumberInput({ unit, onSubmit }: Props) {
  const [keypadOpen, setKeypadOpen] = useState(false)
  const [pendingValue, setPendingValue] = useState<string>('')

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 14, opacity: 0.7, color: '#1d1d1f' }}>Значення:</span>
        <button
          onClick={() => setKeypadOpen(true)}
          style={{
            background: '#fff', color: '#1d1d1f',
            padding: '12px 20px', fontSize: 22, fontWeight: 600,
            border: '1px solid #d1d1d6', borderRadius: 12,
            minWidth: 120, textAlign: 'right', cursor: 'pointer',
            fontFamily: 'monospace',
          }}
        >
          {pendingValue || '—'}
        </button>
        <span style={{ fontSize: 14, opacity: 0.7, color: '#1d1d1f' }}>
          {unit === 'g' ? 'грамів' : 'Ньютонів'}
        </span>
        <button
          onClick={() => {
            const v = parseFloat(pendingValue.replace(',', '.'))
            if (Number.isFinite(v) && v >= 0) {
              onSubmit(v)
              setPendingValue('')
            }
          }}
          disabled={!pendingValue}
          style={{
            background: pendingValue ? '#0071e3' : '#a0a0a8',
            color: '#fff', border: 'none',
            padding: '12px 24px', fontSize: 16, fontWeight: 600,
            borderRadius: 12, cursor: pendingValue ? 'pointer' : 'not-allowed',
            minHeight: 48,
          }}
        >
          Записати → Далі
        </button>
      </div>
      {keypadOpen && (
        <TouchNumberKeypad
          initialValue={pendingValue}
          onConfirm={(v) => {
            setPendingValue(String(v))
            setKeypadOpen(false)
          }}
          onCancel={() => setKeypadOpen(false)}
        />
      )}
    </>
  )
}
```

- [ ] **Step 3: Verify build, commit**

```bash
npm run typecheck && npm run build
git add src/ui/TouchNumberKeypad.tsx src/ui/NumberInput.tsx
git commit -m "feat(ui): TouchNumberKeypad modal + Apple-style NumberInput trigger"
```

---

### Task 17: HUD redesign (glassmorphism + new layout)

**Files:**
- Modify: `src/lab/HUD.tsx`

- [ ] **Step 1: Rewrite HUD using GlassPanel**

Replace `src/lab/HUD.tsx`:

```tsx
import { useLabState } from './LabState'
import { tasks } from './tasks'
import { NumberInput } from '../ui/NumberInput'
import { GlassPanel } from '../ui/GlassPanel'
import { useReadings } from './InstrumentReadings'
import { newtonsToGrams } from '../utils/units'

const TOTAL = 9
const BASE_FONT = '"SF Pro Display", "Inter", system-ui, sans-serif'

export function HUD() {
  const phase = useLabState(s => s.phase)
  const idx = useLabState(s => s.currentTaskIndex)
  const journal = useLabState(s => s.journal)
  const setMeasurement = useLabState(s => s.setMeasurement)

  const digitalScaleG = useReadings(s => s.digitalScaleGrams)
  const dynamometerN = useReadings(s => s.dynamometerNewtons)
  const leverTilt = useReadings(s => s.leverBalanceTilt)
  const leverRightG = useReadings(s => s.leverRightPanGrams)

  if (phase !== 'in-progress') return null
  const current = tasks[idx]

  let liveLabel = ''
  let liveValue = ''
  let stepHint = ''
  if (current.instrumentId === 'digital-scale') {
    liveLabel = 'Прилад показує'
    liveValue = `${digitalScaleG} г`
    stepHint = digitalScaleG === 0
      ? '→ Поклади предмет на платформу'
      : '✓ Прочитай значення і впиши'
  } else if (current.instrumentId === 'dynamometer') {
    liveLabel = 'Сила натягу'
    liveValue = `${dynamometerN.toFixed(2)} N`
    stepHint = dynamometerN === 0
      ? '→ Підвісь предмет на гачок'
      : '✓ Прочитай Ньютони і впиши'
  } else {
    liveLabel = 'Стан балансу'
    const balanced = Math.abs(leverTilt) < 0.05
    liveValue = balanced ? '⚖️ урівноважено' : (leverTilt < 0 ? '↘ ліва важче' : '↙ права важче')
    if (leverRightG === 0) stepHint = '→ Поклади предмет ліворуч, гирьки праворуч'
    else if (!balanced) stepHint = `→ На правій ${leverRightG} г — додай/прибери гирьки`
    else stepHint = `✓ Балка вирівняна! Маса = ${leverRightG} г`
  }

  return (
    <div style={{ fontFamily: BASE_FONT }}>
      {/* Top floating pill */}
      <GlassPanel
        variant="subtle"
        style={{
          position: 'fixed', top: 16, left: '50%',
          transform: 'translateX(-50%)',
          padding: '8px 20px', borderRadius: 100,
          fontSize: 13, fontWeight: 500,
          zIndex: 10,
        }}
      >
        Лабораторна · {idx + 1} з {TOTAL}
      </GlassPanel>

      {/* Left: current step + live reading */}
      <GlassPanel
        style={{
          position: 'fixed', top: 80, left: 16, width: 360,
          padding: 20, zIndex: 10,
        }}
      >
        <div style={{ fontSize: 11, opacity: 0.5, textTransform: 'uppercase', letterSpacing: 1 }}>
          Зараз робимо
        </div>
        <div style={{ fontSize: 18, fontWeight: 500, margin: '8px 0 12px', lineHeight: 1.4 }}>
          {current.prompt}
        </div>
        <div style={{
          fontSize: 13, color: '#6e6e73', lineHeight: 1.5,
          padding: '12px 0', borderTop: '1px solid rgba(0,0,0,0.08)', borderBottom: '1px solid rgba(0,0,0,0.08)',
        }}>
          💡 {current.hint}
        </div>
        <div style={{ paddingTop: 16 }}>
          <div style={{ fontSize: 11, opacity: 0.5, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
            {liveLabel}
          </div>
          <div style={{
            fontSize: 36, fontWeight: 700, color: '#0071e3',
            fontVariantNumeric: 'tabular-nums', lineHeight: 1, marginBottom: 12,
          }}>
            {liveValue}
          </div>
          <div style={{ fontSize: 14, color: '#1d1d1f', lineHeight: 1.4, fontWeight: 500 }}>
            {stepHint}
          </div>
        </div>
      </GlassPanel>

      {/* Right: journal */}
      <GlassPanel
        style={{
          position: 'fixed', top: 80, right: 16, width: 320,
          padding: 16, zIndex: 10, maxHeight: '70vh', overflow: 'auto',
        }}
      >
        <div style={{ fontSize: 11, opacity: 0.5, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
          Лабжурнал
        </div>
        {tasks.map((t, i) => {
          const entry = journal.find(e => e.taskId === t.id)
          const opacity = i < idx ? 1 : i === idx ? 0.6 : 0.35
          const valueText = entry
            ? t.inputUnit === 'N'
              ? `${entry.userValue.toFixed(2)} N`
              : `${entry.userValue} г`
            : '— —'
          return (
            <div key={t.id} style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '8px 0',
              borderBottom: '1px dashed rgba(0,0,0,0.08)',
              fontSize: 13, opacity,
            }}>
              <span>{i < idx ? '✓ ' : i === idx ? '→ ' : '  '}{t.objectId}</span>
              <span style={{ fontWeight: 600, color: entry ? '#0071e3' : '#999' }}>{valueText}</span>
            </div>
          )
        })}
      </GlassPanel>

      {/* Bottom center: input bar */}
      <GlassPanel
        style={{
          position: 'fixed', bottom: 16, left: '50%',
          transform: 'translateX(-50%)',
          padding: '14px 24px', zIndex: 10,
        }}
      >
        <NumberInput
          unit={current.inputUnit}
          onSubmit={(value) => setMeasurement(current.id, value)}
        />
      </GlassPanel>
    </div>
  )
}
```

> Note: `newtonsToGrams` import not used here (was in v1 spec); removed to satisfy strict typecheck.

- [ ] **Step 2: Verify build, commit**

```bash
npm run typecheck && npm run build
git add src/lab/HUD.tsx
git commit -m "feat(lab): HUD redesign with glassmorphism + Apple HIG layout"
```

---

### Task 18: IntroScreen cinematic redesign

**Files:**
- Modify: `src/lab/IntroScreen.tsx`

- [ ] **Step 1: Rewrite IntroScreen**

```tsx
import { useEffect, useState } from 'react'
import { useLabState } from './LabState'
import { Button } from '../ui/Button'

export function IntroScreen() {
  const start = useLabState(s => s.start)
  const [stage, setStage] = useState(0)

  useEffect(() => {
    const t1 = setTimeout(() => setStage(1), 100)
    const t2 = setTimeout(() => setStage(2), 600)
    const t3 = setTimeout(() => setStage(3), 1100)
    const t4 = setTimeout(() => setStage(4), 1700)
    return () => [t1, t2, t3, t4].forEach(clearTimeout)
  }, [])

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'linear-gradient(180deg, #fafafa 0%, #cdcdd2 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      color: '#1d1d1f', padding: 32,
      fontFamily: '"SF Pro Display", "Inter", system-ui, sans-serif',
    }}>
      <div style={{
        opacity: stage >= 1 ? 1 : 0,
        transform: stage >= 1 ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 600ms ease, transform 600ms ease',
        fontSize: 56, fontWeight: 200, letterSpacing: -1.5,
        marginBottom: 8,
      }}>
        Лабораторна робота
      </div>
      <div style={{
        opacity: stage >= 2 ? 1 : 0,
        transform: stage >= 2 ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 600ms ease, transform 600ms ease',
        fontSize: 32, fontWeight: 400, color: '#0071e3',
        marginBottom: 40,
      }}>
        Вимірювання маси тіл
      </div>
      <div style={{
        opacity: stage >= 3 ? 1 : 0,
        transform: stage >= 3 ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 800ms ease, transform 800ms ease',
        fontSize: 17, color: '#6e6e73', maxWidth: 600,
        textAlign: 'center', lineHeight: 1.5, marginBottom: 48,
      }}>
        Виміряй масу трьох предметів — тенісного м'яча, яблука і бейсбольного м'яча —
        трьома різними приладами. Система покаже, що робити на кожному кроці.
      </div>
      <div style={{
        opacity: stage >= 4 ? 1 : 0,
        transform: stage >= 4 ? 'scale(1)' : 'scale(0.9)',
        transition: 'opacity 400ms ease, transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}>
        <Button onClick={start}>Почати лабораторну</Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build, commit**

```bash
npm run typecheck && npm run build
git add src/lab/IntroScreen.tsx
git commit -m "feat(lab): cinematic intro reveal with staged fade-in"
```

---

### Task 19: SummaryScreen animated reveal

**Files:**
- Modify: `src/lab/SummaryScreen.tsx`

- [ ] **Step 1: Rewrite SummaryScreen**

```tsx
import { useRef, useState, useEffect } from 'react'
import { toPng } from 'html-to-image'
import { useLabState } from './LabState'
import { tasks } from './tasks'
import { withinTolerance } from '../utils/units'
import { Button } from '../ui/Button'
import { GlassPanel } from '../ui/GlassPanel'

export function SummaryScreen() {
  const journal = useLabState(s => s.journal)
  const reset = useLabState(s => s.reset)
  const reportRef = useRef<HTMLDivElement>(null)
  const [revealedRows, setRevealedRows] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setRevealedRows(r => {
        if (r >= 9) { clearInterval(interval); return r }
        return r + 1
      })
    }, 100)
    return () => clearInterval(interval)
  }, [])

  let exact = 0, close = 0, off = 0
  const rows = tasks.map(t => {
    const entry = journal.find(e => e.taskId === t.id)
    if (!entry) return { task: t, entry: null, status: 'missing' as const }
    const inTol = withinTolerance(entry.userValue, t.expectedValue, t.tolerance)
    const inLooseTol = withinTolerance(entry.userValue, t.expectedValue, t.tolerance * 1.5)
    const status = inTol ? 'exact' : inLooseTol ? 'close' : 'off'
    if (status === 'exact') exact++
    else if (status === 'close') close++
    else off++
    return { task: t, entry, status }
  })

  const downloadScreenshot = async () => {
    if (!reportRef.current) return
    const dataUrl = await toPng(reportRef.current, { backgroundColor: '#fafafa' })
    const link = document.createElement('a')
    link.download = 'mass-lab-report.png'
    link.href = dataUrl
    link.click()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'linear-gradient(180deg, #fafafa 0%, #cdcdd2 100%)',
      color: '#1d1d1f',
      overflow: 'auto', padding: 32,
      fontFamily: '"SF Pro Display", "Inter", system-ui, sans-serif',
    }}>
      <div ref={reportRef} style={{ maxWidth: 700, margin: '0 auto' }}>
        <GlassPanel variant="strong" style={{ padding: 32 }}>
          <h1 style={{ fontSize: 40, fontWeight: 600, letterSpacing: -1, margin: '0 0 8px' }}>
            Лабораторну виконано
          </h1>
          <p style={{ fontSize: 18, color: '#6e6e73', margin: '0 0 24px' }}>
            <span style={{ color: '#34c759', fontWeight: 600 }}>🟢 {exact}</span>{' '}
            <span style={{ color: '#ff9500', fontWeight: 600 }}>🟡 {close}</span>{' '}
            <span style={{ color: '#ff3b30', fontWeight: 600 }}>🔴 {off}</span>
          </p>
          {rows.map(({ task, entry, status }, i) => {
            const dot = status === 'exact' ? '🟢' : status === 'close' ? '🟡' : '🔴'
            const expected = task.inputUnit === 'N'
              ? `${task.expectedValue.toFixed(2)} N`
              : `${task.expectedValue} г`
            const userText = entry
              ? (task.inputUnit === 'N' ? `${entry.userValue.toFixed(2)} N` : `${entry.userValue} г`)
              : '—'
            return (
              <div
                key={task.id}
                style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '14px 0',
                  borderBottom: i < 8 ? '1px solid rgba(0,0,0,0.08)' : 'none',
                  fontSize: 15,
                  opacity: i < revealedRows ? 1 : 0,
                  transform: i < revealedRows ? 'translateX(0)' : 'translateX(-12px)',
                  transition: 'opacity 300ms ease, transform 300ms ease',
                }}
              >
                <span>{dot} {task.objectId} · {task.instrumentId}</span>
                <span>
                  <span style={{ color: '#6e6e73' }}>еталон {expected} · </span>
                  <span style={{ fontWeight: 600 }}>ти: {userText}</span>
                </span>
              </div>
            )
          })}
        </GlassPanel>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 32 }}>
        <Button variant="secondary" onClick={downloadScreenshot}>📷 Скачати звіт</Button>
        <Button onClick={reset}>Почати знову</Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build, commit**

```bash
npm run typecheck && npm run build
git add src/lab/SummaryScreen.tsx
git commit -m "feat(lab): animated summary reveal with staggered rows"
```

---

## Phase 4 — Guided Core (Tasks 20-25)

### Task 20: TaskSteps definitions

**Files:**
- Create: `src/guided/TaskSteps.ts`
- Test: `tests/guided/TaskSteps.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/guided/TaskSteps.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { TASK_STEPS } from '../../src/guided/TaskSteps'

describe('TASK_STEPS', () => {
  it('has step trees for all 9 tasks', () => {
    expect(Object.keys(TASK_STEPS)).toHaveLength(9)
    expect(TASK_STEPS).toHaveProperty('t1')
    expect(TASK_STEPS).toHaveProperty('t9')
  })
  it('each task has at least 4 steps', () => {
    for (const taskId of Object.keys(TASK_STEPS)) {
      expect(TASK_STEPS[taskId].length).toBeGreaterThanOrEqual(4)
    }
  })
  it('each step has unique id within its task', () => {
    for (const taskId of Object.keys(TASK_STEPS)) {
      const ids = TASK_STEPS[taskId].map(s => s.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })
  it('lever-balance tasks have a balance-loop step', () => {
    const leverTasks = ['t2', 't5', 't8']
    for (const tid of leverTasks) {
      const stepIds = TASK_STEPS[tid].map(s => s.id)
      expect(stepIds).toContain('balance-loop')
    }
  })
})
```

- [ ] **Step 2: Run tests — expect failure**

```bash
npm run test
```

- [ ] **Step 3: Implement TaskSteps**

Create `src/guided/TaskSteps.ts`:

```ts
export type StepTarget =
  | { kind: 'object'; id: 'tennis-ball' | 'apple' | 'baseball' | 'weight-any' }
  | { kind: 'instrument'; id: 'digital-scale' | 'lever-balance-left' | 'lever-balance-right' | 'dynamometer-hook' }
  | { kind: 'ui'; id: 'input' | 'submit' }

export type CompletionRule =
  | { kind: 'dragging'; bodyPattern: string }
  | { kind: 'snapped'; targetPrefix: string }
  | { kind: 'reading-stable'; instrument: 'digital-scale' | 'dynamometer'; minValue: number; durationMs: number }
  | { kind: 'lever-balanced'; toleranceTilt: number }
  | { kind: 'input-focused' }
  | { kind: 'submitted' }

export type Step = {
  id: string
  target: StepTarget
  visualHint: 'arrow' | 'glow' | 'target-ring' | 'highlight'
  hintTemplate: string  // e.g. "Введи {value} у поле"
  complete: CompletionRule
}

export type TaskStepsMap = Record<string, Step[]>

const objectIdToTarget = (objId: string): StepTarget =>
  objId === 'tennis-ball' || objId === 'apple' || objId === 'baseball'
    ? { kind: 'object', id: objId as 'tennis-ball' | 'apple' | 'baseball' }
    : { kind: 'object', id: 'tennis-ball' }

function makeDigitalScaleSteps(taskId: string, objectId: string): Step[] {
  const obj = objectIdToTarget(objectId)
  return [
    { id: 'pickup', target: obj, visualHint: 'arrow',
      hintTemplate: `Натисни і потримай ${objectId === 'tennis-ball' ? 'тенісний м\'яч' : objectId === 'apple' ? 'яблуко' : 'бейсбольний м\'яч'}`,
      complete: { kind: 'dragging', bodyPattern: objectId } },
    { id: 'place', target: { kind: 'instrument', id: 'digital-scale' }, visualHint: 'target-ring',
      hintTemplate: 'Перетягни на платформу електронних ваг',
      complete: { kind: 'snapped', targetPrefix: 'digital-scale' } },
    { id: 'read', target: { kind: 'instrument', id: 'digital-scale' }, visualHint: 'highlight',
      hintTemplate: 'Дисплей показує {digitalScaleGrams} г',
      complete: { kind: 'reading-stable', instrument: 'digital-scale', minValue: 1, durationMs: 1500 } },
    { id: 'enter', target: { kind: 'ui', id: 'input' }, visualHint: 'arrow',
      hintTemplate: 'Введи {digitalScaleGrams} у поле нижче',
      complete: { kind: 'input-focused' } },
    { id: 'submit', target: { kind: 'ui', id: 'submit' }, visualHint: 'arrow',
      hintTemplate: 'Натисни "Записати"',
      complete: { kind: 'submitted' } },
  ]
}

function makeDynamometerSteps(taskId: string, objectId: string): Step[] {
  const obj = objectIdToTarget(objectId)
  return [
    { id: 'pickup', target: obj, visualHint: 'arrow',
      hintTemplate: 'Візьми предмет',
      complete: { kind: 'dragging', bodyPattern: objectId } },
    { id: 'hang', target: { kind: 'instrument', id: 'dynamometer-hook' }, visualHint: 'target-ring',
      hintTemplate: 'Підвісь на гачок динамометра',
      complete: { kind: 'snapped', targetPrefix: 'dynamometer-hook' } },
    { id: 'read', target: { kind: 'instrument', id: 'dynamometer-hook' }, visualHint: 'highlight',
      hintTemplate: 'Шкала показує {dynamometerNewtons} N',
      complete: { kind: 'reading-stable', instrument: 'dynamometer', minValue: 0.05, durationMs: 1500 } },
    { id: 'enter', target: { kind: 'ui', id: 'input' }, visualHint: 'arrow',
      hintTemplate: 'Введи значення в Ньютонах',
      complete: { kind: 'input-focused' } },
    { id: 'submit', target: { kind: 'ui', id: 'submit' }, visualHint: 'arrow',
      hintTemplate: 'Натисни "Записати"',
      complete: { kind: 'submitted' } },
  ]
}

function makeLeverBalanceSteps(taskId: string, objectId: string): Step[] {
  const obj = objectIdToTarget(objectId)
  return [
    { id: 'pickup-object', target: obj, visualHint: 'arrow',
      hintTemplate: 'Візьми предмет',
      complete: { kind: 'dragging', bodyPattern: objectId } },
    { id: 'place-left', target: { kind: 'instrument', id: 'lever-balance-left' }, visualHint: 'target-ring',
      hintTemplate: 'Поклади на ЛІВУ чашу',
      complete: { kind: 'snapped', targetPrefix: 'lever-left' } },
    { id: 'pickup-weight', target: { kind: 'object', id: 'weight-any' }, visualHint: 'arrow',
      hintTemplate: 'Візьми гирьку',
      complete: { kind: 'dragging', bodyPattern: 'weight' } },
    { id: 'place-right', target: { kind: 'instrument', id: 'lever-balance-right' }, visualHint: 'target-ring',
      hintTemplate: 'Поклади на ПРАВУ чашу',
      complete: { kind: 'snapped', targetPrefix: 'lever-right' } },
    { id: 'balance-loop', target: { kind: 'instrument', id: 'lever-balance-right' }, visualHint: 'highlight',
      hintTemplate: 'Праворуч {leverRightPanGrams} г — додай/прибери поки не вирівняється',
      complete: { kind: 'lever-balanced', toleranceTilt: 0.05 } },
    { id: 'enter', target: { kind: 'ui', id: 'input' }, visualHint: 'arrow',
      hintTemplate: 'Маса = {leverRightPanGrams} г. Введи у поле',
      complete: { kind: 'input-focused' } },
    { id: 'submit', target: { kind: 'ui', id: 'submit' }, visualHint: 'arrow',
      hintTemplate: 'Натисни "Записати"',
      complete: { kind: 'submitted' } },
  ]
}

export const TASK_STEPS: TaskStepsMap = {
  t1: makeDigitalScaleSteps('t1', 'tennis-ball'),
  t2: makeLeverBalanceSteps('t2', 'tennis-ball'),
  t3: makeDynamometerSteps('t3', 'tennis-ball'),
  t4: makeDigitalScaleSteps('t4', 'apple'),
  t5: makeLeverBalanceSteps('t5', 'apple'),
  t6: makeDynamometerSteps('t6', 'apple'),
  t7: makeDigitalScaleSteps('t7', 'baseball'),
  t8: makeLeverBalanceSteps('t8', 'baseball'),
  t9: makeDynamometerSteps('t9', 'baseball'),
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npm run test
```

All tests should pass (17 existing + 4 new = 21).

- [ ] **Step 5: Commit**

```bash
git add src/guided/TaskSteps.ts tests/guided/TaskSteps.test.ts
git commit -m "feat(guided): TaskSteps definitions for all 9 tasks"
```

---

### Task 21: StepEngine with auto-detection

**Files:**
- Create: `src/guided/StepEngine.ts`
- Test: `tests/guided/StepEngine.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/guided/StepEngine.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useStepEngine } from '../../src/guided/StepEngine'

describe('StepEngine', () => {
  beforeEach(() => {
    useStepEngine.getState().resetForTask(0)
  })

  it('starts at step 0 of task 0', () => {
    const s = useStepEngine.getState()
    expect(s.currentStepIndex).toBe(0)
    expect(s.currentTaskIndex).toBe(0)
  })

  it('resetForTask sets task and resets step', () => {
    const { resetForTask } = useStepEngine.getState()
    resetForTask(3)
    const s = useStepEngine.getState()
    expect(s.currentTaskIndex).toBe(3)
    expect(s.currentStepIndex).toBe(0)
  })

  it('setDragging stores body id', () => {
    const { setDragging } = useStepEngine.getState()
    setDragging('tennis-ball-0')
    expect(useStepEngine.getState().draggingBodyId).toBe('tennis-ball-0')
    setDragging(null)
    expect(useStepEngine.getState().draggingBodyId).toBe(null)
  })

  it('advanceStep increments index', () => {
    const { advanceStep } = useStepEngine.getState()
    advanceStep()
    expect(useStepEngine.getState().currentStepIndex).toBe(1)
  })
})
```

- [ ] **Step 2: Run — expect failure**

```bash
npm run test
```

- [ ] **Step 3: Implement StepEngine**

Create `src/guided/StepEngine.ts`:

```ts
import { create } from 'zustand'

export type StepEngineState = {
  currentTaskIndex: number
  currentStepIndex: number
  draggingBodyId: string | null
  inputFocused: boolean
  lastSnapTargetId: string | null
  readingStableSinceMs: number
  setDragging: (id: string | null) => void
  setInputFocused: (b: boolean) => void
  setLastSnap: (id: string | null) => void
  setReadingStableSince: (ms: number) => void
  advanceStep: () => void
  resetForTask: (taskIndex: number) => void
}

export const useStepEngine = create<StepEngineState>((set) => ({
  currentTaskIndex: 0,
  currentStepIndex: 0,
  draggingBodyId: null,
  inputFocused: false,
  lastSnapTargetId: null,
  readingStableSinceMs: 0,
  setDragging: (id) => set({ draggingBodyId: id }),
  setInputFocused: (b) => set({ inputFocused: b }),
  setLastSnap: (id) => set({ lastSnapTargetId: id }),
  setReadingStableSince: (ms) => set({ readingStableSinceMs: ms }),
  advanceStep: () => set(s => ({ currentStepIndex: s.currentStepIndex + 1 })),
  resetForTask: (taskIndex) => set({
    currentTaskIndex: taskIndex,
    currentStepIndex: 0,
    draggingBodyId: null,
    inputFocused: false,
    lastSnapTargetId: null,
    readingStableSinceMs: 0,
  }),
}))

/**
 * Pure function — given current state, current step's completion rule, and reading values,
 * decide whether the step is complete.
 */
export function isStepComplete(
  rule: import('./TaskSteps').CompletionRule,
  ctx: {
    draggingBodyId: string | null
    lastSnapTargetId: string | null
    digitalScaleGrams: number
    dynamometerNewtons: number
    leverBalanceTilt: number
    leverRightPanGrams: number
    readingStableSinceMs: number
    nowMs: number
    inputFocused: boolean
    submittedSinceMs: number  // 0 if not submitted; ms since submission otherwise
  }
): boolean {
  switch (rule.kind) {
    case 'dragging':
      return ctx.draggingBodyId !== null && ctx.draggingBodyId.includes(rule.bodyPattern)
    case 'snapped':
      return ctx.lastSnapTargetId !== null && ctx.lastSnapTargetId.startsWith(rule.targetPrefix)
    case 'reading-stable': {
      const value = rule.instrument === 'digital-scale' ? ctx.digitalScaleGrams : ctx.dynamometerNewtons
      return value >= rule.minValue && (ctx.nowMs - ctx.readingStableSinceMs) >= rule.durationMs
    }
    case 'lever-balanced':
      return Math.abs(ctx.leverBalanceTilt) < rule.toleranceTilt && ctx.leverRightPanGrams > 0
    case 'input-focused':
      return ctx.inputFocused
    case 'submitted':
      return ctx.submittedSinceMs > 0
  }
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npm run test
```

- [ ] **Step 5: Commit**

```bash
git add src/guided/StepEngine.ts tests/guided/StepEngine.test.ts
git commit -m "feat(guided): StepEngine zustand store + isStepComplete pure function"
```

---

### Task 22: Visual primitives (Arrow3D, GlowRing, HighlightOutline, PulseEffect)

**Files:**
- Create: `src/guided/primitives/Arrow3D.tsx`
- Create: `src/guided/primitives/GlowRing.tsx`
- Create: `src/guided/primitives/HighlightOutline.tsx`
- Create: `src/guided/primitives/PulseEffect.tsx`

- [ ] **Step 1: Arrow3D**

Create `src/guided/primitives/Arrow3D.tsx`:

```tsx
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Mesh } from 'three'

type Props = { position: [number, number, number]; color?: string }

export function Arrow3D({ position, color = '#0071e3' }: Props) {
  const ref = useRef<Mesh>(null)
  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.getElapsedTime()
    ref.current.position.y = position[1] + 0.05 + Math.sin(t * 3) * 0.015
    const scale = 1 + Math.sin(t * 4) * 0.1
    ref.current.scale.setScalar(scale)
  })
  return (
    <group position={position}>
      <mesh ref={ref}>
        <coneGeometry args={[0.025, 0.06, 4]} rotation={[Math.PI, 0, 0]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} transparent opacity={0.9} />
      </mesh>
    </group>
  )
}
```

- [ ] **Step 2: GlowRing**

Create `src/guided/primitives/GlowRing.tsx`:

```tsx
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Mesh } from 'three'

type Props = { position: [number, number, number]; radius?: number; color?: string }

export function GlowRing({ position, radius = 0.1, color = '#0071e3' }: Props) {
  const inner = useRef<Mesh>(null)
  const outer = useRef<Mesh>(null)
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (inner.current) {
      const m = inner.current.material as { opacity: number }
      m.opacity = 0.5 + Math.sin(t * 2) * 0.2
    }
    if (outer.current) {
      const phase = (t * 0.5) % 1
      outer.current.scale.setScalar(1 + phase * 0.5)
      const m = outer.current.material as { opacity: number }
      m.opacity = 0.5 * (1 - phase)
    }
  })
  return (
    <group position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh ref={inner}>
        <ringGeometry args={[radius * 0.85, radius, 48]} />
        <meshBasicMaterial color={color} transparent opacity={0.5} />
      </mesh>
      <mesh ref={outer}>
        <ringGeometry args={[radius * 0.85, radius, 48]} />
        <meshBasicMaterial color={color} transparent opacity={0.4} />
      </mesh>
    </group>
  )
}
```

- [ ] **Step 3: HighlightOutline (lightweight wrapper)**

Create `src/guided/primitives/HighlightOutline.tsx`:

```tsx
import { Outlines } from '@react-three/drei'

type Props = { color?: string; thickness?: number }

export function HighlightOutline({ color = '#0071e3', thickness = 4 }: Props) {
  return <Outlines thickness={thickness} color={color} />
}
```

- [ ] **Step 4: PulseEffect (HTML/CSS)**

Create `src/guided/primitives/PulseEffect.tsx`:

```tsx
import { CSSProperties } from 'react'

type Props = { children: React.ReactNode; active: boolean; style?: CSSProperties }

export function PulseEffect({ children, active, style }: Props) {
  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-block',
        ...style,
      }}
    >
      {children}
      {active && (
        <div
          style={{
            position: 'absolute', inset: -4, borderRadius: 16,
            border: '2px solid #0071e3',
            animation: 'pulseRing 1.2s ease-out infinite',
            pointerEvents: 'none',
          }}
        />
      )}
      <style>{`
        @keyframes pulseRing {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(1.15); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
```

- [ ] **Step 5: Verify build, commit**

```bash
npm run typecheck && npm run build
git add src/guided/primitives/
git commit -m "feat(guided): visual primitives — Arrow3D, GlowRing, HighlightOutline, PulseEffect"
```

---

### Task 23: GuidedOverlay component

**Files:**
- Create: `src/guided/GuidedOverlay.tsx`
- Modify: `src/scene/LabScene.tsx`

- [ ] **Step 1: Implement GuidedOverlay**

Create `src/guided/GuidedOverlay.tsx`:

```tsx
import { useFrame } from '@react-three/fiber'
import { useStepEngine, isStepComplete } from './StepEngine'
import { TASK_STEPS } from './TaskSteps'
import { useLabState } from '../lab/LabState'
import { useReadings } from '../lab/InstrumentReadings'
import { Arrow3D } from './primitives/Arrow3D'
import { GlowRing } from './primitives/GlowRing'

const TARGET_POSITIONS: Record<string, [number, number, number]> = {
  // Approximate world positions for guided arrows/rings
  'tennis-ball':           [-1.05, 0.15, 0],
  'apple':                 [-1.05, 0.15, 0.18],
  'baseball':              [-1.05, 0.15, -0.18],
  'digital-scale':         [0.75, 0.10, 0],
  'lever-balance-left':    [-0.20, 0.32, 0],   // Left pan (lever at x=0.05, beam_len/2=0.225)
  'lever-balance-right':   [0.30, 0.32, 0],    // Right pan
  'dynamometer-hook':      [-0.50, 0.27, 0],
}

export function GuidedOverlay() {
  const taskIndex = useLabState(s => s.currentTaskIndex)
  const phase = useLabState(s => s.phase)
  const stepIdx = useStepEngine(s => s.currentStepIndex)
  const draggingBodyId = useStepEngine(s => s.draggingBodyId)
  const lastSnapTargetId = useStepEngine(s => s.lastSnapTargetId)
  const inputFocused = useStepEngine(s => s.inputFocused)
  const advanceStep = useStepEngine(s => s.advanceStep)

  const digitalScaleGrams = useReadings(s => s.digitalScaleGrams)
  const dynamometerNewtons = useReadings(s => s.dynamometerNewtons)
  const leverBalanceTilt = useReadings(s => s.leverBalanceTilt)
  const leverRightPanGrams = useReadings(s => s.leverRightPanGrams)

  // Auto-detect step completion
  useFrame(({ clock }) => {
    if (phase !== 'in-progress') return
    const taskId = `t${taskIndex + 1}`
    const steps = TASK_STEPS[taskId]
    if (!steps || stepIdx >= steps.length) return
    const step = steps[stepIdx]
    const nowMs = clock.getElapsedTime() * 1000

    const ctx = {
      draggingBodyId, lastSnapTargetId,
      digitalScaleGrams, dynamometerNewtons, leverBalanceTilt, leverRightPanGrams,
      readingStableSinceMs: useStepEngine.getState().readingStableSinceMs,
      nowMs, inputFocused,
      submittedSinceMs: 0,  // submission tracked via journal length change in Task 24
    }

    // Update reading-stable timestamp if reading just became valid
    if (step.complete.kind === 'reading-stable') {
      const v = step.complete.instrument === 'digital-scale' ? digitalScaleGrams : dynamometerNewtons
      if (v >= step.complete.minValue && useStepEngine.getState().readingStableSinceMs === 0) {
        useStepEngine.getState().setReadingStableSince(nowMs)
      } else if (v < step.complete.minValue) {
        useStepEngine.getState().setReadingStableSince(0)
      }
    }

    if (isStepComplete(step.complete, ctx)) {
      advanceStep()
      // Reset stable timer for next step
      useStepEngine.getState().setReadingStableSince(0)
    }
  })

  // Determine current step's visual hint and target position
  if (phase !== 'in-progress') return null
  const taskId = `t${taskIndex + 1}`
  const steps = TASK_STEPS[taskId]
  if (!steps || stepIdx >= steps.length) return null
  const step = steps[stepIdx]
  if (step.target.kind === 'ui') return null  // UI steps handled in HTML overlay

  const targetKey =
    step.target.kind === 'object' ? step.target.id : step.target.id
  const pos = TARGET_POSITIONS[targetKey]
  if (!pos) return null

  return (
    <>
      {step.visualHint === 'arrow' && <Arrow3D position={pos} />}
      {step.visualHint === 'target-ring' && <GlowRing position={pos} radius={0.12} />}
      {/* highlight applied by instrument's existing `active` prop already */}
    </>
  )
}
```

- [ ] **Step 2: Wire into LabScene**

In `src/scene/LabScene.tsx`, add inside `<Physics>`:

```tsx
import { GuidedOverlay } from '../guided/GuidedOverlay'
// ...
<Physics ...>
  {/* ... existing ... */}
  <GuidedOverlay />
</Physics>
```

- [ ] **Step 3: Verify build, commit**

```bash
npm run typecheck && npm run build
git add src/guided/GuidedOverlay.tsx src/scene/LabScene.tsx
git commit -m "feat(guided): GuidedOverlay with auto-step-detection and 3D hints"
```

---

### Task 24: Wire useDrag to StepEngine + add submitted tracking

**Files:**
- Modify: `src/physics/useDrag.ts`
- Modify: `src/scene/objects/Draggable.tsx`
- Modify: `src/lab/HUD.tsx` (input focus tracking)
- Modify: `src/lab/LabState.ts` (submission timestamp)

- [ ] **Step 1: Add submission timestamp to LabState**

In `src/lab/LabState.ts`, add `lastSubmittedAtMs` field and update on `setMeasurement`:

```ts
type LabState = {
  // ... existing
  lastSubmittedAtMs: number
}

export const useLabState = create<LabState>((set, get) => ({
  // ... existing initial state
  lastSubmittedAtMs: 0,

  setMeasurement: (taskId, userValue) => {
    const { journal, currentTaskIndex } = get()
    const newJournal = [...journal, { taskId, userValue, timestamp: Date.now() }]
    const newIndex = currentTaskIndex + 1
    set({
      journal: newJournal,
      currentTaskIndex: newIndex,
      phase: newIndex >= TOTAL_TASKS ? 'finished' : 'in-progress',
      lastSubmittedAtMs: Date.now(),
    })
  },
  // ... rest unchanged
}))
```

- [ ] **Step 2: Hook Draggable to StepEngine**

In `src/scene/objects/Draggable.tsx`, accept an optional `bodyId` prop and notify StepEngine:

```tsx
import { useStepEngine } from '../../guided/StepEngine'

type Props = {
  position: [number, number, number]
  mass: number
  shape: { type: 'ball'; radius: number } | { type: 'cuboid'; halfExtents: [number, number, number] }
  bodyId?: string  // for guided detection
  children: ReactNode
}

export function Draggable({ position, mass, shape, bodyId, children }: Props) {
  const ref = useRef<RapierRigidBody>(null)
  const setDragging = useStepEngine(s => s.setDragging)
  const { onPointerDown: rawDown, onPointerMove, onPointerUp: rawUp } = useDrag({ rigidBody: ref })

  const onPointerDown = (ev: React.PointerEvent) => {
    if (bodyId) setDragging(bodyId)
    rawDown(ev as any)
  }
  const onPointerUp = (ev: React.PointerEvent) => {
    if (bodyId) setDragging(null)
    rawUp(ev as any)
  }
  // ... rest of component as before, with onPointerMove unchanged
}
```

Then in `TennisBall.tsx`, `Apple.tsx`, `Baseball.tsx`, `Weights.tsx` — pass `bodyId` to Draggable:

- TennisBall: `bodyId="tennis-ball"`
- Apple: `bodyId="apple"`
- Baseball: `bodyId="baseball"`
- Weights: `bodyId={`weight-${w.label}`}`

- [ ] **Step 3: Wire snap targets to StepEngine**

In `src/physics/snapTargets.ts`, when `findSnapNear` returns a target, the caller (`useDrag.onPointerUp`) should also update StepEngine's `lastSnapTargetId`:

In `src/physics/useDrag.ts`, modify `onPointerUp`:

```ts
import { useStepEngine } from '../guided/StepEngine'
// inside the hook, before returning callbacks:
const setLastSnap = useStepEngine.getState().setLastSnap

const onPointerUp = (ev: ThreeEvent<PointerEvent>) => {
  // ... existing logic up to snap detection
  if (snap) {
    snap.onAttach(rigidBody.current)
    setLastSnap(snap.id)
  } else {
    rigidBody.current.setBodyType(0, true)
  }
  // ... rest
}
```

- [ ] **Step 4: Wire input focus to StepEngine**

In `src/ui/NumberInput.tsx`, on the trigger button:

```tsx
import { useStepEngine } from '../guided/StepEngine'
// inside component:
const setInputFocused = useStepEngine(s => s.setInputFocused)
// on the trigger button:
onClick={() => { setKeypadOpen(true); setInputFocused(true) }}
// when keypad closes:
onCancel={() => { setKeypadOpen(false); setInputFocused(false) }}
```

- [ ] **Step 5: Reset StepEngine on task advance**

In `src/lab/HUD.tsx` or a new `src/guided/sync.ts`, watch `useLabState.currentTaskIndex` and call `useStepEngine.resetForTask`:

In `src/lab/HUD.tsx`, add a `useEffect`:

```tsx
import { useStepEngine } from '../guided/StepEngine'
// ...
const resetForTask = useStepEngine(s => s.resetForTask)
useEffect(() => {
  resetForTask(idx)
}, [idx, resetForTask])
```

- [ ] **Step 6: Verify build, commit**

```bash
npm run typecheck && npm run test && npm run build
git add -A
git commit -m "feat(guided): wire useDrag, snap targets, input focus to StepEngine"
```

---

### Task 25: Skip guidance toggle + localStorage

**Files:**
- Create: `src/guided/SkipGuidanceToggle.tsx`
- Modify: `src/lab/HUD.tsx`
- Modify: `src/scene/LabScene.tsx`

- [ ] **Step 1: Create toggle component**

Create `src/guided/SkipGuidanceToggle.tsx`:

```tsx
import { useState, useEffect } from 'react'
import { create } from 'zustand'

type GuidanceState = {
  enabled: boolean
  toggle: () => void
  setEnabled: (b: boolean) => void
}

export const useGuidance = create<GuidanceState>((set) => ({
  enabled: typeof localStorage !== 'undefined' ? localStorage.getItem('guidance') !== 'off' : true,
  toggle: () => set(s => {
    const newVal = !s.enabled
    if (typeof localStorage !== 'undefined') localStorage.setItem('guidance', newVal ? 'on' : 'off')
    return { enabled: newVal }
  }),
  setEnabled: (b) => set(() => {
    if (typeof localStorage !== 'undefined') localStorage.setItem('guidance', b ? 'on' : 'off')
    return { enabled: b }
  }),
}))

export function SkipGuidanceToggle() {
  const enabled = useGuidance(s => s.enabled)
  const toggle = useGuidance(s => s.toggle)
  return (
    <button
      onClick={toggle}
      style={{
        position: 'fixed', bottom: 16, left: 16, zIndex: 11,
        background: 'rgba(255,255,255,0.7)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(0,0,0,0.08)',
        padding: '8px 14px', borderRadius: 100,
        fontSize: 12, fontWeight: 500, color: '#1d1d1f',
        cursor: 'pointer', minHeight: 36,
        fontFamily: '"SF Pro Display", "Inter", system-ui',
      }}
    >
      🎓 Гід: {enabled ? 'Увімк' : 'Вимк'}
    </button>
  )
}
```

- [ ] **Step 2: Conditionally render GuidedOverlay**

In `src/scene/LabScene.tsx`:

```tsx
import { useGuidance } from '../guided/SkipGuidanceToggle'
// ...
const guidanceOn = useGuidance(s => s.enabled)
// inside Physics:
{guidanceOn && <GuidedOverlay />}
```

- [ ] **Step 3: Render toggle in HUD or LabScene**

In `src/scene/LabScene.tsx` at the bottom of the JSX (next to camera buttons):

```tsx
import { SkipGuidanceToggle } from '../guided/SkipGuidanceToggle'
// ...
<SkipGuidanceToggle />
```

- [ ] **Step 4: Verify build, commit**

```bash
npm run typecheck && npm run build
git add src/guided/SkipGuidanceToggle.tsx src/scene/LabScene.tsx
git commit -m "feat(guided): skip guidance toggle with localStorage persistence"
```

---

## Phase 5 — Guided Polish (Tasks 26-28)

### Task 26: Adaptive lever balance hint (loop step)

**Files:**
- Modify: `src/lab/HUD.tsx` (already adaptive in HUD, but ensure tied to StepEngine)
- Modify: `src/guided/TaskSteps.ts` (richer hintTemplate)

The lever balance loop step (`balance-loop`) needs context-aware hint. The HUD already does this via `useReadings`. This task ensures consistency between guided overlay text and HUD.

- [ ] **Step 1: Add adaptive hint resolution**

Create `src/guided/hintResolver.ts`:

```ts
import { Step } from './TaskSteps'

type Ctx = {
  digitalScaleGrams: number
  dynamometerNewtons: number
  leverBalanceTilt: number
  leverRightPanGrams: number
  expectedValueGrams: number
}

export function resolveHint(step: Step, ctx: Ctx): string {
  let text = step.hintTemplate
  text = text.replace('{digitalScaleGrams}', String(ctx.digitalScaleGrams))
  text = text.replace('{dynamometerNewtons}', ctx.dynamometerNewtons.toFixed(2))
  text = text.replace('{leverRightPanGrams}', String(ctx.leverRightPanGrams))

  if (step.id === 'balance-loop') {
    const tilt = ctx.leverBalanceTilt
    if (Math.abs(tilt) < 0.05) {
      text = `✓ Балка вирівняна. Маса = ${ctx.leverRightPanGrams} г`
    } else if (tilt < -0.05) {
      const need = Math.max(0, ctx.expectedValueGrams - ctx.leverRightPanGrams)
      text = `Ліва важче — додай ще ~${need} г на праву (зараз ${ctx.leverRightPanGrams} г)`
    } else {
      text = `Права важче — прибери малу гирьку (зараз ${ctx.leverRightPanGrams} г)`
    }
  }
  return text
}
```

- [ ] **Step 2: Use in GuidedOverlay or HUD**

Optional — add to GuidedHUD if Task 23/24 left text rendering separate. Otherwise, HUD's existing logic already covers this.

- [ ] **Step 3: Verify, commit**

```bash
npm run typecheck && npm run build
git add src/guided/hintResolver.ts
git commit -m "feat(guided): adaptive hint resolver for lever balance loop step"
```

---

### Task 27: Camera auto-zoom on active instrument

**Files:**
- Modify: `src/scene/LabScene.tsx` (camera preset follows current task)

- [ ] **Step 1: Wire CameraRig preset to current task**

In `src/scene/LabScene.tsx`, derive preset from the current task's instrument:

```tsx
const currentTask = phase === 'in-progress' ? tasks[idx] : null
const taskPreset: CameraPreset =
  !currentTask ? 'overview'
  : currentTask.instrumentId === 'digital-scale' ? 'digital-scale'
  : currentTask.instrumentId === 'dynamometer' ? 'dynamometer'
  : currentTask.instrumentId === 'lever-balance' ? 'lever-balance'
  : 'overview'

// Replace preset state with computed:
// Remove: const [preset, setPreset] = useState<CameraPreset>('overview')
// Use taskPreset directly:
<CameraRig preset={taskPreset} />
```

Update camera buttons — "Скинути" sets a manual override; "Наблизити" zooms to current task's instrument. To support manual override, keep `preset` state but default it from `taskPreset`:

```tsx
const [manualPreset, setManualPreset] = useState<CameraPreset | null>(null)
const effectivePreset = manualPreset ?? taskPreset

// Cancel manual override after task changes:
useEffect(() => {
  setManualPreset(null)
}, [idx])

// Buttons:
<Button variant="secondary" onClick={() => setManualPreset('overview')}>Скинути</Button>
<Button variant="secondary" onClick={() => setManualPreset(taskPreset)}>Наблизити</Button>
```

- [ ] **Step 2: Verify, commit**

```bash
npm run typecheck && npm run build
git add src/scene/LabScene.tsx
git commit -m "feat(scene): camera auto-zooms to active task's instrument"
```

---

### Task 28: CSS micro-step transitions

**Files:**
- Modify: `src/lab/HUD.tsx` (key on currentStepIndex for transition)

- [ ] **Step 1: Add transition wrapper around step hint text**

In `src/lab/HUD.tsx`, wrap the live reading + step hint block:

```tsx
import { useStepEngine } from '../guided/StepEngine'
// ...
const stepIdx = useStepEngine(s => s.currentStepIndex)
// ...
<div
  key={`${idx}-${stepIdx}`}
  style={{
    paddingTop: 16,
    animation: 'slideInLeft 250ms cubic-bezier(0.34, 1.56, 0.64, 1)',
  }}
>
  {/* existing live reading + step hint */}
</div>
<style>{`
  @keyframes slideInLeft {
    from { opacity: 0; transform: translateX(-12px); }
    to { opacity: 1; transform: translateX(0); }
  }
`}</style>
```

- [ ] **Step 2: Verify, commit**

```bash
npm run typecheck && npm run build
git add src/lab/HUD.tsx
git commit -m "feat(lab): CSS slide-in transition for HUD step hint changes"
```

---

## Phase 6 — Final Polish (Tasks 29-31)

### Task 29: Adaptive quality detection

**Files:**
- Create: `src/perf/adaptiveQuality.ts`
- Modify: `src/scene/PostProcessing.tsx`
- Modify: `src/scene/LabScene.tsx`

- [ ] **Step 1: Create adaptive quality store**

Create `src/perf/adaptiveQuality.ts`:

```ts
import { create } from 'zustand'

type QualityLevel = 'high' | 'medium' | 'low'

type State = {
  level: QualityLevel
  fpsHistory: number[]
  setLevel: (l: QualityLevel) => void
  recordFps: (fps: number) => void
}

export const useQuality = create<State>((set, get) => ({
  level: (typeof localStorage !== 'undefined' ? (localStorage.getItem('quality') as QualityLevel) : null) || 'high',
  fpsHistory: [],
  setLevel: (l) => {
    if (typeof localStorage !== 'undefined') localStorage.setItem('quality', l)
    set({ level: l })
  },
  recordFps: (fps) => {
    const h = [...get().fpsHistory, fps].slice(-30)
    set({ fpsHistory: h })
    if (h.length === 30) {
      const avg = h.reduce((a, b) => a + b, 0) / 30
      const cur = get().level
      if (avg < 30 && cur !== 'low') get().setLevel('low')
      else if (avg < 50 && cur === 'high') get().setLevel('medium')
    }
  },
}))
```

- [ ] **Step 2: Make PostProcessing react to quality**

In `src/scene/PostProcessing.tsx`:

```tsx
import { useQuality } from '../perf/adaptiveQuality'

export function PostProcessing(props: Props) {
  const level = useQuality(s => s.level)
  if (level === 'low') return null  // No post-processing on low
  return (
    <EffectComposer multisampling={level === 'high' ? 2 : 0}>
      {level === 'high' && <DepthOfField focusDistance={props.focusDistance ?? 0.7} focalLength={0.05} bokehScale={2} height={480} />}
      <N8AO halfRes intensity={level === 'high' ? 0.6 : 0.3} aoRadius={0.3} distanceFalloff={0.5} />
      {level === 'high' && <Bloom intensity={0.3} luminanceThreshold={0.95} luminanceSmoothing={0.2} mipmapBlur />}
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette eskil={false} offset={0.15} darkness={0.4} blendFunction={BlendFunction.NORMAL} />
    </EffectComposer>
  )
}
```

- [ ] **Step 3: Track FPS in LabScene**

In `src/scene/LabScene.tsx`, add an FPS tracker:

```tsx
import { useFrame } from '@react-three/fiber'
import { useQuality } from '../perf/adaptiveQuality'

function FpsTracker() {
  const recordFps = useQuality(s => s.recordFps)
  useFrame((_, delta) => {
    if (delta > 0) recordFps(1 / delta)
  })
  return null
}
```

Add `<FpsTracker />` inside `<Canvas>`. Also adjust dpr based on level:

```tsx
import { useQuality } from '../perf/adaptiveQuality'
const qualityLevel = useQuality(s => s.level)
const dpr: [number, number] = qualityLevel === 'high' ? [1, 2] : qualityLevel === 'medium' ? [1, 1.5] : [1, 1]
// Pass: <Canvas dpr={dpr} ...>
```

- [ ] **Step 4: Verify, commit**

```bash
npm run typecheck && npm run build
git add src/perf/adaptiveQuality.ts src/scene/PostProcessing.tsx src/scene/LabScene.tsx
git commit -m "feat(perf): adaptive quality based on FPS measurement"
```

---

### Task 30: Confetti on summary high score

**Files:**
- Modify: `src/lab/SummaryScreen.tsx`

- [ ] **Step 1: Add CSS-based confetti**

Add to `src/lab/SummaryScreen.tsx`:

```tsx
function Confetti() {
  const pieces = Array.from({ length: 50 }, (_, i) => i)
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1 }}>
      {pieces.map(i => {
        const left = Math.random() * 100
        const delay = Math.random() * 2
        const duration = 3 + Math.random() * 2
        const color = ['#0071e3', '#34c759', '#ff9500', '#ff3b30'][i % 4]
        return (
          <div key={i} style={{
            position: 'absolute', top: -10, left: `${left}%`,
            width: 8, height: 12, background: color,
            animation: `fall ${duration}s ${delay}s linear forwards`,
          }}/>
        )
      })}
      <style>{`
        @keyframes fall {
          to { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
```

In SummaryScreen JSX, render conditionally:

```tsx
{exact >= 7 && <Confetti />}
```

- [ ] **Step 2: Verify, commit**

```bash
npm run typecheck && npm run build
git add src/lab/SummaryScreen.tsx
git commit -m "feat(lab): celebratory confetti on high-score summary (>=7/9)"
```

---

### Task 31: Build, manual QA, deploy

**Files:** none (operational)

- [ ] **Step 1: Production build**

```bash
cd "C:/Users/vdomo/OneDrive/Рабочий стол/3dwebsimulation"
npm run build
ls -lh dist/
```

Expected: dist/ contains index.html and assets directory.

- [ ] **Step 2: Local preview**

```bash
npx vite preview --port 4173
```

Open http://localhost:4173 — full end-to-end manual test:
- Intro screen reveal
- Pass tasks 1, 5 (lever balance), 9 (dynamometer) — verify guided flow
- Skip guidance toggle, retry — verify localStorage persistence
- Complete all 9 — verify summary + confetti if exact >= 7
- Reset and start again

- [ ] **Step 3: Push to GitHub + Cloudflare Pages**

(Manual: requires user's GitHub/Cloudflare accounts.)

```bash
git remote add origin <user-provided-url>
git push -u origin master
```

In Cloudflare Pages dashboard: connect to GitHub repo, build command `npm run build`, output `dist`.

- [ ] **Step 4: Manual QA on Promethean panel**

Open deployed URL on Promethean Chrome. Verify:
- [ ] FPS stays ≥30 (adaptive quality kicks in if needed)
- [ ] Touch drag-and-drop responsive
- [ ] Multi-touch (2 students simultaneously) works
- [ ] Snap targets reliable
- [ ] Custom number keypad usable with finger
- [ ] All 9 tasks completable
- [ ] Confetti renders on high score

- [ ] **Step 5: Document any issues**

Create `docs/superpowers/qa/2026-05-01-v2-promethean-test.md` with findings.

---

## Self-review

**Spec coverage:**
- ✅ Section 3 architecture (file structure changes) → all files referenced in tasks
- ✅ Section 4 visual style (Apple Studio palette, lighting, materials, post-processing, camera, typography) → Tasks 2-5
- ✅ Section 5 assets strategy (procedural + canvas textures) → Tasks 6-13
- ✅ Section 6 guided mode (TaskSteps, StepEngine, primitives, overlay, skip toggle) → Tasks 20-25
- ✅ Section 7 UI redesign (GlassPanel, Button, TouchNumberKeypad, HUD, IntroScreen, SummaryScreen) → Tasks 14-19
- ✅ Section 8 phases → 6 phases mapped to task ranges
- ✅ Section 9 risks → mitigations referenced (R1: Task 29; R2: Task 8 fallback noted; R3: simplified read step in Task 20; R4: 56→larger tap targets in Tasks 14-15; R5: procedural apple in Task 12; R6: framer-motion deferred)
- ✅ Section 10 testing (vitest for StepEngine, manual QA in Task 31)

**Placeholder scan:** No "TBD"/"TODO" found. All steps include actual code or commands.

**Type consistency:**
- `Step.complete.kind` — used consistently across TaskSteps.ts, StepEngine.ts, hintResolver.ts
- `useStepEngine` API surface (setDragging, setLastSnap, setInputFocused, advanceStep, resetForTask) — consistent
- `CompletionRule` discriminated union — referenced in Task 20 + Task 21 with same shape

**Scope:** Single MVP→v2 polish, ~31 tasks, 4-5 weeks focused work. Reasonable for a single plan.

**Notes for executor:**
- Rapier 2 + R3F 9 + React 19 → most APIs match plan; small adaptations may be needed (e.g., RefObject vs MutableRefObject) — handle inline
- AI apple was dropped per spec Plan B; if user later wants AI generation, do as separate post-v2 task
- Skip guidance toggle persists in localStorage; clearing localStorage resets default ON
