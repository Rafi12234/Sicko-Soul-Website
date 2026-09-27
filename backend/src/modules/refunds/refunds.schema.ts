import { z } from "zod";

export const requestRefundSchema = z.object({
  orderReference: z.string().trim().min(3).max(32).optional(),
  amount: z.number().positive().max(1_000_000),
  reason: z.string().trim().min(5).max(500),
});

export const refundIdParamsSchema = z.object({
  refundId: z.string().regex(/^\d+$/),
});

export const updateRefundSchema = z.object({
  status: z.enum(["APPROVED", "PROCESSING", "COMPLETED", "REJECTED"]),
  paymentId: z.string().regex(/^\d+$/).nullable().optional(),
});
