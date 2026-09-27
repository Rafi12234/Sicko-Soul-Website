import { z } from "zod";

export const collectionSlugParamsSchema = z.object({
  slug: z.string().trim().min(1).max(120),
});

export const adminCollectionIdParamsSchema = z.object({
  collectionId: z.string().regex(/^\d+$/),
});

export const createCollectionSchema = z.object({
  code: z.string().trim().min(2).max(80),
  slug: z.string().trim().min(2).max(120),
  name: z.string().trim().min(2).max(160),
  tagline: z.string().trim().max(255).nullable().optional(),
  releaseYear: z.number().int().min(2000).max(2200).nullable().optional(),
  status: z.enum(["DRAFT", "SCHEDULED", "LIVE", "SEALED", "ARCHIVED"]).default("DRAFT"),
  opensAt: z.string().datetime().nullable().optional(),
  closesAt: z.string().datetime().nullable().optional(),
});

export const updateCollectionSchema = createCollectionSchema.partial();

export const setCollectionProductsSchema = z.object({
  products: z.array(
    z.object({
      productId: z.string().trim().min(1),
      sortOrder: z.number().int().min(0).default(0),
      sealed: z.boolean().default(false),
    }),
  ).max(200),
});
