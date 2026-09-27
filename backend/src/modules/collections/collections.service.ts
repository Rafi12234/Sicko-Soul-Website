import type { Prisma } from "../../../generated/prisma/client.js";
import { AppError } from "../../errors/app-error.js";
import { prisma } from "../../lib/prisma.js";
import type { AuditContext } from "../../types/auth.js";
import { recordAudit } from "../../services/audit.service.js";
import { mapCollectionDetail, mapCollectionSummary } from "./collections.mapper.js";
import {
  findPublicCollection,
  getAdminCollection,
  listAdminCollections,
  listPublicCollections,
} from "./collections.repository.js";


function mapAdminCollection(row: NonNullable<Awaited<ReturnType<typeof getAdminCollection>>>) {
  return {
    id: row.collection_id.toString(),
    code: row.code,
    slug: row.slug,
    name: row.name,
    tagline: row.tagline,
    releaseYear: row.release_year,
    status: row.status,
    opensAt: row.opens_at?.toISOString() ?? null,
    closesAt: row.closes_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    products: row.collection_products.map((entry) => ({
      productId: entry.products.public_id,
      productName: entry.products.name,
      productSlug: entry.products.slug,
      productStatus: entry.products.status,
      sortOrder: entry.sort_order,
      sealed: entry.is_sealed,
    })),
  };
}

async function readAdminCollection(collectionId: bigint) {
  const row = await getAdminCollection(collectionId);
  if (!row) {
    throw new AppError({
      statusCode: 404,
      code: "COLLECTION_NOT_FOUND",
      message: "Collection was not found.",
    });
  }
  return mapAdminCollection(row);
}

export async function getPublicCollections() {
  return (await listPublicCollections()).map(mapCollectionDetail);
}

export async function getPublicCollection(slug: string) {
  const row = await findPublicCollection(slug);
  if (!row) {
    throw new AppError({
      statusCode: 404,
      code: "COLLECTION_NOT_FOUND",
      message: "Collection was not found.",
    });
  }
  return mapCollectionDetail(row);
}

export async function getCollectionsForAdmin() {
  return (await listAdminCollections()).map((row) => ({
    id: row.collection_id.toString(),
    code: row.code,
    slug: row.slug,
    name: row.name,
    tagline: row.tagline,
    releaseYear: row.release_year,
    status: row.status,
    opensAt: row.opens_at?.toISOString() ?? null,
    closesAt: row.closes_at?.toISOString() ?? null,
    productCount: row._count.collection_products,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }));
}

export async function createCollectionForAdmin(
  input: {
    code: string;
    slug: string;
    name: string;
    tagline?: string | null | undefined;
    releaseYear?: number | null | undefined;
    status: "DRAFT" | "SCHEDULED" | "LIVE" | "SEALED" | "ARCHIVED";
    opensAt?: string | null | undefined;
    closesAt?: string | null | undefined;
  },
  audit: AuditContext,
) {
  const row = await prisma.collections.create({
    data: {
      code: input.code,
      slug: input.slug,
      name: input.name,
      tagline: input.tagline ?? null,
      release_year: input.releaseYear ?? null,
      status: input.status,
      opens_at: input.opensAt ? new Date(input.opensAt) : null,
      closes_at: input.closesAt ? new Date(input.closesAt) : null,
    },
  });
  await recordAudit(audit, {
    action: "COLLECTION_CREATE",
    entityType: "collection",
    entityId: row.collection_id,
    newData: { code: row.code, slug: row.slug, name: row.name, status: row.status },
  });
  return readAdminCollection(row.collection_id);
}

export async function updateCollectionForAdmin(
  collectionId: bigint,
  input: {
    code?: string | undefined;
    slug?: string | undefined;
    name?: string | undefined;
    tagline?: string | null | undefined;
    releaseYear?: number | null | undefined;
    status?: "DRAFT" | "SCHEDULED" | "LIVE" | "SEALED" | "ARCHIVED" | undefined;
    opensAt?: string | null | undefined;
    closesAt?: string | null | undefined;
  },
  audit: AuditContext,
) {
  const old = await prisma.collections.findUnique({ where: { collection_id: collectionId } });
  if (!old) throw new AppError({ statusCode: 404, code: "COLLECTION_NOT_FOUND", message: "Collection was not found." });

  const data: Prisma.collectionsUpdateInput = {};
  if (input.code !== undefined) data.code = input.code;
  if (input.slug !== undefined) data.slug = input.slug;
  if (input.name !== undefined) data.name = input.name;
  if (input.tagline !== undefined) data.tagline = input.tagline;
  if (input.releaseYear !== undefined) data.release_year = input.releaseYear;
  if (input.status !== undefined) data.status = input.status;
  if (input.opensAt !== undefined) data.opens_at = input.opensAt ? new Date(input.opensAt) : null;
  if (input.closesAt !== undefined) data.closes_at = input.closesAt ? new Date(input.closesAt) : null;

  const row = await prisma.collections.update({
    where: { collection_id: collectionId },
    data,
  });
  await recordAudit(audit, {
    action: "COLLECTION_UPDATE",
    entityType: "collection",
    entityId: collectionId,
    oldData: old,
    newData: row,
  });
  return readAdminCollection(collectionId);
}

export async function setCollectionProductsForAdmin(
  collectionId: bigint,
  input: { products: Array<{ productId: string; sortOrder: number; sealed: boolean }> },
  audit: AuditContext,
) {
  const collection = await prisma.collections.findUnique({ where: { collection_id: collectionId } });
  if (!collection) throw new AppError({ statusCode: 404, code: "COLLECTION_NOT_FOUND", message: "Collection was not found." });

  const uniqueProductIds = [...new Set(input.products.map((item) => item.productId))];
  const products = await prisma.products.findMany({
    where: { public_id: { in: uniqueProductIds } },
    select: { product_id: true, public_id: true },
  });
  if (products.length !== uniqueProductIds.length) {
    throw new AppError({ statusCode: 422, code: "UNKNOWN_COLLECTION_PRODUCT", message: "One or more collection products do not exist." });
  }
  const byPublicId = new Map(products.map((p) => [p.public_id, p.product_id]));

  await prisma.$transaction(async (tx) => {
    await tx.collection_products.deleteMany({ where: { collection_id: collectionId } });
    if (input.products.length > 0) {
      await tx.collection_products.createMany({
        data: input.products.map((item) => ({
          collection_id: collectionId,
          product_id: byPublicId.get(item.productId)!,
          sort_order: item.sortOrder,
          is_sealed: item.sealed,
        })),
      });
    }
  });

  await recordAudit(audit, {
    action: "COLLECTION_PRODUCTS_SET",
    entityType: "collection",
    entityId: collectionId,
    newData: input,
  });

  return readAdminCollection(collectionId);
}
