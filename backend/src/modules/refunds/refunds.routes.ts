import { Router } from "express";
import { refundRateLimit } from "../../middleware/sensitive-rate-limit.js";
import { requestRefundController, adminListRefundsController, adminUpdateRefundController } from "./refunds.controller.js";

export const orderRefundsRouter = Router({ mergeParams: true });
orderRefundsRouter.post("/", refundRateLimit, requestRefundController);

export const adminRefundsRouter = Router();
adminRefundsRouter.get("/", adminListRefundsController);
adminRefundsRouter.patch("/:refundId", adminUpdateRefundController);
