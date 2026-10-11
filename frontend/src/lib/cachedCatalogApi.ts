/**
 * Shared, short-lived cache for public catalog display data.
 *
 * The homepage and Products page use the same immutable presentation payload
 * during a brief window, rather than repeating every categories/products query.
 * No cart, checkout, individual product detail or admin mutation is cached.
 * Changes in the Control Room become visible after the short revalidation window;
 * the cart/checkout endpoints still validate live inventory and prices.
 */
import { unstable_cache } from "next/cache";
import { getCatalogArchive, listCatalogSegments } from "@/lib/catalogApi";

const REVALIDATE_SECONDS = 10;

export const getCachedCatalogArchive = unstable_cache(
  getCatalogArchive,
  ["sicko-public-catalog-archive-v1"],
  { revalidate: REVALIDATE_SECONDS, tags: ["sicko-public-catalog"] },
);

export const getCachedCatalogSegments = unstable_cache(
  listCatalogSegments,
  ["sicko-public-catalog-segments-v1"],
  { revalidate: REVALIDATE_SECONDS, tags: ["sicko-public-catalog"] },
);
