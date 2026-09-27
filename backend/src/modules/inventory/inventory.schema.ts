import { z } from "zod";

export const inventoryListQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  lowStock: z.enum(["true", "false"]).optional(),
});

export const inventoryVariantParamsSchema = z.object({
  variantId: z.string().regex(/^\d+$/),
});

export const adjustInventorySchema = z.object({
  movementType: z.enum(["RESTOCK", "RETURN", "ADJUSTMENT"]),
  onHandDelta: z.number().int().min(-100000).max(100000),
  reservedDelta: z.number().int().min(-100000).max(100000).default(0),
  reorderLevel: z.number().int().min(0).max(100000).optional(),
  note: z.string().trim().max(500).optional(),
});
