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
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
    instance = lenis;

    lenis.on("scroll", ScrollTrigger.update);

    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    // Child effects run before this one, so the Preloader cannot lock scroll
    // itself — the store gates it instead.
    if (!useAppStore.getState().hasEntered) lenis.stop();
    const unsubscribe = useAppStore.subscribe((state) => {
      if (state.hasEntered && !state.isMenuOpen) lenis.start();
    });

    return () => {
      unsubscribe();
      gsap.ticker.remove(raf);
      lenis.destroy();
      instance = null;
    };
  }, []);
}
