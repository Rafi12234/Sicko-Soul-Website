"use client";

import { useEffect, useRef } from "react";
import { MEDIA } from "@/lib/media";

/**
 * Persistent Sicko Soul soundtrack.
 *
 * Behaviour:
 *
 * - Root layout keeps this audio element alive during
 *   Next.js client-side navigation.
 *
 * - Hard refresh:
 *   track starts from 0:00 again.
 *
 * - Screen locked / tab hidden / browser minimized:
 *   track pauses.
 *
 * - User returns / screen becomes visible:
 *   track resumes from the exact previous timestamp.
 */
export default function SiteAudio() {
  const audioRef = useRef<HTMLAudioElement>(null);

  /**
   * Tracks whether the audio was actually playing
   * before the page became hidden.
   *
   * This prevents us from incorrectly starting audio
   * when the visitor had never unlocked/started it.
   */
  const shouldResumeRef = useRef(false);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    /**
     * A genuine browser reload should always begin
     * the soundtrack from the start.
     */
    audio.currentTime = 0;
    audio.volume = 1;

    const pauseForBackground = () => {
      /**
       * Remember whether the soundtrack was playing.
       */
      shouldResumeRef.current =
        !audio.paused && !audio.ended;

      if (!audio.paused) {
        audio.pause();
      }
    };

    const resumeFromBackground = async () => {
      /**
       * Don't start music simply because the document
       * became visible.
       *
       * Only resume if it was already playing before
       * the screen/tab became hidden.
       */
      if (!shouldResumeRef.current) {
        return;
      }

      try {
        await audio.play();
      } catch {
        /**
         * Some browsers may still reject resume in an
         * unusual lifecycle situation.
         *
         * In that case we leave the currentTime intact
         * and wait for the next genuine interaction.
         */
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        pauseForBackground();
        return;
      }

      if (document.visibilityState === "visible") {
        void resumeFromBackground();
      }
    };

    /**
     * `pagehide` covers cases such as:
     * - browser moving page into back/forward cache
     * - some mobile browser lifecycle transitions
     */
    const handlePageHide = () => {
      pauseForBackground();
    };

    /**
     * `pageshow` complements `pagehide`.
     */
    const handlePageShow = () => {
      if (document.visibilityState === "visible") {
        void resumeFromBackground();
      }
    };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );

    window.addEventListener(
      "pagehide",
      handlePageHide,
    );

    window.addEventListener(
      "pageshow",
      handlePageShow,
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );

      window.removeEventListener(
        "pagehide",
        handlePageHide,
      );

      window.removeEventListener(
        "pageshow",
        handlePageShow,
      );
    };
  }, []);

  return (
    <audio
      id="sicko-soul-audio"
      ref={audioRef}
      src={MEDIA.audio.soundtrack}
      loop
      preload="auto"
      className="hidden"
      aria-hidden="true"
    />
  );
  
}