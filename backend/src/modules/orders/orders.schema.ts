import { z } from "zod";

const paymentMethod = z.enum(["COD", "MANUAL"]);

export const createOrderSchema = z.object({
  idempotencyKey: z.string().trim().min(8).max(100),
  source: z.enum(["CART", "BUY_NOW"]),
  cartToken: z.string().uuid().nullable().optional(),
  customer: z.object({
    name: z.string().trim().min(2).max(150),
    phone: z.string().trim().min(6).max(32),
    email: z.string().trim().email().max(255),
  }),
  shipping: z.object({
    address: z.string().trim().min(5).max(500),
    city: z.string().trim().min(2).max(120),
    district: z.string().trim().min(2).max(120),
    postalCode: z.string().trim().max(30).optional(),
    landmark: z.string().trim().max(255).optional(),
  }),
  note: z.string().trim().max(4000).optional(),
  paymentMethod: paymentMethod,
  items: z.array(
    z.object({
      productId: z.string().trim().min(1).max(64),
      variantId: z.string().trim().min(1).max(100),
      quantity: z.number().int().min(1).max(20),
    }),
  ).min(1).max(50),
});

export const orderReferenceParamsSchema = z.object({
  reference: z.string().trim().min(3).max(32),
});

// Date filters use Bangladesh storefront calendar days (UTC+06:00), inclusive.
const adminDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD").refine(
  value => {
    const date = new Date(`${value}T12:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Enter a valid calendar date",
);

export const adminOrderListQuerySchema = z.object({
  from: adminDate.optional(),
  to: adminDate.optional(),
  status: z.enum([
    "PENDING_CONFIRMATION",
    "ON_HOLD",
    "CONFIRMED",
    "PROCESSING",
    "SHIPPED",
    "DELIVERED",
    "CANCELLED",
    "REJECTED",
    "RETURNED",
    "OUT_OF_STOCK",
  ]).optional(),
  q: z.string().trim().max(255).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
}).refine(input => !input.from || !input.to || input.from <= input.to, {
  message: "The start date must not be after the end date.", path: ["to"],
});

export const adminOrderStatusSchema = z.object({
  status: z.enum([
    "ON_HOLD",
    "CONFIRMED",
    "PROCESSING",
    "SHIPPED",
    "DELIVERED",
    "CANCELLED",
    "REJECTED",
    "RETURNED",
    "OUT_OF_STOCK",
  ]),
  note: z.string().trim().max(500).optional(),
  cancellationReason: z.string().trim().max(500).optional(),
  holdExpectedRestockDate: adminDate.optional(),
  holdCustomerWaitUntil: adminDate.optional(),
}).superRefine((input, context) => {
  if (input.status !== "ON_HOLD") {
    if (input.holdExpectedRestockDate || input.holdCustomerWaitUntil) {
      context.addIssue({ code: "custom", path: ["status"], message: "Hold dates are only valid for ON_HOLD orders." });
    }
    return;
  }
  const today = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString().slice(0, 10);
  if (!input.note || input.note.trim().length < 10) {
    context.addIssue({ code: "custom", path: ["note"], message: "Describe the incoming shipment and the customer's agreement (10+ characters)." });
  }
  if (!input.holdExpectedRestockDate) {
    context.addIssue({ code: "custom", path: ["holdExpectedRestockDate"], message: "Enter the expected restock date." });
  } else if (input.holdExpectedRestockDate < today) {
    context.addIssue({ code: "custom", path: ["holdExpectedRestockDate"], message: "The expected restock date cannot be in the past." });
  }
  if (!input.holdCustomerWaitUntil) {
    context.addIssue({ code: "custom", path: ["holdCustomerWaitUntil"], message: "Enter the date the customer agreed to wait until." });
  } else if (input.holdCustomerWaitUntil < today || (input.holdExpectedRestockDate && input.holdCustomerWaitUntil < input.holdExpectedRestockDate)) {
    context.addIssue({ code: "custom", path: ["holdCustomerWaitUntil"], message: "Customer wait-until date must be today or later and not before restock." });
  }
});

/** Call Again is a separate workflow action; it never confirms inventory. */
export const adminOrderCallSchema = z.object({
  outcome: z.enum(["NO_ANSWER", "CALL_AGAIN", "CUSTOMER_CONFIRMED", "CUSTOMER_DECLINED"]),
  note: z.string().trim().max(500).optional(),
  callbackAt: z.string().datetime({ offset: true }).optional(),
}).superRefine((input, context) => {
  if (input.outcome === "CUSTOMER_CONFIRMED" && (!input.note || input.note.trim().length < 5)) {
    context.addIssue({ code: "custom", path: ["note"], message: "Record a short note about the customer's phone agreement." });
  }
  if ((input.outcome === "CUSTOMER_CONFIRMED" || input.outcome === "CUSTOMER_DECLINED") && input.callbackAt) {
    context.addIssue({ code: "custom", path: ["callbackAt"], message: "A completed call cannot also schedule a callback." });
  }
});
