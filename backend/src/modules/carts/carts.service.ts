import { env } from "../../config/env.js";
import { AppError } from "../../errors/app-error.js";
import { prisma } from "../../lib/prisma.js";
import { decimalToNumber } from "../../utils/decimal.js";
import { createCartToken } from "../../utils/references.js";
import { mapCart } from "./carts.mapper.js";
import { cartInclude, findCartByToken } from "./carts.repository.js";

function expiryDate(): Date {
  const date = new Date();
  date.setDate(date.getDate() + env.CART_TTL_DAYS);
  return date;
}

async function getActiveCart(cartToken: string) {
  const cart = await findCartByToken(cartToken);
  if (!cart) {
    throw new AppError({ statusCode: 404, code: "CART_NOT_FOUND", message: "Cart was not found." });
  }
  if (cart.status !== "ACTIVE") {
    throw new AppError({ statusCode: 409, code: "CART_NOT_ACTIVE", message: "This cart is no longer active." });
  }
  if (cart.expires_at && cart.expires_at.getTime() <= Date.now()) {
    await prisma.carts.update({ where: { cart_id: cart.cart_id }, data: { status: "EXPIRED" } });
    throw new AppError({ statusCode: 409, code: "CART_EXPIRED", message: "This cart has expired." });
  }
  return cart;
}

export async function createOrResumeCart(cartToken?: string) {
  if (cartToken) {
    const existing = await findCartByToken(cartToken);
    if (existing?.status === "ACTIVE" && (!existing.expires_at || existing.expires_at.getTime() > Date.now())) {
      return mapCart(existing);
    }
  }

  const row = await prisma.carts.create({
    data: {
      cart_token: createCartToken(),
      status: "ACTIVE",
      expires_at: expiryDate(),
    },
    include: cartInclude,
  });
  return mapCart(row);
}

export async function getCart(cartToken: string) {
  return mapCart(await getActiveCart(cartToken));
}

export async function addCartItem(cartToken: string, input: { variantId: string; quantity: number }) {
  const cart = await getActiveCart(cartToken);
  const variantId = BigInt(input.variantId);
  const variant = await prisma.product_variants.findFirst({
    where: {
      variant_id: variantId,
      status: "ACTIVE",
      products: { is: { status: "ACTIVE", product_categories: { is: { is_active: true } } } },
    },
    include: { inventory_stock: true, products: true },
  });
  if (!variant) {
    throw new AppError({ statusCode: 404, code: "VARIANT_NOT_FOUND", message: "The selected size is not available." });
  }

  const available = Math.max(
    0,
    (variant.inventory_stock?.on_hand_qty ?? 0) - (variant.inventory_stock?.reserved_qty ?? 0),
  );
  const existing = cart.cart_items.find((item) => item.variant_id === variantId);
  const nextQty = (existing?.quantity ?? 0) + input.quantity;
  if (nextQty > available) {
    throw new AppError({
      statusCode: 409,
      code: "INSUFFICIENT_STOCK",
      message: "The requested cart quantity is no longer available.",
      details: { available },
    });
  }

  const price = variant.price_override
    ? decimalToNumber(variant.price_override)
    : decimalToNumber(variant.products.base_price);

  await prisma.cart_items.upsert({
    where: {
      cart_id_variant_id: {
        cart_id: cart.cart_id,
        variant_id: variantId,
      },
    },
    create: {
      cart_id: cart.cart_id,
      variant_id: variantId,
      quantity: input.quantity,
      price_when_added: price,
    },
    update: {
      quantity: nextQty,
      price_when_added: price,
    },
  });
  await prisma.carts.update({
    where: { cart_id: cart.cart_id },
    data: { expires_at: expiryDate() },
  });

  return mapCart((await findCartByToken(cartToken))!);
}

export async function updateCartItem(
  cartToken: string,
  itemId: bigint,
  input: { quantity: number },
) {
  const cart = await getActiveCart(cartToken);
  const item = cart.cart_items.find((entry) => entry.cart_item_id === itemId);
  if (!item) {
    throw new AppError({ statusCode: 404, code: "CART_ITEM_NOT_FOUND", message: "Cart item was not found." });
  }

  const stock = item.product_variants.inventory_stock;
  const available = item.product_variants.status === "ACTIVE"
    ? Math.max(0, (stock?.on_hand_qty ?? 0) - (stock?.reserved_qty ?? 0))
    : 0;
  if (input.quantity > available) {
    throw new AppError({
      statusCode: 409,
      code: "INSUFFICIENT_STOCK",
      message: "The requested cart quantity is no longer available.",
      details: { available },
    });
  }

  await prisma.cart_items.update({
    where: { cart_item_id: itemId },
    data: { quantity: input.quantity },
  });
  return mapCart((await findCartByToken(cartToken))!);
}

export async function removeCartItem(cartToken: string, itemId: bigint) {
  const cart = await getActiveCart(cartToken);
  const item = cart.cart_items.find((entry) => entry.cart_item_id === itemId);
  if (!item) {
    throw new AppError({ statusCode: 404, code: "CART_ITEM_NOT_FOUND", message: "Cart item was not found." });
  }
  await prisma.cart_items.delete({ where: { cart_item_id: itemId } });
  return mapCart((await findCartByToken(cartToken))!);
}
