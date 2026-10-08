import { Router } from "express";
import { checkoutRateLimit } from "../../middleware/sensitive-rate-limit.js";
import {
  adminGetOrderController,
  adminListOrdersController,
  adminUpdateOrderStatusController,
  createOrderController,
  getOrderController,
} from "./orders.controller.js";

export const ordersRouter = Router();
ordersRouter.post("/", checkoutRateLimit, createOrderController);
ordersRouter.get("/:reference", getOrderController);

export const adminOrdersRouter = Router();
adminOrdersRouter.get("/", adminListOrdersController);
adminOrdersRouter.get("/:reference", adminGetOrderController);
adminOrdersRouter.patch("/:reference/status", adminUpdateOrderStatusController);
