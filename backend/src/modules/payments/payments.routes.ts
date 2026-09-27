import { Router } from "express";
import {
  adminCreatePaymentController,
  adminListPaymentsController,
  adminUpdatePaymentController,
} from "./payments.controller.js";

export const adminPaymentsRouter = Router();
adminPaymentsRouter.get("/", adminListPaymentsController);
adminPaymentsRouter.post("/", adminCreatePaymentController);
adminPaymentsRouter.patch("/:paymentId", adminUpdatePaymentController);
