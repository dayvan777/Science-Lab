# Mass Measurement Lab v2-lite — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Premium-feel polish of v1 MVP via better assets (canvas-textures), Apple HIG UI redesign, and persistent Guided Mode — **without** any GPU-heavy effects (no HDRI swap, no shadows tweaks, no post-processing, no custom shaders).

**Why v2-lite exists:** Original v2 plan ([2026-05-01-mass-measurement-lab-v2-implementation.md](2026-05-01-mass-measurement-lab-v2-implementation.md)) attempted Apple Studio backdrop + post-processing + Studio HDRI + custom shader sky. On user's hardware this caused unrecoverable lag. All those changes were reverted (commit `9871dfa`). v2-lite drops Phase 1 (Visual Foundation) and Phase 6 perf tuning entirely; keeps the high-impact UX changes that have **zero or negligible** perf cost.

**Current baseline:** commit `9871dfa` — v1 with snap-targets, live readings, step hints. Confirmed working.

**Architecture:** Strictly additive on top of v1. Keep the table, keep v1 lighting, keep v1 camera framing. Add procedural asset polish (canvas textures), redesigned UI (glassmorphism), and a new `src/guided/` subsystem that auto-detects micro-step progress.

**Tech Stack:** React 19 + TypeScript 6 + Vite 8 + R3F 9 + drei 10 + rapier 2 + Zustand 5 + html-to-image. **No new GPU-heavy deps.** `@react-three/postprocessing` already installed (commit `2304c49`) but not used.

**Spec reference:** [`2026-05-01-mass-measurement-lab-v2-design.md`](../specs/2026-05-01-mass-measurement-lab-v2-design.md) — sections 5-7 fully apply (procedural assets, guided mode, UI redesign). **Sections 4 (visual style) and 8 Phase 1/6 are SKIPPED** in v2-lite.

**Estimated total:** 2-3 weeks focused work, ~22 tasks across 4 phases (A, B, C, D).

---

## What changed from v2 → v2-lite

| Original v2 phase | v2-lite decision |
|---|---|
| Phase 1 (Visual Foundation: backdrop, lighting, post-processing, PBR) | **DROPPED** — caused lag. Keep v1 lighting/table. |
| Phase 2 (Procedural Assets: canvas textures, helix spring, etc) | **KEEP** as Phase A (Tasks 1-7). Canvas textures are CPU work, zero GPU cost. Skip helix spring (visual only, reuse v1 cylinder). |
| Phase 3 (UI Redesign: GlassPanel, Apple HIG, etc) | **KEEP** as Phase B (Tasks 8-13). HTML/CSS, zero 3D-perf impact. |
| Phase 4 (Guided Core) | **KEEP** as Phase C (Tasks 14-19). Educational ROI is highest. |
| Phase 5 (Guided Polish) | **KEEP** as Phase D (Tasks 20-22). |
| Phase 6 (Final polish: adaptive quality, confetti, deploy) | **CONDENSED** into Task 22. No adaptive quality needed (no heavy effects to gate). |

**Net result:** lose only the Apple Studio visual identity. The "не понятно что происходит" pain point — which was THE main reason for v2 — is fully addressed by Phases C and D (Guided Mode).

---

## Phase A — Procedural Asset Polish (Tasks 1-7)

Visual upgrades that DON'T cost GPU. Each instrument and object gets canvas-baked textures + slight geometry refinements.

### Task 1: Extract canvas-texture factories (LCD, dial, label)

Identical to v2 plan Task 6. Creates `src/scene/textures/` with:
- `lcdTexture.ts` — extracted from DigitalScale's inline canvas
- `dialTexture.ts` — extracted from Dynamometer's inline canvas

See v2 plan Task 6 for full code. Verify with `npm run test` (existing 17 tests pass).

Commit: `refactor(textures): extract canvas-texture factories to scene/textures/`

### Task 2: Polish DigitalScale (rounded box housing + brand label + glow tare)

Identical to v2 plan Task 7. Replace housing with `<RoundedBox>` from drei, add `createBrandLabel('LAB SCALE')` texture, change tare button to red emissive sphere.

