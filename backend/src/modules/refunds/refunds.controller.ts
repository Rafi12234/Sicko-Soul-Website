import type { RequestHandler } from "express";
import { requireCustomerAccess } from "../customer-access/customer-access.js";
import { auditContextFromRequest } from "../../utils/audit-context.js";
import { orderReferenceParamsSchema } from "../orders/orders.schema.js";
import {
  refundIdParamsSchema,
  requestRefundSchema,
  updateRefundSchema,
} from "./refunds.schema.js";
import {
  listRefundsForAdmin,
  requestRefund,
  updateRefundForAdmin,
} from "./refunds.service.js";

export const requestRefundController: RequestHandler = async (req, res) => {
  const { reference } = orderReferenceParamsSchema.parse(req.params);
  requireCustomerAccess(req, "order", reference);
  const input = requestRefundSchema.parse(req.body);
  res.set("Cache-Control", "no-store");
  res.status(201).json(await requestRefund(reference, input));
};

export const adminListRefundsController: RequestHandler = async (_req, res) => {
  const data = await listRefundsForAdmin();
  res.json({ data, meta: { count: data.length } });
};

export const adminUpdateRefundController: RequestHandler = async (req, res) => {
  const { refundId } = refundIdParamsSchema.parse(req.params);
  const input = updateRefundSchema.parse(req.body);
  res.json({ data: await updateRefundForAdmin(BigInt(refundId), input, auditContextFromRequest(req, res)) });
};
