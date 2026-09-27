import { z } from "zod";

const categoryBase = z.object({
  code: z.string().trim().min(1).max(64),
  slug: z.string().trim().min(1).max(120),
  indexCode: z.string().trim().max(20).nullable().optional(),
  name: z.string().trim().min(1).max(120),
  ghostName: z.string().trim().max(120).nullable().optional(),
  spec: z.string().trim().max(255).nullable().optional(),
  tagline: z.string().trim().max(255).nullable().optional(),
  registry: z.string().trim().max(255).nullable().optional(),
  coverUrl: z.string().trim().url().max(1000).nullable().optional(),
  coverAlt: z.string().trim().max(255).nullable().optional(),
  sortOrder: z.number().int().min(0).max(100000).default(0),
  isActive: z.boolean().default(true),
});

export const createCategorySchema = categoryBase;
export const updateCategorySchema = categoryBase.partial();
export const categoryIdParamsSchema = z.object({ categoryId: z.string().regex(/^\d+$/) });

const imageSchema = z.object({
  type: z.enum(["STILL", "WORN", "GALLERY", "OTHER"]).default("GALLERY"),
  url: z.string().trim().url().max(1000),
  alt: z.string().trim().max(255).nullable().optional(),
  sortOrder: z.number().int().min(0).max(100000).default(0),
});

const variantSchema = z.object({
  sizeCode: z.string().trim().min(1).max(20),
  sizeLabel: z.string().trim().min(1).max(50).optional(),
  sizeGroup: z.enum(["TOP", "PANT", "GENERAL"]).default("GENERAL"),
  sku: z.string().trim().min(2).max(100),
  priceOverride: z.number().positive().nullable().optional(),
  isDefault: z.boolean().default(false),
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).default("ACTIVE"),
  initialStock: z.number().int().min(0).max(100000).default(0),
  reorderLevel: z.number().int().min(0).max(100000).default(0),
});

export const createProductSchema = z.object({
  category: z.string().trim().min(1).max(120),
  publicId: z.string().trim().min(1).max(64),
  slug: z.string().trim().min(1).max(160),
  indexCode: z.string().trim().max(20).nullable().optional(),
  skuBase: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(160),
  basePrice: z.number().positive().max(1_000_000),
  currency: z.string().trim().length(3).default("BDT"),
  spec: z.string().trim().max(255).nullable().optional(),
  tagline: z.string().trim().max(255).nullable().optional(),
  description: z.string().trim().max(20000).nullable().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).default("DRAFT"),
  publishedAt: z.string().datetime().nullable().optional(),
  images: z.array(imageSchema).max(50).default([]),
  features: z.array(z.string().trim().min(1).max(255)).max(100).default([]),
  variants: z.array(variantSchema).max(100).default([]),
});

export const updateProductSchema = createProductSchema
  .omit({ images: true, features: true, variants: true })
  .partial();

export const productPublicIdParamsSchema = z.object({
  productId: z.string().trim().min(1).max(64),
});
export const imageIdParamsSchema = productPublicIdParamsSchema.extend({
  imageId: z.string().regex(/^\d+$/),
});
export const featureIdParamsSchema = productPublicIdParamsSchema.extend({
  featureId: z.string().regex(/^\d+$/),
});
export const variantIdParamsSchema = productPublicIdParamsSchema.extend({
  variantId: z.string().regex(/^\d+$/),
});

export const addImageSchema = imageSchema;
export const addFeatureSchema = z.object({
  text: z.string().trim().min(1).max(255),
  sortOrder: z.number().int().min(0).max(100000).default(0),
});
export const addVariantSchema = variantSchema.omit({ initialStock: true }).extend({
  initialStock: z.number().int().min(0).max(100000).default(0),
});
export const updateVariantSchema = z.object({
  sku: z.string().trim().min(2).max(100).optional(),
  priceOverride: z.number().positive().nullable().optional(),
  isDefault: z.boolean().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),
  reorderLevel: z.number().int().min(0).max(100000).optional(),
});
