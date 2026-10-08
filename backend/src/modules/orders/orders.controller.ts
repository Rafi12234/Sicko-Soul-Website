import type { RequestHandler } from "express";
import { requireCustomerAccess, signCustomerAccess } from "../customer-access/customer-access.js";
import { sendCustomerAccessLink } from "../customer-access/customer-access.service.js";
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
  updateOrderStatus,
} from "./orders.service.js";

export const createOrderController: RequestHandler = async (req, res) => {
  const input = createOrderSchema.parse(req.body);
  res.set("Cache-Control", "no-store");
  const order = await createOrder(input);
  res.status(201).json({ ...order, accessToken: signCustomerAccess("order", order.reference) });
};

export const getOrderController: RequestHandler = async (req, res) => {
  const { reference } = orderReferenceParamsSchema.parse(req.params);
  requireCustomerAccess(req, "order", reference);
  res.set("Cache-Control", "no-store");
  res.json(await getOrder(reference));
};

export const lookupOrderController: RequestHandler = async (req, res) => {
  const input = orderLookupSchema.parse(req.body);
  await sendCustomerAccessLink("order", input.reference, input.identifier);
  res.set("Cache-Control", "no-store");
  res.json({ message: "If the reference and email match, a secure access link will be sent." });
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
