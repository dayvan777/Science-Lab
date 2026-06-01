# NOVA EVRIKA — Interactive 3D Science Labs

> **Browser-based 3D laboratory simulations for Ukrainian schools (grades 6–7).**
> Touch-first (Promethean panels) + mouse. No install, no account, no backend.

🌐 **Live:** https://science-lab-phi.vercel.app/
📦 **Repo:** [dayvan777/Science-Lab](https://github.com/dayvan777/Science-Lab)

NOVA EVRIKA is a **platform**: a reusable engine (`src/sdk/`) plus a growing set of
subject **labs** (`src/labs/`) built on top of it. A student works through each lab
solo — picking up objects, driving instruments, extracting organs, reading values —
guided step by step, no teacher required.

---

## 🔬 Labs

| Subject | Lab | Route | Status |
|---|---|---|---|
| **Physics** | Mass measurement — 3 instruments × 3 objects → invariance of mass | `/physics/mass-measurement` | ✅ |
| **Physics** | Electromagnetic induction — coil · galvanometer · lamp | `/physics/em-induction` | ✅ |
| **Physics** | Brownian motion & diffusion — one living box, 7 missions | `/physics/brownian-diffusion` | ✅ |
| **Biology** | Human internal organs — translucent body + 5 extractable organs | `/biology/anatomy` | ✅ |
| Math / History | — | `/math` · `/history` | soon |

Adding a subject or lab is **one entry** in `src/site/content/subjects.ts` (the landing
pill and subject page render automatically) plus a route in `src/app/App.tsx`.

---

## ✨ Two lab archetypes

Both run on the same engine.

**Procedural physics labs** (mass, induction, diffusion)
- Procedurally-generated geometry — **zero asset files**, full control over quality.
- Real **Rapier** physics (drag-snap, lever balance, spring oscillation) or custom
  particle kinetics (diffusion).
- A guided step engine (3D arrows, multiple-choice questions, "Далі" gating) over a
  `intro → in-progress → finished` phase machine.

**Model-driven labs** (anatomy)
- Real **GLTF/GLB** models via `useGLTF`. The anatomy lab is a *free explorer*: a
  semi-transparent body whose 5 organs **extract → rotate → read → return**, progress N/5.
- Models are **NIH 3D / HuBMAP Human Reference Atlas** (Visible Human Male, CC-BY 4.0)
  and share one coordinate space, so they auto-register in correct anatomical position.

---

## 🛠 Tech stack

| Layer | Library |
|---|---|
| UI | React 19 + TypeScript (strict, `noUnusedLocals`) |
| Build | Vite 8 |
| 3D scene | [three.js](https://threejs.org/) 0.184 · [@react-three/fiber](https://r3f.docs.pmnd.rs/) 9 · [@react-three/drei](https://github.com/pmndrs/drei) 10 |
| Physics | [@react-three/rapier](https://github.com/pmndrs/react-three-rapier) 2 ([Rapier](https://rapier.rs/), WASM) |
| Post-FX | @react-three/postprocessing 3 (Bloom, Vignette) |
| State | [Zustand](https://github.com/pmndrs/zustand) 5 |
| Audio | Web Audio API (custom `SoundManager`) |
| Tests | Vitest 4 + jsdom + @testing-library/react |

No CDN dependencies, no analytics, no backend. Builds to a static bundle (~3.8 MB main,
~1.3 MB gzipped). Heavy labs are **code-split** via `React.lazy` — e.g. the anatomy lab's
~46 MB of models load only on its own route, never on the landing page.

---

## 🚀 Quick start

Requires **Node.js 20+**.

```bash
git clone https://github.com/dayvan777/Science-Lab.git
cd Science-Lab
npm install
npm run dev          # http://localhost:5173/
```

Scripts:

```bash
npm run dev          # Vite dev server with HMR
npm run build        # type-check (tsc) + production build → dist/
npm run preview      # serve the production build
npm run test         # run vitest once
npm run typecheck    # tsc --noEmit
```

**≈470 unit tests** cover pure logic: physics/measurement math, animation helpers,
state machines, the step DSL + engine, the diffusion kinetics, and per-lab content/data.
React Three Fiber scenes need a real GPU, so they are verified by `tsc` + `vite build` +
manual browser smoke rather than unit tests.

---

## 📐 Architecture

Engine vs content, strictly separated:

```
src/
├── sdk/                       ← engine — never imports from labs/
│   ├── animation/             lerp, easeOutCubic/InOutCubic, springStep
│   ├── audio/                 SoundManager (lazy AudioContext, mute, preload)
│   ├── guided/                StepEngine, GuidedOverlay, TaskSteps DSL, primitives
│   ├── object/                Draggable (kinematic-during-drag → dynamic-on-release)
│   ├── physics/               bodyRegistry, snapTargets, useDrag (magnetic-pull tween)
│   ├── scene/                 CinematicLighting, CameraRig, PostFX, Table, webgl, cameraStore
│   ├── ui/                    Button, GlassPanel, BottomSheet, NumberInput, Loader screens…
│   └── a11y/                  useViewport, useReducedMotion, safeArea
│
├── labs/
│   ├── mass-measurement/          physics — guided 9-task measurement
│   ├── electromagnetic-induction/ physics — induction with coil/galvanometer/lamp
│   ├── brownian-diffusion/        physics — one stateful glass box, 7 missions
│   └── anatomy/                   biology — translucent body + 5 GLTF organs
│
├── site/                      landing + subject pages + subjects.ts registry
└── app/                       App shell + routes (BrowserRouter)
```

**Rule:** `sdk/` is shared and stable; the engine never imports from `labs/`. A new lab
is a new folder under `labs/` + one entry in `subjects.ts` + a route. The SDK is a
pattern today (not yet a published package); once its surface stabilises it can graduate
to a versioned npm package without restructuring.

---

## 🧱 How to add a new lab

1. Add the subject (if new) + lab entry to `src/site/content/subjects.ts`.
2. Create `src/labs/<your-lab-id>/` — mirror an existing lab:
   - **Procedural physics?** copy the `mass-measurement` / `brownian-diffusion` shape
     (content `tasks`/`scenes`, Zustand state, `scene/`, `ui/`, the SDK step engine).
   - **Model-driven?** copy the `anatomy` shape (`content/*.ts` data, `useGLTF` scene,
     a free-explorer or guided state store).
3. Reuse SDK primitives (`Button`, `GlassPanel`, `BottomSheet`, `CinematicLighting`,
   `useViewport`, `useReducedMotion`, `isWebGLAvailable`/`WebGLUnsupported`, drei `Loader`).
4. Export a `<YourLab/>` entry component; add the route in `src/app/App.tsx` (lazy-load
   if it ships heavy assets).

Most of the heavy lifting is done — physics, drag-snap-tween, step progression, audio,
camera, HUD primitives, GLTF material/clone patterns.

---

## 🗺 Roadmap

Done:
- [x] SDK engine extracted (`sdk/` vs `labs/`), subject registry + landing/subject pages
- [x] **Mass measurement** — guided 9-task physics lab, real Rapier instruments
- [x] **Electromagnetic induction** — coil/galvanometer/lamp
- [x] **Brownian motion & diffusion** — single living box, 7-mission arc, "Далі" gating
- [x] **Human anatomy** (biology) — translucent body + 5 extractable NIH/HRA organs

Open:
- [ ] More labs in existing subjects (physics, biology) + launch math / history
- [ ] More model-driven labs via the anatomy asset recipe (organ atlas, cell, …)
- [ ] Asset optimisation (Draco/meshopt; CDN/LFS for heavy GLB)
- [ ] Accessibility pass (keyboard nav, WCAG AA audit), real CC0 audio assets
- [ ] Lab SDK as a versioned package once the surface is stable
- [ ] Optional: i18n, Promethean/LMS integration, teacher dashboard

---

## 📚 Design docs

Living architecture decisions live in `docs/superpowers/specs/` (designs) and
`docs/superpowers/plans/` (implementation plans). Every lab goes design → plan →
subagent-driven execution → merge → deploy. The most recent is the biology anatomy lab:

- **Spec:** `docs/superpowers/specs/2026-05-31-anatomy-lab-design.md`
- **Plan:** `docs/superpowers/plans/2026-05-31-anatomy-lab.md`

---

## 🙏 Credits

- Physics by [Rapier](https://rapier.rs/) (Sébastien Crozet) via [@react-three/rapier](https://github.com/pmndrs/react-three-rapier).
- 3D rendering by [three.js](https://threejs.org/) and [@react-three/fiber](https://r3f.docs.pmnd.rs/); helpers from [@react-three/drei](https://github.com/pmndrs/drei).
- Post-FX from [@react-three/postprocessing](https://github.com/pmndrs/postprocessing).
- Anatomy 3D models: **NIH 3D / HuBMAP Human Reference Atlas** (Kristen Browne & Heidi
  Schlehlein, Visible Human Male), **CC-BY 4.0** — see [`public/models/CREDITS.md`](public/models/CREDITS.md).
- Audio placeholders are CC0 stubs; production audio is sourced separately — see [`public/audio/CREDITS.md`](public/audio/CREDITS.md).

---

## 📄 License

[MIT](LICENSE) — free for educational and commercial use. A credit + link back is
appreciated but not required.
