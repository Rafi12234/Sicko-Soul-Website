"use client";

import { useLayoutEffect, useRef } from "react";
import { useAppStore } from "@/store/useAppStore";

/** Space in the filename must be percent-encoded to resolve from /public. */
const TRACK_SRC = "/audio/Hell%20Let%20Loose.mp3";

/**
 * No user-facing control by design — the soundtrack always plays, looping,
 * once the site is entered. Browsers still block unmuted autoplay without a
 * gesture, so a refused attempt falls back to starting on the first
 * pointer/key input anywhere on the page.
 */
export default function SiteAudio() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const hasEntered = useAppStore((state) => state.hasEntered);

  useLayoutEffect(() => {
    const audio = audioRef.current;
    if (!audio || !hasEntered) return;

    let cancelled = false;
    let removeFallback = () => {};

    const armFallback = () => {
      const retry = () => {
        if (!cancelled) audio.play().catch(() => {});
      };
      window.addEventListener("pointerdown", retry, { once: true });
      window.addEventListener("keydown", retry, { once: true });
      removeFallback = () => {
        window.removeEventListener("pointerdown", retry);
        window.removeEventListener("keydown", retry);
      };
    };

    audio.play().catch(() => {
      if (!cancelled) armFallback();
    });

    return () => {
      cancelled = true;
      removeFallback();
    };
  }, [hasEntered]);

  return <audio ref={audioRef} src={TRACK_SRC} loop preload="none" className="hidden" />;
}
