// Deprecated customer email recovery route handler. It is not registered.
import type { RequestHandler } from "express";
export const requestComplaintAccessController: RequestHandler = (_req, res) => {
  res.set("Cache-Control", "no-store");
  res.status(410).json({ error: { code: "EMAIL_RECOVERY_DISABLED", message: "Email recovery is temporarily unavailable." } });
};
