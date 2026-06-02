# Perch Lab — Realism + Clarity Pass (Design Spec)

**Date:** 2026-06-02
**Lab:** `src/labs/perch` (live at `/biology/perch`)
**Status:** Approved design → ready for implementation plan
**Execution:** ultracode — orchestrated via the `Workflow` tool (parallel implementation + adversarial review)

## Goal

Make the perch dissection lab **more realistic *and* more наочно (vivid/clear)** for
students — the textbook-atlas sweet spot, not photoreal murk. The current lab is
stylized-procedural (ellipsoid-halves body, flat fins, simple sphere/torus organs).
This pass re-skins and enriches the **geometry, materials, lighting, and labels**
while keeping the architecture, phases, and the (approved) drag-to-cut mechanic.

Fully procedural, zero asset files (unchanged constraint).

## Approved decisions (from brainstorming)

1. **External fish = style B "realistic textbook"** — fusiform tapered body, fins with
   rays + thickness, scale hint, head detail (operculum, eye highlight, mouth, nostril),
   form-following stripes, wet sheen.
2. **Internal organs = style B** — real organ shapes, distinct readable colors.
3. **Labels = style B "always-on"** — every part in the current phase carries a subtle
   persistent label; the selected one brightens; full fact in the info card on click.
4. **Plus:** clean lit cavity (not dark), soft/contact shadows + rim light, wet
   `clearcoat` PBR, realistic inner body-wall on the open flap, organs slightly spaced
   so all 7 read without rotating.

## Approach — enrich in place

Chosen over a single-mesh body rebuild (silhouette nicer but the flap-split + hinge
get much harder — high risk) and over a GLTF fish (no free dissection-grade model;
breaks "procedural, zero assets"). The existing units stay and only their internals
change:

- **Unchanged:** `state/PerchState.ts`, `content/parts.ts` (data — positions may be
  nudged for spacing), `scene/cut.ts`, `scene/PartShell.tsx`, `scene/Scalpel.tsx`,
  `index.tsx`, `ui/*`, route, subject entry, the 3-phase flow, the drag-to-cut mechanic.
- **Enriched:** `scene/PerchBody.tsx`, `scene/Organs.tsx`, `scene/Tray.tsx`,
  `scene/PerchScene.tsx`, `scene/PartLabel.tsx`.
- **New:** `scene/shape.ts` (+`shape.test.ts`) — pure body-taper math; `scene/Labels.tsx`
  — always-on labels for the current phase.

## Body reshape (fusiform)

The body is two z-split hemispheres (`sphereGeometry(…, phiStart, π)`) scaled `[L,H,W]`
— far wall (z<0) + hinged flap (z>0). To make it fish-shaped **without breaking the
split or hinge**, apply a per-vertex **taper profile along X**: for each vertex, scale
its `y` and `z` by `bodyProfile(t)` where `t = (x/L + 1)/2 ∈ [0,1]` (0 = snout, 1 =
tail). Because only the *magnitude* of `y,z` changes (never the sign of `z`), the
z=0 sagittal split and the dorsal hinge are preserved.

- **`bodyProfile(t)` (pure, tested):** peaks near `t ≈ 0.35` (deep body just behind the
  head), falls to a moderate value at the snout (`t=0`) and a thin value at the caudal
  peduncle (`t=1`); smooth and strictly within `(0, 1]`. Applied in `PerchBody` via a
  `useMemo` that clones the geometry and rewrites its `position` attribute.
- **Skin:** richer runtime `CanvasTexture` — vertical olive→pale gradient + overlapping
  scale arcs + dark vertical bars + a lateral-line stripe. Shared by far wall + flap.

## Fins + head

- **Fins:** keep flat `Shape` fins but add **ray lines** (thin dark strokes baked into a
  small per-fin texture, or thin overlaid line meshes) and a touch of thickness;
  dorsal/tail olive, pectoral/pelvic/anal reddish, all PBR.
