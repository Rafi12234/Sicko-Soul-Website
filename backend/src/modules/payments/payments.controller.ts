import type { RequestHandler } from "express";
import { auditContextFromRequest } from "../../utils/audit-context.js";
import {
  createPaymentSchema,
  paymentIdParamsSchema,
  updatePaymentSchema,
} from "./payments.schema.js";
import {
  createPaymentForAdmin,
  listPaymentsForAdmin,
  updatePaymentForAdmin,
} from "./payments.service.js";

export const adminListPaymentsController: RequestHandler = async (_req, res) => {
  const data = await listPaymentsForAdmin();
  res.json({ data, meta: { count: data.length } });
};

export const adminCreatePaymentController: RequestHandler = async (req, res) => {
  const input = createPaymentSchema.parse(req.body);
  res.status(201).json({ data: await createPaymentForAdmin(input, auditContextFromRequest(req, res)) });
};

export const adminUpdatePaymentController: RequestHandler = async (req, res) => {
  const { paymentId } = paymentIdParamsSchema.parse(req.params);
  const input = updatePaymentSchema.parse(req.body);
  res.json({ data: await updatePaymentForAdmin(BigInt(paymentId), input, auditContextFromRequest(req, res)) });
};
