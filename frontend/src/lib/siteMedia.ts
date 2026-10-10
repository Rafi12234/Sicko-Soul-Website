import { apiRequest, type DataEnvelope } from "@/lib/apiClient";
import { MEDIA } from "@/lib/media";
import { LOOKBOOK_FRAMES, type LookbookFrame } from "@/data/lookbook";

export type EditableLookbookImage = {
  src: string;
  title: string;
  alt: string;
  spec: string;
  line: string;
  reveal: string;
};

export type SiteMediaConfig = {
  heroVideoUrl: string;
  dropVideoUrl: string;
  lookbookImages: EditableLookbookImage[];
};

export type HomepageMedia = {
  heroVideoUrl: string;
  dropVideoUrl: string;
  lookbookFrames: LookbookFrame[];
};

const FALLBACK_MEDIA: SiteMediaConfig = {
  heroVideoUrl: "https://res.cloudinary.com/dec82taov/video/upload/v1791569661/WhatsApp_Video_2026-10-09_at_12.22.53_AM_ahq4cf.mp4",
  dropVideoUrl: MEDIA.originals.dropVideo,
  lookbookImages: LOOKBOOK_FRAMES.map(({ src, alt, title, spec, line, reveal }) =>
    ({ src, alt, title, spec, line, reveal })),
};

function isMediaConfiguration(data: unknown): data is SiteMediaConfig {
  if (!data || typeof data !== "object") return false;
  const item = data as Partial<SiteMediaConfig>;
  return typeof item.heroVideoUrl === "string" && item.heroVideoUrl.length > 0 &&
    typeof item.dropVideoUrl === "string" && item.dropVideoUrl.length > 0 &&
    Array.isArray(item.lookbookImages) && item.lookbookImages.every(img =>
      typeof img.src === "string" && img.src.length > 0 &&
      typeof img.title === "string" && typeof img.alt === "string" &&
      typeof img.spec === "string" && typeof img.line === "string" &&
      typeof img.reveal === "string");
}

/** Backend caches media configuration for up to 20 seconds, invalidated on staff save. Next.js page requests fetch fresh state without generating a separate static copy. */
export async function getHomepageMedia(): Promise<HomepageMedia> {
  let config = FALLBACK_MEDIA;
  try {
    const result = await apiRequest<DataEnvelope<SiteMediaConfig>>("/site-media", { cache: "no-store" });
    if (!isMediaConfiguration(result.data)) throw new Error("Invalid site media response");
    config = result.data;
  } catch (error) {
    // Local installs without the manual SQL still render the existing site.
    // The admin editor will display the underlying failure until SQL is applied.
    console.error("Site media unavailable; displaying configured fallback media:", error);
  }

  const lookbookFrames: LookbookFrame[] = config.lookbookImages.map((img, index) => {
    const template = LOOKBOOK_FRAMES[index % LOOKBOOK_FRAMES.length];
    return {
      ...template,
      id: `lookbook-${index}`,
      index: String(index + 1).padStart(2, "0"),
      src: img.src,
      alt: img.alt || `Caught on Camera photograph ${index + 1}`,
      title: img.title || `FRAME ${String(index + 1).padStart(2, "0")}`,
      spec: img.spec,
      line: img.line,
      reveal: img.reveal,
    };
  });
  return {
    heroVideoUrl: config.heroVideoUrl,
    dropVideoUrl: config.dropVideoUrl,
    lookbookFrames,
  };
}
