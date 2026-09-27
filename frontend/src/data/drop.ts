/** Landing-page voice only. Collection, category and product values come from the API/database. */
export const DROP_COPY = {
  eyebrow: "06 / THE VAULT",
  aside: "CUT ONCE. NEVER RUN AGAIN.",
  heading: "NEW DROP",
  yearChars: "0123456789",
  hint: "PULL A DRAWER",
  catalogue: {
    showing: "SHOWING",
    of: "OF",
    unit: "PIECES IN THIS RUN",
    cta: "OPEN THE FULL DROP",
    stamp: "FULL RUN",
    peek: "INSPECT",
  },
  sealed: {
    stamp: "NOT RELEASED",
    line: "This part of the run is still sealed.",
  },
  empty: "NO CUSTOMER-VISIBLE DROP IS FILED.",
  previewCount: 3,
} as const;

export type DropPiece = {
  id: string;
  index: string;
  name: string;
  src: string;
  alt: string;
  price: string;
  spec: string;
  sealed: boolean;
};

export type DropDrawer = {
  id: string;
  index: string;
  name: string;
  ghost: string;
  count: string;
  line: string;
  pieces: readonly DropPiece[];
  sealed: boolean;
};
