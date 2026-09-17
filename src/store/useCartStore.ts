"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartLine = {
  key: string;
  productId: string;
  size: string;
  quantity: number;
};

type CartState = {
  items: CartLine[];
  addItem: (productId: string, size: string, quantity?: number) => void;
  removeItem: (key: string) => void;
  setQuantity: (key: string, quantity: number) => void;
  setSize: (key: string, size: string) => void;
  clearCart: () => void;
};

const lineKey = (productId: string, size: string) => `${productId}::${size}`;

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (productId, size, quantity = 1) =>
        set((state) => {
          const key = lineKey(productId, size);
          const existing = state.items.find((item) => item.key === key);
          if (existing) {
            return {
              items: state.items.map((item) =>
                item.key === key
                  ? { ...item, quantity: Math.min(9, item.quantity + quantity) }
                  : item,
              ),
            };
          }
          return {
            items: [...state.items, { key, productId, size, quantity: Math.min(9, Math.max(1, quantity)) }],
          };
        }),
      removeItem: (key) => set((state) => ({ items: state.items.filter((item) => item.key !== key) })),
      setQuantity: (key, quantity) =>
        set((state) => ({
          items: state.items
            .map((item) =>
              item.key === key ? { ...item, quantity: Math.min(9, Math.max(0, quantity)) } : item,
            )
            .filter((item) => item.quantity > 0),
        })),
      setSize: (key, size) =>
        set((state) => {
          const source = state.items.find((item) => item.key === key);
          if (!source) return state;

          const nextKey = lineKey(source.productId, size);
          if (nextKey === key) return state;

          const collision = state.items.find((item) => item.key === nextKey);
          if (collision) {
            return {
              items: state.items
                .filter((item) => item.key !== key)
                .map((item) =>
                  item.key === nextKey
                    ? { ...item, quantity: Math.min(9, item.quantity + source.quantity) }
                    : item,
                ),
            };
          }

          return {
            items: state.items.map((item) =>
              item.key === key ? { ...item, key: nextKey, size } : item,
            ),
          };
        }),
      clearCart: () => set({ items: [] }),
    }),
    {
      name: "sicko-soul-cart",
      skipHydration: true,
    },
  ),
);
