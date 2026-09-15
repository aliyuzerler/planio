import { getPublicApiUrl } from "@/lib/env";
import { TENANT_HEADER } from "@xenior/types";
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

function isFormDataBody(body: unknown): body is FormData {
  return typeof FormData !== "undefined" && body instanceof FormData;
}

function buildHeaders(
  options: RequestOptions,
  accept = "application/json",
): Headers {
  const headers = new Headers({
    Accept: accept,
  });
  if (options.body !== undefined && !isFormDataBody(options.body)) {
    headers.set("Content-Type", "application/json");
  }
  const accessToken =
    options.accessToken ?? useAuthStore.getState().accessToken ?? undefined;
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }
  const selectedBusinessId = useAuthStore.getState().selectedBusinessId;
  if (selectedBusinessId) {
    headers.set(TENANT_HEADER, selectedBusinessId);
  }
  return headers;
}

async function parseError(response: Response) {
  const payload: unknown = await response.json().catch(() => null);
  return normalizeApiError(payload);
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const headers = buildHeaders(options);
  try {
    const response = await fetch(`${getPublicApiUrl()}${path}`, {
      method: options.method ?? "GET",
      headers,
      body:
        options.body === undefined
          ? undefined
          : isFormDataBody(options.body)
            ? options.body
            : JSON.stringify(options.body),
      signal: options.signal,
    });

    if (!response.ok) {
      const requestError = await parseError(response);

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

export async function apiRequestBlob(
  path: string,
  options: RequestOptions = {},
): Promise<Blob> {
  const headers = buildHeaders(options, "*/*");
  try {
    const response = await fetch(`${getPublicApiUrl()}${path}`, {
      method: options.method ?? "GET",
      headers,
      signal: options.signal,
    });

    if (!response.ok) {
      const requestError = await parseError(response);
      if (
        response.status === 401 &&
        !options.skipAuthRefresh &&
        !options.retried
      ) {
        try {
          const session = await refreshOnce();
          useAuthStore.getState().updateAccessToken(session.accessToken);
          return apiRequestBlob(path, {
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

    return await response.blob();
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw normalizeApiError(error);
  }
}
