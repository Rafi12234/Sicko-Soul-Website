export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "";

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: unknown;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type ApiErrorPayload = {
  message?: string;
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  } | string;
};

export function requireApiBaseUrl() {
  if (!API_BASE_URL) {
    throw new Error(
      "NEXT_PUBLIC_API_BASE_URL IS NOT CONFIGURED. POINT IT TO THE SICKO SOUL API INCLUDING /api/v1.",
    );
  }
  return API_BASE_URL;
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const base = requireApiBaseUrl();
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    let message = `REQUEST FAILED (${response.status})`;
    let code: string | undefined;
    let details: unknown;

    try {
      const payload = (await response.json()) as ApiErrorPayload;
      message =
        payload.message ??
        (typeof payload.error === "object" ? payload.error?.message : payload.error) ??
        message;
      if (typeof payload.error === "object") {
        code = payload.error?.code;
        details = payload.error?.details;
      }
    } catch {
      // Keep the HTTP fallback when the response has no JSON body.
    }

    throw new ApiError(message, response.status, code, details);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export type DataEnvelope<T> = { data: T };
