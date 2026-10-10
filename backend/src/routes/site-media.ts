import { createHash, randomUUID } from "node:crypto";
import type { RequestHandler } from "express";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { recordAudit } from "../services/audit.service.js";
import { auditContextFromRequest } from "../utils/audit-context.js";

// The URL is stored as metadata. Video/image bytes are delivered directly by
// Cloudinary; neither the cPanel API nor the Next.js process proxies media.
const cloudinaryUrl = (kind: "image" | "video") =>
  z.string().trim().url().max(1200).refine((value) => {
    try {
      const u = new URL(value);
      return u.protocol === "https:" && !u.username && !u.password &&
        u.hostname === "res.cloudinary.com" &&
        u.pathname.startsWith(`/dec82taov/${kind}/upload/`);
    } catch { return false; }
  }, { message: `Use an HTTPS Cloudinary ${kind} URL from dec82taov.` });

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
const MEDIA_CACHE_MS = 20_000;
let cache: { config: SiteMediaConfig; expires: number } | null = null;
let inFlight: Promise<SiteMediaConfig> | null = null;
let mediaVersion = 0;

async function loadFromDatabase(): Promise<SiteMediaConfig> {
  const records = await prisma.site_media.findMany({
    orderBy: [{ slot: "asc" }, { sort_order: "asc" }],
  });
  const hero = records.find(row => row.slot === "HERO_VIDEO");
  const drop = records.find(row => row.slot === "DROP_VIDEO");
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
  };
}

async function getMedia(): Promise<SiteMediaConfig> {
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
  res.json({ data: await loadFromDatabase() });
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
adminSiteMediaRouter.post("/upload-signature", (async (req, res) => {
  const { kind } = z.object({ kind: z.enum(["image", "video"]) }).strict().parse(req.body);
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const secret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (!apiKey || !secret) {
    res.status(503).json({
      error: { code: "CLOUDINARY_UPLOAD_NOT_CONFIGURED", message: "Set CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in backend .env to upload files. Pasting a Cloudinary URL still works." },
    });
    return;
  }
  const timestamp = Math.floor(Date.now() / 1000);
  const publicId = `sicko-soul/site-media/${randomUUID()}`;
  const overwrite = "false";
  // Cloudinary signs all supplied upload params (except api_key, file and signature),
  // lexicographically ordered and joined without a separator before the secret.
  const signed = `overwrite=${overwrite}&public_id=${publicId}&timestamp=${timestamp}`;
  const signature = createHash("sha1").update(signed + secret).digest("hex");
  res.setHeader("Cache-Control", "private, no-store");
  res.json({ data: { kind, apiKey, cloudName: "dec82taov", publicId, timestamp, overwrite, signature } });
}) satisfies RequestHandler);
