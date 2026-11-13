import { createHash } from "node:crypto";
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
  sellAvailableStock,
} from "../inventory/inventory.service.js";
import { enqueueEmail } from "../email/email.service.js";
import { privateOrderTrackingUrl } from "../customer-access/customer-access.js";
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
  paymentMethod: "COD" | "MANUAL";
  items: Array<{ productId: string; variantId: string; quantity: number }>;
};

function checkoutFingerprint(input: CreateOrderInput): string {
  // Normalize user-provided data so logically identical retries hash identically.
  // Never include the idempotency key in the digest.
  const document = {
    source: input.source, cartToken: input.cartToken ?? null,
    customer: { name: input.customer.name.trim(), phone: input.customer.phone.trim(), email: input.customer.email.trim().toLowerCase() },
    shipping: { address: input.shipping.address.trim(), city: input.shipping.city.trim(), district: input.shipping.district.trim(), postalCode: input.shipping.postalCode ?? "", landmark: input.shipping.landmark ?? "" },
    note: input.note ?? "", paymentMethod: input.paymentMethod,
    items: [...input.items].map(item => ({ ...item })).sort((a,b) => a.variantId.localeCompare(b.variantId) || a.productId.localeCompare(b.productId)),
  };
  return createHash("sha256").update(JSON.stringify(document)).digest("hex");
}

function validateReplay(stored: { request_fingerprint: string | null }, fingerprint: string): void {
  if (stored.request_fingerprint !== fingerprint) {
    throw new AppError({ statusCode: 409, code: "IDEMPOTENCY_KEY_REUSED", message: "This checkout attempt changed. Start a new checkout to continue." });
  }
}

