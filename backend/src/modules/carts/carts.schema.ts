import { z } from "zod";

export const createCartSchema = z.object({
  cartToken: z.string().uuid().optional(),
});

export const cartTokenParamsSchema = z.object({
  cartToken: z.string().uuid(),
});

export const cartItemParamsSchema = z.object({
  cartToken: z.string().uuid(),
  itemId: z.string().regex(/^\d+$/),
});

export const addCartItemSchema = z.object({
  variantId: z.string().regex(/^\d+$/),
  quantity: z.number().int().min(1).max(20).default(1),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(1).max(20),
});
