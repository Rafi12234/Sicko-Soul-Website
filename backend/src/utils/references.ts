import { randomBytes, randomUUID } from "node:crypto";

function token(prefix: string): string {
  const time = Date.now().toString(36).toUpperCase();
  const random = randomBytes(8).toString("hex").toUpperCase();
  return `${prefix}-${time}-${random}`;
}

export function createOrderReference(): string {
  return token("SS").slice(0, 32);
}

export function createCaseReference(): string {
  return token("CASE").slice(0, 32);
}

export function createCartToken(): string {
  return randomUUID();
}
