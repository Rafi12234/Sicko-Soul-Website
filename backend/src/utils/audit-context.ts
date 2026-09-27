import type { Request, Response } from "express";
import type { AuditContext } from "../types/auth.js";
import { getStaffContext } from "./staff-context.js";

export function auditContextFromRequest(req: Request, res: Response): AuditContext {
  return {
    staff: getStaffContext(res),
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  };
}
