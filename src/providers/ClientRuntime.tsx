"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";
import { useCartStore } from "@/store/useCartStore";

/**
 * Keeps route-level client state alive without turning individual pages into
 * special cases. Home still owns the cinematic preloader; every secondary
 * route is considered already "inside" the Sicko Soul world.
 */
export default function ClientRuntime() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    useCartStore.persist.rehydrate();
  }, []);

  useLayoutEffect(() => {
    if (pathname !== "/") useAppStore.getState().setHasEntered(true);
  }, [pathname]);

  return null;
}
