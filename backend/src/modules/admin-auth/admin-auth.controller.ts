import type { RequestHandler } from "express";
import { getStaffContext } from "../../utils/staff-context.js";
import { staffLoginSchema } from "./admin-auth.schema.js";
import { getStaffSession, loginStaff } from "./admin-auth.service.js";

export const staffLoginController: RequestHandler = async (req, res) => {
  const input = staffLoginSchema.parse(req.body);
  res.json({ data: await loginStaff(input) });
};

export const staffMeController: RequestHandler = async (_req, res) => {
  res.json({ data: getStaffSession(getStaffContext(res)) });
};