Commit: `feat(instruments): polish digital scale (rounded box housing + brand + glow tare)`

### Task 3: Polish Dynamometer stand and arm (skip helix spring — perf risk)

**Modified from v2 Task 8:** keep the existing simple cylinder spring (NOT helix TubeGeometry — that risks perf on weak hardware). Only update:
- Stand/arm to `<RoundedBox>` from drei
- Materials to higher metalness/roughness as in spec

Commit: `feat(instruments): polish dynamometer stand and arm (no helix spring)`

### Task 4: Polish LeverBalance (rounded beam, concave pans, red needle)

Identical to v2 plan Task 9. Pans get rim torus, beam gets rounded edges, needle becomes red cone instead of red box.

Commit: `feat(instruments): polish lever balance (rounded beam + concave pans + red needle)`

### Task 5: Procedural weights with engraved labels

Identical to v2 plan Task 10. Add `createWeightLabel('1 кг')` texture, conical taper on weight body, top knob.

Commit: `feat(objects): procedural weights with engraved labels and conical taper`

### Task 6: Tennis ball + baseball with seam textures

Identical to v2 plan Task 11. `feltTexture.ts` + `seamTexture.ts` factories applied to balls.

Commit: `feat(objects): canvas seam textures for tennis ball and baseball`

### Task 7: Procedural apple (sphere + stem + leaf)

Identical to v2 plan Task 12. No AI dependency, just a stylized apple from primitives.

Commit: `feat(objects): procedural apple with stem and leaf`

---

## Phase B — UI Redesign (Tasks 8-13)

All Apple HIG / glassmorphism work. **Pure HTML/CSS — zero 3D perf cost.**

### Task 8: GlassPanel reusable component

Identical to v2 plan Task 14. New `src/ui/GlassPanel.tsx` with backdrop-filter glassmorphism + multi-layer shadows.

Commit: `feat(ui): GlassPanel reusable Apple-style glassmorphism container`

### Task 9: Apple HIG Button rewrite

Identical to v2 plan Task 15. Spring press animation, Apple Blue (`#0071e3`) primary, glass secondary.

Commit: `feat(ui): Apple HIG Button with continuous corners + spring press animation`

### Task 10: TouchNumberKeypad + NumberInput rewrite

Identical to v2 plan Task 16. Modal numeric keypad with 80px buttons for touch panels, replaces inline `<input type="number">`.

Commit: `feat(ui): TouchNumberKeypad modal + Apple-style NumberInput trigger`

### Task 11: HUD redesign (glassmorphism + new layout)

Identical to v2 plan Task 17. Top floating pill, left task panel, right journal, bottom input bar — all GlassPanel.

