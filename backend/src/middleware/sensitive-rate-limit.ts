import { createHmac } from "node:crypto";
import type { RequestHandler } from "express";
import { env } from "../config/env.js";
import { AppError } from "../errors/app-error.js";
import { prisma } from "../lib/prisma.js";

// Database-backed (cross-process) fixed-window limiter. Keys are HMACs, never
// raw IPs, customer tokens, emails or order references. Requires P1 migration.
type LimiterName = "checkout" | "recovery" | "complaint" | "refund" | "review" | "cart";
const settings: Record<LimiterName, { limit: number; period: number }> = {
  checkout: { limit: 6, period: 30 * 60_000 },
  recovery: { limit: 6, period: 15 * 60_000 },
  complaint: { limit: 8, period: 15 * 60_000 },
  refund: { limit: 8, period: 15 * 60_000 },
  review: { limit: 8, period: 60 * 60_000 },
  cart: { limit: 20, period: 15 * 60_000 },
};
function key(name: LimiterName, identity: string, bucket: number) {
  return createHmac("sha256", env.JWT_SECRET).update(`${name}:${identity}:${bucket}`).digest("hex");
}
async function increment(name: LimiterName, identity: string): Promise<void> {
  const setting = settings[name];
  const bucket = Math.floor(Date.now() / setting.period);
  const bucketKey = key(name, identity, bucket);
  const expires = new Date((bucket + 1) * setting.period + 60_000);
  // Atomic database upsert across all app replicas; no per-process bypass.
  await prisma.$executeRaw`
    INSERT INTO api_rate_limit_buckets (bucket_key, hits, expires_at)
    VALUES (${bucketKey}, 1, ${expires})
    ON DUPLICATE KEY UPDATE hits = hits + 1`;
  const rows = await prisma.$queryRaw<Array<{ hits: number | bigint }>>`
    SELECT hits FROM api_rate_limit_buckets WHERE bucket_key = ${bucketKey} LIMIT 1`;
  if (Number(rows[0]?.hits ?? 0) > setting.limit) {
    throw new AppError({ statusCode: 429, code: "CUSTOMER_RATE_LIMIT", message: "Too many requests. Please try again later." });
  }
}

function limit(name: LimiterName): RequestHandler {
  return async (req, _res, next) => {
    try {
      const ip = req.ip ?? req.socket.remoteAddress ?? "unidentified";
      await increment(name, `ip:${ip}`);
      // A verified order/case session remains rate limited even across IP changes.
      // Never store or log the bearer itself (even as a reversible encoding).
      const authorization = req.get("authorization");
      if (authorization?.startsWith("Bearer ")) await increment(name, `token:${authorization.slice(7)}`);
      next();
    } catch (error) { next(error); }
  };
}
export const accessRecoveryRateLimit = limit("recovery");
export const complaintWriteRateLimit = limit("complaint");
export const refundRateLimit = limit("refund");
export const checkoutRateLimit = limit("checkout");
export const reviewWriteRateLimit = limit("review");
export const cartCreationRateLimit = limit("cart");

export async function cleanupRateLimitBuckets(): Promise<void> {
  await prisma.$executeRaw`DELETE FROM api_rate_limit_buckets WHERE expires_at < NOW()`;
}
