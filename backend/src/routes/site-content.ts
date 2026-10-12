import { Router } from "express";
import type { RequestHandler } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { recordAudit } from "../services/audit.service.js";
import { auditContextFromRequest } from "../utils/audit-context.js";
import { isAllowedCloudinaryUrl } from "../utils/cloudinary-urls.js";

const SECTION_KEYS = [
  "navigation", "preloader", "hero", "audio", "manifesto", "statementBands",
  "drop", "rack", "streets", "lookbook", "cred", "feedback", "footer",
] as const;
const sectionKey = z.enum(SECTION_KEYS);
const MAX_JSON_BYTES = 60_000;

// Limits nested user input and avoids prototype/constructor keys. Only plain
// strings, arrays and objects are valid; style/layout/HTML is not accepted.
function assertSafeTree(value: unknown, depth = 0, counter = { fields: 0 }): void {
  if (depth > 8 || ++counter.fields > 1000) throw new Error("Content is too deeply nested.");
  if (typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value))) return;
  if (typeof value === "string") {
    if (value.length > 2500 || /[\u0000-\u0008\u000e-\u001f]/.test(value)) throw new Error("Invalid content text.");
    return;
  }
  if (Array.isArray(value)) {
    if (value.length > 60) throw new Error("Too many items in content list.");
    for (const item of value) assertSafeTree(item, depth + 1, counter);
    return;
  }
  if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    const entries = Object.entries(value);
    if (entries.length > 80) throw new Error("Too many content fields.");
    for (const [key, item] of entries) {
      if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(key) || ["__proto__", "constructor", "prototype"].includes(key)) {
        throw new Error("Invalid content field name.");
      }
      assertSafeTree(item, depth + 1, counter);
    }
    return;
  }
  throw new Error("Content must contain only text, arrays and objects.");
}

const saveSchema = z.object({ content: z.record(z.string(), z.unknown()) }).strict();

function parseSectionContent(raw: string): Record<string, unknown> | null {
  try {
    const val: unknown = JSON.parse(raw);
    if (!val || Array.isArray(val) || typeof val !== "object") return null;
    assertSafeTree(val);
    return val as Record<string, unknown>;
  } catch { return null; }
}

async function readAll() {
  const rows = await prisma.site_content_sections.findMany();
  const content: Record<string, Record<string, unknown>> = {};
  for (const row of rows) {
    if (!SECTION_KEYS.includes(row.section_key as typeof SECTION_KEYS[number])) continue;
    const parsed = parseSectionContent(row.content_json);
    if (parsed) content[row.section_key] = parsed;
  }
  return content;
}

export const publicSiteContentRouter = Router();
publicSiteContentRouter.get("/", (async (_req, res) => {
  res.setHeader("Cache-Control", "public, max-age=10, stale-while-revalidate=20");
  res.json({ data: await readAll() });
}) satisfies RequestHandler);

export const adminSiteContentRouter = Router();
adminSiteContentRouter.get("/", (async (_req, res) => {
  res.setHeader("Cache-Control", "private, no-store");
  res.json({ data: await readAll() });
}) satisfies RequestHandler);

/** Save a Cloudinary upload in just the appropriate CMS field. This preserves
 * every other edited label and avoids replacing the entire content section. */
const uploadedContentAssetSchema = z.discriminatedUnion("target", [
  z.object({
    target: z.literal("logo"),
    url: z.string().trim().url().max(1200).refine(v => isAllowedCloudinaryUrl(v, "image")),
  }).strict(),
  z.object({
    target: z.literal("soundtrack"),
    url: z.string().trim().url().max(1200).refine(v => isAllowedCloudinaryUrl(v, "video")),
  }).strict(),
]);
adminSiteContentRouter.put("/uploaded-asset", (async (req, res) => {
  const body = uploadedContentAssetSchema.parse(req.body);
  const key = body.target === "logo" ? "navigation" : "audio";
  const field = body.target === "logo" ? "logoUrl" : "soundtrackUrl";
  await prisma.$transaction(async tx => {
    const old = await tx.site_content_sections.findUnique({ where: { section_key: key } });
    const content = old ? parseSectionContent(old.content_json) ?? {} : {};
    const oldUrl = content[field] ?? null;
    const next = { ...content, [field]: body.url };
    const json = JSON.stringify(next);
    if (Buffer.byteLength(json, "utf8") > MAX_JSON_BYTES) throw new Error("Site content is too large.");
    await tx.site_content_sections.upsert({
      where: { section_key: key },
      create: { section_key: key, content_json: json },
      update: { content_json: json },
    });
    await recordAudit(auditContextFromRequest(req, res), {
      action: "SITE_CONTENT_MEDIA_UPLOAD_SAVE", entityType: "site_content", entityId: undefined,
      oldData: { key, field, url: oldUrl }, newData: { key, field, url: body.url },
    }, tx);
  });
  res.setHeader("Cache-Control", "private, no-store");
  res.json({ data: { target: body.target, url: body.url, saved: true } });
}) satisfies RequestHandler);

adminSiteContentRouter.put("/:key", (async (req, res) => {
  const { key } = z.object({ key: sectionKey }).parse(req.params);
  const body = saveSchema.parse(req.body);
  if (key === "navigation" && body.content.logoUrl !== undefined) {
    const logoUrl = body.content.logoUrl;
    if (typeof logoUrl !== "string" || !isAllowedCloudinaryUrl(logoUrl, "image") || logoUrl.length > 1200) {
      res.status(422).json({ error: { code: "INVALID_LOGO_URL", message: "Use a secure Cloudinary logo URL." } });
      return;
    }
  }
  if (key === "audio") {
    const audioUrl = body.content.soundtrackUrl;
    if (typeof audioUrl !== "string" || !isAllowedCloudinaryUrl(audioUrl, "video") || audioUrl.length > 1200) {
      res.status(422).json({ error: { code: "INVALID_AUDIO_URL", message: "Use a secure Cloudinary soundtrack URL." } });
      return;
    }
  }
  const json = JSON.stringify(body.content);
  if (Buffer.byteLength(json, "utf8") > MAX_JSON_BYTES) {
    res.status(413).json({ error: { code: "CONTENT_TOO_LARGE", message: "Section exceeds 60 KB." } });
    return;
  }
  try { assertSafeTree(body.content); } catch (error) {
    res.status(422).json({ error: { code: "INVALID_CONTENT", message: error instanceof Error ? error.message : "Invalid content." } });
    return;
  }
  const audit = auditContextFromRequest(req, res);
  await prisma.$transaction(async tx => {
    const old = await tx.site_content_sections.findUnique({ where: { section_key: key } });
    await tx.site_content_sections.upsert({
      where: { section_key: key },
      create: { section_key: key, content_json: json },
      update: { content_json: json },
    });
    await recordAudit(audit, {
      action: "SITE_CONTENT_UPDATE", entityType: "site_content",
      // Store versions, not full text, in audit logs to avoid needless PII/log bloat.
      oldData: { key, length: old?.content_json.length ?? 0 },
      newData: { key, length: json.length },
    }, tx);
  });
  res.setHeader("Cache-Control", "private, no-store");
  res.json({ data: { key, saved: true } });
}) satisfies RequestHandler);


