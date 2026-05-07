# Magnetic Pipeline — Demo-Day Hot Patch Design

**Date:** 2026-05-07
**Status:** Approved — implementing now
**Context:** v2-lite Phases A+B+C done. Multiple UX bugs reported. User approved this design.

## Goals

1. **Magnetic snap** — drag near scale → object auto-snaps to center
2. **Strict process** — only active object pickable, only correct scale receives
3. **Lever balance — deterministic** — manual animation, no flying objects
4. **Submit flow works** — record → next task → repeat through all 9

## Behavioral spec

### Drag-and-drop
- **Active object** (per current task): full opacity + blue outline + pulse
- **Other objects**: 0.4 opacity, NOT pickable (Draggable.enabled = false)
- **Active instrument**: yellow outline + magnetic snap zone (radius 0.30 — generous)
- **Other instruments**: 0.5 opacity, no snap
- **Drop in magnetic zone** → object auto-positioned at instrument center
- **Drop outside zone** → object falls under gravity (and may roll, not break process)

### Lever balance — deterministic
- Replace dynamic beam + joints with `<group>` animated via useFrame
- Track state: `leftPanItem: string | null`, `rightPanWeights: string[]`
- Compute mass: `leftMass = mass of leftPanItem`, `rightMass = sum of rightPanWeights`
- Tilt = `clamp((rightMass - leftMass) / referenceMass, -0.25, +0.25)` rad
- Beam rotation animates toward tilt
- Snapped objects become "tracked", positioned at pan location each frame
- Mass reading for HUD: from tracked state directly

### Strict task progression
- Use `currentTask = tasks[currentTaskIndex]`
- `activeObjectId = currentTask.objectId`
- `activeInstrumentId = currentTask.instrumentId`
- Draggable receives `enabled={bodyId === activeObjectId || bodyId.startsWith('weight-')}` (weights always enabled for lever)
- Snap targets check: if not for active instrument, return null in findSnapNear

### Submit flow
- Input bar pulses when measurement is on instrument
- Click "Записати" → calls setMeasurement → currentTaskIndex advances → snapped objects auto-released (kinematic→dynamic, fall back near start zone)
- After 9th: phase='finished' → SummaryScreen

## Implementation files

- `src/scene/objects/Draggable.tsx` — add `enabled` prop
- `src/scene/objects/TennisBall.tsx`, `Apple.tsx`, `Baseball.tsx` — pass `enabled` based on active task
- `src/scene/instruments/LeverBalance.tsx` — refactor to manual animation + tracked state
- `src/lab/InstrumentReadings.ts` — add `leftPanItem`, `rightPanWeights` for lever
- `src/physics/snapTargets.ts` — bigger radius, active-only filter
- `src/lab/HUD.tsx` — verify pulse on active step
- `src/scene/LabScene.tsx` — wire active object/instrument context

## Out of scope

- Apple Studio backdrop
- Post-processing
- New visual effects (only what's needed for active/dimmed)

## Risk

- Lever balance refactor is biggest change. Risk: breaks existing tests OR has visual glitches.
- Mitigation: keep current dynamic beam mesh visible but disable joints, tilt manually.
