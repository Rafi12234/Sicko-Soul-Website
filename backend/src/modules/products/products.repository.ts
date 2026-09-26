import type { Prisma } from "../../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import type { ProductListQuery } from "./products.types.js";

const publicProductInclude = {
  product_categories: {
    select: {
      code: true,
      slug: true,
      name: true,
      is_active: true,
    },
  },
  product_images: {
    orderBy: [{ sort_order: "asc" }, { image_id: "asc" }],
  },
  product_features: {
    orderBy: [{ sort_order: "asc" }, { feature_id: "asc" }],
  },
  product_variants: {
    where: {
      status: {
        not: "ARCHIVED",
      },
    },
    include: {
      sizes: true,
      inventory_stock: true,
    },
  },
} satisfies Prisma.productsInclude;

export type PublicProductRow = Prisma.productsGetPayload<{
  include: typeof publicProductInclude;
}>;

function buildPublicProductWhere(query: Pick<ProductListQuery, "category" | "q">) {
  const where: Prisma.productsWhereInput = {
    status: "ACTIVE",
    product_categories: {
      is: {
        is_active: true,
      },
    },
  };

  if (query.category) {
    where.product_categories = {
      is: {
        is_active: true,
        OR: [{ slug: query.category }, { code: query.category }],
      },
    };
  }

  if (query.q) {
    where.OR = [
      { public_id: { contains: query.q } },
      { slug: { contains: query.q } },
      { sku_base: { contains: query.q } },
      { name: { contains: query.q } },
      { spec: { contains: query.q } },
      { tagline: { contains: query.q } },
    ];
  }

  return where;
}

export async function listPublicProducts(query: ProductListQuery): Promise<{
  rows: PublicProductRow[];
  total: number;
}> {
  const where = buildPublicProductWhere(query);
  const skip = (query.page - 1) * query.limit;

  const [rows, total] = await Promise.all([
    prisma.products.findMany({
      where,
      include: publicProductInclude,
      orderBy: [{ category_id: "asc" }, { created_at: "desc" }, { product_id: "asc" }],
      skip,
      take: query.limit,
    }),
    prisma.products.count({ where }),
  ]);

  return { rows, total };
}

export function findPublicProductByIdentifier(identifier: string): Promise<PublicProductRow | null> {
  return prisma.products.findFirst({
    where: {
      status: "ACTIVE",
      product_categories: {
        is: {
          is_active: true,
        },
      },
      OR: [{ public_id: identifier }, { slug: identifier }],
    },
    include: publicProductInclude,
  });
}
