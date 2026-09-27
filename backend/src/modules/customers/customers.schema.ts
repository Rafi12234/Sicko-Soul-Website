import { z } from "zod";

export const customerIdParamsSchema = z.object({
  customerId: z.string().regex(/^\d+$/),
});

export const updateCustomerStatusSchema = z.object({
  status: z.enum(["ACTIVE", "BLOCKED", "ARCHIVED"]),
});
