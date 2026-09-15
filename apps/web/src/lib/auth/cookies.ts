export const REFRESH_COOKIE_NAME = "xenior.refresh";
export const REFRESH_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export const refreshCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: REFRESH_COOKIE_MAX_AGE_SECONDS,
};