**Important:** since we keep the v1 dark scene background (#2a2a2a), GlassPanel default white-ish glass will be readable. If contrast is poor, swap GlassPanel `variant="strong"` for the task panel.

Commit: `feat(lab): HUD redesign with glassmorphism + Apple HIG layout`

### Task 12: IntroScreen cinematic redesign

Identical to v2 plan Task 18. Staged fade-in (title → subtitle → description → CTA).

**Adjustment:** since LabScene background is dark grey not bright Apple Studio, IntroScreen background gradient stays light (`#fafafa → #cdcdd2`) for premium feel. Only IntroScreen looks "Apple"; LabScene itself stays v1 visual.

Commit: `feat(lab): cinematic intro reveal with staged fade-in`

### Task 13: SummaryScreen animated reveal

Identical to v2 plan Task 19. Staggered row reveals + GlassPanel results card. Skip confetti (v2 Task 30) for now — comes back in Task 22 if user wants it.

Commit: `feat(lab): animated summary reveal with staggered rows`

---

## Phase C — Guided Core (Tasks 14-19)

This is the highest educational ROI. Auto-detect each task's micro-steps, show 3D arrows/glows, walk student through every action.

### Task 14: TaskSteps definitions

Identical to v2 plan Task 20. Creates `src/guided/TaskSteps.ts` + tests. Defines 5-7 micro-steps per task across all 9 tasks.

Commit: `feat(guided): TaskSteps definitions for all 9 tasks`

### Task 15: StepEngine with auto-detection

Identical to v2 plan Task 21. `src/guided/StepEngine.ts` Zustand store + `isStepComplete` pure function + tests.

Commit: `feat(guided): StepEngine zustand store + isStepComplete pure function`

### Task 16: Visual primitives (Arrow3D, GlowRing, HighlightOutline, PulseEffect)

Identical to v2 plan Task 22. Lightweight 3D arrows + rings + HTML pulse animations.

**Perf note:** Arrow3D and GlowRing each use `useFrame` for animation but are SINGLE meshes — negligible cost. Only render when guidance is active.

Commit: `feat(guided): visual primitives — Arrow3D, GlowRing, HighlightOutline, PulseEffect`

### Task 17: GuidedOverlay component

Identical to v2 plan Task 23. Reads StepEngine state, renders one primitive per current step.

Commit: `feat(guided): GuidedOverlay with auto-step-detection and 3D hints`

### Task 18: Wire useDrag, snap targets, input focus to StepEngine

Identical to v2 plan Task 24. Adds `bodyId` prop to Draggable, hooks pointer events to `useStepEngine.setDragging`, etc.

Commit: `feat(guided): wire useDrag, snap targets, input focus to StepEngine`

### Task 19: Skip guidance toggle + localStorage

Identical to v2 plan Task 25. Pill-button bottom-left, persists to localStorage, conditionally renders GuidedOverlay.

Commit: `feat(guided): skip guidance toggle with localStorage persistence`

---

## Phase D — Guided Polish (Tasks 20-22)

### Task 20: Adaptive lever balance hint (loop step)

Identical to v2 plan Task 26. `src/guided/hintResolver.ts` with adaptive text for `balance-loop` step ("додай ~80 г", "забагато, прибери малу").

Commit: `feat(guided): adaptive hint resolver for lever balance loop step`

### Task 21: Camera auto-zoom on active instrument + sub-step transitions

Combines v2 plan Tasks 27 + 28. Camera follows current task's instrument via existing CameraRig presets. Sub-step text in HUD slides in via CSS keyframes.

**Skip:** DOF focus changes (v2 Task 27 mentioned this — irrelevant in v2-lite since no PostProcessing).

Commit: `feat(scene): camera auto-zooms to active task; CSS slide-in for HUD step changes`

### Task 22: Final polish + manual QA + deploy

Combines remaining v2 polish + deploy. Steps:
1. Optional confetti on SummaryScreen high score (CSS-only — see v2 plan Task 30)
2. Local manual QA: run through all 9 tasks
3. `npm run build` + `git push` + Cloudflare Pages connect
4. Deployed manual QA on Promethean panel (if accessible)
5. Document findings in `docs/superpowers/qa/`

Commit: `chore: v2-lite final polish (confetti) + deployment ready`

---

## Self-review

**Spec coverage (v2-lite scope):**
- ✅ Canvas-texture factories (Section 5 spec) → Tasks 1-7
- ✅ UI redesign Apple HIG (Section 7 spec) → Tasks 8-13
- ✅ Persistent guided mode (Section 6 spec) → Tasks 14-19
- ✅ Adaptive hints + camera + transitions → Tasks 20-21
- ⏭️ **Skipped:** Section 4 visual style entirely (Apple Studio backdrop, post-processing, HDRI, FOV change)
- ⏭️ **Skipped:** Performance adaptive quality (no heavy effects to gate)

**Placeholder scan:** No "TBD"/"TODO" — every task references actual code in v2 plan or has explicit modifications noted.

**Type consistency:** All v2 plan APIs preserved (StepEngine, TaskSteps, GuidedOverlay) — no signature drift.

**Scope:** 22 tasks, 4 phases, 2-3 weeks. Reasonable for single plan.

**Notes for executor:**
- Read v2 plan Tasks 6-19 + 22-25 for full code (most v2-lite tasks reference them as "identical to")
- v2-lite assumes v1 lighting/table preserved — DO NOT touch `src/scene/Lighting.tsx`, `src/scene/Table.tsx`, or `Canvas` props in `LabScene.tsx`
- If lag returns at any point, revert immediately (`git revert HEAD`) and report which task introduced it
