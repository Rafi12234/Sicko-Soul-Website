import { Router } from "express";
import { getProductController, listProductsController } from "./products.controller.js";

export const productsRouter = Router();

// Availability may change; never cache a customer-facing inventory snapshot.
productsRouter.use((_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

productsRouter.get("/", listProductsController);
productsRouter.get("/:productId", getProductController);
