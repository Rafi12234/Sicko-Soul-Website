import { MEDIA } from "@/lib/media";
import type { ProductImageRecord, ProductVariantRecord } from "@/types/commerce";

/**
 * Product archive data.
 *
 * Product media is resolved through the canonical Cloudinary manifest in
 * src/lib/media.ts so the landing page, archive, detail, cart and order flow
 * all request the same CDN-backed assets without duplicate local files.
 */

export type ArchiveProduct = {
  id: string;
  index: string;
  name: string;
  price: string;
  priceValue: number;
  spec: string;
  line: string;
  description: string;
  details: readonly string[];
  sizes: readonly string[];
  defaultSize: string;
  still: string;
  worn?: string;
  alt: string;
  /** Backend-ready image records. Legacy still/worn are normalized by getProductGallery(). */
  gallery?: readonly ProductImageRecord[];
  /** Backend-ready size/SKU/stock records. Static products fall back to seeded demo variants. */
  variants?: readonly ProductVariantRecord[];
};

export type ArchiveCategory = {
  id: string;
  index: string;
  name: string;
  ghost: string;
  cover: string;
  coverAlt: string;
  spec: string;
  line: string;
  registry: string;
  products: readonly ArchiveProduct[];
};

export const PRODUCTS_COPY = {
  eyebrow: "PRODUCT ARCHIVE / OPEN FILE",
  heroKicker: "EVERY PIECE WE LET YOU SEE. NOTHING MORE.",
  heroLineOne: "THE",
  heroLineTwo: "EVIDENCE",
  heroScript: "locker",
  heroMeta: "SICKO SOUL · INTERNAL GARMENT INDEX · 2026",
  select: "SELECT A FILE",
  selectAside: "FIVE CATEGORIES. ONE ROOM OPEN AT A TIME.",
  active: "ACTIVE FILE",
  recovered: "RECOVERED IMAGE",
  recoveredPlural: "RECOVERED IMAGES",
  record: "GARMENT RECORD",
  still: "OBJECT",
  worn: "ON BODY",
  noWorn: "NO BODY FRAME RELEASED",
  inspect: "HOLD / MOVE TO INSPECT",
  change: "CHANGE FILE",
  footerEyebrow: "ARCHIVE END / NOTHING ELSE CLEARED",
  footerLine: "YOU SAW WHAT WE CLEARED. THE REST STAYS OFF RECORD.",
  backHome: "RETURN TO THE SCENE",
  ticker: "SICKO SOUL — PRODUCT ARCHIVE — NO RESTOCKS — NO EXPLANATIONS — ",
} as const;

const TOP_SIZES = ["S", "M", "L", "XL"] as const;
const PANT_SIZES = ["28", "30", "32", "34"] as const;

