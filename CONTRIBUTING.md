# Contributing

Thanks for your interest in improving the Lab SDK. This document is intentionally short: the project is small enough that you can read every file in an afternoon.

## Getting set up

```bash
git clone https://github.com/vladdomotsky/lab-sdk.git
cd lab-sdk
npm install
npm run dev          # http://localhost:5173/
```

You'll need **Node 20+**. The project is tested on Windows, macOS and Linux.

## Before you commit

```bash
npm run typecheck    # tsc --noEmit must be clean
npm run test         # 53/53 must pass
npm run build        # must succeed
```

For UI / 3D changes there's no automated test — verify visually in the browser.

## Code conventions

- **Two-layer split is sacred.** Files in `src/sdk/` MUST NOT import from `src/labs/`. The reverse is fine. If you find a circular need, the abstraction probably belongs in the lab folder, not the SDK.
- **Keep files focused.** When a file grows beyond ~250 lines, look for a natural split. The `Rod` helper inside `LeverBalance.tsx` is an example — it could move to `sdk/scene/Rod.tsx` once a second instrument needs it.
- **TDD for pure logic.** Animation math, sound-manager state, step-DSL types, snap progression — these all have unit tests in `tests/`. Add tests when you change them.
- **Manual verification for visuals.** Lighting, materials, post-fx, camera moves — check in the browser, take a screenshot if substantial.
- **Commit messages**: type-scoped, imperative, no period. Examples:
  - `feat(lever): hanging-pan redesign + weight stacking`
  - `fix(scale): place body using registered halfHeight`
  - `refactor(structure): split sdk/ from labs/`

## Adding a new lab

1. Create `src/labs/<id>/` mirroring `mass-measurement/`'s shape.
2. Reuse `Draggable`, `registerSnap`, `bodyRegistry`, `useReadings`, `<CinematicLighting/>`, `<CameraRig/>`, `<PostFX/>`, `<Table/>`.
3. Define your tasks and steps in `content/tasks.ts` and `content/steps.ts`.
4. Export `<YourLab/>` and a `LabDefinition` from `index.tsx`.
5. Mount it from `src/app/App.tsx` (routing TBD as more labs are added).

If you find yourself copy-pasting code from `mass-measurement/` into your new lab, that's a signal to graduate it into `sdk/`.

## Filing issues

When reporting a bug, include:
- What you tried (clicks, drags, key presses)
- What you expected vs what happened
- A screenshot or short screen recording if it's a visual issue
- Browser + OS version

For feature requests, please describe the user need first; the implementation second.
