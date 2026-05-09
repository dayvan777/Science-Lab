# Mass Measurement Lab — Gold Standard Refinement

**Date:** 2026-05-09
**Status:** Design approved, ready for implementation plan
**Supersedes:** This spec extends prior work (see `2026-04-29`, `2026-05-01`, `2026-05-07` specs in this directory). Existing functional baseline stays; this work elevates polish, pedagogy, and architecture.

## North Star

Build the reference-grade interactive lab "Вимірювання маси тіл" (mass measurement) that becomes the **template for every future lab** on the platform. The work has three simultaneous goals:

1. **Look like Tesla unveiling** — cinematic dark studio aesthetic, dramatic lighting, premium materials, glassmorphism UI with clear hierarchy.
2. **Deliver a pedagogical aha-moment** — after 9 measurements, an animated reveal proves "mass is invariant" by showing the three instruments converged on the same value.
3. **Ship as an SDK, not a one-off** — extract reusable abstractions (`Instrument`, `Step`, `SnapTarget`, `Reading`, `LabObject`) so future labs are JSON/JSX configurations plus 3D models, not copy-paste forks.

**Non-goals:** sound voiceover, multilingual UI, multiplayer, VR/AR, free sandbox mode, third-party 3D models, backend persistence, Promethean-specific APIs.

**Success metric:** an investor watching the demo says within 30 seconds "this looks professional" and within 3 minutes "I understand why it matters and would buy this for a school."

## Strategy

**Vertical slice** delivery: polish one complete pipeline (Tennis Ball + Digital Scale, task t1) end-to-end first — visual + SDK + pedagogy + audio. Once that vertical proves the SDK and visual language, propagate quickly to the other instruments and objects. Final reveal scene comes last as a separate piece.

This means after ~2-3 days of work there is one complete, demo-ready slice; the rest of the work is amplification, not invention.

## Architecture: Lab SDK

### Folder structure

```
src/
├── sdk/                        ENGINE — reusable across all labs
│   ├── physics/                bodyRegistry, snapTargets, useDrag
│   ├── scene/                  CinematicLighting, StudioTable, CameraRig, PostFX
│   ├── instrument/             Instrument interface, snap factories, reading-store factory
│   ├── object/                 Draggable, LabObject (declarative wrapper)
│   ├── guided/                 StepEngine, TaskSteps DSL types, GuidedOverlay
│   ├── ui/                     GlassPanel, NumberInput, HudShell, RevealScene
│   ├── audio/                  SoundManager (catalog + play API)
│   └── animation/              tween helpers (lerp, ease-cubic, spring-damper)
│
├── labs/
│   └── mass-measurement/       CONTENT — this lab's specifics
│       ├── index.tsx           <MassMeasurementLab/> entry
│       ├── instruments/        DigitalScale, Dynamometer, LeverBalance
│       ├── objects/            TennisBall, Apple, Baseball, Weights
│       ├── content/
│       │   ├── tasks.ts        9 tasks
│       │   ├── steps.ts        step-DSL per task
│       │   ├── reveal.ts       reveal scene config
│       │   └── strings.ts      all UI text (Ukrainian)
│       └── textures/           lab-specific procedural textures
│
└── app/                        AppShell, routing, lab selection
```

### LabDefinition contract

```ts
type LabDefinition = {
  id: string                 // 'mass-measurement'
  title: string              // 'Вимірювання маси тіл'
  scene: SceneConfig         // dimensions, camera presets, lighting variant
  instruments: InstrumentSpec[]
  objects: ObjectSpec[]
  steps: Step[]              // ordered tasks + completion rules
  reveal: RevealConfig       // what to show in the final reveal
}
```

A future lab (e.g. "Friction") creates `labs/friction/` with its own `LabDefinition` and reuses 100% of `sdk/`.

### What stays lab-specific

- Concrete instrument components (`DigitalScale`, `Dynamometer`, `LeverBalance`)
- Task content (`tasks.ts`, `steps.ts`, `reveal.ts`)
- Lab-specific procedural textures (felt, wax, leather)
- Strings

