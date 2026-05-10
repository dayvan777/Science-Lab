# Science Lab · Mass Measurement

> **Interactive 3D physics laboratory for Ukrainian schools**
> Built for Promethean interactive panels (6th-7th grade) — touch-first, browser-based, no install.

🌐 **Live demo:** https://science-lab-phi.vercel.app/
🎬 **Auto-walkthrough:** https://science-lab-phi.vercel.app/?demo=1 (lab plays itself end-to-end in ~70 seconds)

This repository contains both an **engine** (`src/sdk/`) for building interactive lab simulations and the first concrete lab on top of it: **"Вимірювання маси тіл"** (Mass Measurement of Bodies). A student measures the mass of three different objects (ping-pong ball, metal sphere, baseball) using three different instruments (digital scale, lever balance, dynamometer) and discovers the **invariance of mass** — three methods, one result.

```
┌─────────────┐     ┌──────────────┐     ┌──────────────────┐
│ Pick up     │  →  │ Place on     │  →  │ Read & enter     │  →  …  9 tasks  →  Final reveal
│ object      │     │ instrument   │     │ value (g or N)   │
└─────────────┘     └──────────────┘     └──────────────────┘
```

---

## ✨ Features

- **3 instruments, 3 objects, 9 measurements** with guided step-by-step pedagogy
- **Cinematic dark studio aesthetic** — three-point lighting, shadows, post-FX bloom + vignette, ACES tone mapping
- **Real physics** via Rapier (continuous collision detection, kinematic ↔ dynamic body switching, snap targets)
- **Magnetic-pull snap** — drag tolerance is forgiving so children don't fight pixel precision
- **Visible spring oscillation** on the dynamometer (real spring-damper integration)
- **Auto-dolly camera presets** + mouse-wheel zoom + on-screen zoom buttons (touch-friendly)
- **Lab-journal** grouped by object with placeholder slots — visualises the "rope" of progression
- **Final reveal scene** — three columns, ticking numbers, mass-invariance conclusion
- **Subtle UI sounds** (CC0 placeholders included; production audio is sourced separately)
- **Persistent settings** (mute, etc.) via `localStorage`
- **Ukrainian UI**, single-language by design (architecture-ready for i18n later)

---

## 🛠 Tech stack

