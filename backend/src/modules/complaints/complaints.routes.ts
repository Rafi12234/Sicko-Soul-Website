import { Router } from "express";
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
complaintsRouter.post("/", createComplaintController);
complaintsRouter.get("/:caseReference", getComplaintController);
complaintsRouter.post("/:caseReference/messages", replyComplaintController);

export const adminComplaintsRouter = Router();
adminComplaintsRouter.get("/", adminListComplaintsController);
adminComplaintsRouter.get("/:complaintId", adminGetComplaintController);
adminComplaintsRouter.patch("/:complaintId", adminUpdateComplaintController);
adminComplaintsRouter.post("/:complaintId/messages", adminReplyComplaintController);
