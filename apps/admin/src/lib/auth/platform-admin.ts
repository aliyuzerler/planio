import type { AuthUser, PlatformRole } from "@xenior/types";

export function isSuperAdmin(
  role: PlatformRole | string | null | undefined,
): boolean {
  return role === "SUPER_ADMIN";
}

export function platformAdminDeniedBody(path: string) {
  return {
    statusCode: 403,
    error: "Forbidden",
    message: "Platform administration requires a SUPER_ADMIN account.",
    code: "INSUFFICIENT_PLATFORM_ROLE",
    timestamp: new Date().toISOString(),
    path,
  };
}

export function assertSuperAdminUser(user: AuthUser | undefined): boolean {
  return isSuperAdmin(user?.platformRole);
}
