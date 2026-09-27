/** Landing-page voice only. Category/product data comes from the API. */
export const RACK_COPY = {
  eyebrow: "03 / THE RACK",
  heading: "PICK YOUR",
  headingAlt: "POISON",
  aside: "ONE LIVE FILE AT A TIME. SWITCH WHEN YOU WANT.",
  hint: "HOLD A FRAME TO SEE IT WORN",
  edge: "EVIDENCE ROOM — HANDLE WITH INTENT",
  still: "STILL",
  worn: "ON BODY",
  unit: "UNITS",
  addToCart: "ADD TO CART",
  buyNow: "BUY NOW",
  empty: "NO ACTIVE GARMENTS IN THIS FILE.",
  closing: {
    stamp: "LIVE ARCHIVE",
    line: "Everything cleared in the database shows up here.",
    meta: "CATALOG DATA / LIVE",
  },
} as const;

export type RackProduct = {
  id: string;
  index: string;
  variantId?: string;
  available: boolean;
  name: string;
  still: string;
  worn: string;
  price: string;
  spec: string;
  line: string;
};
