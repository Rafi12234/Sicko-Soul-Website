"use client";

import { useLayoutEffect } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { useAppStore } from "@/store/useAppStore";

let instance: Lenis | null = null;

/** Lets overlays (menu, modals) lock scrolling without re-instantiating Lenis. */
export const getLenis = () => instance;

/**
 * Smooth scroll driven off the GSAP ticker so Lenis and ScrollTrigger share
 * one RAF loop. Call this exactly once, at the root. See ANIMATION_GUIDE.md.
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

    // A single GSAP frame clock drives both scrolling and scroll animations.
    lenis.on("scroll", ScrollTrigger.update);
    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);

    // Do NOT call gsap.ticker.lagSmoothing(0): long frames then jump the
    // scroll position and make the stutter more noticeable. GSAP's default
    // lag protection is safer during video decode and main-thread spikes.
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
      gsap.ticker.remove(raf);
      lenis.destroy();
      instance = null;
    };
  }, []);
}
