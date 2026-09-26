"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { findProductById, getVariantBySize } from "@/data/products";
import type { CartStatus } from "@/types/commerce";

export type CartLine = {
  key: string;
  productId: string;
  variantId: string;
  size: string;
  quantity: number;
  unitPrice: number;
  stockMax: number;
};

type CartState = {
  cartToken: string | null;
  status: CartStatus;
  items: CartLine[];
  ensureCartToken: () => string;
  addItem: (productId: string, size: string, quantity?: number) => void;
  removeItem: (key: string) => void;
  setQuantity: (key: string, quantity: number) => void;
  setSize: (key: string, size: string) => void;
  markConverted: () => void;
  clearCart: () => void;
};

function makeToken() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const lineKey = (productId: string, variantId: string) => `${productId}::${variantId}`;

function resolveVariant(productId: string, size: string) {
  const lookup = findProductById(productId);
  if (!lookup) return null;
  return getVariantBySize(lookup.product, size) ?? null;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      cartToken: null,
      status: "ACTIVE",
      items: [],

      ensureCartToken: () => {
        const current = get().cartToken;
        if (current) return current;
        const next = makeToken();
        set({ cartToken: next, status: "ACTIVE" });
        return next;
      },

      addItem: (productId, size, quantity = 1) => {
        const variant = resolveVariant(productId, size);
        if (!variant || variant.status !== "ACTIVE" || variant.availableQty <= 0) return;

        const token = get().cartToken ?? makeToken();
        const key = lineKey(productId, variant.id);

        set((state) => {
          const existing = state.items.find((item) => item.key === key);
          if (existing) {
            return {
              cartToken: token,
              status: "ACTIVE",
              items: state.items.map((item) =>
                item.key === key
                  ? {
                      ...item,
                      quantity: Math.max(
                        1,
                        Math.min(variant.availableQty, item.quantity + quantity),
                      ),
                      unitPrice: variant.price,
                      stockMax: variant.availableQty,
                    }
                  : item,
              ),
            };
          }

          return {
            cartToken: token,
            status: "ACTIVE",
            items: [
              ...state.items,
              {
                key,
                productId,
                variantId: variant.id,
                size: variant.size,
                quantity: Math.max(1, Math.min(variant.availableQty, quantity)),
                unitPrice: variant.price,
                stockMax: variant.availableQty,
              },
            ],
          };
        });
      },

      removeItem: (key) =>
        set((state) => ({ items: state.items.filter((item) => item.key !== key) })),

      setQuantity: (key, quantity) =>
        set((state) => ({
          items: state.items
            .map((item) =>
              item.key === key
                ? { ...item, quantity: Math.max(0, Math.min(item.stockMax, Math.round(quantity))) }
                : item,
            )
            .filter((item) => item.quantity > 0),
        })),

      setSize: (key, size) =>
        set((state) => {
          const source = state.items.find((item) => item.key === key);
          if (!source) return state;

          const variant = resolveVariant(source.productId, size);
          if (!variant || variant.status !== "ACTIVE" || variant.availableQty <= 0) return state;

          const nextKey = lineKey(source.productId, variant.id);
          if (nextKey === key) return state;

          const collision = state.items.find((item) => item.key === nextKey);
          if (collision) {
            return {
              ...state,
              items: state.items
                .filter((item) => item.key !== key)
                .map((item) =>
                  item.key === nextKey
                    ? {
                        ...item,
                        quantity: Math.min(
                          variant.availableQty,
                          item.quantity + source.quantity,
                        ),
                        unitPrice: variant.price,
                        stockMax: variant.availableQty,
                      }
                    : item,
                ),
            };
          }

          return {
            ...state,
            items: state.items.map((item) =>
              item.key === key
                ? {
                    ...item,
                    key: nextKey,
                    variantId: variant.id,
                    size: variant.size,
                    quantity: Math.min(source.quantity, variant.availableQty),
                    unitPrice: variant.price,
                    stockMax: variant.availableQty,
                  }
                : item,
            ),
          };
        }),

      markConverted: () => set({ items: [], status: "CONVERTED" }),
      clearCart: () => set({ items: [], cartToken: null, status: "ACTIVE" }),
    }),
    {
      name: "sicko-soul-cart",
      version: 2,
      storage: createJSONStorage(() => localStorage),
      migrate: (persistedState) => {
        const saved = persistedState as Partial<CartState> & {
          items?: Array<Partial<CartLine> & { productId: string; size: string; quantity: number }>;
        };

        const normalized = (saved.items ?? []).flatMap((item) => {
          const variant = resolveVariant(item.productId, item.size);
          if (!variant || variant.status !== "ACTIVE" || variant.availableQty <= 0) return [];
          return [
            {
              key: lineKey(item.productId, variant.id),
              productId: item.productId,
              variantId: variant.id,
              size: variant.size,
              quantity: Math.max(1, Math.min(variant.availableQty, item.quantity ?? 1)),
              unitPrice: variant.price,
              stockMax: variant.availableQty,
            },
          ];
        });

        return {
          ...saved,
          cartToken: saved.cartToken ?? null,
          status: saved.status ?? "ACTIVE",
          items: normalized,
        };
      },
      skipHydration: true,
    },
  ),
);
