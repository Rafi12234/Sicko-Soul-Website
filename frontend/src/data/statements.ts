/** Voice per docs/BRAND_BIBLE.md: cold, blunt, exclusionary. No exclamations. */

export type StatementFace = "display" | "gothic" | "blackletter" | "script" | "spray";
export type StatementTone = "bone" | "blood" | "outline" | "outlineBlood";

export type Statement = {
  id: string;
  /** Stock the band is printed on. `shift` starts on paper and burns down to
   *  blood-black across the scroll. */
  theme: "dark" | "light" | "blood" | "shift";
  eyebrow: string;
  /** Two lines, each set in its own hand — the lockup pattern from the
   *  Segments and Streets headlines, never a per-word mix. */
  lineOne: { text: string; face: StatementFace; tone: StatementTone; distress?: boolean };
  lineTwo: { text: string; face: StatementFace; tone: StatementTone; indent?: string };
  /** Hollow word drifting behind the lockup. */
  ghost: string;
  /** Runs down the edge of the band. */
  edge: string;
};

export const STATEMENTS: Record<string, Statement> = {
  entry: {
    id: "entry",
    theme: "shift",
    eyebrow: "I / NO ENTRY FEE",
    lineOne: { text: "YOU CAN'T BUY", face: "display", tone: "bone", distress: true },
    lineTwo: { text: "your way in", face: "script", tone: "blood", indent: "pl-[14%]" },
    ghost: "CLOSED",
    edge: "MEMBERSHIP IS NOT FOR SALE",
  },
  seen: {
    id: "seen",
    theme: "blood",
    eyebrow: "II / ON THE RECORD",
    lineOne: { text: "SEEN ONCE", face: "gothic", tone: "outline" },
    lineTwo: { text: "NEVER FORGOTTEN", face: "blackletter", tone: "bone", indent: "pl-[22%]" },
    ghost: "WITNESS",
    edge: "EVERY FRAME WAS TAKEN, NOT GIVEN",
  },
  ask: {
    id: "ask",
    theme: "blood",
    eyebrow: "III / LAST CALL",
    lineOne: { text: "IF YOU HAVE TO ASK", face: "display", tone: "outline" },
    lineTwo: { text: "it's already gone", face: "script", tone: "bone", indent: "pl-[30%]" },
    ghost: "SOLD",
    edge: "NO WAITLIST. NO EXCEPTIONS.",
  },
};
