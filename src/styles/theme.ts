/**
 * Non-Tailwind consumers (GSAP tweens, canvas/shader uniforms) read tokens
 * from here. Never hardcode a hex or an ease string in a component.
 * Mirrors docs/DESIGN_SYSTEM.md + docs/ANIMATION_GUIDE.md.
 */

export const COLOR = {
  black: "#0a0a0a",
  offBlack: "#141414",
  boneWhite: "#f2f0eb",
  concreteGray: "#8a8a85",
  bloodAccent: "#8a0303",
} as const;

export const EASE = {
  hard: "power4.out",
  expo: "expo.out",
  overshoot: "back.out(1.4)",
  inOut: "power3.inOut",
  slot: "power3.inOut",
  /** Permitted for infinite marquee loops only. */
  loop: "none",
} as const;

/** Tuned per content type — see ANTI_PATTERNS.md §3.3. */
export const STAGGER = {
  chars: 0.045,
  words: 0.02,
  lines: 0.08,
  images: 0.12,
} as const;

export const DURATION = {
  micro: 0.35,
  base: 0.9,
  reveal: 1.2,
  panel: 1.05,
} as const;

export const CURSOR = {
  dotSize: 6,
  ringSize: 38,
  dotLag: 0.18,
  ringLag: 0.55,
} as const;

export const BREAKPOINT = {
  md: 768,
} as const;

export const MEDIA = {
  desktop: `(min-width: ${BREAKPOINT.md}px)`,
  mobile: `(max-width: ${BREAKPOINT.md - 1}px)`,
  reducedMotion: "(prefers-reduced-motion: reduce)",
} as const;
