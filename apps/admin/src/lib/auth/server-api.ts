import "server-only";
import { getPublicApiUrl } from "@/lib/env";

export function nestAuthRequest(
  path: string,
  init: RequestInit,
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(`${getPublicApiUrl()}/auth${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
}

export async function readResponsePayload(response: Response): Promise<unknown> {
  return response.json().catch(() => null);
}
