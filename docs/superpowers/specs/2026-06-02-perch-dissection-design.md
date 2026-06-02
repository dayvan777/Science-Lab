# Perch Dissection Lab — Design Spec

**Date:** 2026-06-02
**Subject:** Biology (zoology) — new lab `perch`
**Status:** Approved design → ready for implementation plan

## Goal

A 3D "study the structure of the river perch (*Perca fluviatilis*)" lab for Ukrainian
7th-grade zoology. The student examines the **external structure**, then **cuts the
body wall open** (a real-feeling dissection), then studies the **internal organs** in
place. Fully procedural — zero asset files (mirrors the paramecium/organelles labs).

## Approved decisions (from brainstorming)

1. **Animal:** perch (окунь). Frog is a separate later lab.
2. **Dissection interaction = concept A: hinged body-wall flap.** The near side of the
   body is a flap hinged along the dorsal ridge; "cutting" swings it open, revealing
   organs that stay in anatomically correct positions.
3. **Three phases:** external study → cut → internal study.
4. **Scope:** the part set below; both external and internal phases included.

## Archetype

Procedural (like paramecium): primitive/`Shape`-based geometry, no GLTF. Reuses the
established "selectable part" pattern from the paramecium organelle pass — a shared
shell that owns hover/select/cursor/dim/highlight + an in-scene label — re-implemented
locally in the perch lab (NOT extracted to SDK yet; see Out of Scope).

## Scene / setting

The perch lies on a **dissection tray** under soft watery-teal lighting (consistent
with the biology labs). `OrbitControls` for inspection (no auto-rotate during work).
Intro = staged title fade, like the other labs.

## Phase machine + cut mechanic

State phases: `'intro' | 'external' | 'internal'`, plus a continuous `cutProgress`
(0→1) that drives the flap.

- **External** (`start()` → `phase='external'`): intact perch. Clicking an external
  part → highlight + 3D label + info card. A **scalpel handle** sits on the belly with
  a dashed guide line.
- **Cut:** the student **drags the scalpel along the belly guide**; `cutProgress`
  tracks drag distance along the line (0→1). The flap's open angle is bound directly to
  `cutProgress` (`flapAngle = lerp(0, MAX_FLAP)`), so the wall opens as they drag —
  inherently reduced-motion-friendly (follows the finger, no auto-animation). On
  touch, the same drag. When `cutProgress` reaches 1 → `phase='internal'`.
- **Internal** (`phase='internal'`): flap fully open, organs clickable → highlight +
  label + info card. External parts dim and stop intercepting clicks. HUD shows
  **«Зашити»** (suture → `cutProgress=0`, `phase='external'`, clears selection) and a
  global **ВИВЧЕНО N/16** badge.

`cut.ts` (pure, tested) exposes `flapAngle(cutProgress, maxRad)` (eased 0→maxRad) and a
`cutProgressFromDrag(dragLen, fullLen)` clamp helper.

## Perch body construction (procedural)

Recognizable perch silhouette and markings:
- **Body:** a tapered fusiform — a deep-bodied ellipsoid stretched along X (length) and
  tapering toward the caudal peduncle. Built as **two sagittal halves** split at the
  z=0 plane: the **far half** (z<0) is the static "back shell"; the **near half** (z>0)
  is the **flap**, hinged along the dorsal ridge (a line along X at the top of the
  body) and rotating outward by `flapAngle`. Interior of the cavity is a darker
  material so organs read.
- **Defining features:** two separate **dorsal fins** (anterior spiny + posterior
  soft), a **forked caudal fin**, reddish **pelvic + anal** fins, **pectoral** fins,
  a large **operculum** (gill cover) plate, a big **eye**, and **5–8 dark vertical
  bars** (via vertex color or a procedural stripe texture) over an olive-green back
  fading to a pale belly. Fins are flat extruded `Shape` geometries with ray lines.
- **Scales / lateral line:** a faint lateral-line stripe; scale texture optional/subtle.

## Internal organs (procedural, in the cavity)

Each a simple solid placed in anatomically plausible position, revealed when the flap
opens:
- **gills** — red curved arches behind the operculum
- **heart** — small red mass, ventral, just behind the gills
- **liver** — brown-red lobed mass, anterior-ventral
- **swimBladder** — large silvery elongated sac, dorsal (the standout organ)
- **stomach** — J-shaped sac
- **intestine** — coiled tube, ventral-posterior
- **kidney** — dark narrow strip along the backbone

## External parts (clickable in phase `external`)

