/** Voice per docs/BRAND_BIBLE.md: cold, blunt, exclusionary. No exclamations. */


export const NAV_COPY = {
  menuOpen: "MENU",
  menuClose: "CLOSE",
  links: [
    { label: "Homepage", href: "/", index: "01" },
    { label: "Products", href: "/products", index: "02" },
    { label: "Drops", href: "/drops", index: "03" },
    { label: "Track Order", href: "/track-order", index: "04" },
    { label: "Complaints", href: "#complaints", index: "05" },
    { label: "Cart", href: "/cart", index: "06" },
  ],
  aside: "NO STOCKISTS. NO SALES. NO SECOND CHANCES.",
} as const;


export const HERO_COPY = {
  eyebrow: "EST. NOWHERE GOOD",
  /** Three tiers of the slogan; the middle tier is an animated counter-voice. */
  lineOne: "SPREAD",
  cycle: ["INVITED", "FORGIVEN", "IMITATED", "PARDONED"],
  cycleSeed: "INVITED",
  lineThree: "THE SICKNESS",
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
