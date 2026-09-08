/** Voice per docs/BRAND_BIBLE.md: cold, blunt, exclusionary. No exclamations. */

export const DROP_COPY = {
  eyebrow: "06 / THE VAULT",
  stamp: "DROP 002",
  aside: "CUT ONCE. NEVER RUN AGAIN.",
  heading: "NEW DROP",
  year: "2026",
  /** Cycles under the year while the section idles. */
  yearChars: "0123456789",
  hint: "PULL A DRAWER",
  live: "LIVE",
  status: "VAULT OPEN",
  /** A drawer previews this many pieces and no more, whatever the run holds. */
  previewCount: 3,
  catalogue: {
    /** `03 OF 12` — reads like a contact sheet, not a product grid. */
    showing: "SHOWING",
    of: "OF",
    unit: "PIECES IN THIS RUN",
    cta: "OPEN THE FULL DROP",
    stamp: "FULL RUN",
    /** Chip that drops onto a tile while it is held. */
    peek: "INSPECT",
  },
  sealed: {
    stamp: "NOT RELEASED",
    line: "The rest of this run is still in the dark.",
  },
} as const;

export type DropPiece = {
  id: string;
  index: string;
  name: string;
  src: string;
  alt: string;
  price: string;
  spec: string;
};

export type DropDrawer = {
  id: string;
  index: string;
  name: string;
  /** Sits behind the name in the closed bar, oversized and hollow. */
  ghost: string;
  count: string;
  line: string;
  pieces: readonly DropPiece[];
  /** Filled with a sealed plate when the run is short. */
  sealed: boolean;
};

export const DROP_DRAWERS: readonly DropDrawer[] = [
  {
    id: "shirts",
    index: "01",
    name: "SHIRTS",
    ghost: "SHIRTS",
    count: "04 PIECES",
    line: "Buttoned to the throat, or not at all.",
    sealed: false,
    pieces: [
      {
        id: "drop-shirt-01",
        index: "01",
        name: "THE INFORMANT",
        src: "/imgs/shirt_1.png",
        alt: "Black patterned shirt, flat lay",
        price: "৳ 2,890",
        spec: "STIFF POPLIN",
      },
      {
        id: "drop-shirt-02",
        index: "02",
        name: "SECOND OFFENSE",
        src: "/imgs/shirt_2.png",
        alt: "Striped shirt, flat lay",
        price: "৳ 3,190",
        spec: "HEAVY TWILL",
      },
      {
        id: "drop-shirt-03",
        index: "03",
        name: "NO WITNESS",
        src: "/imgs/shirt_3.png",
        alt: "Pinstripe shirt, flat lay",
        price: "৳ 3,290",
        spec: "MATTE WEAVE",
      },
      {
        id: "drop-shirt-04",
        index: "04",
        name: "HOUSE ARREST",
        src: "/imgs/shirt_4.png",
        alt: "Long black shirt, flat lay",
        price: "৳ 3,590",
        spec: "DOUBLE STITCH",
      },
    ],
  },
  {
    id: "dropshoulders",
    index: "02",
    name: "DROP SHOULDERS",
    ghost: "SHOULDERS",
    count: "04 PIECES",
    line: "Cut wrong on purpose. That's the point.",
    sealed: false,
    pieces: [
      {
        id: "drop-ds-01",
        index: "01",
        name: "BLACKOUT RITUAL",
        src: "/imgs/dropsholder_1.jpg",
        alt: "Oversized drop-shoulder tee, flat lay",
        price: "৳ 3,390",
        spec: "SEAM DROPPED",
      },
      {
        id: "drop-ds-02",
        index: "02",
        name: "BAD OMEN",
        src: "/imgs/dropsholder_2.jpg",
        alt: "Heavyweight drop-shoulder tee, flat lay",
        price: "৳ 3,490",
        spec: "BOXY CUT",
      },
      {
        id: "drop-ds-03",
        index: "03",
        name: "COLD BLOODED",
        src: "/imgs/dropsholder_3.jpg",
        alt: "Double panel drop-shoulder tee, flat lay",
        price: "৳ 3,690",
        spec: "DOUBLE PANEL",
      },
      {
        id: "drop-ds-04",
        index: "04",
        name: "UNDER THE HOOD",
        src: "/imgs/dropsholder_4.jpg",
        alt: "Heavy cotton drop-shoulder tee, flat lay",
        price: "৳ 3,790",
        spec: "HEAVY COTTON",
      },
    ],
  },
  {
    id: "pants",
    index: "03",
    name: "PANTS",
    ghost: "PANTS",
    count: "01 PIECE",
    line: "Room to run. Not that you will.",
    sealed: true,
    pieces: [
      {
        id: "drop-pant-01",
        index: "01",
        name: "WIDE SENTENCE",
        src: "/imgs/baggy.jpg",
        alt: "Wide-leg baggy pant",
        price: "৳ 3,890",
        spec: "HEAVY DRAPE",
      },
    ],
  },
];
