import { getPublicApiUrl } from "@/lib/env";
import { AppError, normalizeApiError } from "@/lib/api/errors";
import { logout, refresh } from "@/lib/auth/auth-api";
import { useAuthStore } from "@/stores/auth-store";

type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  accessToken?: string;
  signal?: AbortSignal;
  skipAuthRefresh?: boolean;
  retried?: boolean;
}

let refreshInFlight: ReturnType<typeof refresh> | null = null;

function refreshOnce(): ReturnType<typeof refresh> {
  refreshInFlight ??= refresh().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

export function toQuery(
  params: object,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const headers = new Headers({
    Accept: "application/json",
  });

  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  const accessToken =
    options.accessToken ?? useAuthStore.getState().accessToken ?? undefined;
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  try {
    const response = await fetch(`${getPublicApiUrl()}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    });

    if (!response.ok) {
      const payload: unknown = await response.json().catch(() => null);
      const requestError = normalizeApiError(payload);

      if (
        response.status === 401 &&
        !options.skipAuthRefresh &&
        !options.retried
      ) {
        try {
          const session = await refreshOnce();
          useAuthStore.getState().updateAccessToken(session.accessToken);
          return apiRequest<T>(path, {
            ...options,
            accessToken: session.accessToken,
            retried: true,
          });
        } catch {
          useAuthStore.getState().clearSession();
          void logout().catch(() => undefined);
        }
      }

      throw requestError;
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw normalizeApiError(error);
  }
}
