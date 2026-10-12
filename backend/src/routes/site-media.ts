import { createHash, randomUUID } from "node:crypto";
import type { RequestHandler } from "express";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { env } from "../config/env.js";
import { isAllowedCloudinaryUrl } from "../utils/cloudinary-urls.js";
import { AppError } from "../errors/app-error.js";
import { recordAudit } from "../services/audit.service.js";
import { auditContextFromRequest } from "../utils/audit-context.js";

// The URL is stored as metadata. Video/image bytes are delivered directly by
// Cloudinary; neither the cPanel API nor the Next.js process proxies media.
const cloudinaryUrl = (kind: "image" | "video") =>
  z.string().trim().url().max(1200).refine(
    (value) => isAllowedCloudinaryUrl(value, kind),
    { message: `Use an HTTPS Cloudinary ${kind} URL from the configured cloud or the existing legacy media cloud.` },
  );

const lookbookImageSchema = z.object({
  src: cloudinaryUrl("image"),
  title: z.string().trim().max(160),
  alt: z.string().trim().max(255),
  spec: z.string().trim().max(160),
  line: z.string().trim().max(255),
  reveal: z.string().trim().max(255),
}).strict();

const updateSchema = z.object({
  heroVideoUrl: cloudinaryUrl("video"),
  dropVideoUrl: cloudinaryUrl("video"),
  lookbookImages: z.array(lookbookImageSchema).max(40),
}).strict();

type SiteMediaConfig = z.infer<typeof updateSchema>;
type StreetsImage = { src: string; alt: string; caption: string };
type PublicSiteMediaConfig = SiteMediaConfig & {
  streetsImages: { primary: StreetsImage | null; secondary: StreetsImage | null };
};
const MEDIA_CACHE_MS = 20_000;
let cache: { config: PublicSiteMediaConfig; expires: number } | null = null;
let inFlight: Promise<PublicSiteMediaConfig> | null = null;
let mediaVersion = 0;

async function loadFromDatabase(): Promise<PublicSiteMediaConfig> {
  const records = await prisma.site_media.findMany({
    orderBy: [{ slot: "asc" }, { sort_order: "asc" }],
  });
  const hero = records.find(row => row.slot === "HERO_VIDEO");
  const drop = records.find(row => row.slot === "DROP_VIDEO");
  const streetsPrimary = records.find(row => row.slot === "STREETS_PRIMARY" && row.sort_order === 0);
  const streetsSecondary = records.find(row => row.slot === "STREETS_SECONDARY" && row.sort_order === 0);
  if (!hero || !drop) {
    throw new Error("site_media needs HERO_VIDEO and DROP_VIDEO rows. Seed the local database first.");
  }
  return {
    heroVideoUrl: hero.media_url,
    dropVideoUrl: drop.media_url,
    lookbookImages: records.filter(row => row.slot === "LOOKBOOK").map(row => ({
      src: row.media_url,
      title: row.title ?? "",
      alt: row.alt_text ?? "",
      spec: row.spec ?? "",
      line: row.caption ?? "",
      reveal: row.reveal ?? "",
    })),
    streetsImages: {
      primary: streetsPrimary ? {
        src: streetsPrimary.media_url,
        alt: streetsPrimary.alt_text ?? "",
        caption: streetsPrimary.caption ?? "",
      } : null,
      secondary: streetsSecondary ? {
        src: streetsSecondary.media_url,
        alt: streetsSecondary.alt_text ?? "",
        caption: streetsSecondary.caption ?? "",
      } : null,
    },
  };
}

async function getMedia(): Promise<PublicSiteMediaConfig> {
  if (cache && cache.expires > Date.now()) return cache.config;
  // Deduplicate simultaneous requests so one high-traffic period makes one DB query.
  if (!inFlight) {
    const version = mediaVersion;
    const request = loadFromDatabase().then(config => {
      // A concurrent admin Save must not re-populate the cache with old rows.
      if (version === mediaVersion) cache = { config, expires: Date.now() + MEDIA_CACHE_MS };
      return config;
    });
    inFlight = request;
    void request.finally(() => {
      if (inFlight === request) inFlight = null;
    }).catch(() => {});
  }
  return inFlight;
}

const publicRead: RequestHandler = async (_req, res) => {
  // Browsers/reverse proxies may reuse a fresh response; Express also sends an
  // ETag and returns 304 on conditional requests with unchanged JSON.
  res.setHeader("Cache-Control", "public, max-age=20, stale-while-revalidate=40");
  res.json({ data: await getMedia() });
};

export const siteMediaRouter = Router();
siteMediaRouter.get("/", publicRead);

