"use client";

import { API_BASE_URL, ApiError } from "@/lib/apiClient";

type Staff = { id: string; fullName: string; email: string; role: string };
type Payload = { data: { token: string; staff: Staff } };
const eventName = "sicko-admin-session";
let currentToken = "";
let currentStaff: Staff | null = null;
let refreshInFlight: Promise<Payload["data"]> | null = null;

function applySession(payload: Payload["data"] | null) {
  currentToken = payload?.token ?? "";
  currentStaff = payload?.staff ?? null;
  if (typeof window !== "undefined") window.dispatchEvent(new Event(eventName));
}
export function getAdminAccessToken() { return currentToken; }
export function getAdminStaff() { return currentStaff; }
export function listenForAdminSession(listener: () => void) {
  window.addEventListener(eventName, listener);
  return () => window.removeEventListener(eventName, listener);
}
export function setAdminSession(payload: Payload["data"]) { applySession(payload); }

/** Refresh token is only an HttpOnly cookie; no localStorage/sessionStorage. */
export async function refreshAdminSession(): Promise<Payload["data"]> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    const result = await fetch(`${API_BASE_URL}/admin/auth/refresh`, {
      method: "POST", credentials: "include", cache: "no-store",
      headers: { "Content-Type": "application/json" }, body: "{}",
    });
    if (!result.ok) {
      if (result.status === 401 || result.status === 403) applySession(null);
      throw new ApiError(result.status === 401 || result.status === 403 ? "Admin session expired. Please sign in again." : "Cannot reach the session service. Try again shortly.", result.status);
    }
    const payload = await result.json() as Payload;
    if (!payload.data?.token || !payload.data?.staff) throw new Error("Invalid session response.");
    applySession(payload.data);
    return payload.data;
  })().finally(() => { refreshInFlight = null; });
  return refreshInFlight;
}

export async function signOutAdmin() {
  const response = await fetch(`${API_BASE_URL}/admin/auth/logout`, {
    method: "POST", credentials: "include", cache: "no-store",
    headers: { "Content-Type": "application/json" }, body: "{}",
  });
  if (!response.ok) throw new ApiError("Could not revoke admin session. Retry Sign Out.", response.status);
  applySession(null);
}
