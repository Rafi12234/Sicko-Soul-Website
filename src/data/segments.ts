/** Voice per docs/BRAND_BIBLE.md: cold, blunt, exclusionary. No exclamations. */

export const SEGMENTS_COPY = {
  eyebrow: "02 / THE ARSENAL",
  heading: "FIVE WAYS",
  headingAlt: "TO VANISH",
  aside: "NO SIZE GUIDE. IF IT FITS WRONG, IT FITS RIGHT.",
} as const;

export const SEGMENTS = [
  {
    id: "shirt",
    index: "01",
    name: "SHIRT",
    image: "/imgs/shirt.jpg",
    spec: "STIFF COTTON · CUT SHARP",
    line: "Buttoned to the throat, or not at all.",
  },
  {
    id: "tshirt",
    index: "02",
    name: "T-SHIRT",
    image: "/imgs/tshirt.jpg",
    spec: "240 GSM · BOXY",
    line: "Built to outlive whoever wears it.",
  },
  {
    id: "baggy",
    index: "03",
    name: "BAGGY PANT",
    image: "/imgs/baggy.jpg",
    spec: "WIDE LEG · HEAVY DRAPE",
    line: "Room to run. Not that you will.",
  },
  {
    id: "dropshoulder",
    index: "04",
    name: "DROP SHOULDER",
    image: "/imgs/dropsholder.jpg",
    spec: "OVERSIZED · SEAM DROPPED",
    line: "Cut wrong on purpose. That's the point.",
  },
  {
    id: "hoodie",
    index: "05",
    name: "HOODIE",
    image: "/imgs/hoodie.jpg",
    spec: "FLEECE LINED · HOOD DEEP",
    line: "The only face you'll need.",
  },
] as const;