export const adminSiteMediaRouter = Router();
adminSiteMediaRouter.get("/", (async (_req, res) => {
  res.setHeader("Cache-Control", "private, no-store");
  // Keep the editor's request/response contract unchanged. Streets image
  // slots are managed in site_media and are never touched by gallery saves.
  const config = await loadFromDatabase();
  res.json({ data: {
    heroVideoUrl: config.heroVideoUrl,
    dropVideoUrl: config.dropVideoUrl,
    lookbookImages: config.lookbookImages,
  } });
}) satisfies RequestHandler);

adminSiteMediaRouter.put("/", (async (req, res) => {
  const value = updateSchema.parse(req.body);
  const audit = auditContextFromRequest(req, res);
  const rows = [
    { slot: "HERO_VIDEO", sort_order: 0, media_url: value.heroVideoUrl },
    { slot: "DROP_VIDEO", sort_order: 0, media_url: value.dropVideoUrl },
    ...value.lookbookImages.map((item, index) => ({
      slot: "LOOKBOOK", sort_order: index, media_url: item.src,
      title: item.title || null, alt_text: item.alt || null,
      spec: item.spec || null, caption: item.line || null, reveal: item.reveal || null,
    })),
  ];
  await prisma.$transaction(async tx => {
    const previous = await tx.site_media.findMany({
      orderBy: [{ slot: "asc" }, { sort_order: "asc" }],
    });
    await tx.site_media.deleteMany({
      where: { slot: { in: ["HERO_VIDEO", "DROP_VIDEO", "LOOKBOOK"] } },
    });
    await tx.site_media.createMany({ data: rows });
    await recordAudit(audit, {
      action: "SITE_MEDIA_REPLACE",
      entityType: "site_media",
      oldData: previous.map(row => ({ slot: row.slot, url: row.media_url, order: row.sort_order })),
      newData: rows,
    }, tx);
  });
  mediaVersion += 1;
  cache = null;
  inFlight = null;
  res.setHeader("Cache-Control", "private, no-store");
  res.json({ data: value });
}) satisfies RequestHandler);

/**
 * Optional secure upload: admin browser -> Cloudinary directly.
 * Requires CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in BACKEND .env only.
 * The secret is never returned; no binary data or PHP storage hits cPanel.
 */

// Streets photographs are managed separately from Lookbook so editing one
// media group never deletes the other group's database rows.
const streetImage = z.object({
  src: cloudinaryUrl("image"), alt: z.string().trim().max(255),
  caption: z.string().trim().max(255),
}).strict();
const streetsSchema = z.object({
  primary: streetImage.nullable(), secondary: streetImage.nullable(),
}).strict();

adminSiteMediaRouter.get("/streets", (async (_req, res) => {
  res.setHeader("Cache-Control", "private, no-store");
  res.json({ data: (await loadFromDatabase()).streetsImages });
}) satisfies RequestHandler);

adminSiteMediaRouter.put("/streets", (async (req, res) => {
  const content = streetsSchema.parse(req.body);
  const items = [
    { slot: "STREETS_PRIMARY", item: content.primary },
    { slot: "STREETS_SECONDARY", item: content.secondary },
  ];
  await prisma.$transaction(async tx => {
    const previous = await tx.site_media.findMany({ where: { slot: { in: ["STREETS_PRIMARY", "STREETS_SECONDARY"] } } });
    await tx.site_media.deleteMany({ where: { slot: { in: ["STREETS_PRIMARY", "STREETS_SECONDARY"] } } });
    await tx.site_media.createMany({ data: items.filter((value) => value.item !== null).map(value => ({
      slot: value.slot, sort_order: 0, media_url: value.item!.src,
      alt_text: value.item!.alt, caption: value.item!.caption,
    })) });
    await recordAudit(auditContextFromRequest(req, res), {
      action: "STREETS_MEDIA_UPDATE", entityType: "site_media",
      oldData: previous.map(row => ({ slot: row.slot, url: row.media_url })),
      newData: items.map(row => ({ slot: row.slot, url: row.item?.src ?? null })),
    }, tx);
  });
  mediaVersion += 1; cache = null; inFlight = null;
  res.setHeader("Cache-Control", "private, no-store");
  res.json({ data: content });
}) satisfies RequestHandler);

