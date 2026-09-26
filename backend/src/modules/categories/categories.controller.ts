import type { RequestHandler } from "express";
import { getPublicCategories } from "./categories.service.js";

export const listCategoriesController: RequestHandler = async (_req, res) => {
  const categories = await getPublicCategories();

  res.json({
    data: categories,
    meta: {
      count: categories.length,
    },
  });
};