export async function createOrder(input: CreateOrderInput) {
  // Even pre-migration legacy orders must not reveal private order data via reused keys.
  const fingerprint = checkoutFingerprint(input);
  const existing = await findOrderByIdempotencyKey(input.idempotencyKey);
  if (existing) { validateReplay(existing, fingerprint); return mapOrder(existing); }

  let createdId: bigint;
  try {
    createdId = await prisma.$transaction(async (tx) => {
      const resolved = new Map<
        string,
        { variant: CheckoutVariant; quantity: number }
      >();

      for (const line of input.items) {
        // Checkout only accepts real database variant IDs. The storefront no
        // longer manufactures legacy IDs such as `product-size`, so every
        // order line is resolved against product_variants directly.
        if (!/^\d+$/.test(line.variantId)) {
          throw new AppError({
            statusCode: 409,
            code: "ORDER_ITEM_UNAVAILABLE",
            message: "One or more selected garments are no longer available.",
          });
        }

        const variant = await tx.product_variants.findFirst({
          where: {
            variant_id: BigInt(line.variantId),
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

        if (!variant) {
          throw new AppError({
            statusCode: 409,
            code: "ORDER_ITEM_UNAVAILABLE",
            message: "One or more selected garments are no longer available.",
          });
        }

        const key = variant.variant_id.toString();
        const current = resolved.get(key);
        if (current) {
          if (current.quantity + line.quantity > 20) throw new AppError({ statusCode: 422, code: "ORDER_ITEM_QUANTITY_LIMIT", message: "A size cannot exceed 20 units per order." });
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
          variant.products.product_images.find((item) => item.image_type === "STILL" && item.color_code === variant.color_code) ??
           variant.products.product_images.find((item) => item.color_code === variant.color_code) ??
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

    const { customer } = await upsertCustomerAndAddress(tx, {
      ...input.customer,
      shipping: input.shipping,
    });

    let sourceCartId: bigint | null = null;
    if (input.source === "CART") {
      if (!input.cartToken) {
        throw new AppError({
          statusCode: 422,
          code: "CART_TOKEN_REQUIRED",
          message: "A backend cart token is required for cart checkout.",
        });
      }

      const cart = await tx.carts.findUnique({
        where: { cart_token: input.cartToken },
        include: { cart_items: true },
      });
      if (!cart || cart.status !== "ACTIVE") {
        throw new AppError({
          statusCode: 409,
          code: "CART_NOT_ACTIVE",
          message: "This cart is no longer active.",
        });
      }
      if (cart.expires_at && cart.expires_at.getTime() <= Date.now()) {
        throw new AppError({
          statusCode: 409,
          code: "CART_EXPIRED",
          message: "This cart has expired.",
        });
      }

      const submitted = new Map(
        [...resolved.entries()].map(([variantId, entry]) => [variantId, entry.quantity]),
      );
      const cartMatchesSubmission =
        cart.cart_items.length === submitted.size &&
        cart.cart_items.every(
          (item) => submitted.get(item.variant_id.toString()) === item.quantity,
        );

      if (!cartMatchesSubmission) {
        throw new AppError({
          statusCode: 409,
          code: "CART_CHANGED",
          message: "The cart changed before checkout. Refresh it and try again.",
        });
      }

      sourceCartId = cart.cart_id;
    }

    const subtotal = snapshots.reduce((sum, entry) => sum + entry.lineTotal, 0);
    const deliveryCharge = env.DELIVERY_CHARGE_BDT;
    const reference = createOrderReference();

    const order = await tx.orders.create({
      data: {
        order_reference: reference,
        idempotency_key: input.idempotencyKey,
        request_fingerprint: fingerprint,
        customer_id: customer.customer_id,
        shipping_address_id: null,
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
        stock_hold_created_at_checkout: false,
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
        size_snapshot: `${entry.variant.color_code} / ${entry.variant.sizes.code}`,
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
        note: "Order request received; not confirmed and no stock reserved.",
      },
    });

    // An order request does NOT reserve inventory. Staff confirms after reviewing
    // at night; only confirmation deducts stock. Old orders keep legacy holds.

    await tx.payments.create({
      data: {
        order_id: order.order_id,
        method: input.paymentMethod,
        amount: subtotal + deliveryCharge,
        currency: "BDT",
        status: input.paymentMethod === "COD" ? "PENDING" : "INITIATED",
      },
    });

    await enqueueEmail(tx, {
      dedupeKey: `order-received:${order.order_id.toString()}`,
      eventType: "ORDER_RECEIVED",
      orderId: order.order_id, customerId: customer.customer_id,
      recipientName: order.customer_name, recipientEmail: order.customer_email,
      subject: `SICKO SOUL / ORDER ${order.order_reference} RECEIVED`,
      templateKey: "order-received",
      payload: {
        orderReference: order.order_reference,
        status: "PENDING_CONFIRMATION",
        customerName: order.customer_name,
        paymentMethod: order.payment_method,
        totalBDT: subtotal + deliveryCharge,
        trackingUrl: privateOrderTrackingUrl(order.order_reference),
        message: "We received your order request. Our team will review it before confirmation. Your order is not confirmed and stock is not reserved yet.",
      },
    });

    if (sourceCartId) {
      await tx.carts.update({
        where: { cart_id: sourceCartId },
        data: { status: "CONVERTED" },
      });
    }

    // An anonymous checkout does not verify ownership of the email address.
    // Do not update reusable customer profile metadata for existing customers.

      return order.order_id;
    });
  } catch (error) {
    if (isPrismaUniqueError(error)) {
      const raced = await findOrderByIdempotencyKey(input.idempotencyKey);
      if (raced) { validateReplay(raced, fingerprint); return mapOrder(raced); }
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

const transitions: Record<orders_order_status, orders_order_status[]> = {
  PENDING_CONFIRMATION: ["ON_HOLD", "CONFIRMED", "CANCELLED", "REJECTED", "OUT_OF_STOCK"],
  ON_HOLD: ["CONFIRMED", "CANCELLED", "REJECTED", "OUT_OF_STOCK"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "RETURNED"],
  DELIVERED: ["RETURNED"],
  CANCELLED: [],
  REJECTED: [],
  RETURNED: [],
  OUT_OF_STOCK: [],
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
    holdExpectedRestockDate?: string | undefined;
    holdCustomerWaitUntil?: string | undefined;
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
      include: { order_items: { select: { variant_id: true, quantity: true, product_name_snapshot: true, size_snapshot: true } } },
    });
    if (!order) throw new AppError({ statusCode: 404, code: "ORDER_NOT_FOUND", message: "Order was not found." });

    // Reapplying ON_HOLD updates the dates/reason and sends an updated notification.
    if (order.order_status === input.status && input.status !== "ON_HOLD") return order.order_id;
    if (["SHIPPED", "DELIVERED", "RETURNED"].includes(input.status)) {
      throw new AppError({ statusCode: 409, code: "SHIPMENT_WORKFLOW_REQUIRED", message: "Shipping and delivery must be recorded through the shipment workflow." });
    }
    if (input.status === "CANCELLED") {
      const active = await tx.shipments.count({ where: { order_id: order.order_id, status: { notIn: ["CANCELLED", "RETURNED"] } } });
      if (active > 0) throw new AppError({ statusCode: 409, code: "SHIPMENT_MUST_BE_CANCELLED", message: "Close the existing shipment before cancelling this order." });
    }
    if (!(input.status === "ON_HOLD" && order.order_status === "ON_HOLD") && !transitions[order.order_status].includes(input.status)) {
      throw new AppError({
        statusCode: 409,
        code: "INVALID_ORDER_STATUS_TRANSITION",
        message: `Order cannot move from ${order.order_status} to ${input.status}.`,
      });
    }

    const quantities = itemQuantities(order.order_items);

    if (["PENDING_CONFIRMATION", "ON_HOLD"].includes(order.order_status) && input.status === "REJECTED") {
      if (!(input.cancellationReason ?? input.note ?? "").trim()) {
        throw new AppError({ statusCode: 422, code: "REJECTION_REASON_REQUIRED", message: "Record a reason before rejecting this order." });
      }
    }

    if (input.status === "ON_HOLD") {
      const today = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString().slice(0, 10);
      if (!input.note || input.note.trim().length < 10 || !input.holdExpectedRestockDate || !input.holdCustomerWaitUntil ||
          input.holdExpectedRestockDate < today || input.holdCustomerWaitUntil < input.holdExpectedRestockDate) {
        throw new AppError({ statusCode: 422, code: "INVALID_HOLD_DETAILS", message: "Enter a reason, future restock date, and the agreed wait-until date." });
      }
    }

    if (["PENDING_CONFIRMATION", "ON_HOLD"].includes(order.order_status) && input.status === "CONFIRMED") {
      // Admin decision does not depend on a separate call log. Inventory is still
      // checked and deducted atomically. ON_HOLD is NOT a stock reservation.
      if (!order.stock_hold_created_at_checkout) {
        // New COD/manual requests were never reserved. Check all requested sizes
        // atomically and deduct on-hand stock only after an admin confirms.
        await sellAvailableStock(tx, quantities, order.order_id, audit.staff.id);
      } else {
        // Legacy orders from before this upgrade may still have a valid hold.
        if (order.reservation_released_at !== null) {
          await lockAndVerifyAvailableStock(tx, quantities);
          await reserveStock(tx, quantities, order.order_id);
        }
        await consumeReservedStock(tx, quantities, order.order_id, audit.staff.id);
      }
    }

    const releasesLegacyHold =
      (order.order_status === "PENDING_CONFIRMATION" || order.order_status === "ON_HOLD") &&
      (input.status === "CANCELLED" || input.status === "REJECTED" || input.status === "OUT_OF_STOCK" || input.status === "ON_HOLD") &&
      order.stock_hold_created_at_checkout && order.reservation_released_at === null;
    if (releasesLegacyHold) {
      // Release only legacy active reservations; new orders never held stock.
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
    const holdRestock = input.status === "ON_HOLD" && input.holdExpectedRestockDate ? new Date(`${input.holdExpectedRestockDate}T00:00:00.000Z`) : null;
    const holdUntil = input.status === "ON_HOLD" && input.holdCustomerWaitUntil ? new Date(`${input.holdCustomerWaitUntil}T00:00:00.000Z`) : null;
    const effectiveHoldNote = input.status === "ON_HOLD"
      ? `Expected restock: ${input.holdExpectedRestockDate}; customer agrees to wait until: ${input.holdCustomerWaitUntil}. ${input.note?.trim() ?? ""}`.slice(0, 500)
      : input.note ?? null;
    await tx.orders.update({
      where: { order_id: order.order_id },
      data: {
        order_status: input.status,
        last_status_changed_by_staff_id: audit.staff.id,
        ...(releasesLegacyHold ? { reservation_released_at: now } : {}),
        ...(input.status === "ON_HOLD" ? {
          hold_expected_restock_at: holdRestock,
          hold_customer_wait_until: holdUntil,
        } : {}),
        ...(input.status === "CONFIRMED"
          ? { confirmed_at: now, confirmed_by_staff_id: audit.staff.id }
          : {}),
        ...(input.status === "CANCELLED" || input.status === "REJECTED" || input.status === "OUT_OF_STOCK"
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
        note: effectiveHoldNote,
      },
    });

    if (input.status === "ON_HOLD") {
      // Never deduct or reserve stock for a customer-approved waiting order.
      await enqueueEmail(tx, {
        dedupeKey: `order-on-hold:${order.order_id.toString()}:${input.holdExpectedRestockDate}:${input.holdCustomerWaitUntil}`,
        eventType: "ORDER_ON_HOLD",
        orderId: order.order_id,
        customerId: order.customer_id,
        recipientName: order.customer_name,
        recipientEmail: order.customer_email,
        subject: `SICKO SOUL / ORDER ${order.order_reference} ON HOLD`,
        templateKey: "order-on-hold",
        payload: {
          orderReference: order.order_reference,
          status: "ON_HOLD",
          expectedRestockDate: input.holdExpectedRestockDate,
          customerWaitUntil: input.holdCustomerWaitUntil,
          message: "Your order request is on hold while we await restocking. It is not confirmed, and stock has not been reserved.",
          trackingUrl: privateOrderTrackingUrl(order.order_reference),
        },
      });
    }

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
        payload: {
          orderReference: order.order_reference,
          status: input.status,
          message: "Your order has been confirmed by our team and is being prepared.",
          items: order.order_items.map(item => `${item.product_name_snapshot} / ${item.size_snapshot} × ${item.quantity}`).join("; "),
          totalBDT: decimalToNumber(order.grand_total),
          deliveryAddress: [order.shipping_address, order.shipping_city, order.shipping_district].filter(Boolean).join(", "),
          paymentMethod: order.payment_method,
          trackingUrl: privateOrderTrackingUrl(order.order_reference),
        },
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
    if (input.status === "OUT_OF_STOCK") {
      await enqueueEmail(tx, {
        dedupeKey: `order-out-of-stock:${order.order_id.toString()}`,
        eventType: "ORDER_OUT_OF_STOCK",
        orderId: order.order_id,
        customerId: order.customer_id,
        recipientName: order.customer_name,
        recipientEmail: order.customer_email,
        subject: `SICKO SOUL / ORDER ${order.order_reference} OUT OF STOCK`,
        templateKey: "order-out-of-stock",
        payload: {
          orderReference: order.order_reference,
          status: input.status,
          message: "Unfortunately the requested items are no longer available. Your request could not be confirmed.",
          items: order.order_items.map(item => `${item.product_name_snapshot} / ${item.size_snapshot} × ${item.quantity}`).join("; "),
          reason: input.cancellationReason ?? input.note ?? "Stock unavailable at confirmation",
          trackingUrl: privateOrderTrackingUrl(order.order_reference),
        },
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
          trackingUrl: privateOrderTrackingUrl(order.order_reference),
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

export async function recordOrderCall(
  reference: string,
  input: { outcome: "NO_ANSWER" | "CALL_AGAIN" | "CUSTOMER_CONFIRMED" | "CUSTOMER_DECLINED"; note?: string | undefined; callbackAt?: string | undefined },
  audit: AuditContext,
) {
  const orderId = await prisma.$transaction(async tx => {
    const locked = await tx.$queryRaw<Array<{ order_id: bigint }>>(
      Prisma.sql`SELECT order_id FROM orders WHERE order_reference = ${reference} FOR UPDATE`,
    );
    const orderId = locked[0]?.order_id;
    if (!orderId) throw new AppError({ statusCode: 404, code: "ORDER_NOT_FOUND", message: "Order was not found." });
    const order = await tx.orders.findUnique({ where: { order_id: orderId }, select: { order_status: true } });
    if (order?.order_status !== "PENDING_CONFIRMATION") {
      throw new AppError({ statusCode: 409, code: "ORDER_NOT_PENDING", message: "Calls can only be scheduled for pending orders." });
    }
    await tx.order_call_attempts.create({ data: {
      order_id: orderId,
      called_by_staff_id: audit.staff.id,
      outcome: input.outcome,
      note: input.note ?? null,
      callback_at: input.callbackAt ? new Date(input.callbackAt) : null,
    } });
    await recordAudit(audit, {
      action: "ORDER_CALL_RECORDED", entityType: "order", entityId: orderId,
      oldData: null, newData: { outcome: input.outcome, callbackAt: input.callbackAt ?? null },
    }, tx);
    return orderId;
  });
  const order = await findOrderById(orderId);
  if (!order) throw new AppError({ statusCode: 404, code: "ORDER_NOT_FOUND", message: "Order was not found." });
  return mapOrder(order);
}

export async function listOrdersForAdmin(input: {
  status?: orders_order_status | undefined;
  q?: string | undefined;
  from?: string | undefined;
  to?: string | undefined;
  page: number;
  limit: number;
}) {
  const where: Prisma.ordersWhereInput = {};
  // Filter by storefront calendar day in Bangladesh (UTC+06:00), end inclusive.
  // Use a strict exclusive upper bound to avoid millisecond rounding issues.
  if (input.from || input.to) {
    where.placed_at = {
      ...(input.from ? { gte: new Date(`${input.from}T00:00:00+06:00`) } : {}),
      ...(input.to ? { lt: new Date(new Date(`${input.to}T00:00:00+06:00`).getTime() + 86_400_000) } : {}),
    };
  }
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
      orderBy: [{ placed_at: input.status === "PENDING_CONFIRMATION" ? "asc" : "desc" }, { order_id: input.status === "PENDING_CONFIRMATION" ? "asc" : "desc" }],
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
