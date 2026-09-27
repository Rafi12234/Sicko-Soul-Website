import type { Prisma } from "../../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";

export const orderDetailInclude = {
  order_items: {
    orderBy: [{ order_item_id: "asc" }],
  },
  order_status_history: {
    orderBy: [{ changed_at: "asc" }, { history_id: "asc" }],
  },
  shipments: {
    include: {
      shipment_status_history: {
        orderBy: [{ changed_at: "asc" }, { history_id: "asc" }],
      },
    },
    orderBy: [{ shipment_id: "desc" }],
  },
  refunds: {
    orderBy: [{ created_at: "desc" }],
  },
  payments: {
    orderBy: [{ created_at: "desc" }],
  },
} satisfies Prisma.ordersInclude;

export type OrderDetailRow = Prisma.ordersGetPayload<{ include: typeof orderDetailInclude }>;

export function findOrderByReference(reference: string) {
  return prisma.orders.findFirst({
    where: { order_reference: reference },
    include: orderDetailInclude,
  });
}

export function findOrderByIdempotencyKey(key: string) {
  return prisma.orders.findUnique({
    where: { idempotency_key: key },
    include: orderDetailInclude,
  });
}

export function findOrderById(orderId: bigint) {
  return prisma.orders.findUnique({
    where: { order_id: orderId },
    include: orderDetailInclude,
  });
}
