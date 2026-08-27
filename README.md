# SICKO SOUL

> Not made for comfort. Made for consequence.

A dark, gangster-aesthetic streetwear brand site — built to look and move
like an Awwwards Site-of-the-Day, not a template. Every section has its own
layout logic, every scroll reveal is GSAP-driven, every image is treated.
See [`docs/`](./docs) before touching a single component.

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript** (strict)
- **Tailwind CSS 3** — theme fully replaced, not extended (see
  [`tailwind.config.ts`](./tailwind.config.ts))
- **GSAP** — `ScrollTrigger`, `SplitText`, `ScrambleTextPlugin`, registered
  once in [`src/lib/gsap.ts`](./src/lib/gsap.ts)
- **Lenis** — smooth scroll, synced to the GSAP ticker
- **OGL** — lightweight WebGL for the Lookbook hover-distortion shader
- **Zustand** — preloader / menu / cursor global state

Full rationale in [`docs/TECH_STACK.md`](./docs/TECH_STACK.md).

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |

## Project structure

```
src/
  app/                  Root layout, global styles, route entry (page.tsx is a thin shell)
  components/
    sections/           One folder per landing-page section (index.tsx + *.module.css)
    ui/                 Navbar, CustomCursor, NoiseOverlay
    providers/          SmoothScroll (Lenis) provider
  data/                 Per-section copy/content, typed and brand-voiced
  hooks/                useLenis — Lenis + ScrollTrigger sync
  lib/                  gsap.ts — single place plugins are registered
  store/                useAppStore — Zustand global state
  styles/               theme.ts — non-Tailwind design tokens (GSAP/canvas consumers)
docs/                   Brand bible, design system, typography, animation guide,
                        section breakdown, image sourcing, anti-patterns, tech stack
```

Sections are landed one at a time (see the `NEXT / …` marker in
[`src/app/page.tsx`](./src/app/page.tsx)) — never inlined as one giant page.

## Read before you build

This is a themed brand build, not a generic scaffold. Before adding or
changing anything, read the doc that owns that concern:

| Doc | Owns |
| --- | --- |
| [`docs/BRAND_BIBLE.md`](./docs/BRAND_BIBLE.md) | Voice, tone, who this is for |
| [`docs/DESIGN_SYSTEM.md`](./docs/DESIGN_SYSTEM.md) | Colors, spacing, components |
| [`docs/TYPOGRAPHY.md`](./docs/TYPOGRAPHY.md) | Fonts and how they're used |
| [`docs/ANIMATION_GUIDE.md`](./docs/ANIMATION_GUIDE.md) | Exact GSAP pattern per section |
| [`docs/SECTION_BREAKDOWN.md`](./docs/SECTION_BREAKDOWN.md) | What each section is, layout skeleton |
| [`docs/IMAGE_SOURCING.md`](./docs/IMAGE_SOURCING.md) | Where images come from, mandatory treatment |
| [`docs/ANTI_PATTERNS.md`](./docs/ANTI_PATTERNS.md) | What will get a section rejected |
| [`docs/TECH_STACK.md`](./docs/TECH_STACK.md) | Dependencies and why |

Scoped Copilot rules in [`.github/instructions/`](./.github/instructions/)
enforce the same constraints automatically per file path (animation, copy,
design system, images).

## Non-negotiables (short version)

- Palette: `#0a0a0a` black, `#141414` off-black, `#f2f0eb` bone-white,
  `#8a8a85` concrete-gray, `#8a0303` blood-accent (sparse). No blue, purple,
  or pastel.
- `border-radius` ≤ 2px. No soft box-shadows, glassmorphism, or gradients.
- No Inter / Poppins / system-ui. Display font is self-hosted (Anton or a
  distressed display face) via `public/fonts/`.
- Every scroll reveal uses GSAP + `ScrollTrigger`, wrapped in
  `gsap.context()` with a `ctx.revert()` cleanup — never CSS
  `@keyframes`/`IntersectionObserver`.
- Every image is grayscale + high-contrast + grained. Never dropped in raw.
- No centered, stacked, symmetric hero. No repeating layout pattern between
  sections.

If a section could be mistaken for a generic Framer/Webflow AI template,
it's wrong — redo it.