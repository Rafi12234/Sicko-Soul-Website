5. IMAGE ANTI-PATTERNS
5.1 Bright Corporate Stock Photography
❌ WRONG: Smiling models on white background, generic "diverse team in
office" photos, colorful flat-lay product shots.

✅ REQUIRED: Grayscale, high-contrast, moody urban/night photography per
IMAGE_SOURCING.md keyword list. Every image passes through the mandatory
grain + contrast treatment before being used.

5.2 Untreated Raw Images
❌ WRONG: Dropping a raw Unsplash photo directly into an <Image> component
with no filter/treatment applied.

✅ REQUIRED: filter: grayscale(1) contrast(1.2) brightness(0.9) minimum,
plus the NoiseOverlay component layered on top with mix-blend-mode: overlay.

6. STRUCTURAL/CODE ANTI-PATTERNS
6.1 Single Giant page.tsx
❌ WRONG: All sections written inline in app/page.tsx as one 2000-line
file.

✅ REQUIRED: Each section is its own component folder under
src/components/sections/[SectionName]/ with its own index.tsx and, if
needed, a co-located .module.css for one-off effects Tailwind can't
express cleanly (clip-path keyframes, shader canvas mounting, etc).

6.2 Inline Magic Numbers Everywhere
❌ WRONG: Hardcoded hex colors, arbitrary pixel values scattered through
every component (text-[#8a0303] repeated 15 times).

✅ REQUIRED: All brand colors/fonts referenced through tailwind.config.ts
theme tokens (text-blood-accent) or src/styles/theme.ts constants for
non-Tailwind (GSAP/JS) usage.

Final Check Before Marking a Section Complete
Ask yourself: "If I removed all the copy and just looked at the layout,
motion, and color — could this be mistaken for a generic Framer/Webflow
AI-generated template?" If the answer is anything but a hard no, it fails.

text


---

## `.github/instructions/animation.instructions.md` (Full Expanded Version)

```markdown
---
applyTo: "src/components/sections/**/*.tsx,src/components/ui/**/*.tsx,src/components/canvas/**/*.tsx"
---

# GSAP Animation Rules for SICKO SOUL

You are writing animation code for a dark gangster-aesthetic streetwear
brand landing page. Every animation must feel deliberate, aggressive, and
premium — never default GSAP tutorial-level implementation. Read
`docs/ANIMATION_GUIDE.md` for the specific effect assigned to whichever
section you're currently editing before writing any code.

## 1. Setup — always import from the shared instance
Never call `gsap.registerPlugin()` inside a component. Plugins are
registered ONCE in `src/lib/gsap.ts`:

```ts
// src/lib/gsap.ts
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, SplitText, ScrambleTextPlugin);
}

export { gsap, ScrollTrigger, SplitText, ScrambleTextPlugin };
Every section component imports from this file:

TypeScript

import { gsap, ScrollTrigger, SplitText } from "@/lib/gsap";
2. Every animation MUST live inside a gsap.context()
This is mandatory for React + GSAP correctness (cleanup on unmount/route
change) and is non-negotiable:

React

"use client";
import { useRef, useLayoutEffect } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";

export default function Manifesto() {
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      // ALL gsap/ScrollTrigger calls go here, scoped to containerRef
      const split = new SplitText(".manifesto-text", { type: "lines,words" });

      gsap.from(split.words, {
        opacity: 0.15,
        stagger: 0.02,
        ease: "power2.out",
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 70%",
          end: "bottom 30%",
          scrub: 1,
        },
      });
    }, containerRef); // <-- scope

    return () => ctx.revert(); // <-- mandatory cleanup
  }, []);

  return <div ref={containerRef}>...</div>;
}
Never write GSAP calls in useEffect without gsap.context() scoping.
Never forget the return () => ctx.revert() cleanup line.

3. Lenis + ScrollTrigger sync (do this once, globally)
TypeScript

// src/hooks/useLenis.ts
"use client";
import { useLayoutEffect } from "react";
import Lenis from "@studio-freight/lenis";
import { gsap, ScrollTrigger } from "@/lib/gsap";

export function useLenis() {
  useLayoutEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    lenis.on("scroll", ScrollTrigger.update);

    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);

    return () => lenis.destroy();
  }, []);
}
Call useLenis() once at the root layout level only.

4. Banned animation patterns (cross-reference ANTI_PATTERNS.md §3)
❌ IntersectionObserver + CSS class toggle for reveals
❌ Plain opacity-only fades with no transform component
❌ ease: "linear" for anything except infinite marquee/loop animations
❌ Default/unspecified stagger values — always choose intentionally
❌ CSS @keyframes for scroll-tied animation (must be scrub-based GSAP)
❌ transition-all duration-300 Tailwind classes for "premium" hover
effects — use GSAP quickTo() instead
5. Required technique per interaction type
Interaction	Required GSAP technique
Headline reveal on load/scroll	SplitText (chars or lines) + stagger + power4.out/expo.out
Section pin (Manifesto, Lookbook)	ScrollTrigger.pin: true with scrub
Parallax image	gsap.to(img, { yPercent: -20, scrollTrigger: { scrub: true } })
Marquee (Street Cred ticker)	Manual gsap.ticker loop with modulo-based x position, velocity-reactive via scroll delta tracking — NOT CSS animation
Magnetic button	gsap.quickTo(btn, "x", {...}) / quickTo(btn, "y", {...}) driven by mousemove listener, reset with mouseleave
Text scramble (logo, pull-quotes)	ScrambleTextPlugin, chars: "upperCase", tied to ScrollTrigger onEnter or hover
Slot-machine counter (Drop Counter)	Stacked digit divs, gsap.to(digitWrapper, { y: -digitHeight * targetDigit, ease: "power3.inOut" })
Cursor follow	gsap.quickTo(cursor, "x") / "y" inside a mousemove listener at the document level, with a separate slower-lagging trail element
Image hover distortion (Lookbook)	Shader-based (OGL/Three) displacement using a noise texture, uniform driven by mouse velocity — see DistortionImage.tsx
6. Performance requirements
will-change: transform on elements with continuous GSAP animation.
Kill/pause ScrollTriggers not in viewport when possible
(ScrollTrigger.batch for repeated elements like gallery grids).
Use gsap.matchMedia() to provide reduced-motion / simplified mobile
variants — pinning and horizontal scroll sections especially need mobile
fallbacks (typically: disable pin, convert horizontal scroll to normal
vertical stack below 768px).
TypeScript

const mm = gsap.matchMedia();
mm.add("(min-width: 768px)", () => {
  // desktop-only pin/horizontal-scroll logic
});
mm.add("(max-width: 767px)", () => {
  // simplified mobile animation
});
7. Naming convention for ScrollTrigger instances
Always give ScrollTrigger a unique id matching the section for easier
debugging:

TypeScript

scrollTrigger: {
  id: "hero-headline-reveal",
  trigger: containerRef.current,
  start: "top top",
}
8. Before considering a section's animation "done"
Cross-check against docs/ANIMATION_GUIDE.md for that specific section's
assigned effect, and against docs/ANTI_PATTERNS.md §3 to confirm none of
the banned patterns crept in.

text

