"use client";

import type { ReactNode } from "react";
import { useLenis } from "@/hooks/useLenis";

/** The single mount point for Lenis. Nothing else may instantiate it. */
export default function SmoothScroll({ children }: { children: ReactNode }) {
  useLenis();
  return <>{children}</>;
}
