"use client";

import { useLayoutEffect } from "react";
import Lenis from "lenis";
import { ScrollTrigger } from "@/lib/gsap";
import { useAppStore } from "@/store/useAppStore";

let instance: Lenis | null = null;

/** Lets overlays (menu, modals) lock scrolling without re-instantiating Lenis. */
export const getLenis = () => instance;

/**
 * Lenis uses the browser's real requestAnimationFrame timestamps. Keeping it
 * off GSAP's lag-smoothed clock avoids uneven Lenis time deltas when large
 * hero video frames delay GSAP. ScrollTrigger still updates on Lenis scroll.
 * Call this exactly once, at the root.
 */
export function useLenis() {
  useLayoutEffect(() => {
    const lenis = new Lenis({
      // A short lerp avoids a long, input-laggy tail after wheel events.
      // Touch scrolling remains native, which is smoother on mobile browsers.
      lerp: 0.12,
      smoothWheel: true,
      syncTouch: false,
      wheelMultiplier: 0.9,
      autoRaf: false,
    });
    instance = lenis;

    // Real browser RAF time in milliseconds; no GSAP lag-smoothed clock.
    // Lenis still drives ScrollTrigger synchronously from its scroll event.
    lenis.on("scroll", ScrollTrigger.update);
    let rafId = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      rafId = window.requestAnimationFrame(raf);
    };
    rafId = window.requestAnimationFrame(raf);
    let allowed = true; // Lenis starts running when constructed.
    const syncLock = () => {
      const state = useAppStore.getState();
      const shouldRun = state.hasEntered && !state.isMenuOpen && !document.hidden;
      if (shouldRun === allowed) return;
      allowed = shouldRun;
      if (shouldRun) lenis.start();
      else lenis.stop();
    };

    syncLock(); // Preloader is initially closed; do not allow early scrolling.
    const unsubscribe = useAppStore.subscribe(syncLock);
    document.addEventListener("visibilitychange", syncLock);

    return () => {
      unsubscribe();
      document.removeEventListener("visibilitychange", syncLock);
      window.cancelAnimationFrame(rafId);
      lenis.destroy();
      instance = null;
    };
  }, []);
}
