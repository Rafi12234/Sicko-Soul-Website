"use client";

import { useLayoutEffect } from "react";
import { useCartStore } from "@/store/useCartStore";

export default function ClientRuntime() {
  useLayoutEffect(() => {
    let cancelled = false;

    const initializeCart = async () => {
      /*
       * Zustand persist.rehydrate() may be synchronous or asynchronous,
       * so normalize it into a Promise before awaiting it.
       */
      await Promise.resolve(useCartStore.persist.rehydrate());

      if (cancelled) {
        return;
      }

      await Promise.resolve(
        useCartStore.getState().initialize(),
      );
    };

    void initializeCart();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}