# SICKO SOUL — Tech Stack

- Next.js 14+ (App Router), TypeScript strict mode
- Tailwind CSS — fully custom `tailwind.config.ts` theme (colors, fonts,
  spacing from DESIGN_SYSTEM.md). Disable default border-radius scale
  beyond 2px.
- GSAP (core, free as of the Webflow acquisition — includes ScrollTrigger,
  SplitText, ScrambleTextPlugin, all previously "Club GreenSock" plugins)
- Lenis — smooth scroll, synced to GSAP ticker
- OGL or Three.js — only for the Lookbook hover-distortion shader (keep
  minimal/lightweight, not a full 3D scene)
- Zustand — preloader/menu/cursor global state
- next/image with remote patterns for Unsplash/Pexels domains

## package.json core deps
```json
{
  "dependencies": {
    "next": "^14.x",
    "react": "^18.x",
    "gsap": "^3.13.x",
    "@studio-freight/lenis": "^1.x",
    "zustand": "^4.x",
    "ogl": "^1.x"
  }
}
text


---

## 12. Path-specific Copilot instruction files (`.github/instructions/`)

These use the newer Copilot **scoped instructions** feature (`applyTo` frontmatter) so Copilot applies different rules depending on which file it's editing.

### `animation.instructions.md`
```markdown
---
applyTo: "src/components/sections/**/*.tsx"
---
Always import GSAP setup from `src/lib/gsap.ts`. Wrap all animation logic in
`gsap.context()` inside `useEffect`, scoped to a `ref`, and return
`ctx.revert()` in cleanup. Reference `docs/ANIMATION_GUIDE.md` for the exact
effect required for this specific section (matched by folder name). Never
use plain CSS transitions for scroll-triggered reveals — use ScrollTrigger.