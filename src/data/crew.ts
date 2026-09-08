/** Voice per docs/BRAND_BIBLE.md: cold, blunt, exclusionary. No exclamations. */

export const CREW_COPY = {
  eyebrow: "08 / THE CREW",
  stamp: "INITIATION",
  aside: "WE DON'T SEND MUCH. WHEN WE DO, IT MATTERS.",
  heading: "SIGN YOUR",
  /** Blackletter, overlapping the display word above it. */
  headingAlt: "OWN NAME",
  /** Oversized watermark behind the form. */
  ghost: "SWORN",
  label: "YOUR ADDRESS",
  placeholder: "NAME@NOWHERE.GOOD",
  submit: "PUT ME ON",
  /** Swapped in by scramble once the form is signed. */
  done: "YOU'RE ON THE LIST",
  doneLine: "Don't tell anyone. That's the whole point.",
  invalid: "THAT ADDRESS ISN'T REAL",
  terms: "NO SHARING. NO SELLING. NO SECOND WARNINGS.",
  watching: "YOU ARE BEING RECORDED",
  ledger: [
    { value: "01", label: "MAIL A YEAR" },
    { value: "00", label: "PARTNERS" },
    { value: "24H", label: "HEAD START" },
  ],
} as const;
