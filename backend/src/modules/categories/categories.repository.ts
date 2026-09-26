import type { Prisma } from "../../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";

const publicCategorySelect = {
  category_id: true,
  code: true,
  slug: true,
  index_code: true,
  name: true,
  ghost_name: true,
  spec: true,
  tagline: true,
  registry: true,
  cover_url: true,
  cover_alt: true,
  sort_order: true,
  products: {
    where: {
      status: "ACTIVE",
    },
    select: {
      product_id: true,
    },
  },
} satisfies Prisma.product_categoriesSelect;

export type PublicCategoryRow = Prisma.product_categoriesGetPayload<{
  select: typeof publicCategorySelect;
}>;

export function listPublicCategories(): Promise<PublicCategoryRow[]> {
  return prisma.product_categories.findMany({
    where: {
      is_active: true,
    },
    select: publicCategorySelect,
    orderBy: [{ sort_order: "asc" }, { category_id: "asc" }],
  });
}