### What graduates into SDK

- All physics utilities (drag, body registry, snap targets)
- StepEngine, GuidedOverlay, TaskSteps DSL types
- Glass UI primitives (GlassPanel, NumberInput, HudShell)
- Lighting and camera systems with named presets
- Animation primitives
- Audio playback
- `<RevealScene/>` (driven by RevealConfig)

### Module isolation rules

- `sdk/*` MUST NOT import from `labs/*`
- A lab MUST import only from `sdk/*` or its own folder
- Top-level `App.tsx` reads a `LabDefinition` and assembles the scene through SDK components

## Visual System

**Direction:** Cinematic Dark Studio (Tesla unveiling). Dark gradient background, warm key-light, cool fill, dramatic specular on metals.

### Lighting (sdk/scene/CinematicLighting.tsx)

- Key light: DirectionalLight, intensity 2.5, color `#fff5e8`, position `[2, 4, 2]`, soft shadows (PCFSoftShadowMap)
- Fill light: DirectionalLight, intensity 0.6, color `#b0c8e8`, position `[-2, 2, 1]`, no shadows
- Rim light: DirectionalLight, intensity 1.5, color `#ffd0a0`, position `[0, 1, -3]` for contour highlights
- Ambient: 0.15
- Hemisphere: skyColor `#2a3040`, groundColor `#1a1208`, intensity 0.3
- Shadows enabled for key-light only

### Background

Radial gradient from `#2a2a30` (center) → `#1a1a1e` → `#0a0a0c` (edges). Implemented as canvas style or large background sphere — choose during implementation based on perf.

### Materials (PBR)

| Surface | Material | metalness | roughness | clearcoat |
|---|---|---|---|---|
| Table | `meshPhysicalMaterial`, dark walnut | 0.0 | 0.6 | 0.3 |
| Digital scale platform | brushed steel | 0.85 | 0.35 | — |
| Instrument housing | matte black anodized | 0.7 | 0.4 | — |
| Lever pans | polished chrome | 0.95 | 0.1 | — |
| Weights | dark steel | 0.75 | 0.5 | — |
| Tennis ball | felt + seam | 0.0 | 0.85 | — |
| Apple | wax-coated red | 0.0 | 0.3 | 0.5 |
| Baseball | leather + stitches | 0.0 | 0.6 | — |

Add a neutral studio environment map (small procedural cubemap, 64×64) so metals reflect believably without an HDRI download.

### Post-FX

- Bloom: intensity 0.4, threshold 0.9 (highlights on metal and LCD)
- Vignette: eccentricity 0.1, offset 0.3
- Tone mapping: `ACESFilmicToneMapping` via R3F `gl` prop (not a post pass)

Excluded for performance: SSAO, DOF, motion blur.

### LCD displays

7-segment style font, warm green glow `#7fff60` on black, subtle scanlines, bloom amplifies the glow.

### UI palette

```
--bg-deep:        #0a0a0c
--bg-glass:       rgba(20,20,24,0.72)
--text-primary:   #f5f5f7
--text-secondary: #a8a8b0
--accent-blue:    #0a84ff
--accent-amber:   #ff9500
--success:        #34c759
--error:          #ff3b30
--metal-glow:     #ffe9c4
```

### Typography

- UI: SF Pro Display (`-apple-system, Inter` fallback)
- Numerics: JetBrains Mono
- LCD: 7-segment custom face

Scale:
- `.h-display` 32/700/-0.03em (reveal title)
- `.h-1` 22/600/-0.02em (panel titles)
- `.h-2` 18/600 (current task)
- `.body` 14/400/lh 1.5
- `.label` 11/500/0.1em uppercase

## Pedagogy & Flow

### Session structure

```
Intro (5-7s cinematic)
  ↓
Phase 1: Tennis Ball (t1, t2, t3)  →  Milestone 1 (4s overlay)
  ↓
Phase 2: Apple (t4, t5, t6)        →  Milestone 2 (4s overlay)
  ↓
Phase 3: Baseball (t7, t8, t9)
  ↓
Final Reveal (15-20s cinematic)
```

