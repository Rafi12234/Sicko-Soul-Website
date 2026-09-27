# SICKO SOUL — Design System

## Color Palette
- `--black`: #0a0a0a (base background)
- `--off-black`: #141414 (card/section backgrounds)
- `--bone-white`: #f2f0eb (primary text/foreground)
- `--concrete-gray`: #8a8a85 (secondary text)
- `--blood-accent`: #8a0303 (sparse accent — CTA hover, underline, small tags)
- No blues, no purples, no pastel tones, no default Tailwind gray scale.

## Grain & Texture
Every section has a subtle animated film-grain overlay (`NoiseOverlay.tsx`,
SVG turbulence or looping PNG, opacity 4–8%, mix-blend-mode: overlay).
This is what separates this from a "flat vibe-coded" site — nothing should
look digitally clean. It should feel like a photograph, not a Figma file.

## Layout Principles
- Asymmetric grids. No perfectly centered hero content.
- Oversized typography that bleeds off the viewport edge.
- Overlapping elements (image behind text, text behind image) using negative
  margins / absolute positioning.
- Generous use of full-bleed black space — silence is intimidating.
- Thin 1px hairline borders/dividers in bone-white at low opacity, never
  rounded cards with drop-shadows (that's SaaS language, forbidden here).

## Components
- Buttons: rectangular, no border-radius, hairline border, text uppercase +
  letter-spaced, fills solid on hover with a "cut corner" clip-path.
- Cursor: custom — a small crosshair/dot that scales into a filled circle on
  hoverable elements, with a lagging trail (GSAP quickTo).
- Dividers: horizontal scan-line/glitch bar instead of plain `<hr>`.

## Never Use
- border-radius > 2px
- box-shadow soft blur (that "SaaS card" look)
- Emoji, rounded pill badges, gradient buttons
- Centered symmetric hero (logo, headline, subtext, button, stacked & centered)