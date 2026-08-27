"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { COLOR, CURSOR, DURATION, EASE } from "@/styles/theme";
import { useAppStore, type CursorVariant } from "@/store/useAppStore";
import styles from "./CustomCursor.module.css";

const HOVER_SELECTOR = 'a, button, input, textarea, [role="button"], [data-cursor="hover"]';

export default function CustomCursor() {
  const rootRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const crossRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;

    const ctx = gsap.context(() => {
      const root = rootRef.current;
      const ring = ringRef.current;
      const cross = crossRef.current;
      if (!root || !ring || !cross) return;

      gsap.set([ring, cross], { xPercent: -50, yPercent: -50 });

      const ringX = gsap.quickTo(ring, "x", { duration: CURSOR.ringLag, ease: EASE.expo });
      const ringY = gsap.quickTo(ring, "y", { duration: CURSOR.ringLag, ease: EASE.expo });
      const crossX = gsap.quickTo(cross, "x", { duration: CURSOR.dotLag, ease: EASE.expo });
      const crossY = gsap.quickTo(cross, "y", { duration: CURSOR.dotLag, ease: EASE.expo });

      let awake = false;
      const onMove = (event: PointerEvent) => {
        if (!awake) {
          awake = true;
          gsap.set([ring, cross], { x: event.clientX, y: event.clientY });
          gsap.to(root, { opacity: 1, duration: DURATION.micro });
        }
        ringX(event.clientX);
        ringY(event.clientY);
        crossX(event.clientX);
        crossY(event.clientY);
      };

      let applied: CursorVariant | null = null;
      const applyVariant = (variant: CursorVariant) => {
        if (variant === applied) return;
        applied = variant;

        gsap.to(root, {
          opacity: variant === "hidden" ? 0 : 1,
          duration: DURATION.micro,
        });
        gsap.to(ring, {
          scale: variant === "hover" ? 1.45 : 1,
          backgroundColor: variant === "hover" ? COLOR.bloodAccent : "rgba(0,0,0,0)",
          borderColor:
            variant === "hover" ? COLOR.bloodAccent : "rgba(242, 240, 235, 0.35)",
          duration: DURATION.micro,
          ease: EASE.overshoot,
        });
        gsap.to(cross, {
          scale: variant === "hover" ? 0.4 : 1,
          opacity: variant === "hover" ? 0 : 1,
          duration: DURATION.micro,
          ease: EASE.hard,
        });
      };

      const { setCursorVariant } = useAppStore.getState();
      const onOver = (event: Event) => {
        const target = event.target as HTMLElement | null;
        if (target?.closest?.(HOVER_SELECTOR)) setCursorVariant("hover");
      };
      const onOut = (event: Event) => {
        const target = event.target as HTMLElement | null;
        if (target?.closest?.(HOVER_SELECTOR)) setCursorVariant("default");
      };
      const onLeaveWindow = () => setCursorVariant("hidden");
      const onEnterWindow = () => setCursorVariant("default");

      window.addEventListener("pointermove", onMove, { passive: true });
      document.addEventListener("pointerover", onOver, true);
      document.addEventListener("pointerout", onOut, true);
      document.addEventListener("pointerleave", onLeaveWindow);
      document.addEventListener("pointerenter", onEnterWindow);

      applyVariant(useAppStore.getState().cursorVariant);
      const unsubscribe = useAppStore.subscribe((state) => applyVariant(state.cursorVariant));

      return () => {
        window.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerover", onOver, true);
        document.removeEventListener("pointerout", onOut, true);
        document.removeEventListener("pointerleave", onLeaveWindow);
        document.removeEventListener("pointerenter", onEnterWindow);
        unsubscribe();
      };
    }, rootRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={rootRef} aria-hidden className={styles.root}>
      <div ref={ringRef} className={styles.ring} />
      <div ref={crossRef} className={styles.cross} />
    </div>
  );
}
