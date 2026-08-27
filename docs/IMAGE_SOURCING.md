# SICKO SOUL — Image Sourcing & Treatment

## Where to pull from
Unsplash / Pexels / Pixabay (free-use). Use `next/image` with remote
patterns configured for these domains.

## Search Keywords to use (mood-matched)
"black and white urban street night", "smoke portrait dark", "leather
jacket monochrome", "muscle car night rain", "graffiti wall texture",
"chain link fence silhouette", "cigarette smoke close up", "doberman dog
black and white", "tattooed hands", "brass knuckles dark", "money stack
monochrome", "abandoned warehouse moody", "streetwear model shadow",
"low rider night lights", "prison mugshot style portrait".

## What NOT to use
- Bright, colorful, cheerful stock photography
- Smiling corporate/office models
- Generic e-commerce flat-lay product shots on white background
- Anything that looks like a Canva template stock photo

## Mandatory Image Treatment (apply via CSS filter or pre-processing)
Every image on the site gets:
```css
filter: grayscale(100%) contrast(1.2) brightness(0.9);
Plus the global grain overlay component layered on top (NoiseOverlay.tsx).
Optional duotone (black + blood-red) for hero-level hero images only.

Placeholder rule
If a perfect image can't be found, use a solid black/off-black block with
grain texture rather than an unrelated bright stock photo. Consistency of
mood > filling every slot with an image.

text


---

## 10. `docs/ANTI_PATTERNS.md` (arguably the most important file)

```markdown
# SICKO SOUL — Forbidden Patterns ("Vibe-Coded" Tells)

If you generate any of the following, you have failed the brief. Delete and
redo.

1. ❌ Centered hero: logo → headline → subtext → button, all centered,
   stacked vertically. (This is the #1 tell of an AI-generated template.)
2. ❌ Font stack defaulting to Inter, Poppins, Roboto, or system-ui for
   headlines.
3. ❌ Rounded corners (`border-radius > 2px`) on buttons/cards.
4. ❌ Soft drop-shadows / glassmorphism / gradient blur cards.
5. ❌ Purple-to-blue or pastel gradients anywhere.
6. ❌ Plain `opacity: 0 -> 1` fade-in-on-scroll via CSS/IntersectionObserver
   with no movement, split-text, or scrub-based timing.
7. ❌ Generic 3-column "feature grid" with icon + heading + paragraph,
   identical card styling repeated.
8. ❌ Navbar: logo left, links right, all in one flat horizontal bar with
   no personality (acceptable ONLY if paired with something unexpected
   like a scroll-triggered background invert or hidden/reveal on scroll).
9. ❌ Stock "Shop Now" button styling — pill-shaped, colorful, shadowed.
10. ❌ Identical section padding/rhythm throughout (top-40 bottom-40 for
    every section) — vary section heights and breathing room intentionally.
11. ❌ Copy that sounds like a SaaS product ("Empowering your style
    journey," "Join thousands of happy customers").
12. ❌ Testimonials as generic 3-card grid with avatar + 5-star rating.
    Use the marquee/ticker pattern instead.
13. ❌ Symmetric, perfectly balanced compositions. This brand lives in
    tension and asymmetry.
