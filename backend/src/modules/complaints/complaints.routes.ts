import { Router } from "express";
import { requestComplaintAccessController } from "./complaints.access.controller.js";
import { accessRecoveryRateLimit, complaintWriteRateLimit } from "../../middleware/sensitive-rate-limit.js";
import {
  adminGetComplaintController,
  adminListComplaintsController,
  adminReplyComplaintController,
  adminUpdateComplaintController,
  createComplaintController,
  getComplaintController,
  listComplaintCategoriesController,
  replyComplaintController,
} from "./complaints.controller.js";

export const complaintsRouter = Router();
complaintsRouter.get("/categories", listComplaintCategoriesController);
complaintsRouter.post("/", complaintWriteRateLimit, createComplaintController);
complaintsRouter.post("/access", accessRecoveryRateLimit, requestComplaintAccessController);
complaintsRouter.get("/:caseReference", getComplaintController);
complaintsRouter.post("/:caseReference/messages", complaintWriteRateLimit, replyComplaintController);

export const adminComplaintsRouter = Router();
adminComplaintsRouter.get("/", adminListComplaintsController);
adminComplaintsRouter.get("/:complaintId", adminGetComplaintController);
adminComplaintsRouter.patch("/:complaintId", adminUpdateComplaintController);
adminComplaintsRouter.post("/:complaintId/messages", adminReplyComplaintController);
