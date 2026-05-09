# Changelog

All notable changes to this project are documented in this file.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project (loosely) follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] — 2026-05-09 — "Gold Standard"

The first complete pass of the lab. Splits the codebase into a reusable engine
(`src/sdk/`) and the concrete Mass Measurement Lab (`src/labs/mass-measurement/`).
Every visible surface — lighting, materials, animations, audio, pedagogy —
went through a deliberate polish pass.

### Added — engine (`src/sdk/`)

- **animation/** pure helpers: `lerp`, `clamp`, `easeOutCubic`, `easeInOutCubic`, `springStep` (15 unit tests).
- **audio/** `SoundManager` singleton with persistent mute, lazy `AudioContext`, and graceful no-op on missing buffers (6 unit tests).
- **scene/** `CinematicLighting` (3-point warm-key/cool-fill/warm-rim), `CameraRig` with named presets and time-based dolly tween, `PostFX` (Bloom + Vignette + ACES tone mapping at the Canvas level), `Table` with explicit cuboid colliders and table-bounds export, `cameraStore` for manual zoom.
- **physics/** `bodyRegistry` now tracks `{ massKg, halfHeight }` per body, `snapTargets` adds `snapProgress` ease-out helper, `useDrag` performs a 300 ms magnetic-pull tween before `onAttach` and clamps drag position to within table bounds.
- **object/** `Draggable` enables CCD on dynamic bodies and registers half-height for stacking layouts.
- **guided/** Step DSL extended with optional `hintTitle`, `hintExplanation`, `sound`, `micropause`. Sound playback wired through `GuidedOverlay` on step completion.
- **ui/** `SoundToggle`, `ZoomControls` (touch + mouse-wheel), polished `GlassPanel`, `Button`, `NumberInput`.
- **types.ts** — `LabDefinition` contract stub.

### Added — lab (`src/labs/mass-measurement/`)

- Visual redesign of all three instruments:
  - **DigitalScale** — anodized housing, brushed-steel platform, glowing 7-segment LCD with scanlines, lerp-based reading interpolation.
  - **LeverBalance** — wide base on four feet, vertical column, horizontal beam, A-frame V-rod hangers, generously sized chrome dishes with bright rims; ordered weight stacking on each pan.
  - **Dynamometer** — anodized stand, helix `TubeGeometry` spring scaled vertically with load, `springStep`-driven hook oscillation, polished chrome hook ring + stem.
- Object swaps: `TennisBall` → ping-pong (5 g, white plastic), `Apple` → metal ball (250 g, polished chrome). `Baseball` kept (145 g) with smoother sphere and warmer leather tint. `Weights` row with darker steel and slightly polished knob.
- Pedagogy:
  - **`IntroTitle`** + camera `intro` preset — 3-second cinematic flythrough at lab start.
  - **`MilestoneOverlay`** — 4-second slide-in card between objects ("Пінг-понговий м'ячик зважений / ...запам'ятай ці числа").
  - **HUD journal** grouped by object with done / current / pending markers and a placeholder ("·····") for empty slots.
  - **`RevealScene`** — final cinematic comparison: title fade-in, three glass columns rise in a staggered wave, numbers tick from 0 to measured grams, bars draw, conclusion fades in ("Маса не залежить від методу вимірювання — це інваріантність маси"), CTAs.
- `Task` type now carries a human-readable `displayName`.
- Spawn positions tuned so all bodies land cleanly on the table at first mount.

### Changed

- Dropped the `@react-three/postprocessing` cap once perf was validated; bloom intensity tuned down to 0.22 to keep the scene cinematic without blowing out highlights.
- Lever balance materials calmed: lower `metalness`, higher `roughness`, `envMapIntensity` reduced ~50 %.
- Weights moved from behind the lever balance to a vertical column on the far-right side of the table for easier grabbing.
- Camera focus presets changed from aggressive close-ups (which broke drag-pickup) to subtle pans that keep the whole table visible.

### Fixed

- Body levitation on the digital scale — `onAttach` now uses each body's registered `halfHeight` to rest its bottom on the platform.
- Tunneling and fall-through on initial mount — `Table` uses explicit `CuboidCollider`s instead of auto-cuboids, and `Draggable` rigid bodies enable CCD.
- HUD lever-balance tilt label was inverted relative to the post-fix sign convention.
- Dynamometer + digital scale formerly used `body.mass()` which returns 0 for kinematic bodies; both now route through `bodyRegistry.getBodyMass`.

### Tests

- 53 unit tests across animation, sound manager, snap progress, step DSL, step engine, lab state, and tasks. All green.

[0.1.0]: https://github.com/vladdomotsky/lab-sdk/releases/tag/v0.1.0
