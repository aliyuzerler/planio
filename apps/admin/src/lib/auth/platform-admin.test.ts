import { describe, expect, it } from "vitest";
import {
  assertSuperAdminUser,
  isSuperAdmin,
  platformAdminDeniedBody,
} from "./platform-admin";

describe("platform admin gate", () => {
  it("accepts only SUPER_ADMIN", () => {
    expect(isSuperAdmin("SUPER_ADMIN")).toBe(true);
    expect(isSuperAdmin("USER")).toBe(false);
    expect(isSuperAdmin(undefined)).toBe(false);
    expect(
      assertSuperAdminUser({
        id: "1",
        email: "owner@example.test",
        firstName: "A",
        lastName: "B",
        platformRole: "USER",
      }),
    ).toBe(false);
    expect(
      assertSuperAdminUser({
        id: "2",
        email: "admin@example.test",
        firstName: "S",
        lastName: "A",
        platformRole: "SUPER_ADMIN",
      }),
    ).toBe(true);
  });

  it("returns a stable unauthorized platform body", () => {
    const body = platformAdminDeniedBody("/api/auth/login");
    expect(body).toMatchObject({
      statusCode: 403,
      code: "INSUFFICIENT_PLATFORM_ROLE",
      path: "/api/auth/login",
    });
  });
});
