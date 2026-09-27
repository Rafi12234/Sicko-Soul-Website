import { Router } from "express";
import { requestRefundController, adminListRefundsController, adminUpdateRefundController } from "./refunds.controller.js";

export const orderRefundsRouter = Router({ mergeParams: true });
orderRefundsRouter.post("/", requestRefundController);

export const adminRefundsRouter = Router();
adminRefundsRouter.get("/", adminListRefundsController);
adminRefundsRouter.patch("/:refundId", adminUpdateRefundController);
