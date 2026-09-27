import { Router } from "express";
import {
  adminGetCustomerController,
  adminListCustomersController,
  adminUpdateCustomerStatusController,
} from "./customers.controller.js";

export const adminCustomersRouter = Router();
adminCustomersRouter.get("/", adminListCustomersController);
adminCustomersRouter.get("/:customerId", adminGetCustomerController);
adminCustomersRouter.patch("/:customerId/status", adminUpdateCustomerStatusController);
