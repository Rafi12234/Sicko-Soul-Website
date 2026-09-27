"use client";

import { useLayoutEffect } from "react";
import { useCartStore } from "@/store/useCartStore";

/**
 * Route-independent client boot work.
 *
 * The persisted browser value only remembers the backend cart token and a last
 * known snapshot. After hydration we always reconcile it with the API so stock,
 * prices and cart status come from the server.
 */
export default function ClientRuntime() {
  useLayoutEffect(() => {
    void useCartStore.persist.rehydrate().then(() => useCartStore.getState().initialize());
  }, []);

  return null;
}
