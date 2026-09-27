/** Voice per docs/BRAND_BIBLE.md: cold, blunt, exclusionary. No exclamations. */

export const STREETS_COPY = {
  eyebrow: "04 / THE STREETS",
  originLabel: "ORIGIN FILE — UNSEALED",
  aside: "NO FOUNDER STORY. NO INVESTORS. NO PERMISSION.",
  /** Sprayed across the artwork like a tag on the wall behind it. */
  tag: "SICKO SOUL",
  /** Scale contrast inside one headline — no other section stacks it this way. */
  headingSmall: "WE CAME UP",
  headingLarge: "IN THE BLIND SPOT",
  /** Stencil lead-in carries the first clause; the grotesk picks up the rest. */
  body: [
    {
      index: "01",
      lead: "IT STARTED ON A STAIRWELL",
      rest: "nobody swept. Hoods up, faces gone, nothing to prove to whoever was above ground. Every piece cut since has been pulled from that same night.",
    },
    {
      index: "02",
      lead: "NO FOCUS GROUP SIGNED IT OFF.",
      rest: "No borrowed hype, no seeding list. When a run is gone it stays gone, and the next one owes the last one nothing.",
    },
  ],
  quote: "WE WERE NEVER LET IN. WE TOOK THE DOOR OFF.",
  /** Held on screen until the scramble resolves it. */
  quoteCipher: "## #### ##### ### ##. ## #### ### #### ###.",
  caption: "FIG. 04 — STAIRWELL / 03:40",
  captionAlt: "FIG. 05 — LOWER DECK",
  rec: "REC",
  seal: "SICKO SOUL · EST. NOWHERE GOOD · ",
  cta: "PULL THE FILE",
  stats: [
    { value: "2021", label: "EST. NOWHERE GOOD" },
    { value: "00", label: "STOCKISTS" },
    { value: "01", label: "DROP A YEAR" },
  ],
} as const;
