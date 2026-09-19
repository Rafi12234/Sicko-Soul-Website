"use client";

import { useEffect, useRef } from "react";

/** Space in the filename must be percent-encoded to resolve from /public. */
const TRACK_SRC = "/audio/Hell%20Let%20Loose.mp3";

/**
 * Persistent soundtrack.
 *
 * The element lives in the root layout, therefore Next.js client navigation
 * never replaces it. The Preloader starts playback directly from its real
 * button click so the browser receives a trusted user gesture.
 *
 * A genuine hard refresh creates this element again and starts from 0:00.
 */
export default function SiteAudio() {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = 0;
    audio.volume = 1;
  }, []);

  return (
    <audio
      id="sicko-soul-audio"
      ref={audioRef}
      src={TRACK_SRC}
      loop
      preload="auto"
      className="hidden"
      aria-hidden="true"
    />
  );
}
