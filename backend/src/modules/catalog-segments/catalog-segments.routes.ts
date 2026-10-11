import type { RequestHandler } from "express";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../errors/app-error.js";
import { recordAudit } from "../../services/audit.service.js";
import { auditContextFromRequest } from "../../utils/audit-context.js";

const segmentBody = z.object({
  code: z.string().trim().min(1).max(64).regex(/^[a-z0-9_-]+$/),
  slug: z.string().trim().min(1).max(120).regex(/^[a-z0-9-]+$/),
  name: z.string().trim().min(1).max(120),
  coverUrl: z.string().trim().url().max(1000).nullable().optional(),
  coverAlt: z.string().trim().max(255).nullable().optional(),
  tagline: z.string().trim().max(255).nullable().optional(),
  sortOrder: z.number().int().min(0).max(100000).default(0),
  isActive: z.boolean().default(true),
});
const paramsSchema = z.object({ segmentId: z.string().regex(/^\d+$/) });

function mapSegment(row: {
  segment_id: bigint; code: string; slug: string; name: string;
  cover_url: string | null; cover_alt: string | null; tagline: string | null;
  sort_order: number; is_active: boolean;
  _count: { product_categories: number };
}) {
  return {
    id: row.segment_id.toString(), code: row.code, slug: row.slug, name: row.name,
    coverUrl: row.cover_url, coverAlt: row.cover_alt, tagline: row.tagline,
    sortOrder: row.sort_order, isActive: row.is_active,
    categoryCount: row._count.product_categories,
  };
}

export const publicSegmentsRouter = Router();
publicSegmentsRouter.get("/", (async (_req, res) => {
  const rows = await prisma.catalog_segments.findMany({
    where: { is_active: true },
    include: { _count: { select: { product_categories: { where: { is_active: true } } } } },
    orderBy: [{ sort_order: "asc" }, { segment_id: "asc" }],
  });
  res.json({ data: rows.map(mapSegment), meta: { count: rows.length } });
}) satisfies RequestHandler);

export const adminSegmentsRouter = Router();
adminSegmentsRouter.get("/", (async (_req, res) => {
  const rows = await prisma.catalog_segments.findMany({
    include: { _count: { select: { product_categories: true } } },
    orderBy: [{ sort_order: "asc" }, { segment_id: "asc" }],
  });
  res.setHeader("Cache-Control", "private, no-store");
  res.json({ data: rows.map(mapSegment) });
}) satisfies RequestHandler);

adminSegmentsRouter.post("/", (async (req, res) => {
  const body = segmentBody.parse(req.body);
  const row = await prisma.$transaction(async tx => {
    const result = await tx.catalog_segments.create({ data: {
      code: body.code, slug: body.slug, name: body.name,
      cover_url: body.coverUrl ?? null, cover_alt: body.coverAlt ?? null,
      tagline: body.tagline ?? null, sort_order: body.sortOrder, is_active: body.isActive,
    } });
    await recordAudit(auditContextFromRequest(req, res), {
      action: "SEGMENT_CREATE", entityType: "catalog_segment", entityId: result.segment_id,
      newData: result,
    }, tx);
    return result;
  });
  res.status(201).json({ data: { id: row.segment_id.toString() } });
}) satisfies RequestHandler);

adminSegmentsRouter.patch("/:segmentId", (async (req, res) => {
  const { segmentId } = paramsSchema.parse(req.params);
  const body = segmentBody.partial().parse(req.body);
  const id = BigInt(segmentId);
  const old = await prisma.catalog_segments.findUnique({ where: { segment_id: id } });
  if (!old) throw new AppError({ statusCode: 404, code: "SEGMENT_NOT_FOUND", message: "Segment was not found." });
  const row = await prisma.$transaction(async tx => {
    const result = await tx.catalog_segments.update({ where: { segment_id: id }, data: {
      ...(body.code !== undefined ? { code: body.code } : {}),
      ...(body.slug !== undefined ? { slug: body.slug } : {}),
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.coverUrl !== undefined ? { cover_url: body.coverUrl } : {}),
      ...(body.coverAlt !== undefined ? { cover_alt: body.coverAlt } : {}),
      ...(body.tagline !== undefined ? { tagline: body.tagline } : {}),
      ...(body.sortOrder !== undefined ? { sort_order: body.sortOrder } : {}),
      ...(body.isActive !== undefined ? { is_active: body.isActive } : {}),
    } });
    await recordAudit(auditContextFromRequest(req, res), {
      action: "SEGMENT_UPDATE", entityType: "catalog_segment", entityId: id,
      oldData: old, newData: result,
    }, tx);
    return result;
  });
  res.json({ data: { id: row.segment_id.toString(), isActive: row.is_active } });
}) satisfies RequestHandler);

// Permanent deletion is only safe for segments with no assigned categories.
// Otherwise deactivate or reassign subcategories, preserving product/order history.
adminSegmentsRouter.delete("/:segmentId", (async (req, res) => {
  const { segmentId } = paramsSchema.parse(req.params);
  const id = BigInt(segmentId);
  const old = await prisma.catalog_segments.findUnique({
    where: { segment_id: id },
    include: { _count: { select: { product_categories: true } } },
  });
  if (!old) throw new AppError({ statusCode: 404, code: "SEGMENT_NOT_FOUND", message: "Segment was not found." });
  if (old._count.product_categories !== 0) throw new AppError({
    statusCode: 409, code: "SEGMENT_HAS_CATEGORIES",
    message: "Move or delete its subcategories first, or deactivate this main segment instead.",
  });
  await prisma.$transaction(async tx => {
    await tx.catalog_segments.delete({ where: { segment_id: id } });
    await recordAudit(auditContextFromRequest(req, res), {
      action: "SEGMENT_DELETE", entityType: "catalog_segment", entityId: id, oldData: old,
    }, tx);
  });
  res.json({ data: { deleted: true } });
}) satisfies RequestHandler);
