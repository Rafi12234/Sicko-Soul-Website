import { Router } from "express";
import {
  adminListReviewsController,
  adminModerateReviewController,
  listProductReviewsController,
  listPublicReviewsController,
  submitProductReviewController,
} from "./reviews.controller.js";

export const publicReviewsRouter = Router();
publicReviewsRouter.get("/", listPublicReviewsController);

export const productReviewsRouter = Router({ mergeParams: true });
productReviewsRouter.get("/", listProductReviewsController);
productReviewsRouter.post("/", submitProductReviewController);

export const adminReviewsRouter = Router();
adminReviewsRouter.get("/", adminListReviewsController);
adminReviewsRouter.patch("/:reviewId", adminModerateReviewController);
