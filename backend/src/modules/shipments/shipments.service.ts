import type { shipments_status } from "../../../generated/prisma/client.js";
import { AppError } from "../../errors/app-error.js";
import { prisma } from "../../lib/prisma.js";
import { recordAudit } from "../../services/audit.service.js";
import type { AuditContext } from "../../types/auth.js";
import { decimalToNumber } from "../../utils/decimal.js";
import { enqueueEmail } from "../email/email.service.js";
import { returnSoldStock } from "../inventory/inventory.service.js";

function mapShipment(row: {
  shipment_id: bigint;
  order_id: bigint;
  courier_name: string | null;
  courier_service: string | null;
  tracking_code: string | null;
  status: shipments_status;
  shipping_cost: { toString(): string };
  shipped_at: Date | null;
  delivered_at: Date | null;
  created_at: Date;
  updated_at: Date;
}) {
  return {
    id: row.shipment_id.toString(),
    orderId: row.order_id.toString(),
    courierName: row.courier_name,
    courierService: row.courier_service,
    trackingCode: row.tracking_code,
    status: row.status,
    shippingCost: decimalToNumber(row.shipping_cost),
    shippedAt: row.shipped_at?.toISOString() ?? null,
    deliveredAt: row.delivered_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function listShipmentsForAdmin() {
  const rows = await prisma.shipments.findMany({
    include: {
      orders: {
        select: {
          order_reference: true,
          customer_name: true,
          customer_email: true,
        },
      },
    },
    orderBy: [{ created_at: "desc" }],
    take: 300,
  });
  return rows.map((row) => ({
    ...mapShipment(row),
    orderReference: row.orders.order_reference,
    customerName: row.orders.customer_name,
    customerEmail: row.orders.customer_email,
  }));
}

export async function createShipmentForAdmin(
  input: {
    orderReference: string;
    courierName?: string | null | undefined;
    courierService?: string | null | undefined;
    trackingCode?: string | null | undefined;
    shippingCost: number;
  },
  audit: AuditContext,
) {
  const order = await prisma.orders.findUnique({
    where: { order_reference: input.orderReference },
  });
  if (!order) throw new AppError({ statusCode: 404, code: "ORDER_NOT_FOUND", message: "Order was not found." });
  if (!["CONFIRMED", "PROCESSING", "SHIPPED"].includes(order.order_status)) {
    throw new AppError({
      statusCode: 409,
      code: "SHIPMENT_NOT_ALLOWED",
      message: "A shipment can only be created after the order is confirmed.",
    });
  }

  const existing = await prisma.shipments.findFirst({
    where: { order_id: order.order_id, status: { notIn: ["DELIVERED", "RETURNED", "CANCELLED"] } },
  });
  if (existing) {
    throw new AppError({ statusCode: 409, code: "ACTIVE_SHIPMENT_EXISTS", message: "This order already has an active shipment." });
  }

  const row = await prisma.$transaction(async (tx) => {
    const shipment = await tx.shipments.create({
      data: {
        order_id: order.order_id,
        courier_name: input.courierName ?? null,
        courier_service: input.courierService ?? null,
        tracking_code: input.trackingCode ?? null,
        shipping_cost: input.shippingCost,
        status: "PENDING",
        last_status_changed_by_staff_id: audit.staff.id,
      },
    });
    await tx.shipment_status_history.create({
      data: {
        shipment_id: shipment.shipment_id,
        from_status: null,
        to_status: "PENDING",
        note: "Shipment created.",
        changed_by_staff_id: audit.staff.id,
      },
    });
    await recordAudit(
      audit,
      {
        action: "SHIPMENT_CREATE",
        entityType: "shipment",
        entityId: shipment.shipment_id,
        newData: shipment,
      },
      tx,
    );
    return shipment;
  });

  return mapShipment(row);
}

const allowedTransitions: Record<shipments_status, shipments_status[]> = {
  PENDING: ["READY", "CANCELLED"],
  READY: ["DISPATCHED", "CANCELLED"],
  DISPATCHED: ["IN_TRANSIT", "DELIVERED", "FAILED", "RETURNED"],
  IN_TRANSIT: ["DELIVERED", "FAILED", "RETURNED"],
  DELIVERED: ["RETURNED"],
  FAILED: ["RETURNED", "CANCELLED"],
  RETURNED: [],
  CANCELLED: [],
};

export async function updateShipmentForAdmin(
  shipmentId: bigint,
  input: {
    status: shipments_status;
    note?: string | undefined;
    courierName?: string | null | undefined;
    courierService?: string | null | undefined;
    trackingCode?: string | null | undefined;
  },
  audit: AuditContext,
) {
  return prisma.$transaction(async (tx) => {
    const shipment = await tx.shipments.findUnique({
      where: { shipment_id: shipmentId },
      include: {
        orders: {
          include: {
            order_items: {
              select: { variant_id: true, quantity: true },
            },
          },
        },
      },
    });
    if (!shipment) throw new AppError({ statusCode: 404, code: "SHIPMENT_NOT_FOUND", message: "Shipment was not found." });

    if (shipment.status !== input.status && !allowedTransitions[shipment.status].includes(input.status)) {
      throw new AppError({
        statusCode: 409,
        code: "INVALID_SHIPMENT_STATUS_TRANSITION",
        message: `Shipment cannot move from ${shipment.status} to ${input.status}.`,
      });
    }

    const now = new Date();
    const row = await tx.shipments.update({
      where: { shipment_id: shipmentId },
      data: {
        status: input.status,
        last_status_changed_by_staff_id: audit.staff.id,
        ...(input.courierName !== undefined ? { courier_name: input.courierName } : {}),
        ...(input.courierService !== undefined ? { courier_service: input.courierService } : {}),
        ...(input.trackingCode !== undefined ? { tracking_code: input.trackingCode } : {}),
        ...(input.status === "DISPATCHED" || input.status === "IN_TRANSIT"
          ? { shipped_at: shipment.shipped_at ?? now }
          : {}),
        ...(input.status === "DELIVERED" ? { delivered_at: now } : {}),
      },
    });

    if (shipment.status !== input.status) {
      await tx.shipment_status_history.create({
        data: {
          shipment_id: shipmentId,
          from_status: shipment.status,
          to_status: input.status,
          note: input.note ?? null,
          changed_by_staff_id: audit.staff.id,
        },
      });
    }

    if (input.status === "DISPATCHED" || input.status === "IN_TRANSIT") {
      if (shipment.orders.order_status !== "SHIPPED") {
        await tx.orders.update({
          where: { order_id: shipment.order_id },
          data: {
            order_status: "SHIPPED",
            last_status_changed_by_staff_id: audit.staff.id,
          },
        });
        await tx.order_status_history.create({
          data: {
            order_id: shipment.order_id,
            from_status: shipment.orders.order_status,
            to_status: "SHIPPED",
            changed_by_staff_id: audit.staff.id,
            note: input.note ?? "Shipment dispatched.",
          },
        });
      }

      await enqueueEmail(tx, {
        dedupeKey: `order-shipped:${shipment.order_id.toString()}`,
        eventType: "ORDER_SHIPPED",
        orderId: shipment.order_id,
        customerId: shipment.orders.customer_id,
        recipientName: shipment.orders.customer_name,
        recipientEmail: shipment.orders.customer_email,
        subject: `SICKO SOUL / ORDER ${shipment.orders.order_reference} SHIPPED`,
        templateKey: "order-shipped",
        payload: {
          orderReference: shipment.orders.order_reference,
          trackingCode: input.trackingCode ?? shipment.tracking_code ?? "",
          courier: input.courierName ?? shipment.courier_name ?? "",
        },
      });
    }

    if (input.status === "DELIVERED") {
      if (shipment.orders.order_status !== "DELIVERED") {
        await tx.orders.update({
          where: { order_id: shipment.order_id },
          data: {
            order_status: "DELIVERED",
            last_status_changed_by_staff_id: audit.staff.id,
          },
        });
        await tx.order_status_history.create({
          data: {
            order_id: shipment.order_id,
            from_status: shipment.orders.order_status,
            to_status: "DELIVERED",
            changed_by_staff_id: audit.staff.id,
            note: input.note ?? "Shipment delivered.",
          },
        });
      }

      await enqueueEmail(tx, {
        dedupeKey: `order-delivered:${shipment.order_id.toString()}`,
        eventType: "ORDER_DELIVERED",
        orderId: shipment.order_id,
        customerId: shipment.orders.customer_id,
        recipientName: shipment.orders.customer_name,
        recipientEmail: shipment.orders.customer_email,
        subject: `SICKO SOUL / ORDER ${shipment.orders.order_reference} DELIVERED`,
        templateKey: "order-delivered",
        payload: { orderReference: shipment.orders.order_reference },
      });
    }

    if (input.status === "RETURNED" && shipment.orders.order_status !== "RETURNED") {
      const quantities = shipment.orders.order_items
        .filter(
          (item): item is { variant_id: bigint; quantity: number } =>
            item.variant_id !== null,
        )
        .map((item) => ({ variantId: item.variant_id, quantity: item.quantity }));

      if (["SHIPPED", "DELIVERED"].includes(shipment.orders.order_status)) {
        await returnSoldStock(tx, quantities, shipment.order_id, audit.staff.id);
      }

      await tx.orders.update({
        where: { order_id: shipment.order_id },
        data: {
          order_status: "RETURNED",
          last_status_changed_by_staff_id: audit.staff.id,
        },
      });
      await tx.order_status_history.create({
        data: {
          order_id: shipment.order_id,
          from_status: shipment.orders.order_status,
          to_status: "RETURNED",
          changed_by_staff_id: audit.staff.id,
          note: input.note ?? "Shipment returned.",
        },
      });
    }

    await recordAudit(
      audit,
      {
        action: "SHIPMENT_UPDATE",
        entityType: "shipment",
        entityId: shipmentId,
        oldData: { status: shipment.status },
        newData: { status: input.status, trackingCode: row.tracking_code },
      },
      tx,
    );

    return mapShipment(row);
  });
}
