# NOVA EVRIKA — Landing Page + Subject Routing Design

**Date:** 2026-05-10
**Status:** Approved (visual confirmed via brainstorm visual companion)
**Scope:** New top-level landing page + subject pages + routing wrapper around the existing `mass-measurement` lab. The existing lab itself is **not touched** — only its mounting path moves from "/" to "/physics/mass-measurement".

---

## Goal

Build the brand entry point for the educational platform **NOVA EVRIKA** so that:

1. Users arrive at `/` and see a polished landing with the NOVA EVRIKA brand mark, three subject pills (Mathematics, History, Physics), and a clear path into content.
2. Each subject has its own page that lists the available labs for that subject — leaves room for future growth (the user has explicitly confirmed plans for more labs).
3. The existing `mass-measurement` lab continues to work, just at a deeper URL.
4. Math and History have no labs yet — they're presented as "Coming Soon" so the platform shape is visible from day one but doesn't promise vapourware.

The visual language extends — and explicitly inherits from — the lab's existing dark-studio aesthetic: dark gradient background with coloured blur glows, glass-pill buttons, geometric tech typography for the brand mark.

## Non-goals

- No content for Math or History labs — those subject pages just show a "Coming soon" placeholder.
- No user accounts, no progress tracking across visits, no server backend. Pure static SPA.
- No internationalisation system — the entire site stays in Ukrainian (consistent with the existing lab).
- No SEO meta tags or social-share images yet (can add later — not in scope of this revision).
- No changes to the lab's internal step engine, physics, content, or 3D scene.

---

## Reference

User-provided references confirm:

- **Brand mark:** NOVA EVRIKA logo (hexagon with "E" + DNA double-helix, supplied as `public/nova-evrika-logo.png`). Uses the brand-specific geometric tech font (Orbitron-family) only inside the brand mark; nothing else on the site uses Orbitron.
- **Visual style:** dark background (`#08080a`) with multi-coloured radial-gradient blur glows (Apple-blue `rgba(10,132,255,...)`, soft green `rgba(80,220,130,...)`, warm yellow `rgba(255,220,80,...)`, deep blue `rgba(50,80,160,...)`), glass-pill buttons, subtle frosted typography.
- **Display typography:** for non-brand large titles (lab names, hero moments), the heavy display font from the user's first reference ("ВІРТУАЛЬНА ЛАБОРАТОРІЯ") — Saira 800/900 used as the closest free Google Font match.
- **Body typography:** Inter / SF Pro Display, already used by the existing lab.

---

## Architecture

### Routing

Add `react-router-dom@7` (peer of React 19). Routes:

| Path | Page | Status |
|---|---|---|
| `/` | `<LandingPage />` | new |
| `/physics` | `<PhysicsPage />` (list of physics labs) | new |
| `/physics/mass-measurement` | `<MassMeasurementLab />` (existing) | moved from `/` |
| `/math` | `<ComingSoonPage subject="math" />` | new placeholder |
| `/history` | `<ComingSoonPage subject="history" />` | new placeholder |
| `*` | redirect to `/` | new fallback |

`react-router-dom@7` is the only new dependency. ~9 KB gzipped, mature, standard.

### File layout (NEW)

All new files live under `src/site/`. The existing `src/sdk/` and `src/labs/mass-measurement/` are untouched.

```
src/
├── sdk/                          (unchanged)
├── labs/
│   └── mass-measurement/         (unchanged)
├── site/                         ← NEW
│   ├── pages/
│   │   ├── LandingPage.tsx       # /
│   │   ├── PhysicsPage.tsx       # /physics
│   │   └── ComingSoonPage.tsx    # /math, /history (parametrised by subject)
│   ├── components/
│   │   ├── BrandHero.tsx         # kicker + logo + wordmark + tagline (re-used on Landing + ComingSoon)
│   │   ├── SubjectPill.tsx       # one navigation pill (active or locked)
│   │   ├── LabCard.tsx           # used on PhysicsPage to list labs
│   │   └── GlowBackground.tsx    # the blur-glow background layer
│   ├── content/
│   │   └── subjects.ts           # subject + lab registry (single source of truth for nav)
│   └── styles/
│       └── fonts.css             # @import Google Fonts (Inter + Saira; Orbitron is logo-only)
└── app/
    └── App.tsx                   # ← becomes the router shell; mounts pages
```

### Subject + lab registry

