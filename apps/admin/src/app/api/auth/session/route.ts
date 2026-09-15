import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  authSessionResponseSchema,
  currentUserResponseSchema,
} from "@xenior/validation";
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

export async function GET(): Promise<NextResponse> {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_COOKIE_NAME)?.value;

  if (!refreshToken) {
    return NextResponse.json(
      { message: "Authentication required." },
      { status: 401 },
    );
  }

  const refreshResponse = await nestAuthRequest("/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });
  const refreshPayload = await readResponsePayload(refreshResponse);
  const parsedRefresh = authSessionResponseSchema.safeParse(refreshPayload);

  if (!refreshResponse.ok || !parsedRefresh.success) {
    const response = NextResponse.json(refreshPayload, {
      status: refreshResponse.ok ? 502 : refreshResponse.status,
    });
    response.cookies.delete(REFRESH_COOKIE_NAME);
    return response;
  }

  const meResponse = await nestAuthRequest("/me", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${parsedRefresh.data.accessToken}`,
    },
  });
  const mePayload = await readResponsePayload(meResponse);
  const parsedMe = currentUserResponseSchema.safeParse(mePayload);

  if (!meResponse.ok || !parsedMe.success) {
    const response = NextResponse.json(mePayload, {
      status: meResponse.ok ? 502 : meResponse.status,
    });
    response.cookies.delete(REFRESH_COOKIE_NAME);
    return response;
  }

  if (!assertSuperAdminUser(parsedMe.data.user)) {
    await nestAuthRequest("/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken: parsedRefresh.data.refreshToken }),
    }).catch(() => undefined);
    const response = NextResponse.json(
      platformAdminDeniedBody("/api/auth/session"),
      { status: 403 },
    );
    response.cookies.delete(REFRESH_COOKIE_NAME);
    return response;
  }

  const response = NextResponse.json({
    accessToken: parsedRefresh.data.accessToken,
    expiresIn: parsedRefresh.data.expiresIn,
    tokenType: parsedRefresh.data.tokenType,
    user: parsedMe.data.user,
  });
  response.cookies.set(
    REFRESH_COOKIE_NAME,
    parsedRefresh.data.refreshToken,
    refreshCookieOptions,
  );
  return response;
}
