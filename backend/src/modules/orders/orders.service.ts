import { Prisma, type orders_order_status } from "../../../generated/prisma/client.js";
import { env } from "../../config/env.js";
import { AppError } from "../../errors/app-error.js";
import { prisma } from "../../lib/prisma.js";
import { recordAudit } from "../../services/audit.service.js";
import type { AuditContext } from "../../types/auth.js";
import { decimalToNumber } from "../../utils/decimal.js";
import { createOrderReference } from "../../utils/references.js";
import { isPrismaUniqueError } from "../../utils/prisma-error.js";
import { upsertCustomerAndAddress } from "../customers/customers.service.js";
import {
  consumeReservedStock,
  lockAndVerifyAvailableStock,
  releaseReservedStock,
  reserveStock,
  returnSoldStock,
} from "../inventory/inventory.service.js";
import { enqueueEmail } from "../email/email.service.js";
import { mapOrder } from "./orders.mapper.js";
import {
  findOrderById,
  findOrderByIdempotencyKey,
  findOrderByReference,
  orderDetailInclude,
} from "./orders.repository.js";

const checkoutVariantInclude = {
  sizes: true,
  inventory_stock: true,
  products: {
    include: {
      product_images: {
        orderBy: [{ sort_order: "asc" }, { image_id: "asc" }],
      },
    },
  },
} satisfies Prisma.product_variantsInclude;

type CheckoutVariant = Prisma.product_variantsGetPayload<{
  include: typeof checkoutVariantInclude;
}>;

type CreateOrderInput = {
  idempotencyKey: string;
  source: "CART" | "BUY_NOW";
  cartToken?: string | null | undefined;
  customer: { name: string; phone: string; email: string };
  shipping: {
    address: string;
    city: string;
    district: string;
    postalCode?: string | undefined;
    landmark?: string | undefined;
  };
  note?: string | undefined;
  paymentMethod: "COD" | "MANUAL" | "MOBILE_FINANCIAL_SERVICE" | "BANK_TRANSFER" | "CARD";
  items: Array<{ productId: string; variantId: string; quantity: number }>;
};

