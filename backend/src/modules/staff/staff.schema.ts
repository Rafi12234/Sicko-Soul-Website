import { z } from "zod";

const roleSchema = z.enum([
  "SUPER_ADMIN",
  "ADMIN",
  "ORDER_MANAGER",
  "INVENTORY_MANAGER",
  "SUPPORT",
]);

export const staffIdParamsSchema = z.object({
  staffId: z.string().regex(/^\d+$/),
});

export const createStaffSchema = z.object({
  fullName: z.string().trim().min(2).max(150),
  email: z.string().trim().email().max(255),
  password: z.string().min(10).max(200),
  role: roleSchema,
  isActive: z.boolean().default(true),
});

export const updateStaffSchema = z.object({
  fullName: z.string().trim().min(2).max(150).optional(),
  email: z.string().trim().email().max(255).optional(),
  password: z.string().min(10).max(200).optional(),
  role: roleSchema.optional(),
  isActive: z.boolean().optional(),
});
