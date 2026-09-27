/** Voice per docs/BRAND_BIBLE.md: cold, blunt, exclusionary. No exclamations. */

export const CRED_COPY = {
  eyebrow: "07 / STREET CRED",
  stamp: "UNSOLICITED",
  aside: "NOBODY WAS PAID. NOBODY WAS ASKED.",
  heading: "WHAT THEY",
  headingScript: "said after",
  hint: "HOLD A STATEMENT TO STOP THE ROOM",
  verdict: "VERIFIED",
  /** Runs the tape that cuts across the wall. */
  tape: "STREET CRED ★ VERIFIED BY THE BLOCK ★ NO REFUNDS ★ NO APOLOGIES ★ ",
  counter: {
    value: "1284",
    chars: "0123456789",
    label: "STATEMENTS ON FILE",
  },
  stats: [
    { value: "00", label: "PAID PLACEMENTS" },
    { value: "04", label: "RETURNS ACCEPTED" },
    { value: "∞", label: "PEOPLE STILL WAITING" },
  ],
} as const;

export type CredStatement = {
  id: string;
  case: string;
  quote: string;
  /** Blacked out until the plate is held — evidence, not marketing. */
  redacted: string;
  name: string;
  handle: string;
};

/** Three rows, counter-scrolling. Lengths differ so they never sync up. */
export const CRED_ROWS: readonly (readonly CredStatement[])[] = [
  [
    {
      id: "c-01",
      case: "CASE 014",
      quote: "Wore it once. Got followed home.",
      redacted: "Worth it.",
      name: "DEACON",
      handle: "@deacon.wav",
    },
    {
      id: "c-02",
      case: "CASE 031",
      quote: "My mother asked what happened to me.",
      redacted: "I didn't answer.",
      name: "V. ROMANO",
      handle: "@nofacev",
    },
    {
      id: "c-03",
      case: "CASE 047",
      quote: "Three people crossed the street.",
      redacted: "Good.",
      name: "SLIM",
      handle: "@slim.after.dark",
    },
    {
      id: "c-04",
      case: "CASE 052",
      quote: "It doesn't fit right.",
      redacted: "Nothing does anymore.",
      name: "K. ADEYEMI",
      handle: "@kadeyemi",
    },
  ],
  [
    {
      id: "c-05",
      case: "CASE 066",
      quote: "Bought it to blend in.",
      redacted: "Opposite happened.",
      name: "MARA",
      handle: "@mara.nocturne",
    },
    {
      id: "c-06",
      case: "CASE 078",
      quote: "The stitching outlived the relationship.",
      redacted: "She kept the shirt.",
      name: "T. OKONKWO",
      handle: "@okonkwo.t",
    },
    {
      id: "c-07",
      case: "CASE 083",
      quote: "Nobody compliments it.",
      redacted: "They just stare.",
      name: "GHOST",
      handle: "@ghost.protocol",
    },
    {
      id: "c-08",
      case: "CASE 091",
      quote: "Sized up. Still felt watched.",
      redacted: "Kept it anyway.",
      name: "R. VOSS",
      handle: "@vossknuckle",
    },
    {
      id: "c-09",
      case: "CASE 097",
      quote: "Came in black. Left in black.",
      redacted: "No notes.",
      name: "AUGUST",
      handle: "@august.wake",
    },
  ],
  [
    {
      id: "c-10",
      case: "CASE 103",
      quote: "Wash it cold. It holds a grudge.",
      redacted: "So do I.",
      name: "PRIEST",
      handle: "@priest.9mm",
    },
    {
      id: "c-11",
      case: "CASE 118",
      quote: "Not clothing. A warning label.",
      redacted: "Read it twice.",
      name: "L. CASTELLANO",
      handle: "@castellano.l",
    },
    {
      id: "c-12",
      case: "CASE 126",
      quote: "I don't own it.",
      redacted: "It tolerates me.",
      name: "NINE",
      handle: "@nine.lives.left",
    },
    {
      id: "c-13",
      case: "CASE 134",
      quote: "Asked where I got it. Told them nowhere.",
      redacted: "They believed me.",
      name: "SAINT",
      handle: "@saint.unmade",
    },
  ],
];