export const PRODUCT_CATEGORIES: readonly ArchiveCategory[] = [
  {
    id: "shirt",
    index: "01",
    name: "SHIRT",
    ghost: "SHIRT",
    cover: MEDIA.images.shirt,
    coverAlt: "Sicko Soul shirt category",
    spec: "STIFF COTTON · CUT SHARP",
    line: "Buttoned to the throat, or not at all.",
    registry: "BUTTONED GOODS / FILE 01",
    products: [
      {
        id: "shirt-01",
        index: "01",
        name: "THE INFORMANT",
        price: "৳ 2,890",
        priceValue: 2890,
        spec: "STIFF POPLIN · CUT SHARP",
        line: "Talks less than you do.",
        description:
          "A hard-cut button shirt built like a statement under questioning. Boxed through the body, blunt at the collar, and clean enough to look deliberate after midnight.",
        details: ["Structured poplin hand", "Boxed shoulder line", "Straight hem", "Limited archive run"],
        sizes: TOP_SIZES,
        defaultSize: "M",
        still: MEDIA.images.shirt1,
        worn: MEDIA.images.manShirt1,
        alt: "The Informant shirt",
      },
      {
        id: "shirt-02",
        index: "02",
        name: "SECOND OFFENSE",
        price: "৳ 3,190",
        priceValue: 3190,
        spec: "HEAVY TWILL · BOXED SHOULDER",
        line: "The first one was a warning.",
        description:
          "A heavier shirt with a squared stance and enough structure to hold its shape when the room does not. Built for repeat offenders, not first impressions.",
        details: ["Heavy twill body", "Boxed shoulder", "Reinforced seams", "Limited archive run"],
        sizes: TOP_SIZES,
        defaultSize: "M",
        still: MEDIA.images.shirt2,
        worn: MEDIA.images.manShirt2,
        alt: "Second Offense shirt",
      },
      {
        id: "shirt-03",
        index: "03",
        name: "NO WITNESS",
        price: "৳ 3,290",
        priceValue: 3290,
        spec: "MATTE WEAVE · BLUNT COLLAR",
        line: "Nobody saw you leave.",
        description:
          "Low-shine fabric, severe collar geometry, and a restrained silhouette that reads quiet until it is too close. Made to disappear in bad light and stay remembered anyway.",
        details: ["Matte woven surface", "Blunt collar profile", "Relaxed straight cut", "Limited archive run"],
        sizes: TOP_SIZES,
        defaultSize: "M",
        still: MEDIA.images.shirt3,
        worn: MEDIA.images.manShirt3,
        alt: "No Witness shirt",
      },
      {
        id: "shirt-04",
        index: "04",
        name: "HOUSE ARREST",
        price: "৳ 3,590",
        priceValue: 3590,
        spec: "DOUBLE STITCH · LONG BODY",
        line: "Comfortable. Still not free.",
        description:
          "A longer, heavier shirt with doubled seam work and a locked-in drape. Enough room to move. Not enough to pretend there are no consequences.",
        details: ["Extended body length", "Double-stitch construction", "Relaxed fit", "Limited archive run"],
        sizes: TOP_SIZES,
        defaultSize: "M",
        still: MEDIA.images.shirt4,
        worn: MEDIA.images.manShirt4,
        alt: "House Arrest shirt",
      },
    ],
  },
  {
    id: "tshirt",
    index: "02",
    name: "T-SHIRT",
    ghost: "TEE",
    cover: MEDIA.images.tshirt,
    coverAlt: "Sicko Soul T-shirt category",
    spec: "240 GSM · BOXY",
    line: "Built to outlive whoever wears it.",
    registry: "HEAVY JERSEY / FILE 02",
    products: [
      {
        id: "tshirt-01",
        index: "01",
        name: "DEAD CHANNEL",
        price: "৳ 2,490",
        priceValue: 2490,
        spec: "240 GSM · BOXY",
        line: "Nothing coming through but static.",
        description:
          "Dense jersey, a short boxy body, and a dead-air attitude. This is the everyday Sicko Soul uniform stripped down to weight, shape, and signal loss.",
        details: ["240 GSM jersey", "Boxy silhouette", "Dropped shoulder", "Limited archive run"],
        sizes: TOP_SIZES,
        defaultSize: "M",
        still: MEDIA.images.tshirt,
        alt: "Sicko Soul boxy T-shirt",
      },
    ],
  },
  {
    id: "baggy",
    index: "03",
    name: "BAGGY PANT",
    ghost: "BAGGY",
    cover: MEDIA.images.baggy,
    coverAlt: "Sicko Soul baggy pant category",
    spec: "WIDE LEG · HEAVY DRAPE",
    line: "Room to run. Not that you will.",
    registry: "LOWER BODY / FILE 03",
    products: [
      {
        id: "baggy-01",
        index: "01",
        name: "WIDE SENTENCE",
        price: "৳ 3,890",
        priceValue: 3890,
        spec: "WIDE LEG · HEAVY DRAPE",
        line: "A longer sentence than you planned for.",
        description:
          "A low, wide trouser with enough fabric to move like smoke and enough weight to stay grounded. The silhouette is deliberately oversized from hip to hem.",
        details: ["Wide-leg pattern", "Heavy drape", "Relaxed rise", "Limited archive run"],
        sizes: PANT_SIZES,
        defaultSize: "30",
        still: MEDIA.images.baggy,
        alt: "Wide Sentence baggy pant",
      },
    ],
  },
  {
    id: "dropshoulder",
    index: "04",
    name: "DROP SHOULDER",
    ghost: "DROP",
    cover: MEDIA.images.dropsholder,
    coverAlt: "Sicko Soul drop shoulder category",
    spec: "OVERSIZED · SEAM DROPPED",
    line: "Cut wrong on purpose. That's the point.",
    registry: "OVERSIZED GOODS / FILE 04",
    products: [
      {
        id: "dropshoulder-01",
        index: "01",
        name: "BLACKOUT RITUAL",
        price: "৳ 3,390",
        priceValue: 3390,
        spec: "OVERSIZED · SEAM DROPPED",
        line: "Wide enough to hide what you're carrying.",
        description:
          "An oversized upper built around a deliberately fallen shoulder line. Heavy, broad, and quiet—the shape does the threatening before the graphics need to.",
        details: ["Dropped shoulder seam", "Oversized body", "Heavy cotton hand", "Limited archive run"],
        sizes: TOP_SIZES,
        defaultSize: "M",
        still: MEDIA.images.dropsholder1,
        worn: MEDIA.images.manDropsholder1,
        alt: "Blackout Ritual drop shoulder",
      },
      {
        id: "dropshoulder-02",
        index: "02",
        name: "BAD OMEN",
        price: "৳ 3,490",
        priceValue: 3490,
        spec: "HEAVYWEIGHT · BOXY CUT",
        line: "Everyone reads the signs too late.",
        description:
          "A heavyweight box cut that sits away from the body and refuses to look polite. Thick enough to hold the silhouette; loose enough to distort it.",
        details: ["Heavyweight knit", "Boxed fit", "Dropped shoulder", "Limited archive run"],
        sizes: TOP_SIZES,
        defaultSize: "M",
        still: MEDIA.images.dropsholder2,
        worn: MEDIA.images.manDropsholder2,
        alt: "Bad Omen drop shoulder",
      },
      {
        id: "dropshoulder-03",
        index: "03",
        name: "COLD BLOODED",
        price: "৳ 3,690",
        priceValue: 3690,
        spec: "DOUBLE PANEL · DROPPED SEAM",
        line: "It doesn't flinch. Neither should you.",
        description:
          "Built with a harder panelled structure and an intentionally displaced shoulder. The fit lands wide, the line stays severe, and the garment keeps its distance.",
        details: ["Double-panel build", "Dropped seam", "Wide body", "Limited archive run"],
        sizes: TOP_SIZES,
        defaultSize: "M",
        still: MEDIA.images.dropsholder3,
        worn: MEDIA.images.manDropsholder3,
        alt: "Cold Blooded drop shoulder",
      },
      {
        id: "dropshoulder-04",
        index: "04",
        name: "UNDER THE HOOD",
        price: "৳ 3,790",
        priceValue: 3790,
        spec: "HEAVY COTTON · BOXED FIT",
        line: "You don't see the face. Just the shape.",
        description:
          "A broad, heavy cotton shape designed to read as mass before detail. It hangs clean, sits wide, and keeps the wearer visually one step removed.",
        details: ["Heavy cotton body", "Boxed silhouette", "Wide sleeve", "Limited archive run"],
        sizes: TOP_SIZES,
        defaultSize: "M",
        still: MEDIA.images.dropsholder4,
        worn: MEDIA.images.manDropsholder4,
        alt: "Under The Hood drop shoulder",
      },
    ],
  },
  {
    id: "hoodie",
    index: "05",
    name: "HOODIE",
    ghost: "HOOD",
    cover: MEDIA.images.hoodie,
    coverAlt: "Sicko Soul hoodie category",
    spec: "FLEECE LINED · HOOD DEEP",
    line: "The only face you'll need.",
    registry: "COVERED GOODS / FILE 05",
    products: [
      {
        id: "hoodie-01",
        index: "01",
        name: "NO FACE",
        price: "৳ 4,290",
        priceValue: 4290,
        spec: "FLEECE LINED · HOOD DEEP",
        line: "Recognition was never part of the plan.",
        description:
          "A deep-hood fleece layer built to collapse the face into shadow. Heavy enough for structure, loose enough to disappear inside, and finished without unnecessary noise.",
        details: ["Fleece-lined body", "Deep hood profile", "Relaxed fit", "Limited archive run"],
        sizes: TOP_SIZES,
        defaultSize: "M",
        still: MEDIA.images.hoodie,
        alt: "No Face Sicko Soul hoodie",
      },
    ],
  },
] as const;