export async function createOrder(input: CreateOrderInput) {
  const existing = await findOrderByIdempotencyKey(input.idempotencyKey);
  if (existing) return mapOrder(existing);

  let createdId: bigint;
  try {
    createdId = await prisma.$transaction(async (tx) => {
      const resolved = new Map<
        string,
        { variant: CheckoutVariant; quantity: number }
      >();

      for (const line of input.items) {
        const legacyPrefix = `${line.productId}-`;
        const legacySize =
          !/^\d+$/.test(line.variantId) && line.variantId.startsWith(legacyPrefix)
            ? line.variantId.slice(legacyPrefix.length)
            : null;

        const variant = await tx.product_variants.findFirst({
          where: {
            ...( /^\d+$/.test(line.variantId)
              ? { variant_id: BigInt(line.variantId) }
              : {
                  products: { is: { public_id: line.productId } },
                  ...(legacySize ? { sizes: { is: { code: legacySize } } } : {}),
                }),
            status: "ACTIVE",
            products: {
              is: {
                public_id: line.productId,
                status: "ACTIVE",
                product_categories: { is: { is_active: true } },
              },
            },
          },
          include: checkoutVariantInclude,
        });

        if (!variant || (!/^\d+$/.test(line.variantId) && !legacySize)) {
          throw new AppError({
            statusCode: 409,
            code: "ORDER_ITEM_UNAVAILABLE",
            message: "One or more selected garments are no longer available.",
          });
        }

        const key = variant.variant_id.toString();
        const current = resolved.get(key);
        if (current) {
          current.quantity += line.quantity;
        } else {
          resolved.set(key, { variant, quantity: line.quantity });
        }
      }

      const snapshots = [...resolved.values()].map(({ variant, quantity }) => {
        const unitPrice = variant.price_override
          ? decimalToNumber(variant.price_override)
          : decimalToNumber(variant.products.base_price);
        const image =
          variant.products.product_images.find((item) => item.image_type === "STILL") ??
          variant.products.product_images[0] ??
          null;
        return {
          variant,
          quantity,
          unitPrice,
          lineTotal: unitPrice * quantity,
          imageUrl: image?.image_url ?? null,
        };
      });

    await lockAndVerifyAvailableStock(
      tx,
      snapshots.map((entry) => ({
        variantId: entry.variant.variant_id,
        quantity: entry.quantity,
      })),
    );

    const { customer, address } = await upsertCustomerAndAddress(tx, {
      ...input.customer,
      shipping: input.shipping,
    });

    let sourceCartId: bigint | null = null;
    if (input.cartToken) {
      const cart = await tx.carts.findUnique({ where: { cart_token: input.cartToken } });

      // The current storefront still has a legacy local/Zustand cart. Its cartToken
      // may not exist in the server carts table yet. Checkout remains safe because
      // every submitted item, price and stock row is independently resolved and
      // validated by the server below. If a real backend cart exists, preserve the
      // relationship and convert it after successful checkout.
      if (cart?.status === "ACTIVE") {
        sourceCartId = cart.cart_id;
      }
    }

    const subtotal = snapshots.reduce((sum, entry) => sum + entry.lineTotal, 0);
    const deliveryCharge = env.DELIVERY_CHARGE_BDT;
    const reference = createOrderReference();

    const order = await tx.orders.create({
      data: {
        order_reference: reference,
        idempotency_key: input.idempotencyKey,
        customer_id: customer.customer_id,
        shipping_address_id: address.address_id,
        source_cart_id: sourceCartId,
        source: input.source,
        customer_name: input.customer.name,
        customer_phone: input.customer.phone,
        customer_email: input.customer.email.toLowerCase(),
        shipping_address: input.shipping.address,
        shipping_city: input.shipping.city,
        shipping_district: input.shipping.district,
        shipping_postal_code: input.shipping.postalCode ?? null,
        shipping_landmark: input.shipping.landmark ?? null,
        order_note: input.note ?? null,
        payment_method: input.paymentMethod,
        subtotal,
        delivery_charge: deliveryCharge,
        grand_total: subtotal + deliveryCharge,
        currency: "BDT",
        order_status: "PENDING_CONFIRMATION",
        payment_status: "UNPAID",
      },
    });

    await tx.order_items.createMany({
      data: snapshots.map((entry) => ({
        order_id: order.order_id,
        product_id: entry.variant.product_id,
        variant_id: entry.variant.variant_id,
        product_public_id_snapshot: entry.variant.products.public_id,
        sku_snapshot: entry.variant.sku,
        product_name_snapshot: entry.variant.products.name,
        size_snapshot: entry.variant.sizes.code,
        image_url_snapshot: entry.imageUrl,
        unit_price: entry.unitPrice,
        quantity: entry.quantity,
        line_total: entry.lineTotal,
      })),
    });

    await tx.order_status_history.create({
      data: {
        order_id: order.order_id,
        from_status: null,
        to_status: "PENDING_CONFIRMATION",
        note: "Order request received.",
      },
    });

    await reserveStock(
      tx,
      snapshots.map((entry) => ({
        variantId: entry.variant.variant_id,
        quantity: entry.quantity,
      })),
      order.order_id,
    );

    await tx.payments.create({
      data: {
        order_id: order.order_id,
        method: input.paymentMethod,
        amount: subtotal + deliveryCharge,
        currency: "BDT",
        status: input.paymentMethod === "COD" ? "PENDING" : "INITIATED",
      },
    });

    if (sourceCartId) {
      await tx.carts.update({
        where: { cart_id: sourceCartId },
        data: { status: "CONVERTED" },
      });
    }

    const now = new Date();
    await tx.customers.update({
      where: { customer_id: customer.customer_id },
      data: {
        first_order_at: customer.first_order_at ?? now,
        last_order_at: now,
      },
    });

      return order.order_id;
    });
  } catch (error) {
    if (isPrismaUniqueError(error)) {
      const raced = await findOrderByIdempotencyKey(input.idempotencyKey);
      if (raced) return mapOrder(raced);
    }
    throw error;
  }

  const row = await findOrderById(createdId);
  if (!row) throw new AppError({ statusCode: 500, code: "ORDER_READBACK_FAILED", message: "Order was created but could not be read back.", expose: false });
  return mapOrder(row);
}

