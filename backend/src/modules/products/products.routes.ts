import { Router } from "express";
import { getProductController, listProductsController } from "./products.controller.js";

export const productsRouter = Router();

productsRouter.get("/", listProductsController);
productsRouter.get("/:productId", getProductController);
