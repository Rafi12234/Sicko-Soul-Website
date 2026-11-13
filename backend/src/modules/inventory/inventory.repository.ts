import { Prisma } from "../../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";

export type LockedStockRow = {
  variant_id: bigint;
  on_hand_qty: number;
  reserved_qty: number;
};

export async function lockStockRows(
  tx: Prisma.TransactionClient,
  variantIds: bigint[],
): Promise<LockedStockRow[]> {
  if (variantIds.length === 0) return [];

  // Always acquire row locks in the same deterministic order. This reduces the
  // chance of deadlocks when two checkouts contain the same variants in a
  // different client-side order.
  const orderedIds = [...new Set(variantIds.map((id) => id.toString()))]
    .map((id) => BigInt(id))
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

  return tx.$queryRaw<LockedStockRow[]>(
    Prisma.sql`
      SELECT variant_id, on_hand_qty, reserved_qty
      FROM inventory_stock
      WHERE variant_id IN (${Prisma.join(orderedIds)})
      ORDER BY variant_id
      FOR UPDATE
    `,
  );
}

const inventoryListInclude = {
  product_variants: {
    include: {
      sizes: true,
      products: {
        select: {
          public_id: true,
          name: true,
          currency: true,
          base_price: true,
        },
      },
    },
  },
} satisfies Prisma.inventory_stockInclude;

export type InventoryListRow = Prisma.inventory_stockGetPayload<{
  include: typeof inventoryListInclude;
}>;

/** Admin inventory only: do not resurrect archived demo products (or retired sizes).
 * Draft and inactive products remain editable so staff can stock them before launch.
 */
export function listInventoryRows(q?: string): Promise<InventoryListRow[]> {
  const search = q?.trim();
  const where: Prisma.inventory_stockWhereInput = {
    product_variants: {
      is: {
        status: { not: "ARCHIVED" },
        products: { is: { status: { not: "ARCHIVED" } } },
        ...(search
          ? {
              OR: [
                { sku: { contains: search } },
                { products: { is: { public_id: { contains: search } } } },
                { products: { is: { name: { contains: search } } } },
              ],
            }
          : {}),
      },
    },
  };

  return prisma.inventory_stock.findMany({
    where,
    include: inventoryListInclude,
    orderBy: [{ variant_id: "asc" }],
  });
}

export function getInventoryMovementRows(variantId: bigint) {
  return prisma.inventory_movements.findMany({
    where: { variant_id: variantId },
    include: {
      staff_users: {
        select: { full_name: true, email: true },
      },
    },
    orderBy: [{ created_at: "desc" }, { movement_id: "desc" }],
    take: 200,
  });
}