### Per-task micro-flow (3 steps, down from 5)

1. **PICKUP** — highlight active object, hint "Візьми X"
2. **PLACE** — magnetic snap to instrument, tick sound, glow flash
3. **READ & ENTER** — input field appears with the live reading echoed; user types and presses Enter (Enter auto-submits)

27 micro-interactions total across 9 tasks (down from 45).

### Step DSL extensions

```ts
type Step = {
  id: string
  target: StepTarget
  visualHint: 'arrow' | 'glow' | 'target-ring' | 'highlight'
  hintTitle: string                           // short instruction
  hintExplanation?: string                    // educational "why" context (NEW)
  micropause?: number                         // ms delay before advancing (NEW)
  sound?: 'tick' | 'ding' | 'whoosh' | 'success'  // (NEW)
  complete: CompletionRule
}
```

### Hint copy pattern

Two-layer hints:

```
TITLE      (what to do)         "Поклади м'яч на платформу"      accent-blue
EXPLAIN    (why this works)     "Електронні ваги вимірюють       text-secondary
                                 силу тиску і конвертують у грами"
```

### Milestones between objects

Slide-in overlay (top, click-through), 4s auto-dismiss:

- After tennis ball: "Ти виміряв 3-ма приладами. Запам'ятай ці числа — далі побачиш чому."
- After apple: "Ще одне підтвердження. Останній об'єкт — і покажу головне."
- After baseball: directly transitions to Final Reveal.

### Final Reveal scene

Sequence (~15-20s total):

1. Table fades to black (1s)
2. Camera dollies up into abstract space (1.5s)
3. Title fades in: "Що ти відкрив" (0.8s)
4. Three columns rise (one per object), staggered wave (0.5s each)
5. Each column shows three rows: digital scale, lever, dynamometer (with formula shown for the dynamometer: "0.57N ÷ 9.8 = 58 г")
6. Numbers tick from 0 to final value with easeOutCubic (1.5s)
7. Bars draw under each row, all the same length within an object
8. Pulse glow sequentially across rows
9. Conclusion text appears word-by-word (2s):
   - "Маса не залежить від методу вимірювання."
   - "Це фундаментальна властивість матерії — інваріантність маси."
10. Subtle particle confetti on success sound
11. CTAs: `[Спробувати знову]` `[Наступна лабораторна (скоро)]`

### RevealConfig (SDK contract)

```ts
type RevealConfig = {
  groupBy: 'object'
  series: { label: string; items: RevealItem[] }[]
  conclusion: { title: string; body: string }
  cta: { label: string; action: 'restart' | 'next-lab' }[]
}
```

## Animations & Cinematics

### Snap animation (magnetic pull)

Replace instant teleport with 300ms tween:

1. Capture current body position
2. Tween to snap.position with easeOutCubic
3. In parallel: glow VFX at the snap target (radius pulse 0→0.4→0)
4. On complete: tick sound, body becomes kinematic-locked
5. If snap missed (outside radius): body becomes dynamic, falls under gravity

### Hover & state

- Hovered object (when `enabled=true`): outline `Outlines thickness={2} color="#0a84ff"` + scale 1.02
- Active object (current task): persistent pulsing glow ring around it
- Inactive objects: material desaturated 40%, subtle dim

### Camera presets (sdk/scene/CameraRig.tsx)

```ts
type CameraPreset =
  | 'intro'           // high cinematic angle, focus on table
  | 'workspace'       // default: front + slightly above, all instruments visible
  | 'focus-scale'     // closeup on digital scale
  | 'focus-lever'     // closeup on lever balance
  | 'focus-dyn'       // closeup on dynamometer
  | 'reveal'          // pulled back into abstract space
```

Auto-transitions:
- `activeInstrument` changes → smooth dolly to `focus-{instrument}` (1.5s, easeInOutCubic)
- Snap success → "punch" zoom (10% closer 200ms, then back)
- `phase === 'finished'` → reveal preset

No manual orbit-controls; composition is fixed.

### Reading update

