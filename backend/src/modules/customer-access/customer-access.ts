import type { Request } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { AppError } from "../../errors/app-error.js";
import { env } from "../../config/env.js";

export type AccessKind = "order" | "complaint";
const audience = "sicko-soul-customer";
const issuer = "sicko-soul-api";

// A reference is never proof of ownership. Token is scoped to one exact record.
export function signCustomerAccess(kind: AccessKind, reference: string, expiresInSeconds = 60 * 60 * 12, emailVerified = false): string {
  return jwt.sign({ kind, reference, emailVerified }, env.JWT_SECRET, {
    algorithm: "HS256", audience, issuer, expiresIn: expiresInSeconds,
  });
}

export function requireCustomerAccess(req: Request, kind: AccessKind, reference: string): JwtPayload {
  const header = req.get("authorization") ?? "";
  const match = /^Bearer ([A-Za-z0-9._-]+)$/.exec(header);
  if (!match) deny();
  try {
    const decoded = jwt.verify(match![1]!, env.JWT_SECRET, {
      algorithms: ["HS256"], audience, issuer,
    });
    if (typeof decoded === "string") deny();
    const claims = decoded as JwtPayload;
    if (claims.kind !== kind || claims.reference !== reference) deny();
    return claims;
  } catch { deny(); }
}

export function requireVerifiedOrderReview(req: Request, reference: string): void {
  const claims = requireCustomerAccess(req, "order", reference);
  if (claims.emailVerified !== true) {
    throw new AppError({ statusCode: 403, code: "EMAIL_VERIFICATION_REQUIRED", message: "Verify your order email using the secure access link before claiming a Verified Purchase review." });
  }
}

function deny(): never {
  throw new AppError({ statusCode: 401, code: "CUSTOMER_ACCESS_REQUIRED", message: "Verify access to this record using your email." });
}
