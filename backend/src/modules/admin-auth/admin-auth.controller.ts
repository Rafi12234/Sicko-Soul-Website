import type { Request, RequestHandler, Response } from "express";
import { env } from "../../config/env.js";
import { AppError } from "../../errors/app-error.js";
import { getStaffContext } from "../../utils/staff-context.js";
import { staffLoginSchema } from "./admin-auth.schema.js";
import { getStaffSession, loginStaff, revokeStaffSession, rotateStaffSession } from "./admin-auth.service.js";

const cookieName = env.NODE_ENV === "production" ? "__Secure-sicko_admin_refresh" : "sicko_admin_refresh";
const cookiePath = `${env.API_PREFIX}/admin/auth`;
const cookieOptions = {
  httpOnly: true, secure: env.NODE_ENV === "production", sameSite: "strict" as const,
  path: cookiePath,
};
function setCookie(res: Response, token: string) {
  res.cookie(cookieName, token, { ...cookieOptions, maxAge: env.ADMIN_REFRESH_DAYS * 86400000 });
}
function clearCookie(res: Response) { res.clearCookie(cookieName, cookieOptions); }
function cookieValue(req: Request) {
  const cookie = req.headers.cookie ?? "";
  const part = cookie.split(";").map(v => v.trim()).find(v => v.startsWith(`${cookieName}=`));
  return part?.slice(cookieName.length + 1) ?? "";
}
// Cookie auth mutating endpoints are strictly same-origin to the storefront.
// Together with SameSite=Strict, this prevents CSRF from other sites.
function assertTrustedOrigin(req: Request) {
  const origin = req.header("origin");
  const fetchSite = req.header("sec-fetch-site");
  if (origin && origin !== new URL(env.FRONTEND_ORIGIN).origin) throw new AppError({ statusCode: 403, code: "ORIGIN_NOT_ALLOWED", message: "Request origin is not allowed." });
  if (fetchSite === "cross-site") throw new AppError({ statusCode: 403, code: "ORIGIN_NOT_ALLOWED", message: "Cross-site admin requests are not allowed." });
}

export const staffLoginController: RequestHandler = async (req, res) => {
  assertTrustedOrigin(req);
  const result = await loginStaff(staffLoginSchema.parse(req.body));
  setCookie(res, result.refreshToken);
  res.setHeader("Cache-Control", "no-store");
  res.json({ data: { token: result.token, staff: result.staff } });
};
export const staffRefreshController: RequestHandler = async (req, res) => {
  assertTrustedOrigin(req);
  try {
    const result = await rotateStaffSession(cookieValue(req));
    setCookie(res, result.refreshToken);
    res.setHeader("Cache-Control", "no-store");
    res.json({ data: { token: result.token, staff: result.staff } });
  } catch (err) {
    // Do not erase a newer cookie written by another browser tab.
    throw err;
  }
};
export const staffLogoutController: RequestHandler = async (req, res) => {
  assertTrustedOrigin(req);
  await revokeStaffSession(cookieValue(req));
  clearCookie(res);
  res.setHeader("Cache-Control", "no-store");
  res.status(204).end();
};
export const staffMeController: RequestHandler = async (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json({ data: getStaffSession(getStaffContext(res)) });
};
