import { NextResponse } from "next/server";
import { authSessionResponseSchema } from "@xenior/validation";
import {
  REFRESH_COOKIE_NAME,
  refreshCookieOptions,
} from "@/lib/auth/cookies";
import {
  nestAuthRequest,
  readResponsePayload,
} from "@/lib/auth/server-api";

export async function POST(request: Request): Promise<NextResponse> {
  const body: unknown = await request.json().catch(() => null);
  const upstream = await nestAuthRequest("/register", {
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

  const { refreshToken, ...session } = parsed.data;
  const response = NextResponse.json(session, { status: 201 });
  response.cookies.set(
    REFRESH_COOKIE_NAME,
    refreshToken,
    refreshCookieOptions,
  );
  return response;
}
