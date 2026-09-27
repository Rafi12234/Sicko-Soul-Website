import { Router } from "express";
import {
  adminCreateCollectionController,
  adminListCollectionsController,
  adminSetCollectionProductsController,
  adminUpdateCollectionController,
  getCollectionController,
  listCollectionsController,
} from "./collections.controller.js";

export const collectionsRouter = Router();
collectionsRouter.get("/", listCollectionsController);
collectionsRouter.get("/:slug", getCollectionController);

export const adminCollectionsRouter = Router();
adminCollectionsRouter.get("/", adminListCollectionsController);
adminCollectionsRouter.post("/", adminCreateCollectionController);
adminCollectionsRouter.patch("/:collectionId", adminUpdateCollectionController);
adminCollectionsRouter.put("/:collectionId/products", adminSetCollectionProductsController);
