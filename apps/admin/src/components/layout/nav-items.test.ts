import { describe, expect, it } from "vitest";
import { APP_NAV_ITEMS, isNavItemActive } from "./nav-items";

describe("admin navigation", () => {
  it("covers platform administration areas", () => {
    expect(APP_NAV_ITEMS.map((item) => item.href)).toEqual([
      "/dashboard",
      "/businesses",
      "/subscriptions",
      "/plans",
      "/audit-logs",
    ]);
  });

  it("marks nested business routes as active", () => {
    expect(isNavItemActive("/businesses/abc", "/businesses")).toBe(true);
    expect(isNavItemActive("/dashboard", "/businesses")).toBe(false);
    expect(isNavItemActive("/dashboard", "/dashboard")).toBe(true);
  });
});
