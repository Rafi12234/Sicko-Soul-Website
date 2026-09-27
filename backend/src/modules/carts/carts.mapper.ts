import { decimalToNumber } from "../../utils/decimal.js";
import type { CartRow } from "./carts.repository.js";

export function mapCart(row: CartRow) {
  const items = row.cart_items.map((item) => {
    const variant = item.product_variants;
    const product = variant.products;
    const stock = variant.inventory_stock;
    const availableQty =
      variant.status === "ACTIVE"
        ? Math.max(0, (stock?.on_hand_qty ?? 0) - (stock?.reserved_qty ?? 0))
        : 0;
    const effectivePrice = variant.price_override
      ? decimalToNumber(variant.price_override)
      : decimalToNumber(product.base_price);
    const primaryImage =
      product.product_images.find((image) => image.image_type === "STILL") ??
      product.product_images[0] ??
      null;

    return {
      id: item.cart_item_id.toString(),
      variantId: variant.variant_id.toString(),
      productId: product.public_id,
      productName: product.name,
      size: variant.sizes.code,
      sku: variant.sku,
      imageUrl: primaryImage?.image_url ?? null,
      quantity: item.quantity,
      priceWhenAdded: decimalToNumber(item.price_when_added),
      currentPrice: effectivePrice,
      availableQty,
      variantStatus: variant.status,
      lineTotal: effectivePrice * item.quantity,
    };
  });

  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);

  return {
    token: row.cart_token,
    status: row.status,
    expiresAt: row.expires_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    items,
    subtotal,
    currency: "BDT",
  };
}
