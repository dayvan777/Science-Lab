# Electromagnetic Induction Lab — Design

**Date:** 2026-05-11
**Status:** Approved (visual layout + scene list confirmed in brainstorm)
**Scope:** New practical lab `electromagnetic-induction` under NOVA EVRIKA → Physics. Mirrors the architectural pattern of `mass-measurement` (separate folder, reuses `src/sdk/*`, never imports from another lab). Introduces ONE new SDK primitive (`MultipleChoice` UI + matching step-engine completion rule) and ONE physics-specific instrument family (Coil + Galvanometer + Bulb).

---

## Goal

Build an interactive 3D lab where a 7–9 grade student investigates electromagnetic induction by dragging a bar magnet through a coil and observing the galvanometer needle + lightbulb behavior. The student progresses through 5 guided scenes, each closing with a multiple-choice question that anchors the key observation. The lab teaches Faraday's law qualitatively (`EMF ∝ rate of flux change`) and Lenz's law qualitatively (induced-current direction depends on motion direction), without requiring the student to compute numerical EMF values.

Pedagogical anchor (the "mass invariance" analogue): **current only flows when the magnetic flux through the coil CHANGES** — a stationary magnet inside the coil produces no current, even though the field is at its strongest there.

## Non-goals

- No quantitative EMF calculation by the student. Galvanometer shows a needle, bulb shows brightness, but the student doesn't input numbers — they pick from multiple-choice answers.
- No second coil, no comparison of different magnets, no different wire materials. Single magnet + single coil keeps the focus on speed and direction only.
- No animated wire current particles, no electron-flow visualization. The galvanometer needle deflection and the bulb brightness are the only feedback channels.
- No editing of the existing `mass-measurement` lab. Only the platform-level registry (`src/site/content/subjects.ts`) and the router (`src/app/App.tsx`) gain one entry each.
- No new dependencies. Reuses Rapier (for magnet drag physics), R3F, drei, zustand, all already in package.json.

---

## Reference (user-supplied)

Two screenshots of an existing reference lab from another vendor show a horizontal copper coil connected via wires to an analog galvanometer (center-zero ammeter graduated −5…+5 A). User added a hand-drawn lightbulb to the circuit, asking us to include it. User explicitly described the speed-dependent behavior: slow magnet → bulb dark, fast magnet → bulb lights. The reference also shows a row of 6 named "scenes" at the bottom of its UI (Електромагніт, Магніт та котушка, Піднести магніт, Відвести магніт, Темп піднесення, На великій відстані). Our design uses 5 scenes (we collapse "intro" and "magnet + coil" into a single intro scene, and drop "large distance" as redundant with "stationary magnet"-style observation).

The visual style — dark studio with coloured blur glows, glass HUD panels, Apple-blue accents — matches what is already shipped on the platform (mass-measurement + NOVA EVRIKA landing).

---

## Architecture

### Lab file layout

```
src/labs/electromagnetic-induction/
├── index.tsx                          # entry component: phase router (intro / in-progress / reveal)
├── scene/
│   ├── LabScene.tsx                   # Canvas + Physics + the 3D scene
│   └── cameraPresets.ts               # 'overview' / 'focus-coil' / 'focus-galvanometer'
├── instruments/
│   ├── Coil.tsx                       # horizontal solenoid (TubeGeometry helix, reused pattern from Dynamometer's spring)
│   ├── Galvanometer.tsx               # box + analog centred-zero needle
│   └── Bulb.tsx                       # frosted-glass sphere + base + PointLight (intensity driven by reading)
├── objects/
│   └── BarMagnet.tsx                  # Draggable, N (red #ff3b30) / S (blue #0a84ff) halves
├── state/
│   ├── LabState.ts                    # phase, currentSceneIndex, journal[]
│   └── InductionReadings.ts           # magnetVelocity, currentEMF, bulbBrightness — Zustand store
├── physics/
│   └── induction.ts                   # pure functions: computeEMF(magnetPos, magnetVel, coilCenter) + brightness curve
├── content/
│   └── scenes.ts                      # the 5 scenes (text, MC options, completion rule)
├── ui/
│   ├── HUD.tsx                        # instruction + MC choices + journal
│   ├── IntroScreen.tsx                # entry hero
│   └── RevealScene.tsx                # final summary (analog of mass-measurement's RevealScene)
└── textures/
    └── galvanometerDial.ts            # canvas dial for the gauge face
```