| Layer | Library |
|---|---|
| UI | React 19 + TypeScript 6 |
| Build | Vite 8 |
| 3D scene | [@react-three/fiber](https://r3f.docs.pmnd.rs/) 9 + [three.js](https://threejs.org/) |
| Helpers | [@react-three/drei](https://github.com/pmndrs/drei) 10 |
| Physics | [@react-three/rapier](https://github.com/pmndrs/react-three-rapier) 2 ([Rapier](https://rapier.rs/)) |
| Post-FX | @react-three/postprocessing 3 (Bloom, Vignette) |
| State | [Zustand](https://github.com/pmndrs/zustand) 5 |
| Audio | Web Audio API (custom `SoundManager`) |
| Tests | Vitest 4 + jsdom |

No external CDN dependencies, no analytics, no backend. Builds to a single static bundle (~3.6 MB / 1.27 MB gzipped).

---

## 🚀 Quick start

Requires **Node.js 20+**.

```bash
git clone https://github.com/dayvan777/Science-Lab.git
cd Science-Lab
npm install
npm run dev          # http://localhost:5173/
```

Available scripts:

```bash
npm run dev          # Vite dev server with HMR
npm run build        # type-check + production build → dist/
npm run preview      # serve the production build
npm run test         # run vitest once
npm run test:watch   # vitest in watch mode
npm run typecheck    # tsc --noEmit
```

53 unit tests cover physics math, animation helpers, sound manager, step DSL, and step engine.

---

## 📐 Architecture

The codebase splits into two layers:

```
src/
├── sdk/                            ← reusable engine, never imports from labs/
│   ├── animation/                  lerp, easeOutCubic, easeInOutCubic, springStep
│   ├── audio/                      SoundManager (lazy AudioContext, mute, preload)
│   ├── guided/                     StepEngine, GuidedOverlay, primitives, TaskSteps DSL types
│   ├── object/                     Draggable (kinematic-during-drag, dynamic-on-release)
│   ├── physics/                    bodyRegistry, snapTargets, useDrag (with magnetic-pull tween)
│   ├── scene/                      CinematicLighting, CameraRig, PostFX, Table, cameraStore
│   ├── ui/                         Button, GlassPanel, NumberInput, SoundToggle, ZoomControls
│   └── types.ts                    LabDefinition contract
│
├── labs/
│   └── mass-measurement/           ← lab-specific content
│       ├── index.tsx               <MassMeasurementLab/> entry + sound catalog
│       ├── instruments/            DigitalScale, Dynamometer, LeverBalance
│       ├── objects/                TennisBall (ping-pong), Apple (metal ball), Baseball, Weights
│       ├── content/                tasks.ts, steps.ts (Step DSL data)
│       ├── state/                  LabState (Zustand), InstrumentReadings (Zustand)
│       ├── textures/               procedural canvas-2d textures (LCD, dial, label, felt, seam)
│       ├── ui/                     HUD, IntroScreen, IntroTitle, MilestoneOverlay, RevealScene, SummaryScreen
│       └── scene/                  LabScene (Canvas + Physics + lab-specific layout)
│
└── app/                            App shell (just mounts <MassMeasurementLab/>)
```

### The `LabDefinition` contract

```ts
// src/sdk/types.ts
export type LabDefinition = {
  id: string                    // 'mass-measurement', 'friction', ...
  title: string                 // displayed in title cards
  // Future: scene config, instruments[], objects[], steps[], reveal config
}
```

Each lab exports its own `MassMeasurementLab`-style entry component and a definition object. The application shell decides which lab to mount (currently hard-coded to mass measurement; routing is trivial to add).

### Why split engine from content?

Today the SDK is a **pattern**, not yet a published package — but the directory boundary is enforced as a rule (engine never imports from labs). When we ship a second lab (`labs/friction/`, `labs/electrostatics/`), we keep all of the SDK and replace only the lab folder. If the SDK reaches stable surface area, it can graduate to a versioned package without restructuring.

---

## 🧱 How to add a new lab

1. Create `src/labs/<your-lab-id>/` mirroring the structure of `mass-measurement/`.
2. Define your task content in `content/tasks.ts` and step DSL in `content/steps.ts`.
3. Build instruments and objects using `Draggable`, `registerSnap`, `bodyRegistry`, `useReadings`.
4. Reuse SDK scene primitives (`<CinematicLighting/>`, `<CameraRig/>`, `<Table/>`, `<PostFX/>`) in your `scene/LabScene.tsx`.
5. Export a `<YourLab/>` entry component and a `LabDefinition`.
6. Mount it from `src/app/App.tsx`.

Most of the heavy lifting is already done — physics, drag-snap-tween, step progression, audio, camera dolly, HUD primitives.

---

## 🗺 Roadmap

Done in `feature/gold-standard`:

- [x] **Slice 0** — Folder split (`sdk/` vs `labs/`)
- [x] **Slice 1** — t1 vertical polish: cinematic lighting, post-FX, magnetic snap, focus camera, LCD glow, two-layer hint copy, audio wiring
- [x] **Slice 2** — Lever balance redesign: hanging chrome pans, A-frame V wires, weight stacking
- [x] **Slice 3** — Dynamometer polish: helix-tube spring, spring-damper hook oscillation
- [x] **Slice 4** — Object polish: ping-pong / metal ball / baseball / weights with proper PBR
- [x] **Slice 5** — Pedagogy scaffolding: intro flythrough, milestone overlays, grouped journal
- [x] **Slice 6** — Final reveal scene: three-column animated comparison + mass-invariance conclusion

Open:

- [ ] **Slice 7** — Accessibility pass (keyboard nav, focus rings, WCAG AA contrast audit)
- [ ] **Slice 8** — Demo mode (`?demo=1` auto-walkthrough), real CC0 audio assets
- [ ] **Future labs** — friction, electrostatics, simple machines, …
- [ ] **Lab SDK as a package** — once two labs are shipped, extract the engine to a versioned npm package
- [ ] **Optional**: i18n, server-side journal storage, classroom dashboard for teachers

---

## 📚 Design docs

Living architecture decisions live in `docs/superpowers/specs/` and `docs/superpowers/plans/`. The most recent spec is the gold-standard design that this `master` reflects:

- **Spec:** [`docs/superpowers/specs/2026-05-09-mass-measurement-gold-standard-design.md`](docs/superpowers/specs/2026-05-09-mass-measurement-gold-standard-design.md)
- **Plan:** [`docs/superpowers/plans/2026-05-09-slice-0-and-1-foundation-flagship.md`](docs/superpowers/plans/2026-05-09-slice-0-and-1-foundation-flagship.md)

---

## 🙏 Credits

- Physics by [Rapier](https://rapier.rs/) (Sébastien Crozet) via [@react-three/rapier](https://github.com/pmndrs/react-three-rapier).
- 3D rendering by [three.js](https://threejs.org/) and [@react-three/fiber](https://r3f.docs.pmnd.rs/).
- Helper components from [@react-three/drei](https://github.com/pmndrs/drei).
- Post-FX from [@react-three/postprocessing](https://github.com/pmndrs/postprocessing).
- Audio placeholders are zero-byte stubs; real sounds will be sourced from [freesound.org](https://freesound.org) under CC0 — see [`public/audio/CREDITS.md`](public/audio/CREDITS.md).

---

## 📄 License

[MIT](LICENSE) — free for educational and commercial use. If you build something with this, a credit + a link back is appreciated but not required.
