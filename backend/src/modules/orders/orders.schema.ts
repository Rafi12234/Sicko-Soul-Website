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

export const orderLookupSchema = z.object({
  reference: z.string().trim().min(3).max(32),
  identifier: z.string().trim().email().max(255),
});

export const adminOrderListQuerySchema = z.object({
  status: z.enum([
    "PENDING_CONFIRMATION",
    "CONFIRMED",
    "PROCESSING",
    "SHIPPED",
    "DELIVERED",
    "CANCELLED",
    "REJECTED",
    "RETURNED",
  ]).optional(),
  q: z.string().trim().max(255).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

export const adminOrderStatusSchema = z.object({
  status: z.enum([
    "CONFIRMED",
    "PROCESSING",
    "SHIPPED",
    "DELIVERED",
    "CANCELLED",
    "REJECTED",
    "RETURNED",
  ]),
  note: z.string().trim().max(500).optional(),
  cancellationReason: z.string().trim().max(500).optional(),
});
