import type { Config } from "tailwindcss";

/**
 * Full theme replacement — the default Tailwind palette, radius scale and
 * blurred shadow scale are intentionally destroyed, not extended.
 * See docs/DESIGN_SYSTEM.md and docs/ANTI_PATTERNS.md §2.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    colors: {
      transparent: "transparent",
      current: "currentColor",
      inherit: "inherit",
      /* Invertible: these follow --c-* so a .theme-light section flips wholesale. */
      black: "rgb(var(--c-bg) / <alpha-value>)",
      "off-black": "rgb(var(--c-surface) / <alpha-value>)",
      "bone-white": "rgb(var(--c-fg) / <alpha-value>)",
      "concrete-gray": "rgb(var(--c-muted) / <alpha-value>)",
      "blood-accent": "#8a0303",
      /* Absolute. For plates that sit over imagery and must not invert. */
      ink: "#0a0a0a",
      paper: "#f2f0eb",
    },

    // 2px is the hard ceiling. lg/xl/full deliberately do not exist.
    borderRadius: {
      none: "0",
      DEFAULT: "0",
      hair: "1px",
      max: "2px",
    },

    // Hard-edged screen-print misregistration offsets only. No ambient blur.
    boxShadow: {
      none: "none",
      print: "6px 6px 0 0 #0a0a0a",
      "print-blood": "6px 6px 0 0 #8a0303",
      hairline: "0 0 0 1px rgba(242, 240, 235, 0.2)",
    },

    fontFamily: {
      display: ['"Anton"', '"Arial Narrow Bold"', "sans-serif"],
      // Matches the blackletter lockup in public/imgs/logo.jpg.
      gothic: ['"Pirata One"', '"Anton"', "serif"],
      // Heavier, tighter Old English — tattoo flash rather than storybook.
      blackletter: ['"UnifrakturCook"', '"Pirata One"', "serif"],
      // Graffiti tag hand. Falls back to marker, never to system cursive —
      // the `cursive` keyword resolves to Comic Sans on Windows.
      script: ['"Sedgwick Ave Display"', '"Permanent Marker"', "sans-serif"],
      /** Aerosol tags sprayed on the wall. Accent only, never body copy. */
      spray: ['"Rubik Spray Paint"', '"Anton"', "sans-serif"],
      /** Marker scrawl — annotations written over the top of the page. */
      marker: ['"Permanent Marker"', '"Special Elite"', "sans-serif"],
      /** Raw scrawl for the hardest annotations. */
      scrawl: ['"Rock Salt"', '"Permanent Marker"', "sans-serif"],
      body: ['"Archivo Narrow"', '"Helvetica Neue Condensed"', '"Arial Narrow"', "sans-serif"],
      stencil: ['"Special Elite"', '"Courier New"', "monospace"],
    },

    extend: {
      fontSize: {
        eyebrow: ["0.6875rem", { lineHeight: "1", letterSpacing: "0.28em" }],
        stamp: ["0.75rem", { lineHeight: "1", letterSpacing: "0.35em" }],
        "body-lg": ["clamp(1.0625rem, 1.4vw, 1.375rem)", { lineHeight: "1.55" }],
        manifesto: ["clamp(1.75rem, 4.2vw, 4rem)", { lineHeight: "1.15", letterSpacing: "-0.02em" }],
        "nav-link": ["clamp(1.6rem, 3.4vw, 2.9rem)", { lineHeight: "1", letterSpacing: "0.01em" }],
        segment: ["clamp(1.9rem, 4.6vw, 4rem)", { lineHeight: "0.92", letterSpacing: "-0.02em" }],
        display: ["clamp(2.25rem, 6.5vw, 5.5rem)", { lineHeight: "0.9", letterSpacing: "-0.02em" }],
        "display-xl": ["clamp(3rem, 10vw, 9rem)", { lineHeight: "0.85", letterSpacing: "-0.03em" }],
        hero: ["clamp(4rem, 15vw, 14rem)", { lineHeight: "0.78", letterSpacing: "-0.04em" }],
        "hero-slab": ["clamp(5rem, 21vw, 20rem)", { lineHeight: "0.72", letterSpacing: "-0.05em" }],
      },
      letterSpacing: {
        crushed: "-0.045em",
        eyebrow: "0.28em",
        stencil: "0.35em",
      },
      spacing: {
        gutter: "clamp(1.25rem, 4vw, 4.5rem)",
        bleed: "clamp(2rem, 9vw, 11rem)",
      },
      // Grain must sit above the preloader panels, cursor above everything.
      zIndex: {
        nav: "70",
        preloader: "100",
        noise: "110",
        cursor: "120",
      },
      transitionTimingFunction: {
        // For the few permitted CSS state changes (colour/border only).
        hard: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
