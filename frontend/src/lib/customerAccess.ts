"use client";

export type CustomerAccessKind = "order" | "complaint";
function storageKey(kind: CustomerAccessKind, ref: string): string {
  return `ss:access:${kind}:${ref}`;
}

export function saveCustomerAccess(kind: CustomerAccessKind, ref: string, token: string): void {
  if (typeof window === "undefined") return;
  // Prevent accepting malformed arbitrary string fragments as auth credentials.
  if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) return;
  localStorage.setItem(storageKey(kind, ref), token);
}

export function getCustomerAccess(kind: CustomerAccessKind, ref: string): string | null {
  if (typeof window === "undefined") return null;
  // Hash fragment does not appear in HTTP logs, analytics requests, or referrers.
  const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const received = fragment.get("access");
  if (received) {
    saveCustomerAccess(kind, ref, received);
    window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
  }
  const key = storageKey(kind, ref);
  const saved = localStorage.getItem(key);
  if (saved) return saved;
  // Migrate credentials created by the P0/P1 session-storage implementation.
  const previousSession = sessionStorage.getItem(key);
  if (previousSession) {
    saveCustomerAccess(kind, ref, previousSession);
    sessionStorage.removeItem(key);
  }
  return previousSession;
}

export function authHeaders(kind: CustomerAccessKind, ref: string): Record<string, string> {
  const token = getCustomerAccess(kind, ref);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// The fragment is never sent to the server or recorded in the URL query.
export function privateAccessLink(kind: CustomerAccessKind, ref: string): string | null {
  const token = getCustomerAccess(kind, ref);
  if (!token || typeof window === "undefined") return null;
  const route = kind === "order" ? `/orders/${encodeURIComponent(ref)}` : `/support/case/${encodeURIComponent(ref)}`;
  return `${window.location.origin}${route}#access=${encodeURIComponent(token)}`;
}
