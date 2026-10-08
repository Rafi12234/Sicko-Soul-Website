import { Prisma } from "../../../generated/prisma/client.js";
import { cleanupRateLimitBuckets } from "../../middleware/sensitive-rate-limit.js";
import { env } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";
import { logger } from "../../lib/logger.js";
import { releaseReservedStock } from "../inventory/inventory.service.js";

// ORDER_PENDING_TTL_MINUTES is now a STOCK-HOLD lifetime, NOT an order lifetime.
// Preserve the order request for staff review even if its unverified hold expires.
// Never auto-reject a COD/manual order because staff did not review it in time.
export async function expirePendingOrders(limit = 30): Promise<number> {
  const cutoff = new Date(Date.now() - env.ORDER_PENDING_TTL_MINUTES * 60_000);
  const candidates = await prisma.orders.findMany({
    where: {
      order_status: "PENDING_CONFIRMATION",
      reservation_released_at: null,
      created_at: { lt: cutoff },
    },
    select: { order_id: true },
    orderBy: [{ created_at: "asc" }],
    take: limit,
  });

  let released = 0;
  for (const candidate of candidates) {
    const didRelease = await prisma.$transaction(async (tx) => {
      // Serialize with staff confirmation/cancellation on the same order row.
      const locked = await tx.$queryRaw<Array<{ order_id: bigint }>>(
        Prisma.sql`SELECT order_id FROM orders WHERE order_id = ${candidate.order_id} FOR UPDATE`,
      );
      if (!locked.length) return false;
      const order = await tx.orders.findUnique({
        where: { order_id: candidate.order_id },
        include: { order_items: { select: { variant_id: true, quantity: true } } },
      });
      if (
        !order ||
        order.order_status !== "PENDING_CONFIRMATION" ||
        order.reservation_released_at !== null ||
        order.created_at >= cutoff
      ) return false;

      await releaseReservedStock(tx, order.order_items
        .filter((item): item is { variant_id: bigint; quantity: number } => item.variant_id !== null)
        .map((item) => ({ variantId: item.variant_id, quantity: item.quantity })), order.order_id);

      // No change to order_status, payment_status, or cancellation fields.
      // Mark once in the same transaction as stock release to prevent repeats.
      await tx.orders.update({
        where: { order_id: order.order_id },
        data: { reservation_released_at: new Date() },
      });
      return true;
    });
    if (didRelease) released++;
  }
  return released;
}

export function startPendingExpiryWorker(): () => void {
  let busy = false;
  let lastCleanup = 0;
  const run = async () => {
    if (busy) return;
    busy = true;
    try {
      const count = await expirePendingOrders();
      if (count) logger.info({ count }, "expired pending stock holds released; orders remain pending");
      if (Date.now() - lastCleanup > 60 * 60_000) { await cleanupRateLimitBuckets(); lastCleanup = Date.now(); }
    }
    catch (err) { logger.error({ err }, "pending stock hold release failed"); }
    finally { busy = false; }
  };
  void run();
  const timer = setInterval(() => { void run(); }, env.ORDER_EXPIRY_WORKER_INTERVAL_MS);
  timer.unref();
  return () => clearInterval(timer);
}
