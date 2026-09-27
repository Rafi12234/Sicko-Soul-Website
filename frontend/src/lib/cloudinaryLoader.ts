import type { ImageLoaderProps } from "next/image";
import { cloudinaryImageUrl } from "./media";

/**
 * Send Next/Image's responsive srcset widths directly to Cloudinary.
 * This avoids double optimization (Cloudinary -> Next optimizer -> browser)
 * while retaining Next/Image sizing, lazy-loading and responsive srcsets.
 */
export default function cloudinaryLoader({ src, width, quality }: ImageLoaderProps) {
  if (!src.includes("res.cloudinary.com") || !src.includes("/image/upload/")) {
    return src;
  }

  return cloudinaryImageUrl(src, width, quality ? String(quality) : "auto");
}