export type ProductLookup = {
  product: ArchiveProduct;
  category: ArchiveCategory;
};

export const ALL_PRODUCTS = PRODUCT_CATEGORIES.flatMap((category) =>
  category.products.map((product) => ({ product, category })),
);

export function findProductById(productId: string): ProductLookup | undefined {
  return ALL_PRODUCTS.find(({ product }) => product.id === productId);
}

export function getProductGallery(product: ArchiveProduct): ProductImageRecord[] {
  if (product.gallery?.length) {
    return [...product.gallery].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  const fallback: ProductImageRecord[] = [
    {
      id: `${product.id}-still`,
      type: "STILL",
      url: product.still,
      alt: product.alt,
      label: "OBJECT",
      sortOrder: 10,
    },
  ];

  if (product.worn) {
    fallback.push({
      id: `${product.id}-worn`,
      type: "WORN",
      url: product.worn,
      alt: `${product.name} worn`,
      label: "ON BODY",
      sortOrder: 20,
    });
  }

  return fallback;
}

export function getProductVariants(product: ArchiveProduct): ProductVariantRecord[] {
  if (product.variants?.length) {
    return product.variants.filter((variant) => variant.status !== "ARCHIVED");
  }

  // Demo inventory mirrors the production variant shape. The API can replace
  // this array without changing the product-detail/cart components.
  return product.sizes.map((size, index) => ({
    id: `${product.id}-${size}`,
    size,
    sku: `${product.id.toUpperCase()}-${size}`,
    price: product.priceValue,
    availableQty: index === product.sizes.length - 1 ? 3 : 8,
    status: "ACTIVE" as const,
    isDefault: size === product.defaultSize,
  }));
}

export function getVariantBySize(product: ArchiveProduct, size: string) {
  return getProductVariants(product).find((variant) => variant.size === size);
}
