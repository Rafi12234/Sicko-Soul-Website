# SICKO SOUL — Animation Guide (GSAP)

## Global Setup
- Register `ScrollTrigger`, `SplitText`, `ScrambleTextPlugin` in `lib/gsap.ts`.
- Initialize Lenis in `hooks/useLenis.ts`, sync with ScrollTrigger:
  `lenis.on('scroll', ScrollTrigger.update)` + drive via `gsap.ticker`.
- Every section animation must be wrapped in `gsap.context()` scoped to the
  component and reverted on unmount (React cleanup).

## Preloader
- Black screen, percentage counter (0→100) animated with GSAP, ties to
  logo text using ScrambleTextPlugin (looks like decrypting/hacking).
- On complete: two black panels slide apart (clip-path or transform) to
  reveal the Hero underneath. Never a simple fade-out spinner.

## Hero
- Background: full-bleed video or B&W image with slow Ken Burns zoom
  (`gsap.to(img, {scale: 1.15, scrollTrigger: {scrub: true}})`).
- Headline: SplitText by chars, animate `yPercent: 100 -> 0` + slight
  rotation, staggered, with a slight scramble-text pass on the tagline.
- A vertical "SCROLL" indicator with an infinitely looping GSAP timeline.

## Manifesto Section
- Large body text pinned via `ScrollTrigger.pin`, words/lines fade from
  30% opacity to 100% opacity as they cross a scroll threshold (scrubbed),
  simulating a "reading spotlight" effect.

## Lookbook / Collection
- Horizontal scroll section: pin the section, translate a flex row of
  product cards on the X axis tied to vertical scroll progress.
- Each image has a WebGL/CSS distortion-on-hover effect (RGB split or
  ripple) — use `DistortionImage.tsx` (OGL/Three shader or CSS filter
  fallback).
- Product name/price reveals via clip-path wipe on hover.

## The Streets (Story)
- Parallax layered images (background moves slower than foreground) using
  ScrollTrigger scrub.
- Big pull-quote text scrambles into place using ScrambleTextPlugin as it
  enters viewport.

## Street Cred (Testimonials)
- Infinite GSAP-driven marquee (not CSS animation) so speed can be
  scroll-velocity-reactive (faster marquee when user scrolls fast).

## Drop Counter
- Countdown numbers use a slot-machine digit-roll animation (GSAP + modular
  divs), not a plain text update.

## Join The Crew (Newsletter)
- Input focus triggers a full-bleed background color/texture shift
  (black -> deep red vignette) — feels like "you're being watched."
- Submit button has a magnetic hover pull effect (GSAP quickTo tracking
  mouse position within button bounds).

## Footer
- Giant outro wordmark animates in on pin/scrub, letters slightly
  glitch/jitter using a repeating scramble on scroll-triggered intervals.

## General Rules
- EVERY scroll animation uses ScrollTrigger `scrub` or `toggleActions`,
  never `IntersectionObserver` + CSS class toggle.
- Stagger values should feel deliberate (0.05–0.12s), not the GSAP default.
- Easing: prefer `power4.out`, `expo.out`, `back.out(1.4)` — never plain
  `ease: "linear"` or default `power1`.