import type { ProductImageRecord, ProductVariantRecord } from "@/types/commerce";

/**
 * Product archive presentation contracts.
 *
 * IMPORTANT: this file intentionally contains no catalog records. All category,
 * product, image, price, size, variant and inventory values come from the API.
 * Only decorative/voice copy stays in source control.
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
  gallery: readonly ProductImageRecord[];
  variants: readonly ProductVariantRecord[];
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
  heroMeta: "SICKO SOUL · INTERNAL GARMENT INDEX",
  select: "SELECT A FILE",
  selectAside: "ACTIVE DATABASE CATEGORIES. ONE ROOM OPEN AT A TIME.",
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

export type ProductLookup = {
  product: ArchiveProduct;
  category: ArchiveCategory;
};

export function getProductGallery(product: ArchiveProduct): ProductImageRecord[] {
  return [...product.gallery].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getProductVariants(product: ArchiveProduct): ProductVariantRecord[] {
  return product.variants.filter((variant) => variant.status !== "ARCHIVED");
}

export function getVariantBySize(product: ArchiveProduct, size: string) {
  return getProductVariants(product).find((variant) => variant.size === size);
}
