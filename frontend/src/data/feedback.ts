/** Voice per docs/BRAND_BIBLE.md: cold, blunt, exclusionary. No exclamations. */

export const FEEDBACK_COPY = {
  eyebrow: "08 / THE COMPLAINT DESK",
  stamp: "ON RECORD",
  aside: "WE READ EVERY ONE. WE ANSWER ALMOST NONE.",
  heading: "SAY IT TO",
  headingAlt: "OUR FACE",
  ghost: "FILED",
  intro: "Something went wrong with an order, a garment, or us. Put it in writing.",
  sheetRef: "FORM 08 — COMPLAINT / ONE SUBMISSION PER INCIDENT",
  fields: {
    name: { label: "WHO'S ASKING", placeholder: "NAME OR ALIAS" },
    email: { label: "WHERE WE REACH YOU", placeholder: "NAME@NOWHERE.GOOD" },
    order: { label: "ORDER REF", placeholder: "SS-0000 (IF YOU HAVE ONE)" },
    message: { label: "THE COMPLAINT", placeholder: "KEEP IT SHORT. WE'VE HEARD IT ALL." },
  },
  categoryLabel: "WHAT WENT WRONG",
  categories: [
    { id: "defect", label: "DEFECT" },
    { id: "delivery", label: "DELIVERY" },
    { id: "sizing", label: "SIZING" },
    { id: "refund", label: "REFUND" },
    { id: "other", label: "OTHER" },
  ],
  submit: "FILE IT",
  errors: {
    email: "THAT ADDRESS ISN'T REAL",
    message: "WRITE THE COMPLAINT FIRST",
  },
  done: {
    head: "COMPLAINT LOGGED",
    line: "It's on the record now. That's the part we can promise.",
    ref: "CASE",
  },
  terms: "NO ABUSE. NO THREATS. THOSE GO STRAIGHT IN THE BIN.",
  watching: "THIS FORM IS BEING RECORDED",
  ledger: [
    { value: "72H", label: "TYPICAL REPLY" },
    { value: "01", label: "ESCALATION LEVEL" },
    { value: "00", label: "AUTOMATED BOTS" },
  ],
} as const;
