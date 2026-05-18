/**
 * API client. Talks to the FastAPI backend with httpOnly cookie credentials.
 *
 * Types in this file are hand-written for Phase 1 B3. Chunk C1 will replace
 * them with `openapi-typescript`-generated types from the backend's OpenAPI
 * schema.
 */

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

// ─── Types (hand-written for now) ─────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  display_name: string;
  created_at: string;
}

export interface SignupInput {
  email: string;
  password: string;
  display_name: string;
}

// ─── Errors ───────────────────────────────────────────────────────────────────
export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string,
  ) {
    super(`${status} ${detail}`);
    this.name = "ApiError";
  }
}

// ─── Core fetch wrapper ───────────────────────────────────────────────────────
async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    // Send + receive httpOnly cookies cross-origin (dev: 3000 → 8000)
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = (await res.json()) as { detail?: string };
      if (body.detail) detail = body.detail;
    } catch {
      // body wasn't JSON — keep statusText
    }
    throw new ApiError(res.status, detail);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// ─── Auth endpoints ───────────────────────────────────────────────────────────
export const auth = {
  signup: (input: SignupInput) =>
    apiFetch<User>("/auth/signup", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  login: (email: string, password: string) =>
    apiFetch<User>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  me: () => apiFetch<User>("/auth/me"),

  logout: () => apiFetch<void>("/auth/logout", { method: "POST" }),

  refresh: () => apiFetch<User>("/auth/refresh", { method: "POST" }),
};
