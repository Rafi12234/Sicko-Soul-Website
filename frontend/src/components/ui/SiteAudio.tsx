"use client";

import { useEffect, useRef, useState } from "react";
import { MEDIA } from "@/lib/media";
import { isMusicDisabledByUser, rememberMusicEnabled } from "@/lib/audioPreference";
import { useAppStore } from "@/store/useAppStore";
import styles from "./SiteAudio.module.css";

/**
 * Persistent Sicko Soul soundtrack.
 *
 * Behaviour:
 *
 * - Root layout keeps this audio element alive during
 *   Next.js client-side navigation.
 *
 * - Hard refresh:
 *   track starts from 0:00 on entry unless the visitor chose SOUND OFF.
 *
 * - Screen locked / tab hidden / browser minimized:
 *   track pauses.
 *
 * - User returns / screen becomes visible:
 *   track resumes from the exact previous timestamp.
 */
export default function SiteAudio() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const hasEntered = useAppStore((state) => state.hasEntered);
  const [isPlaying, setIsPlaying] = useState(false);

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

    /** A full reload resets track time; the entry ritual honors SOUND OFF. */
    audio.currentTime = 0;
    audio.volume = 1;

    // The preloader starts the same element directly during a trusted click.
    // Media events ensure the floating button reflects that real play state.
    const handlePlaying = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    audio.addEventListener("playing", handlePlaying);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handlePause);
    audio.addEventListener("error", handlePause);
    setIsPlaying(!audio.paused && !audio.ended && audio.readyState >= 2);

    const pauseForBackground = () => {
      /**
       * Remember whether the soundtrack was playing.
       */
      // pagehide and visibilitychange can both fire. Never clear a pending
      // resume flag during the second notification after we've paused.
      if (!audio.paused && !audio.ended) {
        shouldResumeRef.current = true;
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
      if (!shouldResumeRef.current || isMusicDisabledByUser()) {
        return;
      }

      try {
        await audio.play();
        shouldResumeRef.current = false;
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
      audio.removeEventListener("playing", handlePlaying);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handlePause);
      audio.removeEventListener("error", handlePause);
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

  const toggleMusic = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!audio.paused && !audio.ended) {
      // Pause, don't mute: resuming preserves the current position.
      shouldResumeRef.current = false;
      audio.pause();
      rememberMusicEnabled(false);
      return;
    }

    // A real button interaction unlocks play() where browser policy requires it.
    void audio.play().then(() => {
      if (!audio.paused) rememberMusicEnabled(true);
    }).catch(() => {
      // Keep the UI in sync if playback is blocked or the network is offline.
      setIsPlaying(false);
    });
  };

  return (
    <>
      <audio
        id="sicko-soul-audio"
        ref={audioRef}
        src={MEDIA.audio.soundtrack}
        loop
        preload="auto"
        className="hidden"
        aria-hidden="true"
      />
      {hasEntered && (
        <button
          type="button"
          className={`${styles.toggle} ${isPlaying ? "" : styles.off}`}
          onClick={toggleMusic}
          aria-label={isPlaying ? "Turn background music off" : "Turn background music on"}
          aria-pressed={isPlaying}
          title={isPlaying ? "Music off" : "Music on"}
        >
          <svg
            className={styles.symbol}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="square"
            strokeLinejoin="miter"
            aria-hidden="true"
          >
            <path d="M4 9h4l5-4v14l-5-4H4z" />
            {isPlaying ? (
              <>
                <path d="M17 9a5 5 0 0 1 0 6" />
                <path d="M19 6a9 9 0 0 1 0 12" />
              </>
            ) : (
              <path d="M17 9l5 6m0-6-5 6" />
            )}
          </svg>
          <span className={styles.label} aria-hidden="true">
            SOUND <span className={styles.state}>{isPlaying ? "ON" : "OFF"}</span>
          </span>
          <span className={styles.led} aria-hidden="true" />
        </button>
      )}
    </>
  );
}