`src/site/content/subjects.ts` is the single source of truth for what shows in the nav pills and on each subject page. Adding a new lab in the future is a one-line entry here — no code changes elsewhere.

```ts
export type LabEntry = {
  id: string                  // 'mass-measurement'
  title: string               // 'Вимірювання маси тіл'
  subtitle?: string           // 'Класи 6–7 · Механіка'
  path: string                // '/physics/mass-measurement'
  status: 'available' | 'soon'
}

export type SubjectEntry = {
  id: 'math' | 'history' | 'physics'
  title: string               // 'Фізика'
  path: string                // '/physics' (or '/math', '/history')
  status: 'available' | 'soon'
  labs: LabEntry[]
}

export const SUBJECTS: SubjectEntry[] = [
  { id: 'math',    title: 'Математика', path: '/math',    status: 'soon',      labs: [] },
  { id: 'history', title: 'Історія',    path: '/history', status: 'soon',      labs: [] },
  {
    id: 'physics',
    title: 'Фізика',
    path: '/physics',
    status: 'available',
    labs: [
      {
        id: 'mass-measurement',
        title: 'Вимірювання маси тіл',
        subtitle: 'Електронні ваги · Важільні · Динамометр',
        path: '/physics/mass-measurement',
        status: 'available',
      },
    ],
  },
]
```

### Page descriptions

#### `LandingPage` (`/`)

Centered hero:

```
       ОСВІТНЯ ПЛАТФОРМА  •  6–7 КЛАС  •  BETA
                  [logo image] NOVA EVRIKA
              Інтерактивні предмети для шкільної програми

       [МАТЕМАТИКА скоро]  [ІСТОРІЯ скоро]  [ФІЗИКА 1 лаба]
```

- Full-screen dark background with the four-glow radial overlay.
- `<BrandHero />` renders kicker text, the logo image (via `<img src="/nova-evrika-logo.png" />`), and the tagline.
- Below: a row of three `<SubjectPill />` components — each reads from `SUBJECTS`, renders its title and an end-badge (`СКОРО` or "N лаба(и)"), and behaves as a `<Link>` to the subject's path. Locked subjects render with reduced opacity glass styling and still navigate to their `/math` or `/history` route, where the user sees the "Coming soon" page.

#### `PhysicsPage` (`/physics`)

Header reuses `<BrandHero />` (smaller version — logo top-left, no tagline) for brand continuity, then a list of `<LabCard />` items showing the labs for this subject. Currently one card ("Вимірювання маси тіл"), with room for more rows as labs ship.

The lab card displays the lab title (in Saira 800 — display font), a one-line subtitle, and a pill button "Почати лабораторну". Click navigates to `/physics/mass-measurement`.

There's also a back link or breadcrumb at top that returns to `/`.

#### `ComingSoonPage` (`/math`, `/history`)

Reuses `<BrandHero />` plus a centred message: "Цей предмет з'явиться найближчим часом" with a link back to `/`. Same dark+glow background. Parametrised by subject id so we don't repeat the page twice.

### Visual tokens (NEW, used across site)

