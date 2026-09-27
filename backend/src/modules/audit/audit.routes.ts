import { Router } from "express";
import { adminListAuditLogsController } from "./audit.controller.js";

export const adminAuditRouter = Router();
adminAuditRouter.get("/", adminListAuditLogsController);
