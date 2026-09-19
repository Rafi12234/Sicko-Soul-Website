"use client";

import { useLayoutEffect } from "react";
import { useCartStore } from "@/store/useCartStore";

/**
 * Route-independent client boot work.
 *
 * Entry state is deliberately NOT inferred from pathname. The Preloader now
 * lives in the root layout, so a hard load on /products, /cart, /buy-now, etc.
 * gets the same branded entry/audio unlock ritual as the homepage. Internal
 * Next.js navigation keeps the root layout alive, so the ritual does not replay.
 */
export default function ClientRuntime() {
  useLayoutEffect(() => {
    useCartStore.persist.rehydrate();
  }, []);

  return null;
}
