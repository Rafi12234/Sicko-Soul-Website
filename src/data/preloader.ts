/** Voice per docs/BRAND_BIBLE.md: cold, blunt, exclusionary. No exclamations. */
export const PRELOADER_COPY = {
  eyebrow: "INITIATION SEQUENCE",
  tag: "DROP 001 — NO RESTOCK",
  wordmark: "SICKO SOUL",
  /** Scrambled at load; matches wordmark length so layout never shifts. */
  wordmarkCipher: "##### ####",
  status: ["SCREENING YOU", "MOST DON'T MAKE IT", "YOU'RE IN. DON'T WASTE IT."],
  /** Centred lockup that assembles while the counter runs. Mixed case and
   *  blackletter so it matches the wordmark in public/imgs/logo.jpg. */
  core: {
    mark: "Sicko Soul",
    sub: "FOR THE ONES WHO WERE NEVER INVITED",
    subCipher: "### ### #### ### #### ## ########",
    rule: "EST. NOWHERE GOOD",
  },
} as const;
