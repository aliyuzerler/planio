import { NextRequest, NextResponse } from "next/server";
import { REFRESH_COOKIE_NAME } from "@/lib/auth/cookies";

export function proxy(request: NextRequest): NextResponse {
  const hasRefreshSession = request.cookies.has(REFRESH_COOKIE_NAME);

  if (!hasRefreshSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
    "/businesses",
    "/businesses/:path*",
    "/subscriptions",
    "/subscriptions/:path*",
    "/audit-logs",
    "/audit-logs/:path*",
  ],
};
