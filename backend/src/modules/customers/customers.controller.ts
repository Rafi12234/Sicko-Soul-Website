import type { RequestHandler } from "express";
import { auditContextFromRequest } from "../../utils/audit-context.js";
import {
  getCustomerForAdmin,
  listCustomersForAdmin,
  updateCustomerStatusForAdmin,
} from "./customers.admin.service.js";
import {
  customerIdParamsSchema,
  updateCustomerStatusSchema,
} from "./customers.schema.js";

export const adminListCustomersController: RequestHandler = async (_req, res) => {
  const data = await listCustomersForAdmin();
  res.json({ data, meta: { count: data.length } });
};

export const adminGetCustomerController: RequestHandler = async (req, res) => {
  const { customerId } = customerIdParamsSchema.parse(req.params);
  res.json({ data: await getCustomerForAdmin(BigInt(customerId)) });
};

export const adminUpdateCustomerStatusController: RequestHandler = async (req, res) => {
  const { customerId } = customerIdParamsSchema.parse(req.params);
  const input = updateCustomerStatusSchema.parse(req.body);
  res.json({
    data: await updateCustomerStatusForAdmin(
      BigInt(customerId),
      input.status,
      auditContextFromRequest(req, res),
    ),
  });
};
