import { mapPublicProduct } from "../products/products.mapper.js";
import type { CollectionDetailRow, CollectionSummaryRow } from "./collections.repository.js";
import type { PublicCollectionDetail, PublicCollectionSummary } from "./collections.types.js";

function iso(value: Date | null): string | null {
  return value?.toISOString() ?? null;
}

export function mapCollectionSummary(row: CollectionSummaryRow): PublicCollectionSummary {
  return {
    id: row.slug,
    code: row.code,
    slug: row.slug,
    name: row.name,
    tagline: row.tagline,
    releaseYear: row.release_year,
    status: row.status,
    opensAt: iso(row.opens_at),
    closesAt: iso(row.closes_at),
    productCount: row.collection_products.length,
  };
}

export function mapCollectionDetail(row: CollectionDetailRow): PublicCollectionDetail {
  return {
    ...mapCollectionSummary(row),
    products: row.collection_products.map((entry) => ({
      productId: entry.products.public_id,
      sealed: entry.is_sealed,
      sortOrder: entry.sort_order,
      product: mapPublicProduct(entry.products),
    })),
  };
}
