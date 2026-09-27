import { z } from "zod";

export const paymentIdParamsSchema = z.object({
  paymentId: z.string().regex(/^\d+$/),
});

export const createPaymentSchema = z.object({
  orderReference: z.string().trim().min(3).max(32),
  method: z.enum(["COD", "MANUAL", "MOBILE_FINANCIAL_SERVICE", "BANK_TRANSFER", "CARD"]),
  amount: z.number().positive().max(1_000_000),
  provider: z.string().trim().max(100).nullable().optional(),
  providerReference: z.string().trim().max(191).nullable().optional(),
  status: z.enum([
    "INITIATED",
    "PENDING",
    "PAID",
    "FAILED",
    "CANCELLED",
    "PARTIALLY_REFUNDED",
    "REFUNDED",
  ]).default("PENDING"),
});

export const updatePaymentSchema = z.object({
  status: z.enum([
    "INITIATED",
    "PENDING",
    "PAID",
    "FAILED",
    "CANCELLED",
    "PARTIALLY_REFUNDED",
    "REFUNDED",
  ]),
  provider: z.string().trim().max(100).nullable().optional(),
  providerReference: z.string().trim().max(191).nullable().optional(),
});