`dorsalFins` (Спинні плавці — spiny + soft), `caudalFin` (Хвостовий), `analFin`
(Анальний), `pectoralFins` (Грудні), `pelvicFins` (Черевні), `operculum` (Зяброва
кришка), `lateralLine` (Бічна лінія), `scales` (Луска), `head` (Голова: око, ніздрі,
рот). → 9 external + 7 internal = **16 parts**.

## Part selection + labels

Mirror of the paramecium organelle pattern:
- **`PartShell`** — owns hover state, `useCursor` (gated to the active phase), pointer
  handlers (gated so external parts are interactive only in `external`, organs only in
  `internal`), and a computed visual `state` ({selected, dimmed, targetEmissive,
  targetOpacity}) handed to a renderer.
- **`PartLabel`** — drei `<Html>` name pill + `<Line>` leader, shown for the selected
  part only.
- Side **rail** (phase-filtered: external parts in phase 1, organs in phase 3), **info
  card** (facts + close), **HUD** (cut affordance / «Зашити» / «← Зовнішня» / progress
  badge / procedural-credit line).

## Data model — `content/parts.ts`

```
PartKind = 'fin' | 'plate' | 'line' | 'organ' | 'region'
PartDef {
  id: PartId
  label: string                    // UA
  phase: 'external' | 'internal'
  kind: PartKind
  color: string
  position?: [number, number, number]   // label/leader anchor (body-local frame)
  facts: string[]                  // short UA facts
}
PARTS: PartDef[]   // single source of truth for rail, labels, picking
```

Actual fact strings (one short UA sentence each) authored in this file during the plan.

## State — `state/PerchState.ts` (Zustand)

```
phase: 'intro' | 'external' | 'internal'
cutProgress: number               // 0..1
selectedPartId: PartId | null
viewedPartIds: PartId[]           // all studied, both phases
start()                           // → external
setCut(p)                         // clamp 0..1; if p>=1 → phase='internal'
suture()                          // cutProgress=0, phase='external', clear selection
select(id)                        // set + dedupe-record viewed; only same-phase parts
deselect()
reset()
```

## File structure — new lab `src/labs/perch/`

- `content/parts.ts` + `content/parts.test.ts`
- `state/PerchState.ts` + `state/PerchState.test.ts`
- `scene/anatomy.ts` (body dims, colors, `dampAlpha`), `scene/cut.ts` + `scene/cut.test.ts`
- `scene/Tray.tsx`, `scene/PerchBody.tsx` (back shell + flap + fins + head + stripes),
  `scene/Organs.tsx`, `scene/ExternalParts.tsx`, `scene/Scalpel.tsx` (drag→cutProgress),
  `scene/PartShell.tsx`, `scene/PartLabel.tsx`, `scene/PerchScene.tsx`
- `ui/IntroScreen.tsx`, `ui/PartRail.tsx`, `ui/InfoCard.tsx`, `ui/HUD.tsx`
- `index.tsx` (`PerchLab` phase machine + `perchLabDefinition`)
- **Modify:** `src/site/content/subjects.ts` (add `perch` entry to biology:
  title 'Будова річкового окуня', subtitle 'Зовнішня будова · розтин · внутрішні
  органи', path '/biology/perch', status 'available') + `subjects.test.ts`;
  `src/app/App.tsx` (lazy `/biology/perch` route).

## Reduced motion

`useReducedMotion()` gates: gill sway, idle "breathing", label fade, and the **suture
(close) easing** (instant when reduced). The cut itself is drag-driven (follows the
pointer), so it stays available and needs no motion gating. `OrbitControls` autoRotate
off during work regardless.

## Testing

- **Pure math** (`cut.test.ts`): `flapAngle` bounds/monotonic/eased; `cutProgressFromDrag`
  clamp. (`anatomy.ts` `dampAlpha` already a known pattern.)
- **Content** (`parts.test.ts`): 16 parts, unique ids, every part has ≥1 fact, phase
  split 9/7.
- **State** (`PerchState.test.ts`): phase transitions, `setCut` threshold → internal,
  `suture` resets, `select` dedupe + same-phase guard, `reset`.
- **Scenes/R3F:** not unit-tested (project norm) → human smoke + spike gate.
- Gate: `tsc` (strict, `noUnusedLocals`) · `vitest run` · `vite build`.

## Spike gate (recommended first step)

Ship a deployable spike to prod: **perch body + the hinged cut-open flap + 2 organs
(swim bladder + heart)**. The user validates the hero interaction (the cut feel + fish
recognizability) before the full build. Mirrors the anatomy/paramecium/organelle
workflow.

## Out of scope (YAGNI)

Frog lab (next cycle); SDK extraction of the shared selectable-part pattern (now in
~3 labs — a separate refactor PR later); sound; real GLTF/asset models; the "two
specimens in one lab" switcher; cross-section (concept B) or extract (concept C) modes.
