import type { RequestHandler } from "express";
import { auditContextFromRequest } from "../../utils/audit-context.js";
import {
  createShipmentSchema,
  shipmentIdParamsSchema,
  updateShipmentStatusSchema,
} from "./shipments.schema.js";
import {
  createShipmentForAdmin,
  listShipmentsForAdmin,
  updateShipmentForAdmin,
} from "./shipments.service.js";

export const adminListShipmentsController: RequestHandler = async (_req, res) => {
  const data = await listShipmentsForAdmin();
  res.json({ data, meta: { count: data.length } });
};

export const adminCreateShipmentController: RequestHandler = async (req, res) => {
  const input = createShipmentSchema.parse(req.body);
  res.status(201).json({ data: await createShipmentForAdmin(input, auditContextFromRequest(req, res)) });
};

export const adminUpdateShipmentController: RequestHandler = async (req, res) => {
  const { shipmentId } = shipmentIdParamsSchema.parse(req.params);
  const input = updateShipmentStatusSchema.parse(req.body);
  res.json({ data: await updateShipmentForAdmin(BigInt(shipmentId), input, auditContextFromRequest(req, res)) });
};
