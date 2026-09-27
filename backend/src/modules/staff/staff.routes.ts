import { Router } from "express";
import {
  adminCreateStaffController,
  adminListStaffController,
  adminUpdateStaffController,
} from "./staff.controller.js";

export const adminStaffRouter = Router();
adminStaffRouter.get("/", adminListStaffController);
adminStaffRouter.post("/", adminCreateStaffController);
adminStaffRouter.patch("/:staffId", adminUpdateStaffController);
