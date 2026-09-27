import { z } from "zod";

export const reviewProductParamsSchema = z.object({
  productId: z.string().trim().min(1).max(160),
});

export const publicReviewListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(60).default(18),
});

export const submitReviewSchema = z.object({
  productId: z.string().trim().min(1).max(160).optional(),
  displayName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(160).optional(),
  text: z.string().trim().min(5).max(5000),
  orderReference: z.string().trim().min(3).max(32).optional(),
});

export const reviewIdParamsSchema = z.object({
  reviewId: z.string().regex(/^\d+$/),
});

export const moderateReviewSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "HIDDEN"]),
  note: z.string().trim().max(500).optional(),
});
