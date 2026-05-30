# Diffusion Lab — Camera / Lighting / Alignment Polish

**Status:** Approved direction (2026-05-30). Post-deploy polish of the reworked
brownian-diffusion lab from user prod feedback. **Scope: diffusion lab only.**
Shared SDK is touched only via *additive optional props with current-behaviour
defaults*, so `mass-measurement` and `electromagnetic-induction` are unaffected.

**Lab:** `src/labs/brownian-diffusion/` (route `/physics/brownian-diffusion`).

## Why (prod feedback, three items)
1. **Camera/scale:** the glass cube reads as washed-out (a bright blow-out on the
   glass) and the fixed close framing makes the scale hard to judge; the angle
   feels uncomfortable.
2. **No orbit:** the user wants to drag the mouse and rotate the camera around the
   box to view it from any side.
3. **Alignment:** in the narrow task panel the «Далі» / «Обери правильну
   відповідь…» button sits narrower and left of the full-width MC option pills, so
   it looks shifted.

---

## 1. Camera — free orbit (`OrbitControls`)

Replace the diffusion lab's camera control with drei's `OrbitControls`
(`@react-three/drei`, already used for `Environment`). In
`scene/LabScene.tsx`, **remove** `<CameraRig preset="focus-box" />` and
`<PinchZoomController />`; **add** `<OrbitControls>` configured:

- `makeDefault`, `target = BOX_WORLD` (`[0, 0.95, 0]`), `enableDamping`.
- **Rotate** on LEFT *and* MIDDLE mouse buttons (`mouseButtons`: both → `THREE.MOUSE.ROTATE`); object-drag was removed in the rework, so LEFT is free. Touch: one-finger rotate, two-finger zoom (drei defaults).
- **Zoom**: mouse wheel + touch pinch (native), plus the on-screen `+/−` buttons wired to the controls (scale the camera-to-target distance via an `orbitRef`, then `controls.update()`).
- `enablePan = false` — orbit + zoom only, always centred on the box.
- **Constraints:** `minDistance`/`maxDistance` (≈ 0.35 … 1.6) so the student can't fly inside the box or lose it; `minPolarAngle`/`maxPolarAngle` (≈ 0.12π … 0.52π) so the camera stays above the table and can't flip over the top.
- **Start pose:** a 3/4 view (above + front, slightly to the side), e.g. Canvas `camera.position ≈ [0.55, 1.4, 0.95]` looking at the box — scale legible immediately.
- **Responsive FOV** (was provided by `CameraRig`): set the camera FOV per breakpoint (phone ≈ 62°, tablet ≈ 56°, desktop 50°) and update it on breakpoint change so portrait phones still fit the box.

Other labs keep using `CameraRig` unchanged — this swap is local to diffusion's
`LabScene`. Diffusion loses the per-scene preset/intro-dolly, which is fine: it is
a single continuous scene.

## 2. Lighting / blow-out

The hotspot is the `studio` Environment reflecting on the glass, amplified by
`Bloom`. Tune within diffusion's scene + an additive `PostFX` option:

- **Exposure:** lower the Canvas `toneMappingExposure` `0.55 → ~0.45`.
- **Environment:** reduce its lighting contribution (e.g. `environmentIntensity ≈ 0.4`, or a dimmer setup) so the glass stops blowing out.
- **Glass:** slightly reduce `GlassBox` wall reflectivity/opacity so it reads as clean glass, not a mirror.
- **Bloom:** extend SDK `PostFX` with optional `bloomIntensity` (default `0.22`) and `bloomThreshold` (default `0.92`); diffusion passes gentler values (≈ `0.10` / `0.96`). Labs that call `<PostFX/>` with no props are byte-for-byte unchanged.
- **Cube definition (scale clarity):** add crisp faint edge lines to the box outline (drei `<Edges>` or an `edgesGeometry` `lineSegments`) so the cube's extent — and thus the molecules' scale — is unambiguous.

Exact numeric values are a visual-tuning matter the user verifies on prod (the
headless preview renders in a hidden tab, so R3F can't be smoke-tested here). The
plan ships sensible starting values; we iterate from the user's screenshot if
needed.

## 3. Button alignment

Add an optional `fullWidth?: boolean` to the SDK `Button` (`src/sdk/ui/Button.tsx`,
default `false` → other labs unchanged); when true it sets `width: '100%'`. In
diffusion's `ui/HUD.tsx`, render the unified «Далі» button with `fullWidth` inside
a small top-margin wrapper, so it spans the panel and lines up directly under the
full-width MC pills.

---

## 4. File-level change map

**Modify (diffusion):** `scene/LabScene.tsx` (OrbitControls + zoom wiring +
exposure + responsive FOV; drop `CameraRig`/`PinchZoomController` imports),
`instruments/GlassBox.tsx` (edge lines + gentler glass), `ui/HUD.tsx` (`fullWidth`
on «Далі»).

**Modify (SDK, additive only):** `ui/Button.tsx` (optional `fullWidth`),
`scene/PostFX.tsx` (optional `bloomIntensity`/`bloomThreshold`, defaults =
current).

**Unchanged:** `scene/CameraRig.tsx`, `scene/PinchZoomController.tsx`,
`scene/CinematicLighting.tsx`, and everything under the other two labs.

## 5. Testing & safety

- **Gate:** `npx tsc --noEmit` clean; `npx vitest run src/labs/brownian-diffusion` green (use the scoped run — the full suite's R3F/jsdom env flakes on file collection).
- **New unit test:** `Button` renders `width:100%` when `fullWidth` (RTL).
- **Not unit-testable (browser/prod verify):** OrbitControls rotate/zoom + constraints, the reduced blow-out, cube-edge clarity, and the button alignment in the narrow panel. The user confirms on prod.

## 6. Risks & non-goals

- **Risk:** camera/lighting are visual + interaction, not unit-tested → rely on the user's prod check; ship conservative starting values and iterate.
- **Risk:** OrbitControls replacing `CameraRig` in diffusion drops the intro dolly + presets there — accepted (single-scene lab).
- **Non-goals:** no change to other labs' camera; no global camera/lighting overhaul; SDK edits stay additive with safe defaults.
