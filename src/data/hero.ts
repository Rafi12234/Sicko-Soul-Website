/** Voice per docs/BRAND_BIBLE.md: cold, blunt, exclusionary. No exclamations. */

export const NAV_COPY = {
  menuOpen: "MENU",
  menuClose: "CLOSE",
  links: [
    { label: "Lookbook", href: "#lookbook", index: "01" },
    { label: "The Streets", href: "#the-streets", index: "02" },
    { label: "Drop 001", href: "#drop", index: "03" },
    { label: "Complaints", href: "#complaints", index: "04" },
  ],
  aside: "NO STOCKISTS. NO SALES. NO SECOND CHANCES.",
} as const;

export const HERO_COPY = {
  eyebrow: "EST. NOWHERE GOOD",
  /** Reads NEVER · [cycling] · STILL HERE — three type treatments, one lockup. */
  lineOne: "NEVER",
  cycle: ["INVITED", "FORGIVEN", "IMITATED", "PARDONED"],
  cycleSeed: "INVITED",
  lineThree: "STILL HERE",
  tagline: "YOU DON'T WEAR IT. YOU SURVIVE IT.",
  taglineCipher: "### ##### #### ### ### ####### ###",
  scroll: "SCROLL",
  rec: "REC",
  /** Runs bottom-to-top down the right edge, counter to the footer ticker. */
  edgeTicker: "SICKO SOUL — NOT FOR YOU — ",
  marquee: [
    "YOU DON'T WEAR THIS. YOU SURVIVE IN IT.",
    "FOR THE ONES WHO WERE NEVER INVITED",
    "LIMITED ON PURPOSE",
    "MOST PEOPLE DON'T DESERVE IT ANYWAY",
  ],
} as const;
