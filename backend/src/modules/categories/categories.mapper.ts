import type { PublicCategoryRow } from "./categories.repository.js";
import type { PublicCategory } from "./categories.types.js";

export function mapPublicCategory(row: PublicCategoryRow): PublicCategory {
  return {
    id: row.slug,
    code: row.code,
    slug: row.slug,
    indexCode: row.index_code,
    name: row.name,
    ghostName: row.ghost_name,
    spec: row.spec,
    tagline: row.tagline,
    registry: row.registry,
    coverUrl: row.cover_url,
    coverAlt: row.cover_alt,
    sortOrder: row.sort_order,
    productCount: row.products.length,
    segment: {
      id: row.catalog_segments!.segment_id.toString(),
      slug: row.catalog_segments!.slug,
      name: row.catalog_segments!.name,
      sortOrder: row.catalog_segments!.sort_order,
    },
  };
}
