"use client";

export type CustomerAccessKind = "order" | "complaint";
function storageKey(kind: CustomerAccessKind, ref: string): string {
  return `ss:access:${kind}:${ref}`;
}

export function saveCustomerAccess(kind: CustomerAccessKind, ref: string, token: string): void {
  if (typeof window === "undefined") return;
  // Prevent accepting malformed arbitrary string fragments as auth credentials.
  if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) return;
  sessionStorage.setItem(storageKey(kind, ref), token);
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
  return sessionStorage.getItem(storageKey(kind, ref));
}

export function authHeaders(kind: CustomerAccessKind, ref: string): Record<string, string> {
  const token = getCustomerAccess(kind, ref);
  return token ? { Authorization: `Bearer ${token}` } : {};
}
