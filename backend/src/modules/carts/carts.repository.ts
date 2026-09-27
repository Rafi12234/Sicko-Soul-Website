import type { Prisma } from "../../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";

export const cartInclude = {
  cart_items: {
    include: {
      product_variants: {
        include: {
          sizes: true,
          inventory_stock: true,
          products: {
            include: {
              product_categories: {
                select: {
                  name: true,
                  index_code: true,
                  slug: true,
                },
              },
              product_images: {
                orderBy: [{ sort_order: "asc" }, { image_id: "asc" }],
              },
            },
          },
        },
      },
    },
    orderBy: [{ created_at: "asc" }, { cart_item_id: "asc" }],
  },
} satisfies Prisma.cartsInclude;

export type CartRow = Prisma.cartsGetPayload<{ include: typeof cartInclude }>;

export function findCartByToken(cartToken: string) {
  return prisma.carts.findUnique({
    where: { cart_token: cartToken },
    include: cartInclude,
  });
}
