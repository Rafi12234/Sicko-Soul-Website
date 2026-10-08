/** Explicit visitor choice. Never store a positive default just for entering. */
const MUSIC_DISABLED_KEY = "sicko-soul-music-disabled";

export function isMusicDisabledByUser(): boolean {
  try {
    return window.localStorage.getItem(MUSIC_DISABLED_KEY) === "1";
  } catch {
    // Storage may be unavailable in private/restricted browser contexts.
    return false;
  }
}

export function rememberMusicEnabled(enabled: boolean): void {
  try {
    if (enabled) {
      window.localStorage.removeItem(MUSIC_DISABLED_KEY);
    } else {
      window.localStorage.setItem(MUSIC_DISABLED_KEY, "1");
    }
  } catch {
    // Audio controls must continue working even when storage is blocked.
  }
}
