import type { PublicProductRow } from "./products.repository.js";
import type {
  ProductFeature,
  ProductImage,
  ProductVariant,
  PublicProduct,
} from "./products.types.js";

function decimalToNumber(value: { toString(): string }): number {
  return Number(value.toString());
}

function mapImage(row: PublicProductRow["product_images"][number]): ProductImage {
  return {
    id: row.image_id.toString(),
    type: row.image_type,
    url: row.image_url,
    alt: row.alt_text,
    sortOrder: row.sort_order,
  };
}

function mapFeature(row: PublicProductRow["product_features"][number]): ProductFeature {
  return {
    id: row.feature_id.toString(),
    text: row.feature_text,
    sortOrder: row.sort_order,
  };
}

function mapVariant(row: PublicProductRow["product_variants"][number], basePrice: number): ProductVariant {
  const stock = row.inventory_stock;
  const onHandQty = stock?.on_hand_qty ?? 0;
  const reservedQty = stock?.reserved_qty ?? 0;
  const rawAvailableQty = Math.max(0, onHandQty - reservedQty);
  const availableQty = row.status === "ACTIVE" ? rawAvailableQty : 0;

  return {
    id: row.variant_id.toString(),
    size: row.sizes.code,
    sizeLabel: row.sizes.label,
    sizeGroup: row.sizes.size_group,
    sku: row.sku,
    price: row.price_override ? decimalToNumber(row.price_override) : basePrice,
    availableQty,
    onHandQty,
    reservedQty,
    status: row.status,
    isDefault: row.is_default,
  };
}

export function mapPublicProduct(row: PublicProductRow): PublicProduct {
  const basePrice = decimalToNumber(row.base_price);
  const images = row.product_images.map(mapImage);
  const features = row.product_features.map(mapFeature);
  const variants = [...row.product_variants]
    .sort((a, b) => a.sizes.sort_order - b.sizes.sort_order)
    .map((variant) => mapVariant(variant, basePrice));

  const defaultVariant =
    variants.find((variant) => variant.status === "ACTIVE" && variant.isDefault) ??
    variants.find((variant) => variant.status === "ACTIVE") ??
    null;

  const availableQty = variants.reduce(
    (sum, variant) => sum + (variant.status === "ACTIVE" ? variant.availableQty : 0),
    0,
  );

  return {
    id: row.public_id,
    slug: row.slug,
    indexCode: row.index_code,
    skuBase: row.sku_base,
    name: row.name,
    basePrice,
    currency: row.currency,
    spec: row.spec,
    tagline: row.tagline,
    description: row.description,
    category: {
      id: row.product_categories.slug,
      code: row.product_categories.code,
      slug: row.product_categories.slug,
      name: row.product_categories.name,
    },
    images,
    features,
    variants,
    defaultVariantId: defaultVariant?.id ?? null,
    primaryImage:
      images.find((image) => image.type === "STILL") ?? images[0] ?? null,
    wornImage: images.find((image) => image.type === "WORN") ?? null,
    availability: {
      status: availableQty > 0 ? "IN_STOCK" : "OUT_OF_STOCK",
      availableQty,
    },
  };
}
