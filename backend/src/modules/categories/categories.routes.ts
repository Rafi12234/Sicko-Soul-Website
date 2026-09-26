import { Router } from "express";
import { listCategoriesController } from "./categories.controller.js";

export const categoriesRouter = Router();

categoriesRouter.get("/", listCategoriesController);
