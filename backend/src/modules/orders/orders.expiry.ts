import { Prisma } from "../../../generated/prisma/client.js";
import { cleanupRateLimitBuckets } from "../../middleware/sensitive-rate-limit.js";
import { env } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";
import { logger } from "../../lib/logger.js";
import { releaseReservedStock } from "../inventory/inventory.service.js";
import { enqueueEmail } from "../email/email.service.js";

export async function expirePendingOrders(limit = 30): Promise<number> {
  const cutoff = new Date(Date.now() - env.ORDER_PENDING_TTL_MINUTES * 60_000);
  const candidates = await prisma.orders.findMany({
    where: { order_status: "PENDING_CONFIRMATION", created_at: { lt: cutoff } },
    select: { order_id: true }, orderBy: [{ created_at: "asc" }], take: limit,
  });
  let expired = 0;
  for (const candidate of candidates) {
    const didExpire = await prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<Array<{ order_id: bigint }>>(
        Prisma.sql`SELECT order_id FROM orders WHERE order_id = ${candidate.order_id} FOR UPDATE`,
      );
      if (!locked.length) return false;
      const order = await tx.orders.findUnique({
        where: { order_id: candidate.order_id },
        include: { order_items: { select: { variant_id: true, quantity: true } } },
      });
      if (!order || order.order_status !== "PENDING_CONFIRMATION" || order.created_at >= cutoff) return false;
      await releaseReservedStock(tx, order.order_items
        .filter((item): item is {variant_id: bigint; quantity: number} => item.variant_id !== null)
        .map((item) => ({ variantId: item.variant_id, quantity: item.quantity })), order.order_id);
      await tx.orders.update({
        where: { order_id: order.order_id },
        data: { order_status: "REJECTED", cancelled_at: new Date(), cancellation_reason: "Pending order expired without staff confirmation." },
      });
      await tx.order_status_history.create({
        data: { order_id: order.order_id, from_status: "PENDING_CONFIRMATION", to_status: "REJECTED", note: "Automatic timeout: stock released." },
      });
      await enqueueEmail(tx, {
        dedupeKey: `order-expired:${order.order_id.toString()}`, eventType: "ORDER_CANCELLED",
        orderId: order.order_id, customerId: order.customer_id,
        recipientName: order.customer_name, recipientEmail: order.customer_email,
        subject: `SICKO SOUL / ORDER ${order.order_reference} EXPIRED`,
        templateKey: "order-cancelled",
        payload: { orderReference: order.order_reference, status: "REJECTED", reason: "Pending order confirmation window expired." },
      });
      return true;
    });
    if (didExpire) expired++;
  }
  return expired;
}

export function startPendingExpiryWorker(): () => void {
  let busy = false;
  let lastCleanup = 0;
  const run = async () => {
    if (busy) return;
    busy = true;
    try {
      const count = await expirePendingOrders(); if (count) logger.info({ count }, "expired pending order holds");
      if (Date.now() - lastCleanup > 60 * 60_000) { await cleanupRateLimitBuckets(); lastCleanup = Date.now(); }
    }
    catch (err) { logger.error({ err }, "pending order expiry failed"); }
    finally { busy = false; }
  };
  void run();
  const timer = setInterval(() => { void run(); }, env.ORDER_EXPIRY_WORKER_INTERVAL_MS);
  timer.unref();
  return () => clearInterval(timer);
}
