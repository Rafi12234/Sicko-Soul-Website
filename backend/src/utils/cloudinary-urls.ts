import { env } from "../config/env.js";

// Older Sicko Soul media is hosted here. Keep these URLs valid when switching
// to the local Cloudinary environment; existing storefront assets are not moved.
const LEGACY_CLOUD_NAMES = ["dec82taov"];
const CLOUD_NAME_PATTERN = /^[a-z0-9][a-z0-9_-]*$/i;

export function isAllowedCloudinaryUrl(value: string, kind: "image" | "video"): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "res.cloudinary.com" ||
        url.username || url.password || url.port || url.hash) return false;
    const allowed = new Set([env.CLOUDINARY_CLOUD_NAME, ...LEGACY_CLOUD_NAMES]);
    return Array.from(allowed).some(cloud =>
      Boolean(cloud && CLOUD_NAME_PATTERN.test(cloud) &&
        url.pathname.startsWith(`/${cloud}/${kind}/upload/`)));
  } catch {
    return false;
  }
}
