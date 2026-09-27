import type { RequestHandler } from "express";
import { auditContextFromRequest } from "../../utils/audit-context.js";
import {
  adjustInventorySchema,
  inventoryListQuerySchema,
  inventoryVariantParamsSchema,
} from "./inventory.schema.js";
import {
  adjustInventory,
  getInventoryMovements,
  listInventory,
} from "./inventory.service.js";

export const adminListInventoryController: RequestHandler = async (req, res) => {
  const query = inventoryListQuerySchema.parse(req.query);
  const data = await listInventory(query);
  res.json({ data, meta: { count: data.length } });
};

export const adminAdjustInventoryController: RequestHandler = async (req, res) => {
  const { variantId } = inventoryVariantParamsSchema.parse(req.params);
  const input = adjustInventorySchema.parse(req.body);
  const data = await adjustInventory(BigInt(variantId), input, auditContextFromRequest(req, res));
  res.json({ data });
};

export const adminInventoryMovementsController: RequestHandler = async (req, res) => {
  const { variantId } = inventoryVariantParamsSchema.parse(req.params);
  const data = await getInventoryMovements(BigInt(variantId));
  res.json({ data, meta: { count: data.length } });
};