Numbers on LCD/dial interpolate per frame: `displayed = lerp(displayed, target, 0.15)`, snap when `|delta| < 0.5`. Gives a ~500ms settling sensation.

### Lever beam easing

Replace linear lerp with spring-damper:
```
velocity += (target - current) * stiffness - velocity * damping
current += velocity * dt
```
stiffness = 8, damping = 2.5. Beam overshoots, returns, settles within ~1.5s.

### Dynamometer hook

Same spring-damper as lever beam. Hanging an object causes spring to oscillate before settling.

### Particles & VFX

- Snap success: 12-point ring puff (gpu-instanced), 300ms, accent-blue
- Submit success: 8-point subtle confetti near input, 1s, white
- Final reveal: 40-point confetti, ~3s, palette colors

### Microinteraction catalog

| Event | Animation | Sound | Duration |
|---|---|---|---|
| Hover object | scale 1→1.02 | — | 150ms |
| Pickup begins | object glow on | tick subtle | instant |
| Drag enters snap radius | snap-target pulses | — | continuous |
| Snap success | magnetic pull tween + ring puff | tick | 300ms |
| Reading stabilizes | digits stop ticking | — | ~500ms |
| Submit | input zoom 0.95→1, confetti | ding | 600ms |
| Object completed | journal row highlight pulse | — | 800ms |
| Milestone overlay | translate+fade from top | whoosh | 400ms in / 4s stay / 300ms out |
| Final reveal start | camera dolly + table fade | whoosh long | 1.5s |
| Reveal numbers tick | counter animation | — | 1.5s staggered |
| Reveal conclusion | letter-by-letter fade | — | 2s |

## UI & Layout

### Layout grid

```
top-left:    "ЗАРАЗ РОБИМО" panel (current task + progress + hint)
top-right:   Журнал (grouped by object, with placeholder slots)
bottom-center: Input bar (only when current step is 'enter')
bottom-left:  Reset button
bottom-right: System controls (sound toggle, camera preset, reset)
center:       3D scene with overlay visual hints
```

### "Зараз робимо" panel

- Progress indicator: 9 segments, active highlighted (accent-blue), completed (success), pending (bg-glass)
- h-2 short instruction
- body secondary "why" explanation
- Hint pill (💡 icon + text on accent-amber background)
- Wrapped in `GlassPanel variant="strong"` (blur 24px, opacity 0.8)

### Journal panel

Grouped by object with all 9 slots visible from the start:

```
ЛАБ-ЖУРНАЛ                              3/9

🎾 Тенісний м'яч
✓ Електронні весами        58 г
✓ Важільні весами           58 г
→ Динамометр                ····

🍎 Яблуко
○ Електронні весами        ─
... (all slots visible)
```

This is the "visual rope" preparing the user for the final reveal.

### Input bar

Native HTML input + button. Enter submits. On submit-success: shake-free pulse + ding. On out-of-tolerance: shake + retry hint.

### Visual hint overlays (in 3D scene)

```ts
type VisualHint =
  | { kind: 'arrow';       targetPos: Vector3; pulse: boolean }
  | { kind: 'glow';        targetPos: Vector3; color: string; radius: number }
  | { kind: 'target-ring'; targetPos: Vector3; color: string }
  | { kind: 'highlight';   targetObjectId: string }
```

### Milestone overlay

Slide-in from top, center-screen, click-through-able, 30% backdrop dim, 4s auto-dismiss.

### System controls (top-right)

- Sound toggle (persists in localStorage)
- Camera preset dropdown
- Reset button (with confirmation)

## Audio

### Catalog (5 sounds)

| ID | Trigger | Description | Source | Duration |
|---|---|---|---|---|
| `tick` | snap success | short muted click | freesound CC0 | 80ms |
| `ding` | submit success | soft metallic ding | freesound CC0 | 250ms |
| `whoosh` | milestone / reveal start | low-frequency pad sweep | freesound CC0 | 600ms |
| `success` | reveal conclusion | warm restacked chord | freesound CC0 | 1200ms |
| `error` | input out of tolerance | short buzz | freesound CC0 | 200ms |

