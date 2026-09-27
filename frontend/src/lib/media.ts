/**
 * Canonical Sicko Soul media manifest.
 *
 * Keep the original Cloudinary delivery URLs here. Next/Image requests are
 * transformed responsively by src/lib/cloudinaryLoader.ts, while raw consumers
 * (WebGL/video) use the helpers below to request optimized derivatives directly
 * from Cloudinary.
 */

const CLOUD_NAME = "dec82taov";
export const CLOUDINARY_ORIGIN = `https://res.cloudinary.com/${CLOUD_NAME}`;

export const MEDIA = {
  images: {
    // Brand/editorial-only media. Commerce/product imagery is never sourced
    // from this manifest; product/category/drop images come from the database.
    image1: `${CLOUDINARY_ORIGIN}/image/upload/v1789785496/image_1_ealpmn.jpg`,
    image2: `${CLOUDINARY_ORIGIN}/image/upload/v1789785497/image_2_j2uc4q.jpg`,
    image3: `${CLOUDINARY_ORIGIN}/image/upload/v1789785497/image_3_hj5v58.jpg`,
    image4: `${CLOUDINARY_ORIGIN}/image/upload/v1789785497/image_4_ykdkgm.jpg`,
    image5: `${CLOUDINARY_ORIGIN}/image/upload/v1789785497/image_5_hj7hed.jpg`,
    logo: `${CLOUDINARY_ORIGIN}/image/upload/v1789785498/logo_hkdmch.jpg`,
    manDropsholder1: `${CLOUDINARY_ORIGIN}/image/upload/v1789785498/man_dropsholder_1_q97paa.png`,
    manDropsholder4: `${CLOUDINARY_ORIGIN}/image/upload/v1789785496/man_dropsholder_4_du6t1a.png`,
    manShirt3: `${CLOUDINARY_ORIGIN}/image/upload/v1789785496/man_shirt_3_ha5vdh.png`,
  },
  originals: {
    heroVideo: `${CLOUDINARY_ORIGIN}/video/upload/v1789785536/hero-loop_i2kzjv.mp4`,
    dropVideo: `${CLOUDINARY_ORIGIN}/video/upload/v1789785530/new_drop_lolbzp.mp4`,
  },
audio: {
  soundtrack:
    `${CLOUDINARY_ORIGIN}/video/upload/v1789931041/FREE_DRAKE_X_TRAVIS_SCOTT_TYPE_BEAT_-_CHARIOT_DREAMS_jq4hk5.mp3`,
},
} as const;

/**
 * Build a Cloudinary image URL for raw-image consumers such as WebGL.
 * Next/Image does this dynamically through cloudinaryLoader instead.
 */
export function cloudinaryImageUrl(src: string, width: number, quality = "auto") {
  if (!src.includes("/image/upload/")) return src;
  const q = quality === "auto" ? "q_auto" : `q_${quality}`;
  return src.replace(
    "/image/upload/",
    `/image/upload/c_limit,w_${Math.round(width)}/${q}/f_auto/`,
  );
}

/** Deliver a browser-appropriate, bandwidth-optimized Cloudinary video. */
export function cloudinaryVideoUrl(src: string, width = 1920) {
  if (!src.includes("/video/upload/")) return src;
  return src.replace(
    "/video/upload/",
    `/video/upload/c_limit,w_${Math.round(width)}/q_auto/f_auto/`,
  );
}

/** Generate a lightweight first-frame poster from an uploaded Cloudinary video. */
export function cloudinaryVideoPoster(src: string, width = 1920) {
  if (!src.includes("/video/upload/")) return "";
  const framed = src
    .replace(
      "/video/upload/",
      `/video/upload/c_limit,w_${Math.round(width)}/so_0/q_auto/f_auto/`,
    )
    .replace(/\.[a-z0-9]+(?:\?.*)?$/i, ".jpg");
  return framed;
}

export const HERO_VIDEO_MOBILE = cloudinaryVideoUrl(MEDIA.originals.heroVideo, 960);
export const HERO_VIDEO_TABLET = cloudinaryVideoUrl(MEDIA.originals.heroVideo, 1440);
export const HERO_VIDEO = cloudinaryVideoUrl(MEDIA.originals.heroVideo, 1920);
export const HERO_POSTER = cloudinaryVideoPoster(MEDIA.originals.heroVideo, 1600);

export const DROP_VIDEO_MOBILE = cloudinaryVideoUrl(MEDIA.originals.dropVideo, 960);
export const DROP_VIDEO_TABLET = cloudinaryVideoUrl(MEDIA.originals.dropVideo, 1440);
export const DROP_VIDEO = cloudinaryVideoUrl(MEDIA.originals.dropVideo, 1920);
export const DROP_POSTER = cloudinaryVideoPoster(MEDIA.originals.dropVideo, 1600);
