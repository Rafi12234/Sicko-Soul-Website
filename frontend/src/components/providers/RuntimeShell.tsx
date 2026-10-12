"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import SmoothScroll from "@/components/providers/SmoothScroll";
import ClientRuntime from "@/components/providers/ClientRuntime";
import Preloader from "@/components/sections/Preloader";
import CustomCursor from "@/components/ui/CustomCursor";
import NoiseOverlay from "@/components/ui/NoiseOverlay";
import SiteAudio from "@/components/ui/SiteAudio";
import RouteTransition from "@/components/ui/RouteTransition";

export default function RuntimeShell({ children, soundtrackUrl }: { children: ReactNode; soundtrackUrl: string }) {
  const isAdmin = usePathname()?.startsWith("/admin");
  if (isAdmin) return <div data-admin-shell className="min-h-screen bg-[#0b0b0d] text-bone-white">{children}</div>;
  return <>
    <ClientRuntime />
    <Preloader />
    <SmoothScroll>{children}</SmoothScroll>
    <RouteTransition />
    <NoiseOverlay />
    <CustomCursor />
    <SiteAudio src={soundtrackUrl} />
  </>;
}
