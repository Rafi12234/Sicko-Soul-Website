/** Landing-page voice only. Complaint categories and support metrics come from the API/database. */
export const FEEDBACK_COPY = {
  eyebrow: "08 / THE COMPLAINT DESK",
  stamp: "ON RECORD",
  aside: "WE READ WHAT GETS FILED.",
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
  submit: "FILE IT",
  errors: {
    email: "THAT ADDRESS ISN'T REAL",
    message: "WRITE THE COMPLAINT FIRST",
    category: "NO ACTIVE COMPLAINT TYPE IS AVAILABLE",
  },
  done: {
    head: "COMPLAINT LOGGED",
    line: "It's on the record now. That's the part we can promise.",
    ref: "CASE",
  },
  terms: "NO ABUSE. NO THREATS. THOSE GO STRAIGHT IN THE BIN.",
  watching: "THIS FORM IS BEING RECORDED",
} as const;
