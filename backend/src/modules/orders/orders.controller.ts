import type { RequestHandler } from "express";
import { auditContextFromRequest } from "../../utils/audit-context.js";
import {
  adminOrderListQuerySchema,
  adminOrderStatusSchema,
  createOrderSchema,
  orderLookupSchema,
  orderReferenceParamsSchema,
} from "./orders.schema.js";
import {
  createOrder,
  getOrder,
  listOrdersForAdmin,
  lookupOrder,
  updateOrderStatus,
} from "./orders.service.js";

export const createOrderController: RequestHandler = async (req, res) => {
  const input = createOrderSchema.parse(req.body);
  res.status(201).json(await createOrder(input));
};

export const getOrderController: RequestHandler = async (req, res) => {
  const { reference } = orderReferenceParamsSchema.parse(req.params);
  res.json(await getOrder(reference));
};

export const lookupOrderController: RequestHandler = async (req, res) => {
  const input = orderLookupSchema.parse(req.body);
  res.json(await lookupOrder(input.reference, input.identifier));
};

export const adminListOrdersController: RequestHandler = async (req, res) => {
  const input = adminOrderListQuerySchema.parse(req.query);
  res.json(await listOrdersForAdmin(input));
};

export const adminGetOrderController: RequestHandler = async (req, res) => {
  const { reference } = orderReferenceParamsSchema.parse(req.params);
  res.json({ data: await getOrder(reference) });
};

export const adminUpdateOrderStatusController: RequestHandler = async (req, res) => {
  const { reference } = orderReferenceParamsSchema.parse(req.params);
  const input = adminOrderStatusSchema.parse(req.body);
  res.json({ data: await updateOrderStatus(reference, input, auditContextFromRequest(req, res)) });
};
