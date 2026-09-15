import { cookies } from "next/headers";
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

export async function POST(): Promise<NextResponse> {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_COOKIE_NAME)?.value;

  if (!refreshToken) {
    return NextResponse.json(
      { message: "Authentication required." },
      { status: 401 },
    );
  }

  const upstream = await nestAuthRequest("/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });
  const payload = await readResponsePayload(upstream);

  if (!upstream.ok) {
    const response = NextResponse.json(payload, { status: upstream.status });
    response.cookies.delete(REFRESH_COOKIE_NAME);
    return response;
  }

  const parsed = authSessionResponseSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Authentication service returned an invalid response." },
      { status: 502 },
    );
  }

  const { refreshToken: rotatedToken, ...session } = parsed.data;
  const response = NextResponse.json(session);
  response.cookies.set(
    REFRESH_COOKIE_NAME,
    rotatedToken,
    refreshCookieOptions,
  );
  return response;
}
