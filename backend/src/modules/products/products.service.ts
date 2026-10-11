import { AppError } from "../../errors/app-error.js";
import { mapPublicProduct } from "./products.mapper.js";
import {
  findPublicProductByIdentifier,
  listPublicProducts,
} from "./products.repository.js";
import type {
  ProductListQuery,
  ProductListResult,
  PublicProduct,
} from "./products.types.js";

// This cache is only for the *public listing*. Cart, checkout, individual
// product reads, inventory operations and all admin APIs remain live.
// Remote MariaDB round-trips can be slow even on a local development machine.
// Cache resolved responses and coalesce simultaneous identical page requests.
// Never cache free-text search to keep memory bounded and results responsive.
const LIST_CACHE_MS = 8_000;
const LIST_CACHE_MAX_KEYS = 32;
type ListCacheEntry = { expiresAt: number; request: Promise<ProductListResult> };
const listCache = new Map<string, ListCacheEntry>();

async function loadPublicProducts(query: ProductListQuery): Promise<ProductListResult> {
  const { rows, total } = await listPublicProducts(query);
  return {
    products: rows.map(mapPublicProduct),
    page: query.page,
    limit: query.limit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / query.limit),
  };
}

export async function getPublicProducts(query: ProductListQuery): Promise<ProductListResult> {
  if (query.q) return loadPublicProducts(query);

  const key = `${query.category ?? ""}|${query.page}|${query.limit}`;
  const now = Date.now();
  const found = listCache.get(key);
  if (found && found.expiresAt > now) return found.request;
  if (found) listCache.delete(key);

  // Expired requests are removed before trimming; the Map preserves insertion
  // order, making the oldest entry a safe bounded eviction candidate.
  for (const [itemKey, entry] of listCache) {
    if (entry.expiresAt <= now) listCache.delete(itemKey);
  }
  while (listCache.size >= LIST_CACHE_MAX_KEYS) {
    const oldestKey = listCache.keys().next().value;
    if (oldestKey === undefined) break;
    listCache.delete(oldestKey);
  }

  const request = loadPublicProducts(query);
  listCache.set(key, { expiresAt: now + LIST_CACHE_MS, request });
  // Never let a temporary DB error poison the next request.
  void request.catch(() => {
    if (listCache.get(key)?.request === request) listCache.delete(key);
  });
  return request;
}

export async function getPublicProduct(identifier: string): Promise<PublicProduct> {
  const row = await findPublicProductByIdentifier(identifier);

  if (!row) {
    throw new AppError({
      statusCode: 404,
      code: "PRODUCT_NOT_FOUND",
      message: "Product was not found.",
    });
  }

  return mapPublicProduct(row);
}
