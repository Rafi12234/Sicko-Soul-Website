import { Router } from "express";
import {
  adminCreateShipmentController,
  adminListShipmentsController,
  adminUpdateShipmentController,
} from "./shipments.controller.js";

export const adminShipmentsRouter = Router();
adminShipmentsRouter.get("/", adminListShipmentsController);
adminShipmentsRouter.post("/", adminCreateShipmentController);
adminShipmentsRouter.patch("/:shipmentId", adminUpdateShipmentController);
