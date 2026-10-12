/**
 * Low-overhead recovery for editorial background video on mobile and desktop.
 * No scroll subscriptions or animation frames: visibility is supplied by each
 * section, and a single 9-second watchdog only runs while it is visible.
 */
export type VideoPlaybackIssue = "reduced-motion" | "blocked" | "unavailable" | null;

export type VideoPlaybackController = {
  sync: (visible: boolean) => void;
  playManually: () => void;
  destroy: () => void;
};

export function createVideoPlaybackController(
  video: HTMLVideoElement,
  options: {
    fallbackUrl: () => string;
    onIssue: (issue: VideoPlaybackIssue) => void;
  },
): VideoPlaybackController {
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let visible = false;
  let manuallyEnabled = false;
  let destroyed = false;
  let fallbackUsed = false;
  let playPending = false;
  let playGeneration = 0;
  let issue: VideoPlaybackIssue = null;
  let watchdog: ReturnType<typeof setTimeout> | undefined;
  let pauseRetryTimer: ReturnType<typeof setTimeout> | undefined;
  let pauseRetries = 0;
  let progressCount = 0;

  const allowed = () => visible && !document.hidden && (!motion.matches || manuallyEnabled);
  const report = (next: VideoPlaybackIssue) => {
    if (!destroyed && issue !== next) {
      issue = next;
      options.onIssue(next);
    }
  };
  const clearTimers = () => {
    if (watchdog !== undefined) clearTimeout(watchdog);
    watchdog = undefined;
    if (pauseRetryTimer !== undefined) clearTimeout(pauseRetryTimer);
    pauseRetryTimer = undefined;
  };

  /** One check per nine seconds, never a frame loop or scrolling callback. */
  function watchForProgress() {
    if (destroyed || !allowed() || watchdog !== undefined || issue === "unavailable") return;
    const previousProgress = progressCount;
    watchdog = setTimeout(() => {
      watchdog = undefined;
      if (!allowed() || destroyed) return;
      if (progressCount === previousProgress) {
        fallback();
      } else {
        watchForProgress();
      }
    }, 9000);
  }

  function fallback() {
    if (destroyed || !allowed()) return;
    if (fallbackUsed) {
      clearTimers();
      report("unavailable");
      return;
    }
    fallbackUsed = true;
    clearTimers();
    // A source change aborts the old play() promise. Invalidate it explicitly;
    // otherwise an unresolved Safari play() promise can block the replacement.
    playGeneration += 1;
    playPending = false;
    pauseRetries = 0;
    let source: string;
    try {
      source = options.fallbackUrl();
      const url = new URL(source);
      if (url.protocol !== "https:" || url.hostname !== "res.cloudinary.com" ||
          !url.pathname.includes("/video/upload/")) {
        report("unavailable");
        return;
      }
    } catch {
      report("unavailable");
      return;
    }
    try {
      video.src = source;
      video.load();
      // A playback attempt may be queued while the MP4 starts buffering.
      attemptPlay();
      watchForProgress();
    } catch {
      report("unavailable");
    }
  }

  function attemptPlay() {
    if (destroyed || !allowed() || !video.paused || playPending ||
        issue === "blocked" || issue === "unavailable") return;
    video.muted = true;
    video.playsInline = true;
    playPending = true;
    const generation = ++playGeneration;
    watchForProgress();
    try {
      void Promise.resolve(video.play()).then(() => {
        if (destroyed || generation !== playGeneration) return;
        playPending = false;
        if (!allowed()) {
          if (!video.paused) video.pause();
          return;
        }
        report(null);
        watchForProgress();
      }, (error: unknown) => {
        if (destroyed || generation !== playGeneration) return;
        playPending = false;
        if (!allowed()) return;
        const name = error && typeof error === "object" && "name" in error ? String(error.name) : "";
        if (name === "AbortError") {
          // A preload/load call may cancel a pending play. Retry when ready.
          if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) attemptPlay();
        } else if (name === "NotAllowedError") {
          clearTimers();
          report("blocked");
        } else {
          fallback();
        }
      });
    } catch {
      if (generation === playGeneration) {
        playPending = false;
        fallback();
      }
    }
  }

  function sync(nextVisible: boolean) {
    if (destroyed) return;
    visible = nextVisible;
    if (!visible || document.hidden) {
      clearTimers();
      playGeneration += 1;
      playPending = false;
      if (!video.paused) video.pause();
      return;
    }
    if (motion.matches && !manuallyEnabled) {
      clearTimers();
      if (!video.paused) video.pause();
      report("reduced-motion");
      return;
    }
    attemptPlay();
    if (issue !== "blocked" && issue !== "unavailable") watchForProgress();
  }

  function playManually() {
    if (destroyed) return;
    manuallyEnabled = true;
    visible = true;
    report(null);
    // Trigger play() synchronously from the actual user click so Safari/iOS
    // can honor the transient user-activation gesture.
    if (video.paused) attemptPlay();
    else watchForProgress();
  }

  const onPlaying = () => {
    pauseRetries = 0;
    report(null);
    watchForProgress();
  };
  const onTimeUpdate = () => { progressCount += 1; };
  const onPause = () => {
    if (!allowed() || destroyed || pauseRetries >= 2 || pauseRetryTimer !== undefined) return;
    pauseRetries += 1;
    pauseRetryTimer = setTimeout(() => {
      pauseRetryTimer = undefined;
      if (allowed()) attemptPlay();
    }, 800);
  };
  const onWaiting = () => watchForProgress();
  const onCanPlay = () => attemptPlay();
  const onError = () => { if (allowed()) fallback(); };
  const onVisibility = () => sync(visible);
  const onMotion = () => sync(visible);

  video.addEventListener("playing", onPlaying);
  video.addEventListener("timeupdate", onTimeUpdate);
  video.addEventListener("pause", onPause);
  video.addEventListener("waiting", onWaiting);
  video.addEventListener("stalled", onWaiting);
  video.addEventListener("canplay", onCanPlay);
  video.addEventListener("error", onError);
  document.addEventListener("visibilitychange", onVisibility);
  if (typeof motion.addEventListener === "function") motion.addEventListener("change", onMotion);
  else motion.addListener(onMotion);
  if (motion.matches) report("reduced-motion");

  return {
    sync,
    playManually,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      playGeneration += 1;
      clearTimers();
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("stalled", onWaiting);
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("error", onError);
      document.removeEventListener("visibilitychange", onVisibility);
      if (typeof motion.removeEventListener === "function") motion.removeEventListener("change", onMotion);
      else motion.removeListener(onMotion);
    },
  };
}
