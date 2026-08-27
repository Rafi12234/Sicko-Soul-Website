# SICKO SOUL — Typography

## Font Roles
1. **Display / Headline font** — aggressive, condensed, distressed, bold.
   Use one of (self-host the `.woff2` in `public/fonts/`, do NOT rely on
   Google Fonts CDN defaults):
   - "Anton" (paired with letter-spacing + distress texture overlay via CSS
     `mix-blend-mode` for grit)
   - Or a true distressed/graffiti display face sourced from a free foundry
     (e.g., "Bunker", "Rust", "Knife Fight", "Rockstar" style fonts from
     DaFont/Fontspring free section) — MUST be self-hosted, not a live CDN.
   - Fallback stack: `"Anton", "Arial Narrow Bold", sans-serif`

2. **Body / UI font** — clean but hard-edged grotesk, NOT Inter/Poppins:
   - "Neue Machina", "Archivo Narrow", or "Helvetica Neue Condensed"

3. **Accent / Stencil font** (used sparingly for tags like "DROP 001",
   "LIMITED", stamps) — a stencil/typewriter font like "Special Elite" or
   a custom stencil face, to look like spray-painted stencil tags.

## Rules
- Headlines: ALWAYS uppercase, tight letter-spacing on large sizes,
  wide letter-spacing on small labels/eyebrows.
- Font sizes are extreme — hero headline should be `clamp(4rem, 15vw, 14rem)`.
  Subtlety is not the goal here; dominance is.
- Use GSAP SplitText to animate headline reveals character-by-character or
  line-by-line — never just fade in the whole block at once.