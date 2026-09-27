import { z } from "zod";

export const shipmentIdParamsSchema = z.object({
  shipmentId: z.string().regex(/^\d+$/),
});

export const createShipmentSchema = z.object({
  orderReference: z.string().trim().min(3).max(32),
  courierName: z.string().trim().max(120).nullable().optional(),
  courierService: z.string().trim().max(120).nullable().optional(),
  trackingCode: z.string().trim().max(191).nullable().optional(),
  shippingCost: z.number().min(0).max(1_000_000).default(0),
});

export const updateShipmentStatusSchema = z.object({
  status: z.enum([
    "PENDING",
    "READY",
    "DISPATCHED",
    "IN_TRANSIT",
    "DELIVERED",
    "FAILED",
    "RETURNED",
    "CANCELLED",
  ]),
  note: z.string().trim().max(500).optional(),
  courierName: z.string().trim().max(120).nullable().optional(),
  courierService: z.string().trim().max(120).nullable().optional(),
  trackingCode: z.string().trim().max(191).nullable().optional(),
});
