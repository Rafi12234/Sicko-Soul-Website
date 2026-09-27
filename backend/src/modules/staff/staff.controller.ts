import type { RequestHandler } from "express";
import { auditContextFromRequest } from "../../utils/audit-context.js";
import {
  createStaffSchema,
  staffIdParamsSchema,
  updateStaffSchema,
} from "./staff.schema.js";
import { createStaff, listStaff, updateStaff } from "./staff.service.js";

export const adminListStaffController: RequestHandler = async (_req, res) => {
  const data = await listStaff();
  res.json({ data, meta: { count: data.length } });
};

export const adminCreateStaffController: RequestHandler = async (req, res) => {
  const input = createStaffSchema.parse(req.body);
  res.status(201).json({ data: await createStaff(input, auditContextFromRequest(req, res)) });
};

export const adminUpdateStaffController: RequestHandler = async (req, res) => {
  const { staffId } = staffIdParamsSchema.parse(req.params);
  const input = updateStaffSchema.parse(req.body);
  res.json({ data: await updateStaff(BigInt(staffId), input, auditContextFromRequest(req, res)) });
};
