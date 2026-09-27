import type { Prisma } from "../../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import { publicProductInclude } from "../products/products.repository.js";

const visibleCollectionStatuses = ["SCHEDULED", "LIVE", "SEALED", "ARCHIVED"] as const;

const publicMembershipWhere = {
  products: {
    is: {
      status: "ACTIVE",
      product_categories: {
        is: { is_active: true },
      },
    },
  },
} satisfies Prisma.collection_productsWhereInput;

const summaryInclude = {
  collection_products: {
    where: publicMembershipWhere,
    select: { product_id: true },
  },
} satisfies Prisma.collectionsInclude;

const detailInclude = {
  collection_products: {
    where: publicMembershipWhere,
    include: {
      products: {
        include: publicProductInclude,
      },
    },
    orderBy: [{ sort_order: "asc" }, { product_id: "asc" }],
  },
} satisfies Prisma.collectionsInclude;

export type CollectionSummaryRow = Prisma.collectionsGetPayload<{ include: typeof summaryInclude }>;
export type CollectionDetailRow = Prisma.collectionsGetPayload<{ include: typeof detailInclude }>;

export function listPublicCollections() {
  return prisma.collections.findMany({
    where: { status: { in: [...visibleCollectionStatuses] } },
    include: detailInclude,
    orderBy: [{ release_year: "desc" }, { opens_at: "desc" }, { collection_id: "desc" }],
  });
}

export function findPublicCollection(slug: string) {
  return prisma.collections.findFirst({
    where: {
      slug,
      status: { in: [...visibleCollectionStatuses] },
    },
    include: detailInclude,
  });
}

export function listAdminCollections() {
  return prisma.collections.findMany({
    include: {
      _count: { select: { collection_products: true } },
    },
    orderBy: [{ collection_id: "desc" }],
  });
}

export function getAdminCollection(collectionId: bigint) {
  return prisma.collections.findUnique({
    where: { collection_id: collectionId },
    include: {
      collection_products: {
        include: {
          products: {
            select: { public_id: true, name: true, slug: true, status: true },
          },
        },
        orderBy: [{ sort_order: "asc" }, { product_id: "asc" }],
      },
    },
  });
}
