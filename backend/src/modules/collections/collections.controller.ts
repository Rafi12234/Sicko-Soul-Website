import type { RequestHandler } from "express";
import { auditContextFromRequest } from "../../utils/audit-context.js";
import {
  adminCollectionIdParamsSchema,
  collectionSlugParamsSchema,
  createCollectionSchema,
  setCollectionProductsSchema,
  updateCollectionSchema,
} from "./collections.schema.js";
import {
  createCollectionForAdmin,
  getCollectionsForAdmin,
  getPublicCollection,
  getPublicCollections,
  setCollectionProductsForAdmin,
  updateCollectionForAdmin,
} from "./collections.service.js";

export const listCollectionsController: RequestHandler = async (_req, res) => {
  const data = await getPublicCollections();
  res.json(data);
};

export const getCollectionController: RequestHandler = async (req, res) => {
  const { slug } = collectionSlugParamsSchema.parse(req.params);
  res.json(await getPublicCollection(slug));
};

export const adminListCollectionsController: RequestHandler = async (_req, res) => {
  const data = await getCollectionsForAdmin();
  res.json({ data, meta: { count: data.length } });
};

export const adminCreateCollectionController: RequestHandler = async (req, res) => {
  const input = createCollectionSchema.parse(req.body);
  const data = await createCollectionForAdmin(input, auditContextFromRequest(req, res));
  res.status(201).json({ data });
};

export const adminUpdateCollectionController: RequestHandler = async (req, res) => {
  const { collectionId } = adminCollectionIdParamsSchema.parse(req.params);
  const input = updateCollectionSchema.parse(req.body);
  const data = await updateCollectionForAdmin(BigInt(collectionId), input, auditContextFromRequest(req, res));
  res.json({ data });
};

export const adminSetCollectionProductsController: RequestHandler = async (req, res) => {
  const { collectionId } = adminCollectionIdParamsSchema.parse(req.params);
  const input = setCollectionProductsSchema.parse(req.body);
  const data = await setCollectionProductsForAdmin(BigInt(collectionId), input, auditContextFromRequest(req, res));
  res.json({ data });
};
