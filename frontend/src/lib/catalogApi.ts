import type { ArchiveCategory, ArchiveProduct, ProductLookup } from "@/data/products";
import { apiRequest, type DataEnvelope } from "@/lib/apiClient";
import type {
  PublicCategoryRecord,
  CatalogSegmentRecord,
  PublicProductRecord,
  ProductImageRecord,
  ProductVariantRecord,
} from "@/types/commerce";

type ProductListEnvelope = {
  data: PublicProductRecord[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type CategoryListEnvelope = {
  data: PublicCategoryRecord[];
  meta: { count: number };
};

const PRODUCT_PAGE_SIZE = 50;

function moneyLabel(value: number) {
  return `৳ ${new Intl.NumberFormat("en-BD", { maximumFractionDigits: 0 }).format(value)}`;
}

/**
 * Backward compatibility for backend instances that have not been restarted with
 * the new colour-aware product mapper yet. Older responses omit `colorCode`,
 * but the real-catalogue image alt text and variant SKU still identify colour.
 * A supplied API colour always wins, so admin-created colours remain dynamic.
 */
function resolveProductColor(
  colorCode: string | null | undefined,
  ...hints: Array<string | null | undefined>
): string {
  const explicit = typeof colorCode === "string" ? colorCode.trim().toUpperCase() : "";
  if (explicit) return explicit;

  for (const hint of hints) {
    const match = hint?.match(/(?:^|[^a-z0-9])(BLACK|WHITE)(?=$|[^a-z0-9])/i);
    if (match?.[1]) return match[1].toUpperCase();
  }
  return "BLACK";
}

/**
 * The first real-catalogue spreadsheet import accidentally labelled model photos
 * (`*_front_*`) as STILL and the garment-only photos (`*_F_*`) as WORN.
 *
 * Correct only that exact legacy import shape. New admin-uploaded products and
 * intentionally reordered galleries keep their database-defined image order.
 * Once the one-time image-order SQL has corrected the database, this is a no-op.
 */
function correctInitialRealCatalogueFrames(
  productId: string,
  images: ProductImageRecord[],
): ProductImageRecord[] {
  if (!productId.startsWith("SS-REAL-")) return images;

  const corrected = images.map(image => ({ ...image }));
  const colors = Array.from(new Set(corrected.map(image => image.colorCode)));

  for (const color of colors) {
    const frames = corrected
      .filter(image => image.colorCode === color)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    // Only adjust untouched four-frame imports: model front, model back,
    // garment front, garment back. Admin order overrides remain respected.
    if (
      frames.length !== 4 ||
      frames[0].type !== "STILL" ||
      frames[2].type !== "WORN" ||
      !/_front_[^/]+\.(?:png|jpe?g|webp)(?:\?.*)?$/i.test(frames[0].url) ||
      !/_F_[^/]+\.(?:png|jpe?g|webp)(?:\?.*)?$/i.test(frames[2].url) ||
      !/_B_[^/]+\.(?:png|jpe?g|webp)(?:\?.*)?$/i.test(frames[3].url)
    ) continue;

    const firstOrder = frames[0].sortOrder;
    frames[2].sortOrder = firstOrder;
    frames[2].type = "STILL";
    frames[2].label = "T-SHIRT FRONT";
    frames[3].sortOrder = firstOrder + 10;
    frames[1].sortOrder = firstOrder + 30;
    frames[0].sortOrder = firstOrder + 20;
    frames[0].type = "WORN";
    frames[0].label = "ON MODEL";
  }

  return corrected.sort((a, b) => a.sortOrder - b.sortOrder);
}

export function archiveProductFromApi(record: PublicProductRecord): ArchiveProduct {
  const importedGallery: ProductImageRecord[] = record.images
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((image) => ({
      id: image.id,
      type: image.type,
      colorCode: resolveProductColor(image.colorCode, image.alt, image.url),
      url: image.url,
      alt: image.alt ?? record.name,
      label: image.type === "STILL" ? "OBJECT" : image.type === "WORN" ? "ON BODY" : undefined,
      sortOrder: image.sortOrder,
    }));

  const gallery = correctInitialRealCatalogueFrames(record.id, importedGallery);

  const variants: ProductVariantRecord[] = record.variants.map((variant) => ({
    id: variant.id,
    size: variant.size,
    colorCode: resolveProductColor(variant.colorCode, variant.sku),
    sku: variant.sku,
    price: variant.price,
    inStock: variant.inStock,
    status: variant.status,
    isDefault: variant.isDefault,
  }));

  const defaultVariant =
    variants.find((variant) => variant.id === record.defaultVariantId) ??
    variants.find((variant) => variant.status === "ACTIVE") ??
    variants[0];
  // The normalized gallery decides the hero image, not the stale API primaryImage
  // metadata from the initial import. The default colour remains Black.
  const still =
    gallery.find(image => image.type === "STILL" && image.colorCode === defaultVariant?.colorCode) ??
    gallery.find(image => image.type === "STILL") ??
    record.primaryImage ??
    gallery[0] ??
    null;
  const worn =
    gallery.find(image => image.type === "WORN" && image.colorCode === defaultVariant?.colorCode) ??
    gallery.find(image => image.type === "WORN") ??
    record.wornImage;
  const displayPrice = defaultVariant?.price ?? record.basePrice;

  return {
    id: record.id,
    index: record.indexCode ?? "00",
    name: record.name,
    price: moneyLabel(displayPrice),
    priceValue: displayPrice,
    inStock: record.availability.status === "IN_STOCK",
    spec: record.spec ?? "",
    line: record.tagline ?? "",
    description: record.description ?? "",
    details: record.features
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((feature) => feature.text),
    sizes: Array.from(new Set(variants.filter((variant) => variant.status !== "ARCHIVED").map((variant) => variant.size))),
    defaultSize: defaultVariant?.size ?? "",
    still: still?.url ?? "",
    worn: worn?.url,
    alt: still?.alt ?? record.name,
    gallery,
    variants,
  };
}

export function archiveCategoryFromApi(
  category: PublicCategoryRecord,
  products: PublicProductRecord[],
): ArchiveCategory {
  const categoryProducts = products.filter((product) => product.category.slug === category.slug);
  return {
    id: category.slug,
    segment: category.segment,
    index: category.indexCode ?? "00",
    name: category.name,
    ghost: category.ghostName ?? category.name,
    cover: category.coverUrl ?? categoryProducts[0]?.primaryImage?.url ?? "",
    coverAlt: category.coverAlt ?? `${category.name} category`,
    spec: category.spec ?? "",
    line: category.tagline ?? "",
    registry: category.registry ?? category.code,
    products: categoryProducts.map(archiveProductFromApi),
  };
}

async function getProductPage(category: string | undefined, page: number) {
  const query = new URLSearchParams({ page: String(page), limit: String(PRODUCT_PAGE_SIZE) });
  if (category) query.set("category", category);
  return apiRequest<ProductListEnvelope>(`/products?${query.toString()}`, {
    cache: "no-store",
  });
}

/** Fetch every active product page so newly inserted products are never hidden by the API page size. */
export async function listCatalogProducts(category?: string): Promise<PublicProductRecord[]> {
  const first = await getProductPage(category, 1);
  if (first.meta.totalPages <= 1) return first.data;

  const rest = await Promise.all(
    Array.from({ length: first.meta.totalPages - 1 }, (_, index) =>
      getProductPage(category, index + 2),
    ),
  );

  return [first, ...rest].flatMap((page) => page.data);
}

export async function listCatalogSegments(): Promise<CatalogSegmentRecord[]> {
  const result = await apiRequest<DataEnvelope<CatalogSegmentRecord[]>>("/segments", { cache: "no-store" });
  return result.data.slice().sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function listCatalogCategories(): Promise<PublicCategoryRecord[]> {
  const result = await apiRequest<CategoryListEnvelope>("/categories", { cache: "no-store" });
  return result.data;
}

export async function getCatalogProductRecord(identifier: string): Promise<PublicProductRecord> {
  const result = await apiRequest<DataEnvelope<PublicProductRecord>>(
    `/products/${encodeURIComponent(identifier)}`,
    { cache: "no-store" },
  );
  return result.data;
}

export async function getCatalogArchive(): Promise<ArchiveCategory[]> {
  const [categories, products] = await Promise.all([
    listCatalogCategories(),
    listCatalogProducts(),
  ]);

  return categories
    .slice()
    .sort((a, b) => a.segment.sortOrder - b.segment.sortOrder || a.sortOrder - b.sortOrder)
    .map((category) => archiveCategoryFromApi(category, products));
}

export async function getCatalogProduct(identifier: string): Promise<ProductLookup> {
  const product = await getCatalogProductRecord(identifier);
  const [categories, relatedProducts] = await Promise.all([
    listCatalogCategories(),
    listCatalogProducts(product.category.slug),
  ]);
  const categoryRecord = categories.find((entry) => entry.slug === product.category.slug);

  const category: ArchiveCategory = categoryRecord
    ? archiveCategoryFromApi(categoryRecord, relatedProducts)
    : {
        id: product.category.slug,
        segment: null,
        index: "00",
        name: product.category.name,
        ghost: product.category.name,
        cover: product.primaryImage?.url ?? "",
        coverAlt: product.primaryImage?.alt ?? product.category.name,
        spec: "",
        line: "",
        registry: product.category.code,
        products: relatedProducts.map(archiveProductFromApi),
      };

  const archiveProduct = archiveProductFromApi(product);
  const hasCurrent = category.products.some((entry) => entry.id === archiveProduct.id);

  return {
    product: archiveProduct,
    category: hasCurrent
      ? category
      : { ...category, products: [archiveProduct, ...category.products] },
  };
}