### SDK additions (one new rule + one new component)

**New step-engine completion rule** in `src/sdk/guided/TaskSteps.ts`:

```ts
| {
    kind: 'mc-selected'
    /** Index of the correct option (0-based). */
    correctIndex: number
  }
```

Predicate in `src/sdk/guided/StepEngine.ts` — completes when `ctx.lastMCChoice === rule.correctIndex`. Adds one new ctx field: `lastMCChoice: number | null`.

A `Step` of this kind also carries the option labels in a new optional field on the `Step` interface:

```ts
choices?: { id: string; label: string }[]   // length 2-4; correctness is in CompletionRule.correctIndex
```

**New SDK UI component** `src/sdk/ui/MultipleChoice.tsx`:

```tsx
type Props = {
  question: string
  choices: { id: string; label: string }[]
  correctIndex: number
  onChoose: (chosenIndex: number) => void
}
```

Renders three glass-pill buttons in a vertical stack. Click → if correct, button flashes green (`#34c759`) and `onChoose` fires; if wrong, button flashes red briefly then resets, allowing retry. Once correct, all buttons disabled. Uses the existing `GlassPanel` aesthetic.

These are deliberately added to `src/sdk/` (not the lab) because they're generic primitives — math, history, future physics labs will all reuse them.

### Subject registry integration

In `src/site/content/subjects.ts`, the physics subject gains one more lab entry:

```ts
{
  id: 'em-induction',
  title: 'Дослідження електромагнітної індукції',
  subtitle: 'Котушка · Гальванометр · Лампочка',
  path: '/physics/em-induction',
  status: 'available',
}
```

In `src/app/App.tsx`, one new route:

```tsx
<Route path="/physics/em-induction" element={<EMInductionLab />} />
```

The "1 лаба" badge on the Physics pill in the landing page will need to read from `physics.labs.length` (already does — see `SubjectPill.tsx`) and now shows "2 ЛАБИ". The badge formula in `SubjectPill.tsx` currently has a special case for `labCount === 1` printing "1 ЛАБА" and otherwise `${count} ЛАБ`. This means 2 → "2 ЛАБ" (correct Ukrainian plural form for 2-4 is "лаби", so the form needs adjustment to "2 ЛАБИ"). Tiny i18n tweak inside `SubjectPill.tsx`:

```ts
const badgeText = isAvailable
  ? labCount === 1 ? '1 ЛАБА'
    : labCount >= 2 && labCount <= 4 ? `${labCount} ЛАБИ`
    : `${labCount} ЛАБ`
  : 'СКОРО'
```

### Scene layout (3D)

Single table, four objects laid out left-to-right matching the user-reviewed mockup:

| World x | What | Detail |
|---|---|---|
| -0.40 | Magnet tray | Brown rectangular tray (similar to mass-measurement's object tray, recoloured wood) with the bar magnet resting on it. |
| -0.05 | Coil | Horizontal solenoid, axis along world-z (so magnet enters from in-front or behind). ~12 cm long, 8 cm outer diameter. TubeGeometry helix with ~16 turns of copper-toned `meshStandardMaterial`. |
| +0.30 | Galvanometer | Black 8×10 cm housing standing upright. Analog dial face with centre-zero needle, range −5…+5 (arbitrary units). Needle deflects proportionally to current. |
| +0.55 | Bulb | Glass sphere on a brass base, ~5 cm. R3F `<pointLight>` inside, intensity driven by `bulbBrightness` from the readings store. |

Wires are visible TubeGeometry curves drawn between coil ends and the galvanometer + bulb terminals — purely decorative, no physics. Two wire colours: warm red (#cc4030) and cool blue (#3060cc) for the two terminals, matching the schematic conventions.

The coil's axis is along world-z so the student drags the magnet *toward/away from the camera* through it. This makes the velocity direction match the natural drag direction, easier to feel.

### Physics model (lab-local, pure functions)

`src/labs/electromagnetic-induction/physics/induction.ts`:

```ts
const COIL_CENTER = new Vector3(-0.05, 0.95, 0)  // world coords; matches Coil mount position
const COIL_AXIS = new Vector3(0, 0, 1)           // along world z
const INFLUENCE_RADIUS = 0.18                    // metres — outside this, EMF = 0
const EMF_GAIN = 12.0                            // tuning constant (arbitrary units → galvanometer reading)
const EMF_MAX = 5.0                              // matches galvanometer scale ±5
const BULB_THRESHOLD = 1.5                       // |EMF| below this → bulb dark
const BULB_MAX = 4.5                             // |EMF| at this → bulb fully bright

export function computeEMF(magnetPos: Vector3, magnetVel: Vector3): number {
  const offset = new Vector3().subVectors(magnetPos, COIL_CENTER)
  const distance = offset.length()
  if (distance > INFLUENCE_RADIUS) return 0
  // Proximity factor: 1 at centre, smoothly → 0 at INFLUENCE_RADIUS
  const proximity = 1 - (distance / INFLUENCE_RADIUS) ** 2
  // EMF proportional to velocity component along coil axis (Faraday)
  const velAlongAxis = magnetVel.dot(COIL_AXIS)
  const emf = EMF_GAIN * velAlongAxis * proximity
  // Clamp to gauge scale
  return Math.max(-EMF_MAX, Math.min(EMF_MAX, emf))
}

export function computeBulbBrightness(emf: number): number {
  const abs = Math.abs(emf)
  if (abs <= BULB_THRESHOLD) return 0
  return Math.min(1, (abs - BULB_THRESHOLD) / (BULB_MAX - BULB_THRESHOLD))
}

export function computeGalvanometerAngle(emf: number): number {
  // Maps ±EMF_MAX to ±MAX_ANGLE (radians)
  const MAX_ANGLE = Math.PI / 3  // ±60 degrees from vertical
  return (emf / EMF_MAX) * MAX_ANGLE
}
```

`LabScene` calls these in a `useFrame` loop:

```ts
useFrame(() => {
  const pos = magnetRb.translation()
  const vel = magnetRb.linvel()
  const emf = computeEMF(pos, vel)
  setReadings({
    currentEMF: emf,
    bulbBrightness: computeBulbBrightness(emf),
    galvanometerAngle: computeGalvanometerAngle(emf),
    magnetVelocity: vel.length(),
  })
})
```

Galvanometer + Bulb subscribe to the readings store and render reactively. No collision between magnet and coil — the magnet's collider is offset slightly so it can pass through the visual coil geometry without physics interference.

### The 5 scenes (in `content/scenes.ts`)

```ts
import type { Step } from '../../../sdk/guided/TaskSteps'

export const SCENES: Step[][] = [
  // Scene 1 — Знайомство
  [
    {
      id: 'intro',
      target: { kind: 'ui', id: 'submit' },
      visualHint: 'highlight',
      hintTitle: 'Знайомство з обладнанням',
      hintExplanation: "Це котушка з мідного дроту, гальванометр зі стрілкою і лампочка в одному колі. Зараз дослідимо як виникає електричний струм.",
      complete: { kind: 'submitted' },
    },
  ],
  // Scene 2 — Повільний рух
  [
    {
      id: 'pickup-slow',
      target: { kind: 'object', id: 'bar-magnet' },
      visualHint: 'arrow',
      hintTitle: 'Візьми магніт',
      complete: { kind: 'dragging', bodyPattern: 'bar-magnet' },
    },
    {
      id: 'move-slow',
      target: { kind: 'instrument', id: 'coil' },
      visualHint: 'target-ring',
      hintTitle: 'Повільно піднеси магніт до котушки',
      hintExplanation: 'Зверни увагу на стрілку гальванометра і на лампочку.',
      complete: { kind: 'magnet-near-coil', minDuration: 1500 },  // see "new completion rules" below
    },
    {
      id: 'mc-slow',
      target: { kind: 'ui', id: 'input' },
      visualHint: 'highlight',
      hintTitle: 'Що відбувається з лампочкою при повільному русі?',
      choices: [
        { id: 'dark', label: 'Не світиться' },
        { id: 'bright', label: 'Світиться яскраво' },
        { id: 'weak', label: 'Світиться слабо' },
      ],
      complete: { kind: 'mc-selected', correctIndex: 0 },
    },
  ],
  // Scene 3 — Швидкий рух
  [
    {
      id: 'pickup-fast',
      target: { kind: 'object', id: 'bar-magnet' },
      visualHint: 'arrow',
      hintTitle: 'Тепер рухай магніт швидко крізь котушку',
      complete: { kind: 'dragging', bodyPattern: 'bar-magnet' },
    },
    {
      id: 'observe-fast',
      target: { kind: 'instrument', id: 'galvanometer' },
      visualHint: 'highlight',
      hintTitle: 'Подивись що відбувається на гальванометрі і лампочці',
      complete: { kind: 'reading-stable', instrument: 'em-induction', minValue: 3, durationMs: 1000 },  // see notes
    },
    {
      id: 'mc-fast',
      target: { kind: 'ui', id: 'input' },
      visualHint: 'highlight',
      hintTitle: 'При швидкому русі лампочка...',
      choices: [
        { id: 'dark', label: 'Не світиться' },
        { id: 'bright', label: 'Світиться яскраво' },
        { id: 'same', label: 'Світиться так само як раніше' },
      ],
      complete: { kind: 'mc-selected', correctIndex: 1 },
    },
  ],
  // Scene 4 — Зміна напрямку
  [
    {
      id: 'pull-away',
      target: { kind: 'instrument', id: 'coil' },
      visualHint: 'arrow',
      hintTitle: "Відведи магніт з котушки",
      hintExplanation: 'Спостерігай за напрямком відхилення стрілки.',
      complete: { kind: 'magnet-leaving-coil' },
    },
    {
      id: 'mc-direction',
      target: { kind: 'ui', id: 'input' },
      visualHint: 'highlight',
      hintTitle: "Куди відхиляється стрілка коли магніт ВИХОДИТЬ з котушки?",
      choices: [
        { id: 'right', label: 'Так само вправо' },
        { id: 'left', label: 'Вліво (інший бік)' },
        { id: 'none', label: 'Не відхиляється' },
      ],
      complete: { kind: 'mc-selected', correctIndex: 1 },
    },
  ],
  // Scene 5 — Нерухомий магніт
  [
    {
      id: 'place-inside',
      target: { kind: 'instrument', id: 'coil' },
      visualHint: 'target-ring',
      hintTitle: 'Поклади магніт всередину котушки і відпусти',
      complete: { kind: 'magnet-stationary-in-coil', minDuration: 2000 },
    },
    {
      id: 'mc-stationary',
      target: { kind: 'ui', id: 'input' },
      visualHint: 'highlight',
      hintTitle: 'Чому струму немає, хоча магніт всередині котушки?',
      choices: [
        { id: 'weak', label: 'Магніт надто слабкий' },
        { id: 'no-change', label: 'Бо немає РУХУ — потрібна зміна потоку' },
        { id: 'broken', label: 'Котушка зламана' },
      ],
      complete: { kind: 'mc-selected', correctIndex: 1 },
    },
  ],
]
```

### Three new step-engine completion rules (lab-specific subset)

In addition to `mc-selected`, three motion-aware rules are needed for the lab to detect when each scene's interaction has been performed. These could either live in the lab itself (with the lab subscribing to readings and pushing into `lastSnapTargetId`-style state) OR generalize into the SDK. To keep SDK lean, **they live in the lab**: the lab's `LabScene` watches its own readings each frame and calls `useStepEngine.getState().advanceStep()` directly when conditions are met, bypassing the centralized predicate.

This is a deliberate small deviation from `mass-measurement`'s style (where everything goes through `isStepComplete`). The rationale: the conditions (`magnet-near-coil`, `magnet-leaving-coil`, `magnet-stationary-in-coil`) depend on real-time magnet kinematics, which are lab-specific physics — pushing them into the SDK predicate engine would couple the SDK to electromagnetism concepts. The lab self-advances for these motion conditions while using the SDK's predicate engine for `dragging`, `snapped`, `mc-selected`, and `submitted`.

The actual completion check for those three lab-local cases will be a small `useEffect` in `LabScene` that watches readings + the current step id, and calls `advanceStep()` when matched.

### Reading-display HUD

Same pattern as mass-measurement's HUD:

- Top pill: «Лабораторна · 2 з 9 загалом» (or however the platform counts).
- Left panel (collapsible): current scene number and hint.
- Right panel (collapsible): journal — list of completed MC answers, with green-check for correct.
- Bottom: when a `Step` has `choices`, render the new `<MultipleChoice>` component instead of the numeric input.

### Camera presets

```ts
overview:        { position: [0,    1.5,  1.8 ], lookAt: [0,    0.95, 0   ] }
'focus-magnet':  { position: [-0.4, 1.4,  1.4 ], lookAt: [-0.4, 0.95, 0   ] }
'focus-coil':    { position: [-0.05,1.3,  1.0 ], lookAt: [-0.05,0.95, 0   ] }
'focus-galv':    { position: [0.3,  1.3,  1.0 ], lookAt: [0.3,  0.95, 0   ] }
```

Scene 1 → overview, scenes 2-3 → focus-coil, scene 4 → focus-coil (still showing the exit motion), scene 5 → focus-coil. Camera dolly between presets via the existing `CameraRig`.

### Reveal scene

Three-line conclusion text, animated in:

> **Висновок 1.** Струм виникає лише при ЗМІНІ магнітного потоку.
> **Висновок 2.** Швидше рух → більший струм (закон Фарадея).
> **Висновок 3.** Зміна напрямку руху → зміна напрямку струму (закон Ленца).

Reuses the existing `RevealScene` aesthetic (dark glow background + Saira display font for the three statements + Apple-blue link "Завершити").

---

## File touch-list

| File | Change |
|---|---|
| `src/labs/electromagnetic-induction/**` | NEW — entire lab tree (16 files) |
| `src/sdk/guided/TaskSteps.ts` | MODIFIED — add `mc-selected` rule, add optional `choices` field on `Step` |
| `src/sdk/guided/StepEngine.ts` | MODIFIED — handle `mc-selected`; add `lastMCChoice` to ctx + a setter |
| `src/sdk/ui/MultipleChoice.tsx` | NEW — generic MC UI |
| `src/site/content/subjects.ts` | MODIFIED — add second physics lab entry |
| `src/site/components/SubjectPill.tsx` | MODIFIED — pluralisation `2-4 → "ЛАБИ"` |
| `src/app/App.tsx` | MODIFIED — add `/physics/em-induction` route |
| `tests/sdk/stepDsl.test.ts` | MODIFIED — add a test case for the new `mc-selected` rule |
| `tests/labs/em-induction.test.ts` | NEW — unit tests for the pure physics functions (`computeEMF`, `computeBulbBrightness`, `computeGalvanometerAngle`) |

Test count goes 183 → 192 (≈ 5 new SDK tests + ≈ 4 new physics tests).

---

## Acceptance criteria

1. Navigating to `/physics/em-induction` mounts the lab. Intro screen appears, "Почати лабораторну" enters the 3D scene.
2. The 3D scene shows the four objects in the layout above. Magnet starts on its tray. Coil + galvanometer + bulb are visible and connected by wire geometry.
3. Dragging the magnet works (reuses `Draggable` from SDK).
4. Moving the magnet slowly toward the coil: galvanometer needle barely deflects, bulb stays dark.
5. Moving the magnet rapidly through the coil: needle deflects strongly (right when entering), bulb visibly lights up.
6. Pulling the magnet out: needle deflects in the opposite direction (left), bulb lights again.
7. Releasing the magnet inside the coil with no motion: needle returns to zero, bulb goes dark.
8. After completing each scene's interaction, the multiple-choice prompt appears in the HUD. Correct answer flashes green and advances. Wrong answer flashes red and allows retry.
9. Journal panel records each completed MC answer.
10. After scene 5, the reveal scene shows the three conclusion lines.
11. Existing 183 tests still pass; new tests bring total to ~192. `npx tsc --noEmit` and `npm run build` clean.
12. The Physics subject page (`/physics`) now lists TWO lab cards: mass-measurement (unchanged) + em-induction (new).
13. The landing page's Physics pill badge reads "2 ЛАБИ".
14. Mobile breakpoint (< 600 px width): HUD collapses + scene fits in portrait camera framing (reuses Slice D mobile responsive HUD).

---

## Risks

- **Magnet drag through a hollow coil:** the magnet's physics collider must be SMALLER than the coil's interior bore, otherwise Rapier will collide and the student can't push the magnet through. Solution: collider radius 1.5 cm, coil bore 4 cm — generous clearance.
- **Galvanometer needle jitter under noisy velocity:** Rapier reports velocity as a raw kinematic value that can jitter on frame boundaries. The galvanometer angle should be low-pass-filtered (existing pattern: spring-damper integrator like the dynamometer needle).
- **Bulb threshold tuning:** too-high threshold = student moves the magnet fast and bulb still doesn't light (frustrating). Too-low = bulb lights even on slow motion, breaking the pedagogical contrast. Tune empirically against the human-feeling "fast" speed (≈ 0.4 m/s drag velocity → bulb full). The spec lists `BULB_THRESHOLD = 1.5` in EMF units, which corresponds to about 0.13 m/s axial velocity at coil centre. This may need adjustment after smoke-test.
- **The three motion-aware completion rules** (`magnet-near-coil`, `magnet-leaving-coil`, `magnet-stationary-in-coil`) being lab-local rather than SDK rules is a deliberate scope decision but creates a slight inconsistency with how `mass-measurement` is structured. Documented in the architecture section above.

## Out of scope

- Second coil / multi-turn variation / different magnet strengths.
- Quantitative EMF input by the student (we use MC instead).
- An animated electron-flow visualization through the wires.
- Audio for bulb crackling, magnet "click" into coil, etc. (Reusing existing `sdk/audio` catalog — `tick`, `ding`, `success` — for MC answer feedback.)
- Demo mode (`?demo=1`) for this lab. The existing demo is mass-measurement-specific; supporting EM-induction demo would mean abstracting the demo controller. Possible follow-up, not in this slice.
- Translations beyond Ukrainian.

---

## Self-review checklist

- [x] Every spec section has corresponding acceptance criteria
- [x] No "TBD" / "TODO" / placeholder text
- [x] Architecture matches the lab-folder pattern of `mass-measurement` — engine never imports from labs
- [x] New SDK additions (`MultipleChoice` + `mc-selected` rule) are documented and tested
- [x] The 5 scenes have concrete completion rules, MC question text, and correct-answer indices
- [x] File touch-list maps one-to-one with the architecture sections
- [x] Scope is bounded to one slice (one feature branch, one atomic commit at the end)
- [x] Plural form bug in `SubjectPill` flagged and fixed in scope
