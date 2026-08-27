# SICKO SOUL — Forbidden Patterns ("Vibe-Coded" Tells)

Purpose of this file: every AI code assistant defaults to the same 20–30
patterns when generating a landing page. This document lists ALL of them
explicitly, with the WRONG example and the REQUIRED alternative, so there is
zero ambiguity. Before marking any section "done," re-read this file and
check every item against your generated code.

If you generate any of the following, you have failed the brief. Stop,
delete, and redo the section — do not "patch" it.

---

## 1. LAYOUT ANTI-PATTERNS

### 1.1 The Centered Hero
❌ WRONG:
```html
<section class="flex flex-col items-center justify-center text-center h-screen">
  <img src="logo.svg" />
  <h1>Headline</h1>
  <p>Subtext</p>
  <button>Shop Now</button>
</section>
This exact structure (logo → h1 → p → button, all centered, all stacked) is
the single most obvious "AI-generated landing page" signature in existence.

✅ REQUIRED: Asymmetric composition. Headline pinned to one edge bleeding off
screen, image/video occupying the opposing diagonal, tagline marquee running
along the bottom edge independently. Nothing should be centered on both axes
simultaneously.

1.2 Repeating Section Rhythm
❌ WRONG: Every section is py-24 (or py-20/py-32), full-width container,
same max-width, same internal padding — creating a metronomic, predictable
scroll rhythm.

✅ REQUIRED: Vary section heights deliberately. Manifesto section might be
min-h-[150vh] (pinned). Lookbook might be min-h-[300vh] for horizontal
scroll. Hero is h-screen. Footer might be h-[60vh]. No two consecutive
sections should share the same vertical rhythm.

1.3 The 3-Column Feature Grid
❌ WRONG:

HTML

<div class="grid grid-cols-3 gap-8">
  <div class="p-6 rounded-lg shadow"><Icon/><h3>Title</h3><p>Desc</p></div>
  <!-- x3, identical structure -->
</div>
✅ REQUIRED: If presenting 3 brand pillars/values, use unequal column widths
(e.g., 5/3/4 grid split), stagger vertical position of each block, or
present them as a horizontal-scroll strip instead of a static grid.

1.4 Symmetric Navbar
❌ WRONG: [Logo] ... [Link Link Link] ... [Button] in a single flat bar,
always visible, no state change.

✅ REQUIRED: Navbar must have a behavioral twist — background inverts from
transparent to solid black on scroll, OR logo scrambles/glitches on hover,
OR nav links only appear after scrolling past hero (hidden-until-earned,
matching brand tone: "you don't get the menu until you've proven yourself").

1.5 Generic Testimonial Cards
❌ WRONG:

HTML

<div class="grid grid-cols-3 gap-6">
  <div class="rounded-xl shadow p-6">
    <img class="rounded-full w-12 h-12" />
    <p>"Great product!"</p>
    <div>★★★★★</div>
  </div>
</div>
✅ REQUIRED: Velocity-reactive horizontal marquee ticker (see Street Cred
section), no avatars-in-circles, no star ratings (doesn't match brand — this
brand doesn't ask for a 5-star review, it doesn't care what you think).

2. VISUAL/STYLING ANTI-PATTERNS
2.1 Rounded Everything
❌ WRONG: rounded-lg, rounded-xl, rounded-full on buttons, cards,
images, inputs.

✅ REQUIRED: border-radius: 0 or max 2px. Buttons use clip-path for a
"cut corner" instead of rounded corners:

CSS

clip-path: polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px);
2.2 Glassmorphism / Soft Shadows
❌ WRONG: backdrop-blur-md bg-white/10 shadow-2xl shadow-black/20

✅ REQUIRED: Hard 1px hairline borders (border border-white/20), no blur,
no soft ambient shadow. If depth is needed, use a hard-edged offset duplicate
layer (like a screen-print misregistration effect) instead of a blur shadow.

2.3 Gradient Backgrounds
❌ WRONG: bg-gradient-to-br from-purple-600 to-blue-500, or any
pastel/rainbow gradient overlay on hero sections — the universal "AI SaaS
startup" signature.

✅ REQUIRED: Flat black or off-black backgrounds with grain/noise texture
overlay. If a gradient is used at all, it's a black → transparent vignette
for depth, or black → blood-red (#8a0303) radial burst behind a CTA, never
a bright multi-hue gradient.

2.4 Default Font Stack
❌ WRONG: font-sans resolving to Inter/system-ui, or headline styled the
same weight/size relationship as body text (just bigger).

✅ REQUIRED: Self-hosted distressed display font per TYPOGRAPHY.md for all
headlines, loaded via @font-face in globals.css — never a Google Fonts
<link> tag with a generic humanist sans.

2.5 Pill-Shaped Colorful CTAs
❌ WRONG: bg-indigo-600 hover:bg-indigo-700 rounded-full px-8 py-3 text-white shadow-lg

✅ REQUIRED: Rectangular (or cut-corner) button, transparent with hairline
border by default, fills solid bone-white with black text on hover, or
inverts — animated via GSAP not just a CSS :hover transition.

2.6 Colorful Icon Sets
❌ WRONG: Lucide/Heroicons in default colored circles used decoratively
throughout ("feature icons").

✅ REQUIRED: If icons are needed at all, they're monochrome line icons in
bone-white/concrete-gray only, used sparingly — this brand relies on
typography and photography, not iconography, to communicate.

3. ANIMATION ANTI-PATTERNS
3.1 Plain Fade-In-On-Scroll
❌ WRONG:

JavaScript

// IntersectionObserver + CSS class toggle
observer.observe(el);
el.classList.add('opacity-100'); // from opacity-0
This is THE most common AI-generated "scroll animation" and it is banned
outright in this project.

✅ REQUIRED: Every scroll reveal goes through GSAP ScrollTrigger with
scrub or timed toggleActions, includes a transform component (not
opacity alone) — e.g., yPercent, clipPath, skewY, or SplitText
character stagger. Minimum requirement: opacity + at least one transform
property + custom ease (never default linear).

3.2 Default Easing
❌ WRONG: No ease specified (defaults to power1.out), or ease: "linear"
used for anything except infinite marquees.

✅ REQUIRED: Deliberate easing choices — power4.out, expo.out,
back.out(1.4), or custom bezier curves matching the aggressive brand tone.

3.3 Uniform Stagger
❌ WRONG: gsap.from(".item", { opacity: 0, stagger: 0.2 }) applied
identically everywhere regardless of content type.

✅ REQUIRED: Stagger timing tuned per section — text character reveals use
0.02–0.05s stagger, image grid reveals use 0.08–0.15s, and direction of
stagger (from: "start", "center", "random") chosen intentionally per
section mood.

3.4 Hover = Just a CSS Transition
❌ WRONG: transition-all duration-300 hover:scale-105

✅ REQUIRED: Interactive hover states driven by GSAP quickTo() for
magnetic buttons, or shader-based distortion for images (see Lookbook
section) — CSS transitions are acceptable ONLY for the simplest color/border
state changes, never for anything meant to feel "premium."

3.5 Spinner/Progress-Bar Preloader
❌ WRONG: A centered circular spinner or generic progress bar with a
percentage number in default font.

✅ REQUIRED: Percentage counter using the display font at large scale,
scramble-text effect on brand name, ending in a hard-edged panel-wipe
transition (not a fade) into the Hero.

3.6 CSS-Only Infinite Marquee
❌ WRONG: @keyframes marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } } with fixed animation-duration.

✅ REQUIRED: GSAP-driven marquee where speed is modulated by scroll velocity
(faster scroll = faster marquee, using ScrollTrigger's velocity or a
custom scroll-speed tracker) — reference ANIMATION_GUIDE.md Street Cred
section.

4. COPYWRITING ANTI-PATTERNS
4.1 Generic SaaS/E-commerce Phrasing
❌ WRONG: "Shop our latest collection!", "New Arrivals", "Join thousands of
happy customers", "Empowering your unique style journey", "Discover more"

✅ REQUIRED (see BRAND_BIBLE.md for full voice guide): Blunt, cold,
exclusive phrasing. "Take What's Yours." "Not For Everyone." "Earned, Not
Given." "Most People Don't Deserve This Anyway."

4.2 Exclamation Points & Emojis
❌ WRONG: "Get 20% off today! 🔥🛍️"

✅ REQUIRED: Zero emojis anywhere on the site. Zero exclamation points in
brand copy (a threat doesn't need an exclamation point — it's more
intimidating stated flatly).

4.3 Friendly/Apologetic CTAs
❌ WRONG: "Sign up for our newsletter and stay in the loop!", "Oops,
something went wrong, please try again :)"

✅ REQUIRED: "Join The Crew." for signup, and even error states stay in
brand voice: "Try again. We don't repeat ourselves twice."

