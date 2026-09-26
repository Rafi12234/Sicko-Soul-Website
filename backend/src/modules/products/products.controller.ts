import type { RequestHandler } from "express";
import {
  productIdentifierParamsSchema,
  productListQuerySchema,
} from "./products.schema.js";
import { getPublicProduct, getPublicProducts } from "./products.service.js";

export const listProductsController: RequestHandler = async (req, res) => {
  const query = productListQuerySchema.parse(req.query);
  const result = await getPublicProducts(query);

  res.json({
    data: result.products,
    meta: {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
    },
  });
};

export const getProductController: RequestHandler = async (req, res) => {
  const params = productIdentifierParamsSchema.parse(req.params);
  const product = await getPublicProduct(params.productId);

  res.json({ data: product });
};
