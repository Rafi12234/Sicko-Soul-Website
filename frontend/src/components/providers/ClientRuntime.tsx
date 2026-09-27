"use client";

import { useLayoutEffect } from "react";
import { useCartStore } from "@/store/useCartStore";

/**
 * Route-independent client boot work.
 *
 * The persisted browser value only remembers the backend cart token. After
 * hydration the complete cart is loaded from the API, so products, quantities,
 * stock, prices and cart status always come from the database-backed server.
 */
export default function ClientRuntime() {
  useLayoutEffect(() => {
    void useCartStore.persist.rehydrate().then(() => useCartStore.getState().initialize());
  }, []);

  return null;
}
