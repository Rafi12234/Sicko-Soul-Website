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

/**
 * Short post-navigation route wipe.
 *
 * Important:
 * This component should remain inside the root layout/runtime layer so
 * navigating between internal pages does not remount SiteAudio.
 */
export default function RouteTransition() {
  const pathname = usePathname();

  const panelRef = useRef<HTMLDivElement>(null);
  const firstRenderRef = useRef(true);

  useLayoutEffect(() => {
    const panel = panelRef.current;

    if (!panel) {
      return;
    }

    /**
     * Do not show the transition when the application
     * initially mounts.
     */
    if (firstRenderRef.current) {
      firstRenderRef.current = false;

      gsap.set(panel, {
        display: "none",
      });

      return;
    }

    /**
     * Respect reduced-motion preferences.
     */
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReducedMotion) {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "auto",
      });

      ScrollTrigger.refresh();

      return;
    }

    /**
     * Every new route begins from the top.
     */
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto",
    });

    /**
     * Reset panel state before creating the animation.
     * This prevents stale GSAP state if navigation happens quickly.
     */
    gsap.set(panel, {
      display: "flex",
      clipPath: "inset(100% 0 0 0)",
    });

    const label = panel.querySelector<HTMLElement>(
      ".route-transfer-label",
    );

    if (label) {
      gsap.set(label, {
        yPercent: 120,
        autoAlpha: 0,
      });
    }

    const timeline = gsap.timeline({
      defaults: {
        overwrite: "auto",
      },

      onComplete: () => {
        gsap.set(panel, {
          display: "none",
          clipPath: "inset(100% 0 0 0)",
        });

        if (label) {
          gsap.set(label, {
            yPercent: 120,
            autoAlpha: 0,
          });
        }

        ScrollTrigger.refresh();
      },
    });

    timeline.to(panel, {
      clipPath: "inset(0% 0 0 0)",
      duration: 0.34,
      ease: EASE.inOut,
    });

    if (label) {
      timeline.to(
        label,
        {
          yPercent: 0,
          autoAlpha: 1,
          duration: 0.26,
          ease: EASE.expo,
        },
        "-=0.08",
      );
    }

    timeline.to(
      panel,
      {
        clipPath: "inset(0 0 100% 0)",
        duration: 0.58,
        ease: EASE.inOut,
      },
      "+=0.08",
    );

    /**
     * IMPORTANT:
     * GSAP's timeline.kill() returns the Timeline instance.
     *
     * React effect cleanup must return void, so this MUST
     * use braces instead of:
     *
     * return () => timeline.kill();
     */
    return () => {
      timeline.kill();

      gsap.set(panel, {
        display: "none",
        clipPath: "inset(100% 0 0 0)",
      });
    };
  }, [pathname]);

  return (
    <div
      ref={panelRef}
      aria-hidden="true"
      className="
        pointer-events-none
        fixed
        inset-0
        z-[95]
        hidden
        items-end
        overflow-hidden
        bg-blood-accent
        px-gutter
        pb-[7vh]
      "
    >
      {/* Horizontal contamination line */}
      <span
        className="
          absolute
          inset-x-0
          top-1/2
          h-px
          bg-bone-white/20
        "
      />

      {/* System label */}
      <span
        className="
          absolute
          left-gutter
          top-[7vh]
          font-stencil
          text-[0.5rem]
          tracking-stencil
          text-bone-white/65
        "
      >
        SICKO SOUL / INTERNAL ROUTE
      </span>

      {/* Route title */}
      <div className="split-mask pb-2">
        <span
          className="
            route-transfer-label
            block
            font-display
            text-[clamp(3.5rem,9vw,9rem)]
            leading-[0.76]
            tracking-crushed
            text-bone-white
          "
        >
          {routeLabel(pathname)}
        </span>
      </div>
    </div>
  );
}