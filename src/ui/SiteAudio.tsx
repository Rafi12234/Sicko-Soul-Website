"use client";

import { useLayoutEffect, useRef } from "react";
import { useAppStore } from "@/store/useAppStore";

/** Space in the filename must be percent-encoded to resolve from /public. */
const TRACK_SRC = "/audio/Hell%20Let%20Loose.mp3";
const SESSION_TIME_KEY = "sicko-soul-audio-time";

/**
 * The player lives in the root layout, so client-side route navigation never
 * replaces the audio element. A lightweight session checkpoint also restores
 * approximately the same position after an accidental hard refresh.
 */
export default function SiteAudio() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const lastCheckpointRef = useRef(0);
  const hasEntered = useAppStore((state) => state.hasEntered);

  useLayoutEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const restore = () => {
      const stored = Number(sessionStorage.getItem(SESSION_TIME_KEY));
      if (Number.isFinite(stored) && stored > 0 && Number.isFinite(audio.duration) && audio.duration > 0) {
        audio.currentTime = stored % audio.duration;
      }
    };

    const checkpoint = () => {
      if (!Number.isFinite(audio.currentTime) || audio.currentTime <= 0) return;
      if (Math.abs(audio.currentTime - lastCheckpointRef.current) < 1.5) return;
      lastCheckpointRef.current = audio.currentTime;
      sessionStorage.setItem(SESSION_TIME_KEY, String(audio.currentTime));
    };

    const checkpointNow = () => {
      if (Number.isFinite(audio.currentTime) && audio.currentTime > 0) {
        sessionStorage.setItem(SESSION_TIME_KEY, String(audio.currentTime));
      }
    };

    audio.addEventListener("loadedmetadata", restore);
    audio.addEventListener("timeupdate", checkpoint);
    window.addEventListener("pagehide", checkpointNow);

    if (audio.readyState >= 1) restore();

    return () => {
      checkpointNow();
      audio.removeEventListener("loadedmetadata", restore);
      audio.removeEventListener("timeupdate", checkpoint);
      window.removeEventListener("pagehide", checkpointNow);
    };
  }, []);

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

    if (audio.paused) {
      audio.play().catch(() => {
        if (!cancelled) armFallback();
      });
    }

    return () => {
      cancelled = true;
      removeFallback();
    };
  }, [hasEntered]);

  return <audio ref={audioRef} src={TRACK_SRC} loop preload="metadata" className="hidden" />;
}
