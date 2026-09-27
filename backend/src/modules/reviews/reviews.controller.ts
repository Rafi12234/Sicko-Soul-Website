import type { RequestHandler } from "express";
import { auditContextFromRequest } from "../../utils/audit-context.js";
import {
  moderateReviewSchema,
  reviewIdParamsSchema,
  reviewProductParamsSchema,
  submitReviewSchema,
} from "./reviews.schema.js";
import {
  listApprovedReviews,
  listReviewsForAdmin,
  moderateReview,
  submitReview,
} from "./reviews.service.js";

export const listProductReviewsController: RequestHandler = async (req, res) => {
  const { productId } = reviewProductParamsSchema.parse(req.params);
  res.json(await listApprovedReviews(productId));
};

export const submitProductReviewController: RequestHandler = async (req, res) => {
  const { productId } = reviewProductParamsSchema.parse(req.params);
  const input = submitReviewSchema.parse(req.body);
  res.status(201).json(await submitReview(productId, input));
};

export const adminListReviewsController: RequestHandler = async (_req, res) => {
  const data = await listReviewsForAdmin();
  res.json({ data, meta: { count: data.length } });
};

export const adminModerateReviewController: RequestHandler = async (req, res) => {
  const { reviewId } = reviewIdParamsSchema.parse(req.params);
  const input = moderateReviewSchema.parse(req.body);
  res.json({ data: await moderateReview(BigInt(reviewId), input, auditContextFromRequest(req, res)) });
};
