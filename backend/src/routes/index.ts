import { Router } from "express";
import { categoriesRouter } from "../modules/categories/categories.routes.js";
import { healthRouter } from "../modules/health/health.routes.js";
import { productsRouter } from "../modules/products/products.routes.js";

export const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/categories", categoriesRouter);
apiRouter.use("/products", productsRouter);
