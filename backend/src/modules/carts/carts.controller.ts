import type { RequestHandler } from "express";
import {
  addCartItemSchema,
  cartItemParamsSchema,
  cartTokenParamsSchema,
  createCartSchema,
  updateCartItemSchema,
} from "./carts.schema.js";
import {
  addCartItem,
  createOrResumeCart,
  getCart,
  removeCartItem,
  updateCartItem,
} from "./carts.service.js";

export const createCartController: RequestHandler = async (req, res) => {
  const input = createCartSchema.parse(req.body ?? {});
  res.status(201).json({ data: await createOrResumeCart(input.cartToken) });
};

export const getCartController: RequestHandler = async (req, res) => {
  const { cartToken } = cartTokenParamsSchema.parse(req.params);
  res.json({ data: await getCart(cartToken) });
};

export const addCartItemController: RequestHandler = async (req, res) => {
  const { cartToken } = cartTokenParamsSchema.parse(req.params);
  const input = addCartItemSchema.parse(req.body);
  res.status(201).json({ data: await addCartItem(cartToken, input) });
};

export const updateCartItemController: RequestHandler = async (req, res) => {
  const { cartToken, itemId } = cartItemParamsSchema.parse(req.params);
  const input = updateCartItemSchema.parse(req.body);
  res.json({ data: await updateCartItem(cartToken, BigInt(itemId), input) });
};

export const removeCartItemController: RequestHandler = async (req, res) => {
  const { cartToken, itemId } = cartItemParamsSchema.parse(req.params);
  res.json({ data: await removeCartItem(cartToken, BigInt(itemId)) });
};
