import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
import { AppError } from "../../errors/app-error.js";
import { prisma } from "../../lib/prisma.js";
import type { StaffContext } from "../../types/auth.js";

const ACCESS_SECONDS = 15 * 60;
const unauthorized = () => new AppError({ statusCode: 401, code: "STAFF_SESSION_INVALID", message: "Admin session expired. Please sign in again." });
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
const expiry = () => new Date(Date.now() + env.ADMIN_REFRESH_DAYS * 86400000);
const refreshValue = (sessionId: string) => `${sessionId}.${randomBytes(48).toString("base64url")}`;

function accessToken(staff: { staff_user_id: bigint; email: string; role: string }, sessionId: string) {
  return jwt.sign({ email: staff.email, role: staff.role, sid: sessionId, type: "staff_access" }, env.JWT_SECRET,
    { subject: staff.staff_user_id.toString(), expiresIn: ACCESS_SECONDS, algorithm: "HS256" });
}
function publicStaff(staff: { staff_user_id: bigint; full_name: string; email: string; role: string }) {
  return { id: staff.staff_user_id.toString(), fullName: staff.full_name, email: staff.email, role: staff.role };
}

export async function loginStaff(input: { email: string; password: string }) {
  const staff = await prisma.staff_users.findUnique({ where: { email: input.email.toLowerCase() } });
  // Always perform a bcrypt comparison, even for an unknown email, so timing
  // and response shape don't reveal which staff accounts exist.
  const fallbackHash = "$2b$12$a6Rb1UcKny06JTAppI3FAO7yvgLc3deUgKNYgAdr/VdCfJ.FSzM0S";
  const valid = await bcrypt.compare(input.password, staff?.password_hash ?? fallbackHash);
  if (!staff || !staff.is_active || !valid) {
    throw new AppError({ statusCode: 401, code: "INVALID_STAFF_CREDENTIALS", message: "Email or password is incorrect." });
  }
  const sessionId = randomUUID();
  const refreshToken = refreshValue(sessionId);
  await prisma.$transaction([
    prisma.admin_sessions.create({ data: { session_id: sessionId, staff_user_id: staff.staff_user_id, refresh_hash: digest(refreshToken), expires_at: expiry() } }),
    prisma.staff_users.update({ where: { staff_user_id: staff.staff_user_id }, data: { last_login_at: new Date() } }),
  ]);
  return { token: accessToken(staff, sessionId), refreshToken, staff: publicStaff(staff) };
}

export async function rotateStaffSession(raw: string) {
  const id = raw.split(".")[0];
  if (!id || !/^[a-f0-9-]{36}$/i.test(id) || raw.length > 320) throw unauthorized();
  const previous = digest(raw);
  const newToken = refreshValue(id);
  const now = new Date();
  // Optimistic atomic rotation: a stolen/old token cannot be reused.
  const updated = await prisma.admin_sessions.updateMany({
    where: { session_id: id, refresh_hash: previous, revoked_at: null, expires_at: { gt: now } },
    data: { refresh_hash: digest(newToken), last_refreshed_at: now, expires_at: expiry() },
  });
  if (updated.count !== 1) throw unauthorized();
  const session = await prisma.admin_sessions.findUnique({ where: { session_id: id } });
  if (!session) throw unauthorized();
  const staff = await prisma.staff_users.findFirst({ where: { staff_user_id: session.staff_user_id, is_active: true } });
  if (!staff) {
    await prisma.admin_sessions.updateMany({ where: { session_id: id }, data: { revoked_at: now } });
    throw unauthorized();
  }
  return { token: accessToken(staff, id), refreshToken: newToken, staff: publicStaff(staff) };
}

export async function revokeStaffSession(raw?: string) {
  const id = raw?.split(".")[0];
  if (!id || !/^[a-f0-9-]{36}$/i.test(id) || !raw) return;
  const session = await prisma.admin_sessions.findUnique({ where: { session_id: id } });
  if (!session || session.revoked_at) return;
  // Only the *current* refresh token may revoke this session via cookie.
  const candidate = Buffer.from(digest(raw), "hex");
  const expected = Buffer.from(session.refresh_hash, "hex");
  if (candidate.length !== expected.length || !timingSafeEqual(candidate, expected)) return;
  await prisma.admin_sessions.updateMany({ where: { session_id: id, revoked_at: null }, data: { revoked_at: new Date() } });
}

export function getStaffSession(staff: StaffContext) {
  return { id: staff.idString, fullName: staff.fullName, email: staff.email, role: staff.role };
}