All WAV/MP3, < 50KB each, total ~150KB. Stored in `public/audio/sdk/`. Each file documented in `public/audio/CREDITS.md`.

### SoundManager API (sdk/audio/SoundManager.ts)

```ts
class SoundManager {
  preload(): Promise<void>
  play(id: SoundId, volumeMul?: number): void
  toggleMute(): void
  setVolume(v: number): void
}
export const sound = new SoundManager()
```

### Behavior

- Mute toggle in top-right UI; localStorage persisted
- Auto-pause on `document.hidden`
- Lazy preload after first user interaction (Web Audio API requirement)
- Graceful no-op if AudioContext is suspended/blocked

### Licensing

Only CC0 / Public Domain sources. Each file credited in `public/audio/CREDITS.md`.

## Phasing (Vertical Slice plan)

| Slice | Day | Goal | DoD |
|---|---|---|---|
| 0 — Foundation | 1 | `sdk/` and `labs/mass-measurement/` folder structure created; existing code moved without rewrite | typecheck green, all 25 tests pass, behavior identical |
| 1 — t1 Vertical Polish | 2-3 | Tennis Ball + Digital Scale path 100% gold-standard | demo video shows 30s flagship, ≥50fps dev / ≥30fps Promethean target |
| 2 — Lever Balance | 4 | `LeverBalance` reaches Slice-1 quality | spring-damper beam, chrome PBR, focus-lever camera |
| 3 — Dynamometer | 4-5 | `Dynamometer` reaches Slice-1 quality | spring-damper hook, dial texture, focus-dyn camera |
| 4 — Objects polish | 5 | Apple/Baseball/Weights upgraded materials and hover state | PBR materials, hover/active animations |
| 5 — Pedagogical scaffolding | 6 | Intro flythrough, milestone overlays, journal redesign, visual hint overlays | smooth between-object transitions |
| 6 — Final Reveal | 7 | `<RevealScene/>` SDK component, full sequence | reveal plays end-to-end on `phase === 'finished'` |
| 7 — Polish + a11y | 8 | Keyboard nav, focus rings, contrast, edge cases, localStorage | WCAG AA contrast, Tab/Enter/Esc nav |
| 8 — Demo mode + handoff | 9 | `?demo=1` auto-walkthrough, README, perf pass | demo mode plays whole lab unattended |
| Buffer | 10+ | QA bugfix, investor feedback iterations | — |

### Cut-list under time pressure

- Mandatory: Slices 0, 1, 6 (foundation, flagship, reveal)
- Squeeze first: Slice 7 (a11y) — keep keyboard nav, drop full WCAG audit
- Squeeze last: Slice 4 — polish only Apple, leave others procedural

### Checkpoint after Slice 1

User-review the flagship before propagating. If the visual language needs iteration, fix it here once rather than across all instruments.

## Out of Scope / Non-Goals

- Backend, accounts, sync, analytics, telemetry
- PDF/CSV export of journal (deferred to teacher-feedback round)
- i18n framework (Ukrainian only; strings are extracted but no `react-intl`/`i18next`)
- Third-party 3D models (everything procedural for now)
- Multi-user / collaborative sessions
- VR / AR / WebXR
- Free sandbox mode
- Voice / TTS / recorded teacher audio
- Promethean-specific platform integrations (use standard pointer/touch APIs only)
- Additional instruments (steelyard balance, spring scale, ruler) or objects beyond the existing 3
- `framer-motion` / `popmotion` (custom small tween helpers in `sdk/animation/`)
- E2E tests (Playwright/Cypress); visual regression tests; CI performance benchmarks

## Open Questions

None — every decision in this document has been validated with the user during brainstorming.

## References

- `docs/superpowers/specs/2026-04-29-mass-measurement-lab-design.md` — original v1 design
- `docs/superpowers/specs/2026-05-01-mass-measurement-lab-v2-design.md` — v2 visual upgrade attempt (reverted due to perf)
- `docs/superpowers/specs/2026-05-07-magnetic-pipeline-design.md` — magnetic snap + strict task progression (current baseline)
