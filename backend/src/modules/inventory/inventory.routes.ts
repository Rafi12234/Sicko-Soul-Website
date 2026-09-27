import { Router } from "express";
import {
  adminAdjustInventoryController,
  adminInventoryMovementsController,
  adminListInventoryController,
} from "./inventory.controller.js";

export const adminInventoryRouter = Router();

adminInventoryRouter.get("/", adminListInventoryController);
adminInventoryRouter.post("/:variantId/adjust", adminAdjustInventoryController);
adminInventoryRouter.get("/:variantId/movements", adminInventoryMovementsController);