adminSiteMediaRouter.post("/upload-signature", (async (req, res) => {
  const { kind, sizeBytes } = z.object({
    kind: z.enum(["image", "video"]),
    sizeBytes: z.number().int().positive().max(60 * 1024 * 1024),
  }).strict().parse(req.body);
  const maximum = kind === "image" ? 3 * 1024 * 1024 : 60 * 1024 * 1024;
  if (sizeBytes > maximum) {
    res.status(413).json({ error: { code: "MEDIA_TOO_LARGE", message: `Images must be at most 3 MB and video/audio at most 60 MB.` } });
    return;
  }
  const apiKey = env.CLOUDINARY_API_KEY;
  const secret = env.CLOUDINARY_API_SECRET;
  const cloudName = env.CLOUDINARY_CLOUD_NAME;
  if (!cloudName || !apiKey || !secret) {
    res.status(503).json({
      error: { code: "CLOUDINARY_UPLOAD_NOT_CONFIGURED", message: "Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in backend/.env (all from the same Cloudinary environment)." },
    });
    return;
  }
  const timestamp = Math.floor(Date.now() / 1000);
  const publicId = `sicko-soul/site-media/${kind}/${randomUUID()}`;
  const overwrite = "false";
  // Cloudinary signs all supplied upload params (except api_key, file and signature),
  // lexicographically ordered and joined without a separator before the secret.
  const signed = `overwrite=${overwrite}&public_id=${publicId}&timestamp=${timestamp}`;
  const signature = createHash("sha1").update(signed + secret).digest("hex");
  res.setHeader("Cache-Control", "private, no-store");
  res.json({ data: { kind, apiKey, cloudName, publicId, timestamp, overwrite, signature } });
}) satisfies RequestHandler);


/**
 * The authenticated browser first uploads directly to Cloudinary using the
 * signed request above, then calls this endpoint with the Cloudinary URL.
 * Updating one slot at a time prevents an upload from overwriting drafts or
 * other admins' changes to unrelated media rows.
 */
const uploadedAssetSchema = z.discriminatedUnion("target", [
  z.object({ target: z.literal("hero"), url: cloudinaryUrl("video") }).strict(),
  z.object({ target: z.literal("drop"), url: cloudinaryUrl("video") }).strict(),
  z.object({
    target: z.literal("lookbook"), url: cloudinaryUrl("image"),
    index: z.number().int().min(0).max(39),
    alt: z.string().trim().max(255).optional(),
  }).strict(),
  z.object({
    target: z.enum(["streetsPrimary", "streetsSecondary"]), url: cloudinaryUrl("image"),
    alt: z.string().trim().max(255).optional(),
  }).strict(),
]);

adminSiteMediaRouter.put("/uploaded-asset", (async (req, res) => {
  const body = uploadedAssetSchema.parse(req.body);
  const audit = auditContextFromRequest(req, res);
  const slot = body.target === "hero" ? "HERO_VIDEO" :
    body.target === "drop" ? "DROP_VIDEO" :
    body.target === "lookbook" ? "LOOKBOOK" :
    body.target === "streetsPrimary" ? "STREETS_PRIMARY" : "STREETS_SECONDARY";
  const row = await prisma.$transaction(async tx => {
    let before: { media_url: string } | null = null;
    let after: { media_id: bigint; media_url: string };
    if (body.target === "lookbook") {
      const frames = await tx.site_media.findMany({
        where: { slot: "LOOKBOOK" },
        orderBy: [{ sort_order: "asc" }, { media_id: "asc" }],
        select: { media_id: true, media_url: true },
      });
      if (body.index > frames.length) throw new AppError({
        statusCode: 409, code: "LOOKBOOK_INDEX_CHANGED",
        message: "The gallery changed. Reload the Site Media editor and upload again.",
      });
      const existingFrame = frames[body.index];
      if (existingFrame) {
        before = existingFrame;
        after = await tx.site_media.update({
          where: { media_id: existingFrame.media_id },
          data: { media_url: body.url },
        });
      } else {
        after = await tx.site_media.create({ data: {
          slot: "LOOKBOOK", sort_order: body.index, media_url: body.url,
          title: `FRAME ${String(body.index + 1).padStart(2, "0")}`,
          alt_text: body.alt || `Lookbook photo ${body.index + 1}`,
        } });
      }
    } else {
      const key = { slot_sort_order: { slot, sort_order: 0 } };
      before = await tx.site_media.findUnique({ where: key, select: { media_url: true } });
      after = await tx.site_media.upsert({
        where: key,
        create: {
          slot, sort_order: 0, media_url: body.url,
          ...("alt" in body ? { alt_text: body.alt || null } : {}),
        },
        update: { media_url: body.url },
      });
    }
    await recordAudit(audit, {
      action: "SITE_MEDIA_UPLOAD_SAVE", entityType: "site_media", entityId: after.media_id,
      oldData: { slot, url: before?.media_url ?? null },
      newData: { slot, url: after.media_url },
    }, tx);
    return after;
  });
  mediaVersion += 1;
  cache = null;
  inFlight = null;
  res.setHeader("Cache-Control", "private, no-store");
  res.json({ data: { id: row.media_id.toString(), slot, url: row.media_url, saved: true } });
}) satisfies RequestHandler);
