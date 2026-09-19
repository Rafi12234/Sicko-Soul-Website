"use client";

import { useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { EASE } from "@/styles/theme";

const routeLabel = (pathname: string) => {
  if (pathname === "/") return "ORIGIN";
  if (pathname === "/products") return "PRODUCT ARCHIVE";
  if (pathname.startsWith("/products/")) return "PRODUCT FILE";
  if (pathname === "/cart") return "HOLDING CELL";
  if (pathname === "/buy-now") return "ORDER INTAKE";
  return "FILE TRANSFER";
};

/** A short post-navigation cover wipe. The root audio player sits outside it. */
export default function RouteTransition() {
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);
  const firstRef = useRef(true);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    if (firstRef.current) {
      firstRef.current = false;
      gsap.set(panel, { display: "none" });
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      window.scrollTo(0, 0);
      ScrollTrigger.refresh();
      return;
    }

    window.scrollTo(0, 0);
    const tl = gsap.timeline({
      onStart: () => gsap.set(panel, { display: "flex" }),
      onComplete: () => {
        gsap.set(panel, { display: "none" });
        ScrollTrigger.refresh();
      },
    });

    tl.fromTo(
      panel,
      { clipPath: "inset(100% 0 0 0)" },
      { clipPath: "inset(0% 0 0 0)", duration: 0.34, ease: EASE.inOut },
    )
      .fromTo(
        ".route-transfer-label",
        { yPercent: 120, autoAlpha: 0 },
        { yPercent: 0, autoAlpha: 1, duration: 0.26, ease: EASE.expo },
        "-=0.08",
      )
      .to(panel, { clipPath: "inset(0 0 100% 0)", duration: 0.58, ease: EASE.inOut }, "+=0.08");

    return () => {
  tl.kill();
};
  }, [pathname]);

  return (
    <div
      ref={panelRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[95] hidden items-end overflow-hidden bg-blood-accent px-gutter pb-[7vh]"
    >
      <span className="absolute inset-x-0 top-1/2 h-px bg-bone-white/20" />
      <span className="absolute left-gutter top-[7vh] font-stencil text-[0.5rem] tracking-stencil text-bone-white/65">
        SICKO SOUL / INTERNAL ROUTE
      </span>
      <div className="split-mask pb-2">
        <span className="route-transfer-label block font-display text-[clamp(3.5rem,9vw,9rem)] leading-[0.76] tracking-crushed text-bone-white">
          {routeLabel(pathname)}
        </span>
      </div>
    </div>
  );
}
