/**
 * New Drop video lifecycle using the same viewport-controlled play/pause model
 * as Hero. ScrollTrigger supplies visibility; this helper never listens for
 * scroll events or runs animation frames.
 *
 * Keep the working responsive Cloudinary sources in the <video> markup.
 * Only after a media failure do we try the original CMS URL once. No forced
 * codec/transformation is requested from Cloudinary.
 */
export type DropPlaybackIssue = "blocked" | "unavailable" | "reduced-motion" | null;

export type DropPlaybackController = {
  sync: (active: boolean) => void;
  playManually: () => void;
  destroy: () => void;
};

export function createDropPlaybackController(
  video: HTMLVideoElement,
  options: {
    originalUrl: string;
    onIssue: (issue: DropPlaybackIssue) => void;
  },
): DropPlaybackController {
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let active = false;
  let manual = false;
  let destroyed = false;
  let fallbackUsed = false;
  let pending = false;
  let generation = 0;
  let lastIssue: DropPlaybackIssue = null;
  let progressEvents = 0;
  let progressTimer: ReturnType<typeof setTimeout> | undefined;
  let pauseTimer: ReturnType<typeof setTimeout> | undefined;
  let pauseRetries = 0;

  const eligible = () => active && !document.hidden && (!motion.matches || manual);
  const report = (issue: DropPlaybackIssue) => {
    if (destroyed || issue === lastIssue) return;
    lastIssue = issue;
    options.onIssue(issue);
  };
  const clearTimers = () => {
    if (progressTimer !== undefined) clearTimeout(progressTimer);
    if (pauseTimer !== undefined) clearTimeout(pauseTimer);
    progressTimer = undefined;
    pauseTimer = undefined;
  };

  /** One check every 12 seconds, only while the video is visible and eligible. */
  function monitor() {
    if (destroyed || !eligible() || progressTimer !== undefined || lastIssue === "blocked" || lastIssue === "unavailable") return;
    const previous = progressEvents;
    progressTimer = setTimeout(() => {
      progressTimer = undefined;
      if (destroyed || !eligible()) return;
      if (progressEvents === previous) {
        fallback();
      } else {
        monitor();
      }
    }, 12_000);
  }

  function fallback() {
    if (destroyed || !eligible()) return;
    if (fallbackUsed) {
      clearTimers();
      report("unavailable");
      return;
    }
    fallbackUsed = true;
    clearTimers();
    generation += 1; // Ignore pending promises for the previous media source.
    pending = false;
    pauseRetries = 0;
    try {
      const candidate = new URL(options.originalUrl);
      if (candidate.protocol !== "https:" || candidate.hostname !== "res.cloudinary.com" ||
          !candidate.pathname.includes("/video/upload/")) {
        report("unavailable");
        return;
      }
      // Avoid a pointless reload if the browser was already on this source.
      if (video.currentSrc === candidate.toString()) {
        report("unavailable");
        return;
      }
      video.src = candidate.toString();
      // A single load() is needed after changing the URL; never call load()
      // while the primary source is playing or merely coming into view.
      video.load();
      attemptPlay();
    } catch {
      report("unavailable");
    }
  }

  function attemptPlay() {
    if (destroyed || !eligible() || pending || !video.paused ||
        lastIssue === "blocked" || lastIssue === "unavailable") return;
    video.muted = true;
    video.playsInline = true;
    pending = true;
    const currentGeneration = ++generation;
    monitor();
    try {
      void Promise.resolve(video.play()).then(() => {
        if (destroyed || generation !== currentGeneration) return;
        pending = false;
        if (!eligible()) {
          if (!video.paused) video.pause();
          return;
        }
        report(null);
        monitor();
      }, (error: unknown) => {
        if (destroyed || generation !== currentGeneration) return;
        pending = false;
        if (!eligible()) return;
        const name = error && typeof error === "object" && "name" in error ? String(error.name) : "";
        if (name === "NotAllowedError") {
          clearTimers();
          report("blocked");
        } else if (name === "AbortError") {
          // Can occur on a route transition, backgrounding, or a source swap.
          // Retry from the next canplay/loadeddata event instead of spinning.
        } else {
          fallback();
        }
      });
    } catch {
      pending = false;
      fallback();
    }
  }

  const sync = (nextActive: boolean) => {
    if (destroyed) return;
    active = nextActive;
    if (!eligible()) {
      clearTimers();
      generation += 1;
      pending = false;
      if (!video.paused) video.pause();
      if (active && motion.matches && !manual) report("reduced-motion");
      return;
    }
    video.preload = "auto";
    attemptPlay();
    monitor();
  };

  const playManually = () => {
    if (destroyed) return;
    manual = true;
    report(null);
    // Run play() synchronously from the click handler (iOS user activation).
    // Do not reload an already-working asset or request a new codec profile.
    attemptPlay();
  };

  const onPlaying = () => {
    pauseRetries = 0;
    report(null);
    monitor();
  };
  const onTimeUpdate = () => { progressEvents += 1; };
  const onPaused = () => {
    if (!eligible() || destroyed || pauseRetries >= 1 || pauseTimer !== undefined) return;
    pauseRetries += 1;
    pauseTimer = setTimeout(() => {
      pauseTimer = undefined;
      if (eligible()) attemptPlay();
    }, 700);
  };
  const onStall = () => monitor();
  const onReady = () => { if (eligible()) attemptPlay(); };
  const onError = () => fallback();
  const onDocumentVisibility = () => sync(active);
  const onMotionChange = () => sync(active);

  video.addEventListener("playing", onPlaying);
  video.addEventListener("timeupdate", onTimeUpdate);
  video.addEventListener("pause", onPaused);
  video.addEventListener("waiting", onStall);
  video.addEventListener("stalled", onStall);
  video.addEventListener("canplay", onReady);
  video.addEventListener("loadeddata", onReady);
  video.addEventListener("error", onError);
  document.addEventListener("visibilitychange", onDocumentVisibility);
  if (typeof motion.addEventListener === "function") motion.addEventListener("change", onMotionChange);
  else motion.addListener(onMotionChange);

  return {
    sync,
    playManually,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      generation += 1;
      clearTimers();
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("pause", onPaused);
      video.removeEventListener("waiting", onStall);
      video.removeEventListener("stalled", onStall);
      video.removeEventListener("canplay", onReady);
      video.removeEventListener("loadeddata", onReady);
      video.removeEventListener("error", onError);
      document.removeEventListener("visibilitychange", onDocumentVisibility);
      if (typeof motion.removeEventListener === "function") motion.removeEventListener("change", onMotionChange);
      else motion.removeListener(onMotionChange);
    },
  };
}