These live as CSS-in-JS objects in component files (matches the existing lab's pattern of inline styles). They're not extracted to a global theme module yet — that becomes worthwhile only when there are 3+ consumers and a need to override per-page.

```ts
// Background
const SITE_BG = '#08080a'

// Four-glow overlay (used by GlowBackground component)
const GLOW_BG = `
  radial-gradient(circle at 12% 88%, rgba(10, 132, 255, 0.55) 0%, transparent 35%),
  radial-gradient(circle at 88% 18%, rgba(255, 220, 80, 0.30) 0%, transparent 30%),
  radial-gradient(circle at 75% 75%, rgba(80, 220, 130, 0.40) 0%, transparent 35%),
  radial-gradient(circle at 5% 30%, rgba(50, 80, 160, 0.30) 0%, transparent 30%)
`

// Type scale
//   Display (lab names, hero moments) — Saira, weight 800-900
//   Body (everything else) — Inter, weight 400-600
//   Brand mark — image only, no font needed (the .png is the wordmark)

// Apple-blue accents — already used by existing lab, reused here
const ACCENT_BLUE_LIGHT = '#0a84ff'
const ACCENT_BLUE_DARK  = '#0071e3'
```

### Existing lab integration

`src/labs/mass-measurement/index.tsx` currently exports `<MassMeasurementLab />`. The router mounts it at `/physics/mass-measurement`:

```tsx
<Route path="/physics/mass-measurement" element={<MassMeasurementLab />} />
```

No change to the lab's internals. The lab's HUD / canvas / state all continue to fill the viewport when mounted — the router gates them, that's the whole change for the lab.

The lab's internal "intro screen" (the existing `IntroScreen.tsx` with light background) stays as-is for now. Future revision could harmonise its style with the new dark + glow language, but that's out of scope for this spec.

---

## File touch-list

| File | Change |
|---|---|
| `package.json` | add `react-router-dom@^7` |
| `src/app/App.tsx` | becomes the router shell; replaces direct `<MassMeasurementLab/>` mount |
| `src/site/pages/LandingPage.tsx` | new |
| `src/site/pages/PhysicsPage.tsx` | new |
| `src/site/pages/ComingSoonPage.tsx` | new |
| `src/site/components/BrandHero.tsx` | new |
| `src/site/components/SubjectPill.tsx` | new |
| `src/site/components/LabCard.tsx` | new |
| `src/site/components/GlowBackground.tsx` | new |
| `src/site/content/subjects.ts` | new |
| `src/site/styles/fonts.css` | new — `@import url(.../Inter+Saira)` |
| `src/main.tsx` | import `fonts.css` |
| `index.html` | (optional) `<link rel="preconnect"/>` for Google Fonts |
| `public/nova-evrika-logo.png` | already in place |
| `vercel.json` | (NEW) SPA rewrite rule so deep links don't 404 |

The existing lab files are NOT touched.

### Vercel SPA rewrite

`react-router` uses BrowserRouter with HTML5 history. Without a rewrite, `/physics/mass-measurement` returns 404 from Vercel because there's no `physics/mass-measurement.html`. Add `vercel.json`:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
```

This is the standard SPA pattern.

---

## Acceptance criteria

1. `/` shows the NOVA EVRIKA hero with: kicker, logo image (real file from `public/`), three subject pills, tagline.
2. Clicking "Фізика" navigates to `/physics` — a list page showing the existing mass-measurement lab as a card.
3. Clicking the "Почати лабораторну" button on the physics lab card opens the existing experiment at `/physics/mass-measurement` — the lab works exactly as it does today.
4. Clicking "Математика" or "Історія" navigates to `/math` or `/history` — a polished "Coming soon" page (not a 404) using the same hero treatment.
5. Hard-refreshing any deep URL (e.g. `/physics/mass-measurement`) loads correctly (tested via Vercel rewrite).
6. The site is responsive: phone breakpoint (< 600 px width) shows the hero stacked vertically with smaller pills; desktop shows them in a horizontal row.
7. Existing 183 vitest tests still pass — no test changes required.
8. `npx tsc --noEmit` clean, `npm run build` clean.
9. Bundle size grows by less than 50 KB gzipped (router + fonts).

---

## Risks

- **Bundle size from fonts:** Inter + Saira via Google Fonts CDN ≈ 100 KB raw / 30 KB gzipped, acceptable. Self-hosting is a future optimization, not required now.
- **react-router-dom upgrade:** v7 is the current major. If a peer-dep conflict shows up against React 19 / Vite 8, fall back to v6 (functionally equivalent for our usage). Acceptance criterion 8 catches this.
- **Vercel rewrite breaking source maps or `/audio/`:** The wildcard `/(.*)` rewrite could intercept legitimate static assets. Verify by hard-refreshing `/audio/<file>` after deploy. If it breaks, restrict the rewrite to non-asset paths via a `has` clause.

## Out of scope

- Logo-as-SVG (user explicitly wants the PNG file used as-is — no recreation).
- Dark / light theme toggle (everything is dark, that's the brand).
- Animation polish (subject-pill hover effects beyond standard CSS — sure, fine if cheap; deeper motion design is for v0.2).
- Search across labs, lab-completion tracking, teacher dashboard, classroom mode (future / out of scope).
- Internationalisation framework (everything stays Ukrainian).

---

## Self-review checklist

- [x] Every spec section has corresponding acceptance criteria
- [x] No "TBD" / "TODO" / placeholder text
- [x] No internal contradictions — file map matches descriptions, routes match paths
- [x] Single-spec scope — fits one implementation plan, no decomposition needed
- [x] No ambiguous requirements — every component has a one-line role; every constant has a value
