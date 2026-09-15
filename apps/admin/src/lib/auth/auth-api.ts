import type { AuthSessionResponse, AuthUser, LoginInput } from "@xenior/types";
import { normalizeApiError } from "@/lib/api/errors";

export type BrowserAuthSession = Omit<AuthSessionResponse, "refreshToken">;

export interface BrowserHydratedSession extends BrowserAuthSession {
  user: AuthUser;
}

async function authRequest<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`/api/auth${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
    credentials: "same-origin",
    cache: "no-store",
  });

  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null);
    throw normalizeApiError(payload);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function login(input: LoginInput): Promise<BrowserAuthSession> {
  return authRequest("/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function refresh(): Promise<BrowserAuthSession> {
  return authRequest("/refresh", { method: "POST" });
}

export function getSession(): Promise<BrowserHydratedSession> {
  return authRequest("/session", { method: "GET" });
}

export function logout(): Promise<void> {
  return authRequest("/logout", { method: "POST" });
}
