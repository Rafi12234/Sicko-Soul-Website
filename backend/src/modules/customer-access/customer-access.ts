import type { Request } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { AppError } from "../../errors/app-error.js";
import { env } from "../../config/env.js";

export type AccessKind = "order" | "complaint";
const audience = "sicko-soul-customer";
const issuer = "sicko-soul-api";

// A reference is never proof of ownership. Token is scoped to one exact record.
export function signCustomerAccess(kind: AccessKind, reference: string, expiresInSeconds = 60 * 60 * 24 * 30): string {
  return jwt.sign({ kind, reference }, env.JWT_SECRET, {
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

// A verified PURCHASE badge means proof of control of the original checkout
// capability plus delivered item, NOT verified ownership of the email inbox.
export function requireOrderReviewAccess(req: Request, reference: string): void {
  requireCustomerAccess(req, "order", reference);
}

function deny(): never {
  throw new AppError({ statusCode: 401, code: "CUSTOMER_ACCESS_REQUIRED", message: "Private access token required. Use the token saved when the record was created." });
}
