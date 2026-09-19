import { MEDIA } from "@/lib/media";

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
    stamp: "FILE 03 — SEALED",
    line: "The rest opens when we say so. Not before.",
    meta: "03 CATEGORIES WITHHELD",
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
  { id: "dropshoulder", index: "04", label: "DROP SHOULDER", status: "open" },
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
      still: MEDIA.images.shirt1,
      worn: MEDIA.images.manShirt1,
      price: "৳ 2,890",
      spec: "STIFF POPLIN · CUT SHARP",
      line: "Talks less than you do.",
    },
    {
      id: "shirt-02",
      index: "02",
      name: "SECOND OFFENSE",
      still: MEDIA.images.shirt2,
      worn: MEDIA.images.manShirt2,
      price: "৳ 3,190",
      spec: "HEAVY TWILL · BOXED SHOULDER",
      line: "The first one was a warning.",
    },
    {
      id: "shirt-03",
      index: "03",
      name: "NO WITNESS",
      still: MEDIA.images.shirt3,
      worn: MEDIA.images.manShirt3,
      price: "৳ 3,290",
      spec: "MATTE WEAVE · BLUNT COLLAR",
      line: "Nobody saw you leave.",
    },
    {
      id: "shirt-04",
      index: "04",
      name: "HOUSE ARREST",
      still: MEDIA.images.shirt4,
      worn: MEDIA.images.manShirt4,
      price: "৳ 3,590",
      spec: "DOUBLE STITCH · LONG BODY",
      line: "Comfortable. Still not free.",
    },
  ],
  dropshoulder: [
    {
      id: "dropshoulder-01",
      index: "01",
      name: "BLACKOUT RITUAL",
      still: MEDIA.images.dropsholder1,
      worn: MEDIA.images.manDropsholder1,
      price: "৳ 3,390",
      spec: "OVERSIZED · SEAM DROPPED",
      line: "Wide enough to hide what you're carrying.",
    },
    {
      id: "dropshoulder-02",
      index: "02",
      name: "BAD OMEN",
      still: MEDIA.images.dropsholder2,
      worn: MEDIA.images.manDropsholder2,
      price: "৳ 3,490",
      spec: "HEAVYWEIGHT · BOXY CUT",
      line: "Everyone reads the signs too late.",
    },
    {
      id: "dropshoulder-03",
      index: "03",
      name: "COLD BLOODED",
      still: MEDIA.images.dropsholder3,
      worn: MEDIA.images.manDropsholder3,
      price: "৳ 3,690",
      spec: "DOUBLE PANEL · DROPPED SEAM",
      line: "It doesn't flinch. Neither should you.",
    },
    {
      id: "dropshoulder-04",
      index: "04",
      name: "UNDER THE HOOD",
      still: MEDIA.images.dropsholder4,
      worn: MEDIA.images.manDropsholder4,
      price: "৳ 3,790",
      spec: "HEAVY COTTON · BOXED FIT",
      line: "You don't see the face. Just the shape.",
    },
  ],
};
