import { Router } from "express";
import {
  addCartItemController,
  createCartController,
  getCartController,
  removeCartItemController,
  updateCartItemController,
} from "./carts.controller.js";

export const cartsRouter = Router();

cartsRouter.post("/", createCartController);
cartsRouter.get("/:cartToken", getCartController);
cartsRouter.post("/:cartToken/items", addCartItemController);
cartsRouter.patch("/:cartToken/items/:itemId", updateCartItemController);
cartsRouter.delete("/:cartToken/items/:itemId", removeCartItemController);
