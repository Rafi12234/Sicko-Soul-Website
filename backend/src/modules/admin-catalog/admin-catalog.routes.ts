import { Router } from "express";
import {
  adminAddProductFeatureController,
  adminAddProductImageController,
  adminAddProductVariantController,
  adminArchiveProductController,
  adminCreateCategoryController,
  adminCreateProductController,
  adminDeleteProductFeatureController,
  adminDeleteProductImageController,
  adminGetProductController,
  adminListCategoriesController,
  adminListProductsController,
  adminUpdateCategoryController,
  adminUpdateProductController,
  adminUpdateProductVariantController,
} from "./admin-catalog.controller.js";

export const adminCatalogRouter = Router();

adminCatalogRouter.get("/categories", adminListCategoriesController);
adminCatalogRouter.post("/categories", adminCreateCategoryController);
adminCatalogRouter.patch("/categories/:categoryId", adminUpdateCategoryController);

adminCatalogRouter.get("/products", adminListProductsController);
adminCatalogRouter.post("/products", adminCreateProductController);
adminCatalogRouter.get("/products/:productId", adminGetProductController);
adminCatalogRouter.patch("/products/:productId", adminUpdateProductController);
adminCatalogRouter.delete("/products/:productId", adminArchiveProductController);

adminCatalogRouter.post("/products/:productId/images", adminAddProductImageController);
adminCatalogRouter.delete("/products/:productId/images/:imageId", adminDeleteProductImageController);
adminCatalogRouter.post("/products/:productId/features", adminAddProductFeatureController);
adminCatalogRouter.delete("/products/:productId/features/:featureId", adminDeleteProductFeatureController);
adminCatalogRouter.post("/products/:productId/variants", adminAddProductVariantController);
adminCatalogRouter.patch("/products/:productId/variants/:variantId", adminUpdateProductVariantController);