export async function getOrder(reference: string) {
  const row = await findOrderByReference(reference);
  if (!row) throw new AppError({ statusCode: 404, code: "ORDER_NOT_FOUND", message: "Order was not found." });
  return mapOrder(row);
}

export async function lookupOrder(reference: string, identifier: string) {
  const row = await findOrderByReference(reference);
  const needle = identifier.trim().toLowerCase();
  if (
    !row ||
    (row.customer_email.toLowerCase() !== needle && row.customer_phone.toLowerCase() !== needle)
  ) {
    throw new AppError({
      statusCode: 404,
      code: "ORDER_LOOKUP_MISMATCH",
      message: "No order matched that reference and contact.",
    });
  }
  return mapOrder(row);
}

const transitions: Record<orders_order_status, orders_order_status[]> = {
  PENDING_CONFIRMATION: ["CONFIRMED", "CANCELLED", "REJECTED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "RETURNED"],
  DELIVERED: ["RETURNED"],
  CANCELLED: [],
  REJECTED: [],
  RETURNED: [],
};

function itemQuantities(items: Array<{ variant_id: bigint | null; quantity: number }>) {
  return items
    .filter((item): item is { variant_id: bigint; quantity: number } => item.variant_id !== null)
    .map((item) => ({ variantId: item.variant_id, quantity: item.quantity }));
}

export async function updateOrderStatus(
  reference: string,
  input: {
    status: orders_order_status;
    note?: string | undefined;
    cancellationReason?: string | undefined;
  },
  audit: AuditContext,
) {
  const orderId = await prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<Array<{ order_id: bigint }>>(
      Prisma.sql`SELECT order_id FROM orders WHERE order_reference = ${reference} FOR UPDATE`,
    );
    const foundId = locked[0]?.order_id;
    if (!foundId) throw new AppError({ statusCode: 404, code: "ORDER_NOT_FOUND", message: "Order was not found." });

    const order = await tx.orders.findUnique({
      where: { order_id: foundId },
      include: { order_items: { select: { variant_id: true, quantity: true } } },
    });
    if (!order) throw new AppError({ statusCode: 404, code: "ORDER_NOT_FOUND", message: "Order was not found." });

    if (order.order_status === input.status) return order.order_id;
    if (!transitions[order.order_status].includes(input.status)) {
      throw new AppError({
        statusCode: 409,
        code: "INVALID_ORDER_STATUS_TRANSITION",
        message: `Order cannot move from ${order.order_status} to ${input.status}.`,
      });
    }

    const quantities = itemQuantities(order.order_items);

    if (order.order_status === "PENDING_CONFIRMATION" && input.status === "CONFIRMED") {
      await consumeReservedStock(tx, quantities, order.order_id, audit.staff.id);
    }

    if (
      order.order_status === "PENDING_CONFIRMATION" &&
      (input.status === "CANCELLED" || input.status === "REJECTED")
    ) {
      await releaseReservedStock(tx, quantities, order.order_id, audit.staff.id);
    }

    if (
      (order.order_status === "CONFIRMED" || order.order_status === "PROCESSING") &&
      input.status === "CANCELLED"
    ) {
      await returnSoldStock(tx, quantities, order.order_id, audit.staff.id);
    }

    if (
      (order.order_status === "SHIPPED" || order.order_status === "DELIVERED") &&
      input.status === "RETURNED"
    ) {
      await returnSoldStock(tx, quantities, order.order_id, audit.staff.id);
    }

    const now = new Date();
    await tx.orders.update({
      where: { order_id: order.order_id },
      data: {
        order_status: input.status,
        last_status_changed_by_staff_id: audit.staff.id,
        ...(input.status === "CONFIRMED"
          ? { confirmed_at: now, confirmed_by_staff_id: audit.staff.id }
          : {}),
        ...(input.status === "CANCELLED" || input.status === "REJECTED"
          ? { cancelled_at: now, cancellation_reason: input.cancellationReason ?? input.note ?? null }
          : {}),
      },
    });

    await tx.order_status_history.create({
      data: {
        order_id: order.order_id,
        from_status: order.order_status,
        to_status: input.status,
        changed_by_staff_id: audit.staff.id,
        note: input.note ?? null,
      },
    });

    if (input.status === "CONFIRMED") {
      await enqueueEmail(tx, {
        dedupeKey: `order-confirmed:${order.order_id.toString()}`,
        eventType: "ORDER_CONFIRMED",
        orderId: order.order_id,
        customerId: order.customer_id,
        recipientName: order.customer_name,
        recipientEmail: order.customer_email,
        subject: `SICKO SOUL / ORDER ${order.order_reference} CONFIRMED`,
        templateKey: "order-confirmed",
        payload: { orderReference: order.order_reference, status: input.status },
      });
    }
    if (input.status === "SHIPPED") {
      await enqueueEmail(tx, {
        dedupeKey: `order-shipped:${order.order_id.toString()}`,
        eventType: "ORDER_SHIPPED",
        orderId: order.order_id,
        customerId: order.customer_id,
        recipientName: order.customer_name,
        recipientEmail: order.customer_email,
        subject: `SICKO SOUL / ORDER ${order.order_reference} SHIPPED`,
        templateKey: "order-shipped",
        payload: { orderReference: order.order_reference, status: input.status },
      });
    }
    if (input.status === "DELIVERED") {
      await enqueueEmail(tx, {
        dedupeKey: `order-delivered:${order.order_id.toString()}`,
        eventType: "ORDER_DELIVERED",
        orderId: order.order_id,
        customerId: order.customer_id,
        recipientName: order.customer_name,
        recipientEmail: order.customer_email,
        subject: `SICKO SOUL / ORDER ${order.order_reference} DELIVERED`,
        templateKey: "order-delivered",
        payload: { orderReference: order.order_reference, status: input.status },
      });
    }
    if (input.status === "CANCELLED" || input.status === "REJECTED") {
      await enqueueEmail(tx, {
        dedupeKey: `order-cancelled:${order.order_id.toString()}:${input.status}`,
        eventType: "ORDER_CANCELLED",
        orderId: order.order_id,
        customerId: order.customer_id,
        recipientName: order.customer_name,
        recipientEmail: order.customer_email,
        subject: `SICKO SOUL / ORDER ${order.order_reference} ${input.status}`,
        templateKey: "order-cancelled",
        payload: {
          orderReference: order.order_reference,
          status: input.status,
          reason: input.cancellationReason ?? input.note ?? "",
        },
      });
    }

    await recordAudit(
      audit,
      {
        action: "ORDER_STATUS_UPDATE",
        entityType: "order",
        entityId: order.order_id,
        oldData: { status: order.order_status },
        newData: { status: input.status, note: input.note },
      },
      tx,
    );

    return order.order_id;
  });

  const row = await findOrderById(orderId);
  if (!row) throw new AppError({ statusCode: 404, code: "ORDER_NOT_FOUND", message: "Order was not found." });
  return mapOrder(row);
}

export async function listOrdersForAdmin(input: {
  status?: orders_order_status | undefined;
  q?: string | undefined;
  page: number;
  limit: number;
}) {
  const where: Prisma.ordersWhereInput = {};
  if (input.status) where.order_status = input.status;
  if (input.q) {
    where.OR = [
      { order_reference: { contains: input.q } },
      { customer_name: { contains: input.q } },
      { customer_email: { contains: input.q } },
      { customer_phone: { contains: input.q } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.orders.findMany({
      where,
      include: orderDetailInclude,
      orderBy: [{ created_at: "desc" }],
      skip: (input.page - 1) * input.limit,
      take: input.limit,
    }),
    prisma.orders.count({ where }),
  ]);

  return {
    data: rows.map(mapOrder),
    meta: {
      page: input.page,
      limit: input.limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / input.limit),
    },
  };
}
