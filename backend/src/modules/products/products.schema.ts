import { z } from "zod";

const optionalTrimmedString = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().min(1).max(160).optional(),
);

export const productListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(24),
  category: optionalTrimmedString,
  q: optionalTrimmedString,
});

export const productIdentifierParamsSchema = z.object({
  productId: z.string().trim().min(1).max(160),
});
