import type { ArchiveCategory, ArchiveProduct, ProductLookup } from "@/data/products";
import { apiRequest, type DataEnvelope } from "@/lib/apiClient";
import { MEDIA } from "@/lib/media";
import type {
  PublicCategoryRecord,
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

function moneyLabel(value: number) {
  return `৳ ${new Intl.NumberFormat("en-BD", { maximumFractionDigits: 0 }).format(value)}`;
}

export function archiveProductFromApi(record: PublicProductRecord): ArchiveProduct {
  const gallery: ProductImageRecord[] = record.images
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((image) => ({
      id: image.id,
      type: image.type,
      url: image.url,
      alt: image.alt ?? record.name,
      label: image.type === "STILL" ? "OBJECT" : image.type === "WORN" ? "ON BODY" : undefined,
      sortOrder: image.sortOrder,
    }));

  const variants: ProductVariantRecord[] = record.variants.map((variant) => ({
    id: variant.id,
    size: variant.size,
    sku: variant.sku,
    price: variant.price,
    availableQty: variant.availableQty,
    status: variant.status,
    isDefault: variant.isDefault,
  }));

  const defaultVariant =
    variants.find((variant) => variant.id === record.defaultVariantId) ??
    variants.find((variant) => variant.status === "ACTIVE") ??
    variants[0];
  const still = record.primaryImage ?? gallery[0] ?? null;
  const worn = record.wornImage;
  const displayPrice = defaultVariant?.price ?? record.basePrice;

  return {
    id: record.id,
    index: record.indexCode ?? "00",
    name: record.name,
    price: moneyLabel(displayPrice),
    priceValue: displayPrice,
    spec: record.spec ?? "",
    line: record.tagline ?? "",
    description: record.description ?? "",
    details: record.features
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((feature) => feature.text),
    sizes: variants.filter((variant) => variant.status !== "ARCHIVED").map((variant) => variant.size),
    defaultSize: defaultVariant?.size ?? variants[0]?.size ?? "",
    still: still?.url ?? MEDIA.images.logo,
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
  return {
    id: category.slug,
    index: category.indexCode ?? "00",
    name: category.name,
    ghost: category.ghostName ?? category.name,
    cover: category.coverUrl ?? products[0]?.primaryImage?.url ?? MEDIA.images.logo,
    coverAlt: category.coverAlt ?? `${category.name} category`,
    spec: category.spec ?? "",
    line: category.tagline ?? "",
    registry: category.registry ?? category.code,
    products: products
      .filter((product) => product.category.slug === category.slug)
      .map(archiveProductFromApi),
  };
}

export async function listCatalogProducts(category?: string): Promise<PublicProductRecord[]> {
  const query = new URLSearchParams({ page: "1", limit: "50" });
  if (category) query.set("category", category);
  const result = await apiRequest<ProductListEnvelope>(`/products?${query.toString()}`, {
    cache: "no-store",
  });
  return result.data;
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
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((category) => archiveCategoryFromApi(category, products));
}

export async function getCatalogProduct(identifier: string): Promise<ProductLookup> {
  const [product, categories] = await Promise.all([
    getCatalogProductRecord(identifier),
    listCatalogCategories(),
  ]);
  const categoryRecord = categories.find((entry) => entry.slug === product.category.slug);

  const category: ArchiveCategory = categoryRecord
    ? archiveCategoryFromApi(categoryRecord, [product])
    : {
        id: product.category.slug,
        index: "00",
        name: product.category.name,
        ghost: product.category.name,
        cover: product.primaryImage?.url ?? MEDIA.images.logo,
        coverAlt: product.primaryImage?.alt ?? product.category.name,
        spec: "",
        line: "",
        registry: product.category.code,
        products: [],
      };

  const archiveProduct = archiveProductFromApi(product);
  return {
    product: archiveProduct,
    category: { ...category, products: [archiveProduct] },
  };
}
