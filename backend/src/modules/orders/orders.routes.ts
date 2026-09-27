import { Router } from "express";
import {
  adminGetOrderController,
  adminListOrdersController,
  adminUpdateOrderStatusController,
  createOrderController,
  getOrderController,
  lookupOrderController,
} from "./orders.controller.js";

export const ordersRouter = Router();
ordersRouter.post("/", createOrderController);
ordersRouter.post("/lookup", lookupOrderController);
ordersRouter.get("/:reference", getOrderController);

export const adminOrdersRouter = Router();
adminOrdersRouter.get("/", adminListOrdersController);
adminOrdersRouter.get("/:reference", adminGetOrderController);
adminOrdersRouter.patch("/:reference/status", adminUpdateOrderStatusController);
