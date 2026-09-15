import { NextResponse } from "next/server";
import { authSessionResponseSchema } from "@xenior/validation";
import {
  REFRESH_COOKIE_NAME,
  refreshCookieOptions,
} from "@/lib/auth/cookies";
import {
  assertSuperAdminUser,
  platformAdminDeniedBody,
} from "@/lib/auth/platform-admin";
import {
  nestAuthRequest,
  readResponsePayload,
} from "@/lib/auth/server-api";

export async function POST(request: Request): Promise<NextResponse> {
  const body: unknown = await request.json().catch(() => null);
  const upstream = await nestAuthRequest("/login", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const payload = await readResponsePayload(upstream);

  if (!upstream.ok) {
    return NextResponse.json(payload, { status: upstream.status });
  }

  const parsed = authSessionResponseSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Authentication service returned an invalid response." },
      { status: 502 },
    );
  }

  if (!assertSuperAdminUser(parsed.data.user)) {
    await nestAuthRequest("/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken: parsed.data.refreshToken }),
    }).catch(() => undefined);
    return NextResponse.json(platformAdminDeniedBody("/api/auth/login"), {
      status: 403,
    });
  }

  const { refreshToken, ...session } = parsed.data;
  const response = NextResponse.json(session);
  response.cookies.set(
    REFRESH_COOKIE_NAME,
    refreshToken,
    refreshCookieOptions,
  );
  return response;
}
