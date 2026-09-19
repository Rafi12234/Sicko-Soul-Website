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
    baggy: `${CLOUDINARY_ORIGIN}/image/upload/v1789785499/baggy_poqaqm.jpg`,
    dropsholder: `${CLOUDINARY_ORIGIN}/image/upload/v1789785494/dropsholder_wglvpd.jpg`,
    dropsholder1: `${CLOUDINARY_ORIGIN}/image/upload/v1789785494/dropsholder_1_j8amod.jpg`,
    dropsholder2: `${CLOUDINARY_ORIGIN}/image/upload/v1789785494/dropsholder_2_hp10y4.jpg`,
    dropsholder3: `${CLOUDINARY_ORIGIN}/image/upload/v1789785494/dropsholder_3_utqwpg.jpg`,
    dropsholder4: `${CLOUDINARY_ORIGIN}/image/upload/v1789785495/dropsholder_4_up1j9e.jpg`,
    hoodie: `${CLOUDINARY_ORIGIN}/image/upload/v1789785495/hoodie_qxjjef.jpg`,
    image1: `${CLOUDINARY_ORIGIN}/image/upload/v1789785496/image_1_ealpmn.jpg`,
    image2: `${CLOUDINARY_ORIGIN}/image/upload/v1789785497/image_2_j2uc4q.jpg`,
    image3: `${CLOUDINARY_ORIGIN}/image/upload/v1789785497/image_3_hj5v58.jpg`,
    image4: `${CLOUDINARY_ORIGIN}/image/upload/v1789785497/image_4_ykdkgm.jpg`,
    image5: `${CLOUDINARY_ORIGIN}/image/upload/v1789785497/image_5_hj7hed.jpg`,
    logo: `${CLOUDINARY_ORIGIN}/image/upload/v1789785498/logo_hkdmch.jpg`,
    manDropsholder1: `${CLOUDINARY_ORIGIN}/image/upload/v1789785498/man_dropsholder_1_q97paa.png`,
    manDropsholder2: `${CLOUDINARY_ORIGIN}/image/upload/v1789785499/man_dropsholder_2_loowuy.png`,
    manDropsholder3: `${CLOUDINARY_ORIGIN}/image/upload/v1789785499/man_dropsholder_3_ph0cdj.png`,
    manDropsholder4: `${CLOUDINARY_ORIGIN}/image/upload/v1789785496/man_dropsholder_4_du6t1a.png`,
    manShirt1: `${CLOUDINARY_ORIGIN}/image/upload/v1789785496/man_shirt_1_hfrlr2.png`,
    manShirt2: `${CLOUDINARY_ORIGIN}/image/upload/v1789785496/man_shirt_2_pa0add.png`,
    manShirt3: `${CLOUDINARY_ORIGIN}/image/upload/v1789785496/man_shirt_3_ha5vdh.png`,
    manShirt4: `${CLOUDINARY_ORIGIN}/image/upload/v1789785497/man_shirt_4_lmrshp.png`,
    shirt: `${CLOUDINARY_ORIGIN}/image/upload/v1789785497/shirt_yt8qzc.jpg`,
    shirt1: `${CLOUDINARY_ORIGIN}/image/upload/v1789785497/shirt_1_ipy0yh.png`,
    shirt2: `${CLOUDINARY_ORIGIN}/image/upload/v1789785498/shirt_2_whbomw.png`,
    shirt3: `${CLOUDINARY_ORIGIN}/image/upload/v1789785498/shirt_3_ivk1rr.png`,
    shirt4: `${CLOUDINARY_ORIGIN}/image/upload/v1789785498/shirt_4_xxiaua.png`,
    tshirt: `${CLOUDINARY_ORIGIN}/image/upload/v1789785499/tshirt_mu8u7h.jpg`,
  },
  originals: {
    heroVideo: `${CLOUDINARY_ORIGIN}/video/upload/v1789785536/hero-loop_i2kzjv.mp4`,
    dropVideo: `${CLOUDINARY_ORIGIN}/video/upload/v1789785530/new_drop_lolbzp.mp4`,
  },
  audio: {
    soundtrack: `${CLOUDINARY_ORIGIN}/video/upload/v1789785591/Hell_Let_Loose_rbcsku.mp3`,
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
