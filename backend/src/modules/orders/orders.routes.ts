import { Router } from "express";
import { checkoutRateLimit, accessRecoveryRateLimit } from "../../middleware/sensitive-rate-limit.js";
import {
  adminGetOrderController,
  adminListOrdersController,
  adminUpdateOrderStatusController,
  createOrderController,
  getOrderController,
  lookupOrderController,
} from "./orders.controller.js";

export const ordersRouter = Router();
ordersRouter.post("/", checkoutRateLimit, createOrderController);
ordersRouter.post("/lookup", accessRecoveryRateLimit, lookupOrderController);
ordersRouter.get("/:reference", getOrderController);

export const adminOrdersRouter = Router();
adminOrdersRouter.get("/", adminListOrdersController);
adminOrdersRouter.get("/:reference", adminGetOrderController);
adminOrdersRouter.patch("/:reference/status", adminUpdateOrderStatusController);
