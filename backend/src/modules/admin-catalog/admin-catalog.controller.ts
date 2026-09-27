import type { RequestHandler } from "express";
import { auditContextFromRequest } from "../../utils/audit-context.js";
import {
  addFeatureSchema,
  addImageSchema,
  addVariantSchema,
  categoryIdParamsSchema,
  createCategorySchema,
  createProductSchema,
  featureIdParamsSchema,
  imageIdParamsSchema,
  productPublicIdParamsSchema,
  updateCategorySchema,
  updateProductSchema,
  updateVariantSchema,
  variantIdParamsSchema,
} from "./admin-catalog.schema.js";
import {
  addProductFeature,
  addProductImage,
  addProductVariant,
  archiveProductForAdmin,
  createCategoryForAdmin,
  createProductForAdmin,
  deleteProductFeature,
  deleteProductImage,
  getProductForAdmin,
  listCategoriesForAdmin,
  listProductsForAdmin,
  updateCategoryForAdmin,
  updateProductForAdmin,
  updateProductVariant,
} from "./admin-catalog.service.js";

export const adminListCategoriesController: RequestHandler = async (_req, res) => {
  const data = await listCategoriesForAdmin();
  res.json({ data, meta: { count: data.length } });
};
export const adminCreateCategoryController: RequestHandler = async (req, res) => {
  res.status(201).json({ data: await createCategoryForAdmin(createCategorySchema.parse(req.body), auditContextFromRequest(req, res)) });
};
export const adminUpdateCategoryController: RequestHandler = async (req, res) => {
  const { categoryId } = categoryIdParamsSchema.parse(req.params);
  res.json({ data: await updateCategoryForAdmin(BigInt(categoryId), updateCategorySchema.parse(req.body), auditContextFromRequest(req, res)) });
};

export const adminListProductsController: RequestHandler = async (_req, res) => {
  const data = await listProductsForAdmin();
  res.json({ data, meta: { count: data.length } });
};
export const adminGetProductController: RequestHandler = async (req, res) => {
  const { productId } = productPublicIdParamsSchema.parse(req.params);
  res.json({ data: await getProductForAdmin(productId) });
};
export const adminCreateProductController: RequestHandler = async (req, res) => {
  res.status(201).json({ data: await createProductForAdmin(createProductSchema.parse(req.body), auditContextFromRequest(req, res)) });
};
export const adminUpdateProductController: RequestHandler = async (req, res) => {
  const { productId } = productPublicIdParamsSchema.parse(req.params);
  res.json({ data: await updateProductForAdmin(productId, updateProductSchema.parse(req.body), auditContextFromRequest(req, res)) });
};
export const adminArchiveProductController: RequestHandler = async (req, res) => {
  const { productId } = productPublicIdParamsSchema.parse(req.params);
  res.json({ data: await archiveProductForAdmin(productId, auditContextFromRequest(req, res)) });
};

export const adminAddProductImageController: RequestHandler = async (req, res) => {
  const { productId } = productPublicIdParamsSchema.parse(req.params);
  res.status(201).json({ data: await addProductImage(productId, addImageSchema.parse(req.body), auditContextFromRequest(req, res)) });
};
export const adminDeleteProductImageController: RequestHandler = async (req, res) => {
  const { productId, imageId } = imageIdParamsSchema.parse(req.params);
  res.json({ data: await deleteProductImage(productId, BigInt(imageId), auditContextFromRequest(req, res)) });
};
export const adminAddProductFeatureController: RequestHandler = async (req, res) => {
  const { productId } = productPublicIdParamsSchema.parse(req.params);
  res.status(201).json({ data: await addProductFeature(productId, addFeatureSchema.parse(req.body), auditContextFromRequest(req, res)) });
};
export const adminDeleteProductFeatureController: RequestHandler = async (req, res) => {
  const { productId, featureId } = featureIdParamsSchema.parse(req.params);
  res.json({ data: await deleteProductFeature(productId, BigInt(featureId), auditContextFromRequest(req, res)) });
};
export const adminAddProductVariantController: RequestHandler = async (req, res) => {
  const { productId } = productPublicIdParamsSchema.parse(req.params);
  res.status(201).json({ data: await addProductVariant(productId, addVariantSchema.parse(req.body), auditContextFromRequest(req, res)) });
};
export const adminUpdateProductVariantController: RequestHandler = async (req, res) => {
  const { productId, variantId } = variantIdParamsSchema.parse(req.params);
  res.json({ data: await updateProductVariant(productId, BigInt(variantId), updateVariantSchema.parse(req.body), auditContextFromRequest(req, res)) });
};
