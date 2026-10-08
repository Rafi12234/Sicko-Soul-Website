import type { RequestHandler } from "express";
import { requireVerifiedOrderReview } from "../customer-access/customer-access.js";
import { auditContextFromRequest } from "../../utils/audit-context.js";
import {
  moderateReviewSchema,
  publicReviewListQuerySchema,
  reviewIdParamsSchema,
  reviewProductParamsSchema,
  submitReviewSchema,
} from "./reviews.schema.js";
import {
  listApprovedReviewFeed,
  listApprovedReviews,
  listReviewsForAdmin,
  moderateReview,
  submitReview,
} from "./reviews.service.js";

export const listPublicReviewsController: RequestHandler = async (req, res) => {
  const query = publicReviewListQuerySchema.parse(req.query);
  const result = await listApprovedReviewFeed(query.limit);
  res.json(result);
};

export const listProductReviewsController: RequestHandler = async (req, res) => {
  const { productId } = reviewProductParamsSchema.parse(req.params);
  res.json(await listApprovedReviews(productId));
};

export const submitProductReviewController: RequestHandler = async (req, res) => {
  const { productId } = reviewProductParamsSchema.parse(req.params);
  const input = submitReviewSchema.parse(req.body);
  // A supplied order reference must be proven using the P0 verified-order token.
  // Anonymous reviews remain supported, but can never claim Verified Purchase.
  if (input.orderReference) requireVerifiedOrderReview(req, input.orderReference);
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