- **Head:** a defined **operculum** plate with a curved trailing edge + small spine; an
  eye with a `clearcoat` highlight + dark pupil; a mouth line; a nostril dot.

## Organs — realistic shapes (each a focused renderer in `Organs.tsx`)

- **gills** — 3–4 red filament combs (curved thin meshes), bright tips
- **heart** — small two-lobe form, deep red, clearcoat
- **liver** — lobed mass (2–3 merged spheres), brown
- **swimBladder** — elongated silvery sac, high clearcoat sheen (the standout)
- **stomach** — J-shaped sac
- **intestine** — coiled tube via `TubeGeometry` along a coil path, tan
- **kidney** — dark strip along the spine

Positions nudged (in `content/parts.ts`) so the 7 are slightly spaced and none hides
behind another in the open cavity.

## Materials + lighting + cavity

- **Materials:** `MeshPhysicalMaterial` with `clearcoat` for a wet sheen (body, organs);
  swim bladder = light color + high clearcoat (silvery).
- **Lighting:** key + fill + **rim** light; **contact shadows** under the fish on the
  tray (drei `ContactShadows` or `AccumulativeShadows`); keep `Environment` for soft
  reflections.
- **Cavity:** lighter cavity material **plus a small interior fill light** so organs are
  legible when the flap opens (replaces the current near-black cavity).

## Labels — always-on (style B)

New `Labels.tsx`: when not in `intro`, render a **subtle persistent label** (small,
low-opacity pill + short leader) for every part in the current phase (7 organs in
`internal`, 9 external parts in `external`); the **selected** part's label brightens to
full. The existing `SelectedLabel`/`PartLabel` is generalized: `PartLabel` gains an
`ambient` prop (dim style vs full style). Clicking still opens the full-fact info card.
If 9 always-on external labels read as cluttered at the visual gate, fall back to
on-select for the external phase only (internal always-on is the priority).

## Flap (open body wall)

The flap's **inner face** gets a distinct "body-wall in cross-section" material
(muscle/skin tone, matte) so the opened wall reads as a real cut. The drag-to-cut
mechanic, hinge, and `cutProgress`→`flapAngle` are **unchanged**.

## Reduced motion

Unchanged and still complete: gill sway + idle breathing already gate on
`useReducedMotion`; everything new (geometry, materials, lighting, labels) is static.

## Testing

- **Pure math** (`shape.test.ts`): `bodyProfile` — peak near `t≈0.35`, ends thinner than
  peak, output bounded in `(0,1]`, continuity. (Mirrors `cut.ts`/`motion.ts` testing.)
- **Existing tests stay green** — `PerchState`, `parts`, `cut`, `subjects` (positions in
  `parts.ts` may change values; the parts test asserts counts/ids/facts, not coordinates).
- **Scenes/R3F:** not unit-tested → human smoke + the spike gate.
- Gate: `tsc` (strict, `noUnusedLocals`) · `vitest run` · `vite build`.

## Spike gate (recommended first step)

Ship a deployable spike to prod: the **reshaped fusiform body + richer skin + PBR/wet
material + lighting (contact shadows, rim, lit cavity) + 2–3 hero organs (swim bladder,
gills, liver) + always-on labels**. The user validates the realism+clarity feel before
the full organ/fin/head sweep. Mirrors the anatomy/paramecium/organelle workflow.

## Ultracode execution (Workflow)

After the spike validates, the remaining work fans out via the `Workflow` tool:
independent pieces (fins+head, each remaining organ, cavity light, always-on labels)
implemented in parallel where they don't share files, each **adversarially reviewed**
before integration; a final whole-pass review; then finish-the-branch. Shared-file
edits (e.g. `Organs.tsx`, `PerchScene.tsx`) are sequenced to avoid conflicts.

## Out of scope (YAGNI)

The lab's flow / phases / cut mechanic (kept — re-skin only); `parts.ts` fact text +
the 16-part set (unchanged); the frog lab (separate cycle); SDK extraction of the
selectable-part pattern; sound; real GLTF/asset models; the cross-section/extract cut
alternatives.
