import { Router } from "express";
import { complaintWriteRateLimit } from "../../middleware/sensitive-rate-limit.js";
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
complaintsRouter.get("/:caseReference", getComplaintController);
complaintsRouter.post("/:caseReference/messages", complaintWriteRateLimit, replyComplaintController);

export const adminComplaintsRouter = Router();
adminComplaintsRouter.get("/", adminListComplaintsController);
adminComplaintsRouter.get("/:complaintId", adminGetComplaintController);
adminComplaintsRouter.patch("/:complaintId", adminUpdateComplaintController);
adminComplaintsRouter.post("/:complaintId/messages", adminReplyComplaintController);
