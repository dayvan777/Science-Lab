# Paramecium Organelles — Realism Pass (Design Spec)

**Date:** 2026-06-02
**Lab:** `src/labs/paramecium` (live at `/biology/paramecium`)
**Status:** Approved design → ready for implementation plan

## Goal

Make the 9 organelles in the paramecium lab **more realistic** *and* **more
understandable** for students. Today each organelle is a flat colored primitive
(sphere / cone / dot) — biologically *placed* correctly, but visually abstract and
hard to tell apart. This pass gives each organelle its real silhouette, subtle
detail, and — where it teaches function — motion, plus an in-scene name callout for
the selected organelle.

Fully procedural, zero asset files (matches the lab's existing constraint).

## Approved decisions (from brainstorming)

1. **Visual fidelity = "textbook in 3D" (style B).** Each organelle gets a real
   shape, volume, and a touch of detail — readable, not photo-real-murky.
2. **Animate all four functions.** Continuous: contractile-vacuole pump, food-vacuole
   cyclosis+digestion. On-select: trichocyst firing, oral-groove feeding. Everything
   gated by `useReducedMotion`.
3. **In-scene labels (option A).** When an organelle is selected, a small name pill +
   thin leader line appears next to it in 3D (only for the selected one).

## Current state (what we're replacing)

- `scene/Organelles.tsx` — generic `OrganelleGroup` draws every point-organelle's
  `positions` as a `sphereGeometry` (or `coneGeometry` for the `funnel` kind) on a
  shared `MeshStandardMaterial`; select → emissive + pulse; `dim` others to 0.25
  opacity. Plus a separate `Trichocysts` (60 static dots). Also carries a dead
  `export type { OrganelleId }` re-export (removed by this refactor).
- `scene/Cilia.tsx` — 420 instanced cones, fibonacci-sphere placement on the
  ellipsoid, metachronal beat. Cones are thick.
- `scene/Cell.tsx` — glass `MeshPhysicalMaterial` ellipsoid; mounts `<Cilia>` +
  `<Organelles>`; pellicle emissive on select; click → `enterCell`.
- `content/organelles.ts` — data: `id, label, color, kind, positions?, radius?,
  scale?, facts`. **Single source of truth** (also feeds the rail). Unchanged in
  shape by this pass (no required new fields).
- `state/ParameciumState.ts` — `viewMode`, `selectedOrganelleId`, `viewedOrganelleIds`,
  `select/deselect/…`. **Unchanged.**

## Architecture — hybrid (shared shell + per-organelle renderers)

A shared **`OrganelleShell`** owns all cross-cutting concerns; each organelle is a
small focused renderer owning only its shape + intrinsic motion. Chosen over a
data-driven mega-renderer (switch sprawls, heterogeneous animations don't fit in
data) and over keeping one god-component (shapes/motions tangle).

### New folder: `src/labs/paramecium/scene/organelles/`

| File | Responsibility |
|---|---|
| `OrganelleShell.tsx` | Wraps one renderer. Owns: hover state + `useCursor` (cell-view gated), pointer handlers (gated `viewMode==='cell'`) that call `select(id)`, derives `{ selected, highlighted, dimmed }`, applies dim opacity + emissive highlight policy, mounts `<OrganelleLabel>` when selected. Outer `<group>` so child mesh pointer events bubble up. |
| `OrganelleLabel.tsx` | In-scene callout: drei `<Html>` name pill + drei `<Line>` leader from the organelle anchor to the pill. Shown only when `selected && viewMode==='cell'`. `pointerEvents:none`, HUD-style. |
| `ContractileVacuoles.tsx` | Two vacuoles (front/back) — sphere + 7 radial canal lines + highlight; `pumpScale` animation (out of phase). |
| `FoodVacuoles.tsx` | N vacuoles drifting on a cyclosis loop (`cyclosisPos`), colored by `digestColor`, each with 2–3 engulfed-bacteria specks. |
| `Macronucleus.tsx` | Granular sausage/ellipsoid (instanced stipple specks) + soft highlight. |
| `Micronucleus.tsx` | Small bright sphere nestled beside the macronucleus. |
| `OralGroove.tsx` | Shaded funnel indentation + inner sweeping cilia; on-select feeding: a prey speck travels in → a new food vacuole buds. |
| `Trichocysts.tsx` | Dart dots under the pellicle; on-select, a subset fires thin threads outward then retracts. |
| `AnalPore.tsx` | Small notch at the rear; on-select, an occasional expelled remnant. |
| `motion.ts` | **Pure** animation math (no R3F): `pumpScale`, `cyclosisPos`, `digestColor`, plus shared `dampAlpha` re-use from `scene/life.ts`. Unit-tested. |
| `motion.test.ts` | Vitest unit tests for the pure functions. |
| `index.tsx` | `Organelles` component: maps the 6 **point-kind** organelle ids (`oral, foodVacuoles, contractileVacuoles, macronucleus, micronucleus, analPore`) → their renderer wrapped in an `OrganelleShell`, via an `id → renderer` registry; mounts the **layer-kind** `Trichocysts` explicitly (not position-driven). `cilia` + `pellicle` (also layer) stay in `Cell.tsx`/`Cilia.tsx`. Replaces the old `Organelles.tsx` export. |

`scene/Organelles.tsx` becomes a 1-line barrel re-exporting `Organelles` from
`./organelles` so `Cell.tsx`'s import path stays stable.

### Shell ↔ renderer interface

```
type OrganelleVisualState = { selected: boolean; highlighted: boolean; dimmed: boolean }
<OrganelleShell def={def} Renderer={ContractileVacuoles} />
// Shell renders: <group {...pointerHandlers}><Renderer def={def} state={state}/> {selected && <OrganelleLabel def={def}/>}</group>
```

The renderer reads `state` for emissive intensity + to trigger on-select motion
(trichocysts / oral). Continuous motion (pump, cyclosis) runs regardless of selection
but is `reduced`-gated.

## Per-organelle visual treatment (style B)

- **Contractile vacuoles** — sphere + 7 radial "collecting canal" lines (aster) +
  small specular highlight. Color `#9ccdf2`.
- **Food vacuoles** — sphere with 2–3 dark engulfed-bacteria specks; fill color set
  each frame by `digestColor(progress)` (fresh green `#a7c46a` → digested brown
  `#5f4a2c`). Color `#a7c46a` base.
- **Macronucleus** — sausage ellipsoid (`scale [1.4,0.9,0.9]`, base `radius 0.3`)
  with ~40 instanced stipple specks (`#b9853c`) for granular texture. Color `#f0be78`.
- **Micronucleus** — small sphere (`radius 0.1`) + bright inner dot, positioned to sit
  beside the macronucleus (data position already adjacent). Color `#caa06e`.
- **Oral groove / mouth** — shaded funnel (cone, open) recessed into the membrane,
  a few short cilia inside. Color `#7fc8c0`.
- **Trichocysts** — ~34–60 small dots just under the pellicle (fibonacci, ellipsoid-
  scaled). Color `#dfeaf2`.
- **Anal pore** — small notch/quad at the rear (data position `[1.2,-0.3,0.1]`).
  Color `#8fb0a8`.
- **Cilia** — thinner, gently tapered, slightly wavier than today's cones; keep
  `InstancedMesh` + metachronal beat. (Refine `Cilia.tsx` in place.)
- **Pellicle** — faint cortex pattern via a runtime-generated `CanvasTexture` (drawn
  with the 2D canvas API → still zero asset files) applied subtly to the cell so the
  surface reads as patterned, not blank glass. Kept low-contrast to not muddy the glass.

## Motion spec (pure math in `motion.ts`)

All consumed inside `useFrame`; **every** caller checks `useReducedMotion()` and
falls back to the rest pose when reduced.

- **`pumpScale(t: number, period = 3.4, phase = 0): number`** — contractile vacuole.
  `u = ((t / period) + phase) mod 1`. Fill: `u ∈ [0, 0.72]` ease from `0.7 → 1.15`.
  Contract: `u ∈ [0.72, 0.86]` rapid `1.15 → 0.62`. Recover: `u ∈ [0.86, 1]` ease back
  to `0.7`. Returns a scalar scale multiplier. Front/back vacuoles use `phase` 0 and 0.5.
- **`cyclosisPos(t, i, count, period = 18): [number, number, number]`** — food vacuole.
  Returns a point on a tilted 3D ring inside the cytoplasm:
  `a = 2π * ((t / period) + i / count)`, ring center `[0.05, -0.05, 0]`, radii
  `(rx=0.7, ry=0.32)` in a plane tilted ~20° so vacuoles weave front-to-back. Radii are
  bounded to stay inside the ellipsoid (A,B,C) and clear of the macronucleus.
- **`digestColor(progress: number): Color`** — `THREE.Color` lerp `#a7c46a → #5f4a2c`,
  `progress` clamped `[0,1]`, taken as `((t/period)+i/count) mod 1` so each vacuole
  "resets" to fresh after a lap (visually: picked up at the mouth, digested around the loop).
- On-select motions (trichocyst fire, oral feed) are time-driven envelopes started
  when `state.selected` flips true; they can be expressed with a local ref clock and a
  simple eased 0→1→0 envelope (no separate pure fn required, but the envelope helper
  `fireEnvelope(localT)` may live in `motion.ts` for testability).

## In-scene label (option A)

`OrganelleLabel({ def })`:
- Anchor = `def.positions?.[0] ?? [0,0,0]` (cell-local). For `layer` organelles
  selected from the rail (cilia, pellicle, trichocysts), anchor at a sensible fixed
  point on the membrane.
- drei `<Line>` from anchor → `anchor + offset` (offset ~`[0.35, 0.45, 0.1]`), 1px,
  organelle color, slight transparency.
- drei `<Html>` pill at the offset end: `def.label`, small, HUD typography
  (`#bfeee2` on dark translucent), `distanceFactor` for stable size, `pointerEvents:none`,
  `occlude={false}`.
- Rendered only while `selected && viewMode==='cell'`.

## Materials / readability

Stay procedural (`MeshStandardMaterial` / `MeshPhysicalMaterial`). Per-organelle:
distinct base color (from `content/organelles.ts`, matches the rail legend), low
roughness, subtle `emissive` of the same hue for depth; selected → `emissiveIntensity`
up; non-selected when something is selected → dim to ~0.25 opacity (existing policy).
Goal: organelles stay legible **inside** the translucent cell, never wash out.

## Reduced motion

`useReducedMotion()` already gates cilia/swim/pulse/particles/dive. Extend the same
gate to: pump, cyclosis (vacuoles sit at `i/count` rest positions, fresh color), the
two on-select envelopes (show end-state pose, no animation), and any label fade.

## Testing

- **Pure math** (`motion.test.ts`): `pumpScale` bounds + monotonic fill + fast
  contract; `cyclosisPos` continuity (wraps, stays within radius); `digestColor`
  endpoints + midpoint + clamping. (Mirrors how `kinetics`/`lattice` are tested.)
- **State** (`ParameciumState`): unchanged; existing tests stay green.
- **Scenes/R3F**: not unit-tested (project norm) → human smoke + the spike gate.
- Full gate before merge: `tsc` (strict, `noUnusedLocals`), `vitest run`, `vite build`.

## Spike gate (recommended first step)

Before the full plan, ship a **deployable quality spike**: the two continuous-motion
vacuoles (contractile + food) rendered in style B with motion, on `/biology/paramecium`
(or a temporary throwaway route), merged to master so it deploys to prod. The user
confirms the 2D→3D translation feels right ("realistic *and* clear") → then we build
the rest. De-risks the visual direction; matches the anatomy + paramecium workflow.

## Out of scope (YAGNI)

Lab flow / phase machine; rail + info-card **structure** (kept; only color stays
synced); adding/removing organelles or facts; sound; real GLTF/asset models; camera
or environment redesign.

## File change summary

- **Create:** `scene/organelles/` (12 files above).
- **Modify:** `scene/Organelles.tsx` (→ barrel), `scene/Cilia.tsx` (thinner/wavier),
  `scene/Cell.tsx` (mount via barrel unchanged; add pellicle CanvasTexture).
- **Unchanged:** `content/organelles.ts` (data), `state/ParameciumState.ts`,
  `ui/*`, `index.tsx`, route, subject entry.
