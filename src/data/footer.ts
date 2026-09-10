/** Voice per docs/BRAND_BIBLE.md: cold, blunt, exclusionary. No exclamations. */

export const FOOTER_COPY = {
  eyebrow: "09 / END OF FILE",
  /** Bleeds off both edges; letters jitter on a loop. */
  wordmark: "SICKO SOUL",
  /** Runs counter to the hero ticker at the top of the page. */
  ticker: "NOT FOR YOU — NEVER WAS — DON'T ASK AGAIN — ",
  toTop: "BACK TO THE TOP",
  rights: "© 2026 SICKO SOUL. ALL RIGHTS RESERVED. NONE GIVEN.",
  built: "CUT IN THE DARK",
  columns: [
    {
      id: "rooms",
      title: "ROOMS",
      links: [
        { label: "The Arsenal", href: "#segments" },
        { label: "The Rack", href: "#rack" },
        { label: "The Streets", href: "#the-streets" },
        { label: "Lookbook", href: "#lookbook" },
      ],
    },
    {
      id: "vault",
      title: "VAULT",
      links: [
        { label: "Drop 002", href: "#drop" },
        { label: "Street Cred", href: "#street-cred" },
        { label: "The Creed", href: "#manifesto" },
        { label: "Complaints", href: "#complaints" },
      ],
    },
    {
      id: "elsewhere",
      title: "ELSEWHERE",
      links: [
        { label: "Instagram", href: "#" },
        { label: "TikTok", href: "#" },
        { label: "Discord", href: "#" },
        { label: "Press", href: "#" },
      ],
    },
  ],
} as const;
