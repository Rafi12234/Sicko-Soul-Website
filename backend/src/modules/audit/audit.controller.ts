import type { RequestHandler } from "express";
import { listAuditLogs } from "./audit.service.js";

export const adminListAuditLogsController: RequestHandler = async (_req, res) => {
  const data = await listAuditLogs();
  res.json({ data, meta: { count: data.length } });
};
