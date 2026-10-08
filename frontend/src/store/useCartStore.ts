"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { API_BASE_URL, ApiError } from "@/lib/apiClient";
import {
  addServerCartItem,
  createOrResumeCart,
  getServerCart,
  removeServerCartItem,
  updateServerCartItem,
} from "@/lib/cartApi";
import type { CartStatus, ServerCartRecord } from "@/types/commerce";

export type CartLine = {
  key: string;
  itemId: string;
  productId: string;
  productName: string;
  productIndex?: string | null;
  categoryName?: string | null;
  categoryIndex?: string | null;
  productSpec?: string | null;
  variantId: string;
  size: string;
  sku: string;
  imageUrl: string | null;
  quantity: number;
  unitPrice: number;
  stockMax: number;
};

type CartState = {
  cartToken: string | null;
  status: CartStatus;
  items: CartLine[];
  subtotal: number;
  syncing: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  addItem: (variantId: string, quantity?: number) => Promise<boolean>;
  removeItem: (key: string) => Promise<void>;
  setQuantity: (key: string, quantity: number) => Promise<void>;
  setSize: (key: string, variantId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  clearError: () => void;
  markConverted: () => void;
};

function linesFromServer(cart: ServerCartRecord): CartLine[] {
  return cart.items.map((item) => ({
    key: item.id,
    itemId: item.id,
    productId: item.productId,
    productName: item.productName,
    productIndex: item.productIndex,
    categoryName: item.categoryName,
    categoryIndex: item.categoryIndex,
    productSpec: item.productSpec,
    variantId: item.variantId,
    size: item.size,
    sku: item.sku,
    imageUrl: item.imageUrl,
    quantity: item.quantity,
    unitPrice: item.currentPrice,
    stockMax: item.availableQty,
  }));
}

function stateFromServer(cart: ServerCartRecord) {
  return {
    cartToken: cart.token,
    status: cart.status,
    items: linesFromServer(cart),
    subtotal: cart.subtotal,
    error: null,
  };
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "CART COULD NOT BE UPDATED.";
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      cartToken: null,
      status: "ACTIVE",
      items: [],
      subtotal: 0,
      syncing: false,
      error: null,

      initialize: async () => {
        if (!API_BASE_URL) {
          set({
            items: [],
            subtotal: 0,
            error: "NEXT_PUBLIC_API_BASE_URL IS NOT CONFIGURED.",
          });
          return;
        }

        const token = get().cartToken;
        if (!token) return;

        set({ syncing: true });
        try {
          const cart = await getServerCart(token);
          set({ ...stateFromServer(cart), syncing: false });
        } catch (error) {
          // Only a *confirmed* missing/invalid cart may be discarded. Network,
          // timeout, rate-limit and 5xx responses must preserve its opaque token.
          const terminal = error instanceof ApiError &&
            (error.status === 404 || (error.status === 409 && ["CART_NOT_ACTIVE", "CART_EXPIRED"].includes(error.code ?? "")));
          if (terminal) {
            set({ cartToken: null, status: "ACTIVE", items: [], subtotal: 0, syncing: false, error: null });
          } else {
            set({ syncing: false, error: "CART TEMPORARILY UNAVAILABLE. RETRY WHEN CONNECTED." });
          }
        }
      },

      addItem: async (variantId, quantity = 1) => {
        if (!/^\d+$/.test(variantId)) {
          set({ error: "THIS PRODUCT VARIANT IS NOT CONNECTED TO THE BACKEND CATALOG." });
          return false;
        }

        set({ syncing: true, error: null });
        try {
          const cart = await createOrResumeCart(get().cartToken);
          const updated = await addServerCartItem(cart.token, variantId, Math.max(1, quantity));
          set({ ...stateFromServer(updated), syncing: false });
          return true;
        } catch (error) {
          set({ syncing: false, error: errorMessage(error) });
          return false;
        }
      },

      removeItem: async (key) => {
        const token = get().cartToken;
        if (!token) return;
        set({ syncing: true, error: null });
        try {
          const updated = await removeServerCartItem(token, key);
          set({ ...stateFromServer(updated), syncing: false });
        } catch (error) {
          set({ syncing: false, error: errorMessage(error) });
        }
      },

      setQuantity: async (key, quantity) => {
        if (quantity <= 0) {
          await get().removeItem(key);
          return;
        }
        const token = get().cartToken;
        if (!token) return;
        set({ syncing: true, error: null });
        try {
          const updated = await updateServerCartItem(token, key, {
            quantity: Math.max(1, Math.round(quantity)),
          });
          set({ ...stateFromServer(updated), syncing: false });
        } catch (error) {
          set({ syncing: false, error: errorMessage(error) });
        }
      },

      setSize: async (key, variantId) => {
        const token = get().cartToken;
        if (!token || !/^\d+$/.test(variantId)) return;
        set({ syncing: true, error: null });
        try {
          const updated = await updateServerCartItem(token, key, { variantId });
          set({ ...stateFromServer(updated), syncing: false });
        } catch (error) {
          set({ syncing: false, error: errorMessage(error) });
        }
      },

      clearCart: async () => {
        const token = get().cartToken;
        const itemIds = get().items.map((item) => item.itemId);
        if (!token || itemIds.length === 0) {
          set({ items: [], subtotal: 0, error: null });
          return;
        }

        set({ syncing: true, error: null });
        try {
          let cart: ServerCartRecord | null = null;
          for (const itemId of itemIds) {
            cart = await removeServerCartItem(token, itemId);
          }
          if (cart) set({ ...stateFromServer(cart), syncing: false });
          else set({ items: [], subtotal: 0, syncing: false });
        } catch (error) {
          set({ syncing: false, error: errorMessage(error) });
        }
      },

      clearError: () => set({ error: null }),
      markConverted: () =>
        set({
          items: [],
          subtotal: 0,
          cartToken: null,
          status: "CONVERTED",
          syncing: false,
          error: null,
        }),
    }),
    {
      name: "sicko-soul-cart",
      version: 4,
      storage: createJSONStorage(() => localStorage),
      // The browser only remembers the opaque server-cart token. Product names,
      // prices, quantities, stock and totals are always reloaded from the API.
      partialize: (state) => ({
        cartToken: state.cartToken,
      }),
      migrate: (persistedState) => {
        const saved = persistedState as Partial<CartState>;
        return {
          cartToken: saved.cartToken ?? null,
          status: "ACTIVE" as CartStatus,
          items: [],
          subtotal: 0,
          syncing: false,
          error: null,
        };
      },
      skipHydration: true,
    },
  ),
);
