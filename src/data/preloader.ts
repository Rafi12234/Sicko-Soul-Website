/**
 * Sicko Soul preloader / entry ritual copy.
 *
 * Keep all entrance text centralized here so the visual
 * component does not contain random hard-coded brand copy.
 */

export const PRELOADER_COPY = {
  eyebrow: "ENTRY CLEARANCE / 001",

  tag: "SICKO SOUL — PRIVATE SIGNAL",

  wordmark: "SICKO SOUL",

  /**
   * Same approximate character length as the final wordmark
   * so the preloader doesn't shift while ScrambleText runs.
   */
  wordmarkCipher: "##### ####",

  status: [
    "SCREENING SIGNAL",
    "CHECKING THE DAMAGE",
    "CLEARANCE GRANTED",
  ],

  /**
   * Central Sicko Soul registration mark.
   */
  core: {
    mark: "Sicko Soul",

    sub: "FOR THE ONES WHO WERE NEVER INVITED",

    subCipher:
      "### ### #### ### #### ## ########",

    rule: "EST. NOWHERE GOOD",
  },

  /**
   * Stage two.
   *
   * Appears after the loading/countdown reaches 100.
   * The user presses the access control, which gives the
   * browser a real trusted interaction and unlocks audio.
   */
  access: {
    index: "ACCESS // 001",

    status: "SCREENING COMPLETE",

    titleTop: "ACCESS",

    titleBottom: "GRANTED",

    button: "BREAK THE SEAL",

    buttonSub: "SOUND ON / ENTER SITE",

    note: "ONE PRESS. THE SIGNAL STAYS ALIVE.",

    micro: "NO SECOND PROMPT // KEEP MOVING",
  },
} as const;