import { apiRequest, type DataEnvelope } from "@/lib/apiClient";
import { NAV_COPY, HERO_COPY } from "@/data/hero";
import { PRELOADER_COPY } from "@/data/preloader";
import { MANIFESTO_COPY } from "@/data/manifesto";
import { DROP_COPY } from "@/data/drop";
import { RACK_COPY } from "@/data/rack";
import { STREETS_COPY } from "@/data/streets";
import { LOOKBOOK_COPY } from "@/data/lookbook";
import { CRED_COPY } from "@/data/cred";
import { FEEDBACK_COPY } from "@/data/feedback";
import { FOOTER_COPY } from "@/data/footer";
import { STATEMENTS } from "@/data/statements";
import { MEDIA } from "@/lib/media";

export const CONTENT_DEFAULTS = {
  navigation: NAV_COPY, preloader: PRELOADER_COPY, hero: HERO_COPY,
  audio: { soundtrackUrl: MEDIA.audio.soundtrack },
  manifesto: MANIFESTO_COPY, statementBands: STATEMENTS,
  drop: DROP_COPY, rack: RACK_COPY, streets: STREETS_COPY,
  lookbook: LOOKBOOK_COPY, cred: CRED_COPY,
  feedback: FEEDBACK_COPY, footer: FOOTER_COPY,
} as const;
export type ContentKey = keyof typeof CONTENT_DEFAULTS;
export type SiteContent = Partial<Record<ContentKey, Record<string, unknown>>>;

export async function getSiteContent(): Promise<SiteContent> {
  // During CI prerendering there is no backend or absolute API origin. Avoid
  // attempting a relative server-side fetch; retain the versioned copy until
  // the deployed server has SICKO_INTERNAL_API_BASE_URL available.
  if (typeof window === "undefined") {
    const base = process.env.SICKO_INTERNAL_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
    try {
      if (!base || !/^https?:$/.test(new URL(base).protocol)) return {};
    } catch {
      return {};
    }
  }

  try {
    const result = await apiRequest<DataEnvelope<SiteContent>>("/site-content", {
      next: { revalidate: 10 },
    });
    return result.data ?? {};
  } catch (error) {
    // An old backend or a database that has not received the manual SQL
    // should never take the customer storefront offline.
    console.error("Public content overrides unavailable; using brand copy.", error);
    return {};
  }
}

// Merge only keys and leaf types from the versioned source defaults. Editors
// cannot inject class names, links to arbitrary keys, or executable markup.
export function mergeCopy<T>(defaults: T, raw: unknown): T {
  if (typeof defaults === "string") return (typeof raw === "string" ? raw : defaults) as T;
  if (Array.isArray(defaults)) {
    if (!Array.isArray(raw)) return defaults;
    return defaults.map((item, i) => mergeCopy(item, raw[i])) as T;
  }
  if (defaults && typeof defaults === "object") {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return defaults;
    const out: Record<string, unknown> = {};
    const source = raw as Record<string, unknown>;
    for (const [key, item] of Object.entries(defaults)) {
      out[key] = mergeCopy(item, Object.prototype.hasOwnProperty.call(source, key) ? source[key] : undefined);
    }
    return out as T;
  }
  return defaults;
}
