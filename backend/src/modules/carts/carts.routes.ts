import { Router } from "express";
import { cartCreationRateLimit } from "../../middleware/sensitive-rate-limit.js";
import {
  addCartItemController,
  createCartController,
  getCartController,
  removeCartItemController,
  updateCartItemController,
} from "./carts.controller.js";

export const cartsRouter = Router();

// Customer cart state is private to its token and must never be cached.
cartsRouter.use((_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

cartsRouter.post("/", cartCreationRateLimit, createCartController);
cartsRouter.get("/:cartToken", getCartController);
cartsRouter.post("/:cartToken/items", addCartItemController);
cartsRouter.patch("/:cartToken/items/:itemId", updateCartItemController);
cartsRouter.delete("/:cartToken/items/:itemId", removeCartItemController);
