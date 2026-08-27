/** Voice per docs/BRAND_BIBLE.md: cold, blunt, exclusionary. No exclamations. */

export const RACK_COPY = {
  eyebrow: "03 / THE RACK",
  heading: "PICK YOUR",
  headingAlt: "POISON",
  aside: "ONE FILE IS OPEN. THE REST STAY SHUT.",
  hint: "HOLD A FRAME TO SEE IT WORN",
  reject: "NOT YOUR TURN",
  edge: "EVIDENCE ROOM — HANDLE WITH INTENT",
  still: "STILL",
  worn: "ON BODY",
  unit: "UNITS",
  addToCart: "ADD TO CART",
  buyNow: "BUY NOW",
  closing: {
    stamp: "FILE 02 — SEALED",
    line: "The rest opens when we say so. Not before.",
    meta: "04 CATEGORIES WITHHELD",
  },
} as const;

export type RackCategory = {
  id: string;
  index: string;
  label: string;
  status: "open" | "locked";
};

export const RACK_CATEGORIES: readonly RackCategory[] = [
  { id: "shirt", index: "01", label: "SHIRT", status: "open" },
  { id: "tshirt", index: "02", label: "T-SHIRT", status: "locked" },
  { id: "baggy", index: "03", label: "BAGGY PANT", status: "locked" },
  { id: "dropshoulder", index: "04", label: "DROP SHOULDER", status: "locked" },
  { id: "hoodie", index: "05", label: "HOODIE", status: "locked" },
];

export type RackProduct = {
  id: string;
  index: string;
  name: string;
  /** Flat product cutout — what sits in the frame at rest. */
  still: string;
  /** Worn shot — swapped in underneath when the frame is held. */
  worn: string;
  price: string;
  spec: string;
  line: string;
};

export const RACK_PRODUCTS: Record<string, readonly RackProduct[]> = {
  shirt: [
    {
      id: "shirt-01",
      index: "01",
      name: "THE INFORMANT",
      still: "/imgs/shirt_1.png",
      worn: "/imgs/man_shirt_1.png",
      price: "৳ 2,890",
      spec: "STIFF POPLIN · CUT SHARP",
      line: "Talks less than you do.",
    },
    {
      id: "shirt-02",
      index: "02",
      name: "SECOND OFFENSE",
      still: "/imgs/shirt_2.png",
      worn: "/imgs/man_shirt_2.png",
      price: "৳ 3,190",
      spec: "HEAVY TWILL · BOXED SHOULDER",
      line: "The first one was a warning.",
    },
    {
      id: "shirt-03",
      index: "03",
      name: "NO WITNESS",
      still: "/imgs/shirt_3.png",
      worn: "/imgs/man_shirt_3.png",
      price: "৳ 3,290",
      spec: "MATTE WEAVE · BLUNT COLLAR",
      line: "Nobody saw you leave.",
    },
    {
      id: "shirt-04",
      index: "04",
      name: "HOUSE ARREST",
      still: "/imgs/shirt_4.png",
      worn: "/imgs/man_shirt_4.png",
      price: "৳ 3,590",
      spec: "DOUBLE STITCH · LONG BODY",
      line: "Comfortable. Still not free.",
    },
  ],
};
